# Servicio de modelo (FastAPI)

Inferencia pura sobre los artefactos `.pkl` que entrega Data Science: **categoría
de una transacción** y **perfil financiero**. No tiene lógica de negocio — los
indicadores, el motor de reglas y la persistencia viven en Spring Boot
([`CONTRATO_MODELO.md`](../frontend/docs/arquitectura/CONTRATO_MODELO.md) §1).

No se expone a internet: vive en la red interna del compose y solo lo llama la API.

---

## Estado de los modelos (2026-08-07)

### M1 — categorías: arquitectura lista, falta entrenamiento

`modelo_clasificador_salud_financiera.pkl` **ya tiene la forma que pide el
contrato**: un `Pipeline` que recibe la descripción en crudo y devuelve uno de
los 12 slugs, con `predict_proba`.

```text
Pipeline
 ├─ features: FeatureUnion
 │    ├─ word_tfidf: TfidfVectorizer(analyzer=word,    ngram=(1,2))
 │    └─ char_tfidf: TfidfVectorizer(analyzer=char_wb, ngram=(3,5))
 └─ classifier: LogisticRegression
```

No hay que preparar ninguna feature: se le pasa el texto y ya.

Su límite hoy es de **entrenamiento, no de diseño**: se entrenó con una lista
corta de descripciones, así que reparte poca probabilidad y casi nunca supera el
umbral de confianza. Medido sobre 20 descripciones reales:

| | aciertos |
|---|---|
| Solo el modelo | 1 / 20 |
| Solo el baseline | 20 / 20 |
| **Modelo + baseline (lo que hace el servicio)** | **20 / 20** |

### M2 — perfil: cargado pero **no conectado**

`modelo_perfil_salud.pkl` devuelve los 3 slugs correctos y tiene
`predict_proba`, pero no se usa, por dos razones:

1. **Sus features son otras.** Pide `ratio_ahorro`, `ratio_vivienda`,
   `ratio_deuda`, `ratio_gasto_esencial`, `ratio_gasto_discrecional`,
   `ratio_fondo_emergencia`, `ratio_cobertura_ingresos` y `ratio_margen_neto`.
   De los 8 indicadores del contrato ([TAXONOMIA §3](../frontend/docs/datos/TAXONOMIA.md))
   solo coinciden dos, y `ratio_fondo_emergencia` no se puede calcular con lo
   que recibe la API.
2. **Nunca predice `saludable`.** En su propio reporte esa clase sale con
   precision, recall y f1 = `0.00`. Conectarlo significaría que a ningún usuario
   se le puede decir que sus finanzas están bien.

Mientras tanto responde la regla determinista, que es el baseline que el propio
contrato define.

### Cómo lo resuelve el servicio

- **M1 primero, baseline si el modelo no está seguro.** Si
  `max(predict_proba) >= 0.40` manda el modelo; si no, el baseline por palabras
  clave.
- **Esto se ajusta solo**: el día que M1 se reentrene con más datos, empezará a
  superar el umbral y tomará el relevo **sin tocar una línea de código**.
- El campo `origen` de cada resultado dice cuál de los dos contestó. Una
  predicción del modelo y una del baseline no deberían confundirse nunca.

> El baseline es multilingüe (es/pt/en) y resuelve `IFOOD *PEDIDO`,
> `PIX RECEBIDO` o `CONTA DE LUZ ENEL`, que es lo que exige
> [ADR-0009](../frontend/docs/adr/0009-multi-idioma.md).

### Qué falta

**M1** — reentrenar con más datos. El repositorio de Data Science ya tiene un
CSV de **5.000 transacciones reales** (`banco_transacciones.csv`) que el
notebook todavía no usa: hoy entrena sobre una lista escrita a mano. Con ese
dataset y `class_weight="balanced"`, el modelo debería superar el umbral solo.

