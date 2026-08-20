# CONTRATO - servicio de modelo (FastAPI) ↔ Backend (Spring Boot)

> 🧊 **CONGELADO.** Esta es **la costura más crítica del proyecto**: es donde el
> trabajo de las 2 personas de Data Science se encuentra con el de los 3 de
> backend. Las dos mitades se construyen contra este doc, en paralelo, sin
> esperarse. Cambiarlo requiere un ADR y avisar al equipo.

## §1 La regla que lo gobierna todo

**El servicio de ML es inferencia pura. NO tiene lógica de negocio.**

| Vive en el servicio de ML (Python) | Vive en el backend (Spring Boot) |
|---|---|
| Vectorizar el texto de la descripción | Recibir la petición del usuario |
| Predecir la categoría de cada transacción | Agregar los montos por categoría |
| Predecir el perfil a partir de indicadores | **Calcular los 8 indicadores** |
| Devolver probabilidades | **Aplicar el motor de reglas → recomendaciones** |
| Versionar el modelo | Persistir el análisis, auth, historial |

**Por qué así**: el ML se puede reentrenar, reemplazar o tirar sin tocar una
regla de negocio; y el backend se puede testear con un ML *fake* de 20 líneas.
Si el ML calculara indicadores, la misma fórmula viviría en dos lenguajes y
divergiría - es la clase de bug que aparece a las 3 AM del día de la entrega.

## §2 El flujo, paso a paso

```
Usuario ──► Spring Boot ─(1)─► FastAPI  POST /interno/v1/clasificar
                                          { transacciones: [descripcion, valor] }
            Spring Boot ◄─────           { categoria, confianza } por transaccion

            Spring Boot  (2)  agrega montos por categoria  -> resumen_gastos
            Spring Boot  (3)  calcula los 8 indicadores    -> ratios

            Spring Boot ─(4)─► FastAPI  POST /interno/v1/perfil
                                          { indicadores: {...8 ratios...} }
            Spring Boot ◄─────           { perfil, probabilidad, probabilidades }

            Spring Boot  (5)  motor de reglas sobre indicadores -> recomendaciones
            Spring Boot  (6)  persiste + responde
```

**Dos llamadas HTTP, no una.** Se podría hacer en una sola, pero separarlas
permite usar `/clasificar` solo (lo pide el enunciado como endpoint aparte) y
deja los dos modelos desacoplados.

## §3 Red y seguridad

- FastAPI **no se expone a internet**. Vive en la red interna de docker-compose
  (local) y en la VCN privada (OCI). Solo Spring Boot lo llama.
- Autenticación entre servicios: header `X-Clave-Interna: <secreto>` (viene de
  OCI Vault / `.env` local). Sin JWT de usuario - el ML no sabe qué es un usuario.
- **Timeout desde Spring: 5 s.** Si expira o el ML devuelve error → Spring
  responde **503** al cliente. **Nunca** se inventa una predicción ni se cae a un
  valor por defecto.
- Reintentos: 1 reintento con backoff de 200 ms, solo para errores de red/5xx.

## §4 Endpoints del servicio de ML

Base: `http://ml:8000` (nombre de servicio en compose / DNS interno en OCI).

### `POST /interno/v1/clasificar`

Clasifica descripciones de transacciones en categorías. **Sin estado.**

```jsonc
// Entrada
{
  "transacciones": [
    { "id": "t1", "descripcion": "Supermercado La Comer", "valor": 1240.50 },
    { "id": "t2", "descripcion": "UBER *TRIP",            "valor": 185.00 },
    { "id": "t3", "descripcion": "NETFLIX.COM",           "valor": 219.00 }
  ]
}
```

| Campo | Tipo | Req. | Nota |
|---|---|---|---|
| `transacciones[].id` | string | ❌ | Eco: se devuelve tal cual para que Spring reasocie. Si no viene, se usa el índice. |
| `transacciones[].descripcion` | string | ✅ | 1-200 chars. **Es la única feature del modelo M1.** |
| `transacciones[].valor` | decimal | ❌ | El modelo M1 **no lo usa hoy**. Se acepta por si una versión futura lo incorpora. |

