# Servicio de modelo (FastAPI)

Inferencia pura sobre los artefactos `.pkl` que entrega Data Science: **categoría
de una transacción** y **perfil financiero**. No tiene lógica de negocio — los
indicadores, el motor de reglas y la persistencia viven en Spring Boot
([`CONTRATO_MODELO.md`](../docs/arquitectura/CONTRATO_MODELO.md) §1).

No se expone a internet: vive en la red interna del compose y solo lo llama la API.

---

## Estado de los modelos (2026-08-07)

**Los dos modelos están entrenados y en uso.** Todo el proceso —datos, EDA,
entrenamiento, métricas y serialización— está en
[`notebooks/modelos_fintech_vital.ipynb`](notebooks/modelos_fintech_vital.ipynb),
que se puede abrir y volver a ejecutar.

### M1 — categorías

```text
Pipeline
 ├─ features: FeatureUnion
 │    ├─ word_tfidf: TfidfVectorizer(analyzer=word,    ngram=(1,2))
 │    └─ char_tfidf: TfidfVectorizer(analyzer=char_wb, ngram=(3,5))
 └─ classifier: LogisticRegression(class_weight="balanced")
```

Recibe la descripción en crudo y devuelve uno de los 12 slugs con
`predict_proba`. **No hay que preparar ninguna feature.**

| Escenario | macro-F1 |
|---|---|
| Comercio **ya conocido** (escrito de otra forma: `WAL-MART #1234`) | 1.00 |
| Comercio **completamente nuevo** (modelo solo) | 0.58 |
| Comercio nuevo, **modelo + baseline** (lo que corre) | 0.60 |

Las dos cifras son ciertas y responden preguntas distintas. La segunda es un
**límite pesimista**: pide clasificar una marca inventada, que no lleva ninguna
pista dentro. En producción el catálogo de comercios es finito y las marcas
frecuentes se repiten, así que la realidad está entre las dos.

Sobre 20 descripciones escritas a mano (marcas y formatos que no están en el
dataset) acierta **19/20**, y el fallo restante queda por debajo del umbral, así
que el servicio lo sirve como `otros` — que es lo correcto.

### M2 — perfil

`RandomForest` sobre **los 8 indicadores del contrato**, con sus nombres exactos.

| | |
|---|---|
| macro-F1 | **0.89** (meta del contrato: 0.80) |
| baseline (regla determinista) | 0.80 |
| Predice las 3 clases | Sí — `saludable` con f1 0.96 |

Que prediga las tres no es una métrica más: si nunca predijera `saludable`,
ningún usuario podría recibir un diagnóstico bueno. Hay un test que lo comprueba.

### Cómo lo resuelve el servicio

- **M1 primero, baseline si el modelo no está seguro.** Si
  `max(predict_proba) >= 0.40` manda el modelo; si no, el baseline por palabras
  clave, que cubre los comercios que el modelo nunca vio.
- **M2 manda siempre**, con la regla determinista como red de seguridad si el
  artefacto no cargó o la inferencia falla. Nunca se inventa un perfil.
- El campo `origen` de cada resultado dice quién contestó. Una predicción del
  modelo y una del baseline no deberían confundirse nunca.

> El sistema clasifica en los tres idiomas, que es lo que exige
> [ADR-0009](../docs/adr/0009-multi-idioma.md): `IFOOD *PEDIDO` →
> `alimentacion` (0.93), `PIX RECEBIDO SALARIO` → `ingresos` (1.00),
> `CONTA DE LUZ ENEL` → `servicios` (0.99).

### Reentrenar

```bash
# 1. Regenerar los datasets (semilla fija, reproducible)
cd ml/datos && python generar_dataset.py

# 2. Reconstruir y ejecutar el notebook. Deja los .pkl en ../artefactos/
cd ../notebooks
python construir_notebook.py
python -m nbconvert --execute --inplace --to notebook modelos_fintech_vital.ipynb
```

Necesita `requirements-notebook.txt` (añade matplotlib y jupyter, que **no** van
en la imagen del servicio: son ~200 MB que en producción no hacen nada).

**Lo más rentable para mejorar M1 es ampliar `datos/comercios.py`**: cada marca
nueva sube directamente el número exigente. El catálogo cubre hoy México, Brasil
y EE. UU.

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
    { "id": "t1", "categoria": "alimentacion", "confianza": 0.93, "origen": "modelo" },
    { "id": "t2", "categoria": "salud",        "confianza": 0.97, "origen": "modelo" }
  ]
}
```

`origen` es **aditivo** sobre el contrato: Spring puede ignorarlo sin romperse.
Sale `"baseline"` cuando el modelo no supera el umbral de confianza.

---

## Desarrollo

```bash
# Con el stack completo (lo normal)
./ops/stack.ps1 arriba          # o ./ops/stack.sh arriba

# Suelto, en contenedor - que es como corre de verdad
podman build -t fintechvital-ml:dev ml/
podman run --rm -p 8000:8000 fintechvital-ml:dev

# Tests (36)
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
    inferencia.py  Carga de los .pkl e inferencia   <- LEER LA CABECERA
    taxonomia.py   Los 12+3 slugs y los baselines (palabras clave / regla)
    esquemas.py    Pydantic: entrada y salida del contrato
  datos/
    comercios.py         Catalogo de comercios y conceptos por categoria e idioma
    generar_dataset.py   Genera los dos CSV, con semilla fija
    dataset_*.csv        Los datos de entrenamiento (generados, versionados)
  notebooks/
    construir_notebook.py     Las celdas como texto plano, revisables en git
    modelos_fintech_vital.ipynb  El notebook ejecutado, con salidas y graficas
  artefactos/
    modelo_clasificador_salud_financiera.pkl   M1
    modelo_perfil_salud.pkl                    M2
  tests/
```

Los `.pkl` **se versionan a propósito**: la imagen tiene que construirse sin
depender de que alguien reentrene primero. Se regeneran ejecutando el notebook.

El notebook se genera desde `construir_notebook.py` en vez de editarse a mano
porque un `.ipynb` es JSON con las salidas embebidas: revisarlo en git es
ilegible y dos personas que solo lo abran ya producen un diff.