Conviene además evaluar sobre un **conjunto de prueba separado**: el reporte
actual mide `predict` sobre los mismos datos con los que se hizo `fit`, así que
el 1.00 de accuracy no dice todavía si el modelo generaliza.

**M2** — reentrenar sobre **los 8 indicadores del contrato**, con sus nombres
exactos, y comprobar que predice las tres clases.

Cuando lleguen, se cambia la carga en `app/inferencia.py` y **el resto del
servicio no se toca**: el contrato hacia la API ya es el definitivo.

---

## Endpoints

Base interna: `http://ml:8000` (nombre de servicio en el compose).

| | Ruta | Qué hace |
|---|---|---|
| POST | `/interno/v1/clasificar` | Categoría de cada descripción (máx. 500) |
| POST | `/interno/v1/perfil` | Perfil a partir de los 8 indicadores |
| GET | `/interno/v1/salud` | Estado; **503** si un artefacto no cargó |
| GET | `/interno/v1/categorias` | Los slugs que este servicio puede devolver |
| GET | `/interno/v1/docs` | Swagger |

Autenticación entre servicios: cabecera `X-Clave-Interna` (`FV_CLAVE_INTERNA`).
Vacía = desactivada, que es lo cómodo en local.

### Ejemplo

```bash
curl -s localhost:8000/interno/v1/clasificar -H 'Content-Type: application/json' -d '{
  "transacciones": [
    {"id": "t1", "descripcion": "IFOOD *PEDIDO", "valor": 89.90},
    {"id": "t2", "descripcion": "Farmacias del Ahorro", "valor": 150}
  ]}'
```

```jsonc
{
  "modelo_version": "0.2.0",
  "resultados": [
    { "id": "t1", "categoria": "alimentacion", "confianza": 0.6, "origen": "baseline" },
    { "id": "t2", "categoria": "salud",        "confianza": 0.6, "origen": "baseline" }
  ]
}
```

> Hoy casi todo sale con `origen: "baseline"`, por lo que se explica arriba.
> Cuando M1 se reentrene empezaran a aparecer con `"modelo"` — sin cambiar nada
> del servicio.

`origen` es **aditivo** sobre el contrato: Spring puede ignorarlo sin romperse.

---

## Desarrollo

```bash
# Con el stack completo (lo normal)
./ops/stack.ps1 arriba          # o ./ops/stack.sh arriba

# Suelto, en contenedor - que es como corre de verdad
podman build -t fintechvital-ml:dev ml/
podman run --rm -p 8000:8000 fintechvital-ml:dev

# Tests (35)
podman run --rm -v "$PWD/ml:/src:ro" -w /src fintechvital-ml:dev \
  sh -c "pip install -q pytest httpx && python -m pytest tests/ -q"
```

Los tests **no miden la calidad del modelo** (eso es del notebook de Data
Science): comprueban que la costura con Spring se respeta — que los slugs son
los del proyecto, que la forma del JSON es la del contrato y que las
descripciones de los tres idiomas no caen en `otros`.

> `test_m1_devuelve_los_slugs_del_proyecto` falla **a propósito** si una entrega
> nueva renombra una clase. Es la red que evita que el servicio empiece a
> descartar predicciones en silencio.

## Estructura

```text
ml/
  app/
    main.py        FastAPI: rutas, errores con la forma del contrato, auth interna
    inferencia.py  Carga de los .pkl y adaptacion  <- LEER LA CABECERA
    taxonomia.py   Los 12+3 slugs y los baselines (palabras clave / regla)
    esquemas.py    Pydantic: entrada y salida del contrato
  artefactos/      Los .pkl tal como los entrego Data Science:
                     modelo_clasificador_salud_financiera.pkl  (M1, en uso)
                     modelo_perfil_salud.pkl                   (M2, cargado sin usar)
  tests/
```

Los `.pkl` vienen de la rama `data-science`, carpeta
`Data science/Modelo clasificador/`. Se copian aquí a propósito en vez de
referenciarlos: la imagen tiene que ser reproducible sin depender de otra rama.