```jsonc
// Salida 200
{
  "modelo_version": "1.0.0",
  "resultados": [
    { "id": "t1", "categoria": "alimentacion",    "confianza": 0.96 },
    { "id": "t2", "categoria": "transporte",      "confianza": 0.94 },
    { "id": "t3", "categoria": "entretenimiento", "confianza": 0.91 }
  ]
}
```

- `categoria`: **siempre uno de los 12 slugs** de [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md).
  Nunca `null`, nunca un valor fuera de la lista.
- `confianza`: `0.0`-`1.0`, 2 decimales. Es `max(predict_proba)`.
- **RN6**: si `confianza < 0.40`, el ML ya devuelve `categoria = "otros"`. El
  umbral vive en el ML (es propiedad del modelo), no en Spring.
- Máximo **500 transacciones** por llamada. Más → `422`.

### `POST /interno/v1/perfil`

Predice el perfil financiero a partir de los indicadores **ya calculados por Spring**.

```jsonc
// Entrada - los 8 indicadores, TODOS obligatorios, en este orden semantico
{
  "indicadores": {
    "tasa_ahorro":              0.12,
    "ratio_endeudamiento":      0.25,
    "ratio_gasto_ingreso":      0.88,
    "ratio_gasto_esencial":     0.55,
    "ratio_gasto_discrecional": 0.21,
    "concentracion_gasto":      0.34,
    "frecuencia_ahorro_num":    2,
    "ratio_recurrente":         0.08
  }
}
```

Definición exacta de cada indicador (fórmula, rango, quién lo calcula):
[`../datos/TAXONOMIA.md#indicadores`](../datos/TAXONOMIA.md).

```jsonc
// Salida 200
{
  "modelo_version": "1.0.0",
  "perfil": "en_observacion",
  "probabilidad": 0.82,
  "probabilidades": {
    "saludable":      0.11,
    "en_observacion": 0.82,
    "en_riesgo":      0.07
  },
  "explicacion": [
    { "indicador": "tasa_ahorro",         "contribucion": -0.31 },
    { "indicador": "ratio_endeudamiento", "contribucion":  0.18 },
    { "indicador": "ratio_recurrente",    "contribucion":  0.09 }
  ]
}
```

- `perfil`: uno de `saludable` | `en_observacion` | `en_riesgo`.
- `probabilidad` = `probabilidades[perfil]`. Las 3 suman `1.0` (±0.01).
- `explicacion`: contribución de cada indicador al resultado (feature importance
  local, p.ej. SHAP). **Opcional en v1.0** - si el modelo no la puede dar, se
  devuelve `[]` y el frontend simplemente no muestra esa sección. Es el recurso
  opcional "explicabilidad" del enunciado.

### `GET /interno/v1/salud`

```jsonc
{
  "estado": "ok",
  "modelo_transacciones": { "version": "1.0.0", "cargado": true, "clases": 12 },
  "modelo_perfil":        { "version": "1.0.0", "cargado": true, "clases": 3 }
}
```

Si un modelo no cargó → `503` con `estado: "degradado"`. Spring lo propaga a
`/api/v1/salud`.

### Errores del ML

Misma forma que la API pública (ver [`CONTRATO_API.md`](CONTRATO_API.md) §2):
`{codigo, mensaje, detalles, traza_id}`. Códigos: `VALIDACION_ENTRADA` (422),
`MODELO_NO_CARGADO` (503), `ERROR_INTERNO` (500).

## §5 Los dos modelos

| | **M1 - Clasificador de transacciones** | **M2 - Clasificador de perfil** |
|---|---|---|
| **Entrada** | `descripcion` (texto libre, **en es / pt / en**) | 8 indicadores numéricos |
| **Salida** | 1 de 12 categorías + confianza | 1 de 3 perfiles + probabilidades |
| **Tipo** | Clasificación multiclase de texto, **multilingüe** | Clasificación multiclase tabular |
| **Enfoque propuesto** | `TfidfVectorizer` (word 1-2gram + **`char_wb` 3-5gram**) → `LinearSVC` calibrado (`CalibratedClassifierCV`, necesario para tener `predict_proba`) | `GradientBoostingClassifier` o `RandomForest` (ya dan `predict_proba` nativo) |
| **Métrica principal** | **macro-F1**, y **desglosado por idioma** (ver abajo) | **macro-F1** + ROC-AUC (one-vs-rest) |
| **Meta mínima** | macro-F1 ≥ **0.85** global **y ≥ 0.80 en CADA idioma** | macro-F1 ≥ **0.80** en test |
| **Baseline a batir** | Clasificador por keywords (regex) | Regla determinista sobre `tasa_ahorro` + `ratio_endeudamiento` |
| **Artefacto** | `modelo-transacciones-v{X.Y.Z}.joblib` | `modelo-perfil-v{X.Y.Z}.joblib` |

> **El baseline no es decorativo**: si el modelo no le gana al clasificador por
> keywords, hay que decirlo en el notebook y explicar por qué. Un jurado técnico
> valora más eso que una métrica inflada.

### 🌎 M1 es multilingüe - y esto es lo que más fácil se rompe

El proyecto habla **español, portugués e inglés** ([ADR-0009](../adr/0009-multi-idioma.md)),
así que **M1 tiene que clasificar descripciones en los tres**. Esto **no** es un
detalle de la UI: es una propiedad del modelo.

Si M1 se entrena solo con comercios en español, va a devolver **`otros` en silencio**
ante esto:

```
IFOOD *PEDIDO          -> alimentacion   (Brasil)
PIX RECEBIDO SALARIO   -> ingresos       (Brasil)
CONTA DE LUZ ENEL      -> servicios      (Brasil)
MAGAZINE LUIZA         -> compras        (Brasil)
WHOLE FOODS MARKET     -> alimentacion   (EE.UU.)
```

**Un jurado brasileño escribiendo `IFOOD` y viendo `Otros` es el peor momento
posible de la demo.**

**Cómo se resuelve** (decidido, no opcional):

1. **UN solo modelo**, entrenado con los tres idiomas **mezclados**. No tres modelos
   ni detección de idioma previa - eso agregaría un problema nuevo y una fuente de
   error nueva, y fallaría con texto mixto (un brasileño con `NETFLIX.COM`).
2. **`char_wb` de 3-5 caracteres es la clave.** Los n-gramas de caracteres capturan
   raíces compartidas entre lenguas romances (`supermerc-`, `farmac-`, `restaur-`,
   `combustí-`/`combustí`) y hacen al modelo robusto incluso ante palabras que no vio
   en entrenamiento. **Sin `char_wb`, el modelo multilingüe no funciona.**
3. El **dataset incluye comercios reales de los tres mercados**
   ([`../datos/DATASET.md`](../datos/DATASET.md) §5).
4. El **set de validación manual** tiene transacciones en los tres idiomas.
5. **Se reporta macro-F1 POR IDIOMA**, no solo el global.

> ⚠️ **Un macro-F1 global de 0.90 que esconde un 0.62 en portugués es una métrica que
> miente.** El notebook reporta los tres, siempre. Y si el portugués queda flojo, la
> respuesta es más datos en portugués, no maquillar el promedio.

**El servicio NO recibe el idioma como parámetro.** El modelo lo infiere del texto
-que es justamente la gracia del enfoque con n-gramas de caracteres- y el `Accept-
Language` de la API es solo para la **respuesta**, no para la inferencia. Un usuario
puede tener la UI en portugués y transacciones con descripciones en inglés; el modelo
las clasifica igual.

## §6 Serialización y versionado del artefacto

- **Formato**: `joblib` (no `pickle` crudo). El artefacto contiene el **`Pipeline`
  completo** de scikit-learn (vectorizador + clasificador). El servicio hace
  `pipeline.predict(...)`, **nunca** reimplementa el preprocesamiento.
- **El preprocesamiento vive DENTRO del pipeline.** Si el notebook hace
  `descripcion.lower().strip()` antes de vectorizar, eso va como un
  `FunctionTransformer` en el pipeline - no como una nota en el README que el
  backend tiene que recordar. **Todo lo que el notebook hace al texto, lo hace
  también el servicio, porque es el mismo objeto serializado.**
- **Nombre**: `modelo-{transacciones|perfil}-v{MAJOR.MINOR.PATCH}.joblib`.
  - `MAJOR` → cambia el contrato (features nuevas, clases nuevas) → **requiere ADR**.
  - `MINOR` → reentrenamiento con datos nuevos, mismo contrato.
  - `PATCH` → arreglo sin cambio de datos ni contrato.
- **Dónde vive**: ⚠️ **horneado en la imagen del servicio de ML**, en
  `ml/artefactos/`. El plan era **OCI Object Storage** (bucket `modelos/`) y
  **no se llegó a usar**: con modelos de pocos MB, meterlos en la imagen sale
  más simple y hace el arranque determinista. El requisito de OCI se cumple por
  otros cuatro servicios — ver
  [`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md).
- **Cómo lo carga el servicio**: al arrancar, FastAPI carga el artefacto de la
  imagen en memoria. **Si no puede cargarlo → arranca en estado `degradado` y
  devuelve 503.** Nunca sirve predicciones falsas.
- **Metadatos junto al artefacto** (`modelo-transacciones-v1.0.0.json`):

```json
{
  "version": "1.0.0",
  "entrenado_en": "2026-07-28T10:00:00Z",
  "dataset_version": "1.2.0",
  "filas_entrenamiento": 48000,
  "clases": ["alimentacion", "transporte", "..."],
  "metricas": { "macro_f1": 0.91, "accuracy": 0.93 },
  "sklearn_version": "1.5.2"
}
```

> ⚠️ **Trampa clásica**: un `.joblib` entrenado con scikit-learn 1.5 y cargado
> con 1.4 puede fallar o -peor- cargar mal en silencio. La versión de sklearn
> está **fijada exacta** (`==`) en `ml/requirements.txt` y se verifica al cargar
> contra el campo `sklearn_version` del metadata: si no coincide, warning ruidoso.

## §7 Cómo trabajaron en paralelo las dos mitades

> ✅ **Ya ocurrió, y salió bien.** El servicio real está en uso desde el
> 2026-08-07. Esta sección se conserva porque explica **por qué** funcionó, que
> es lo reutilizable.

**Nadie esperó a nadie.** Desde el día 1:

- **Backend (Spring)** trabajó contra un **stub del ML** (`ml-fake`): un FastAPI
  de 30 líneas que respetaba este contrato y devolvía categorías por palabras
  clave y un perfil con una regla simple. Así el backend construyó y terminó el
  flujo completo **sin que existiera el modelo real**. ⚠️ El stub **ya no está en
  el repositorio**: se retiró al entrar el servicio de verdad.
- **Data Science** trabajó en los notebooks y entrenó contra el dataset, y validó
  su servicio con el mismo contrato (`ml/tests/test_servicio.py`, 17 pruebas de
  forma y slugs).
- **El día de la integración** se cambió una variable de entorno
  (`FV_ML_URL=http://ml:8000`) y **funcionó a la primera**, que era la prueba de
  que el contrato servía.
- ⬜ **Tests de contrato compartidos**: se diseñó un único archivo de casos
  (`docs/contratos/casos.json`) para que ambos lados ejecutaran los mismos.
  **El archivo existe pero nadie lo ejecuta**; ver
  [`../contratos/README.md`](../contratos/README.md), que explica qué se corre
  en su lugar.

## §8 Pendiente (TBD)

| # | Qué | Quién decide |
|---|---|---|
| TBD-M1 | ¿`explicacion` (SHAP) entra en v1.0 o queda para v1.1? Depende de si `LinearSVC` calibrado + SHAP es viable en el tiempo. | Data Science |
| TBD-M2 | ¿El umbral de confianza 0.40 (RN6) es el correcto? Se calibra con la matriz de confusión real. | Data Science |
| TBD-M3 | ¿Se reentrena con las correcciones del usuario (RN3) durante el hackathon, o queda como "futuro"? | Equipo |
