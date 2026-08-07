# Servicio de modelo (FastAPI)

Inferencia pura sobre los artefactos `.pkl` que entrega Data Science: **categoría
de una transacción** y **perfil financiero**. No tiene lógica de negocio — los
indicadores, el motor de reglas y la persistencia viven en Spring Boot
([`CONTRATO_MODELO.md`](../frontend/docs/arquitectura/CONTRATO_MODELO.md) §1).

No se expone a internet: vive en la red interna del compose y solo lo llama la API.

---

## Estado del clasificador (2026-08-07)

Los artefactos que hay hoy en `artefactos/` **cubren una parte del problema**, y
el servicio completa el resto con el baseline. Conviene conocer sus límites
antes de tocar nada, porque explican por qué el código está como está.

**`encoder_descripcion.pkl` es un `LabelEncoder`**, no un vectorizador de texto.
Reconoce **18 nombres de comercio exactos** y lanza `ValueError` con cualquier
otra cadena — incluidas variantes de mayúsculas de esos mismos 18:

```python
enc.transform(["Burger King"])   # -> [1]
enc.transform(["BURGER KING"])   # -> ValueError: previously unseen labels
enc.transform(["IFOOD *PEDIDO"]) # -> ValueError: previously unseen labels
```

Las descripciones reales de un extracto (`UBER *TRIP 4821`, `WAL-MART #1234`) no
están en esa lista, así que el modelo no puede opinar sobre ellas.

**`modelo_categoria.pkl` recibe 5 features**, no solo el texto:
`monto_scaled`, `desc_encoded`, `es_fin_de_semana`, `ratio_gasto_ingreso` y
`score_scaled`. Dos de ellas no existen en el momento de clasificar:
`ratio_gasto_ingreso` lo calcula la API *después*, sobre las transacciones ya
clasificadas, y el score de buró es de la persona, no de la transacción. Se
rellenan con el valor neutro tras el escalado, lo cual **aleja la inferencia de
las condiciones de entrenamiento**.

**Sus etiquetas son de subcategoría** (`Comida rápida`, `Supermercado`,
`Farmacia`, `Streaming`, `Transporte/Bus`) y se mapean a los slugs del proyecto
en `taxonomia.py`. Cubren 3 de las 12 categorías.

**`modelo_perfil_salud.pkl` trabaja con montos absolutos** (ingreso, ahorro y
score de buró), no con los 8 ratios del contrato. El proyecto usa ratios a
propósito, para que el mismo modelo sirva en cualquier moneda; esos montos no
son derivables desde un ratio, así que el modelo solo se usa cuando la petición
trae `contexto`.

### Cómo lo resuelve el servicio

Sirve el contrato **tal cual** — la integración con la API es directa — y por dentro:

- Usa el modelo **cuando puede responder** (descripción entre las 18 conocidas,
  o `contexto` presente).
- Cae al **baseline** en el resto de los casos. No es un invento: el propio
  `CONTRATO_MODELO` §5 define el clasificador por palabras clave y la regla
  determinista como *"el baseline a batir"*.
- **Declara siempre por qué camino fue**, en el campo `origen`. Una predicción
  del modelo y una del baseline no deberían confundirse nunca.

> El baseline es multilingüe (es/pt/en) y resuelve `IFOOD *PEDIDO`,
> `PIX RECEBIDO` o `CONTA DE LUZ ENEL`, que es lo que exige
> [ADR-0009](../frontend/docs/adr/0009-multi-idioma.md).

### Qué falta para que el modelo tome el relevo

1. **Un M1 de texto**: `TfidfVectorizer(word 1-2gram + char_wb 3-5gram)` sobre la
   descripción, entrenado con los tres idiomas mezclados. El `char_wb` es lo que
   captura raíces compartidas entre lenguas romances (`supermerc-`, `farmac-`);
   sin él, el modelo multilingüe no funciona.
2. Que **la descripción sea su única feature obligatoria** (el `valor`, opcional).
3. **Etiquetas = los 12 slugs** de
   [`TAXONOMIA.md`](../frontend/docs/datos/TAXONOMIA.md), en `snake_case` y sin
   acentos.
4. **M2 sobre los 8 ratios**, no sobre montos.
5. `predict_proba` calibrado, porque `confianza` es parte del contrato.

Cuando llegue, se cambia la carga en `app/inferencia.py` y **el resto del
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
  "modelo_version": "0.1.0",
  "resultados": [
    { "id": "t1", "categoria": "alimentacion", "confianza": 0.6,  "origen": "baseline" },
    { "id": "t2", "categoria": "salud",        "confianza": 0.64, "origen": "modelo"   }
  ]
}
```

`origen` es **aditivo** sobre el contrato: Spring puede ignorarlo sin romperse.

---

## Desarrollo

```bash
# Con el stack completo (lo normal)
./ops/stack.ps1 arriba          # o ./ops/stack.sh arriba

# Suelto, en contenedor - que es como corre de verdad
podman build -t fintechvital-ml:dev ml/
podman run --rm -p 8000:8000 fintechvital-ml:dev

# Tests (26)
podman run --rm -v "$PWD/ml:/src:ro" -w /src fintechvital-ml:dev \
  sh -c "pip install -q pytest httpx && python -m pytest tests/ -q"
```

Los tests **no miden la calidad del modelo** (eso es del notebook de Data
Science): comprueban que la costura con Spring se respeta — que los slugs son
los del proyecto, que la forma del JSON es la del contrato y que las
descripciones de los tres idiomas no caen en `otros`.

> `test_el_mapa_cubre_todas_las_clases_del_modelo` falla **a propósito** si Data
> Science renombra una clase. Es la red que evita que el servicio empiece a
> devolver `otros` en silencio tras una entrega nueva.

## Estructura

```
ml/
  app/
    main.py        FastAPI: rutas, errores con la forma del contrato, auth interna
    inferencia.py  Carga de los .pkl y adaptacion  <- LEER LA CABECERA
    taxonomia.py   Los 12+3 slugs, el mapa desde las etiquetas de DS, el baseline
    esquemas.py    Pydantic: entrada y salida del contrato
  artefactos/      Los .pkl tal como los entrego Data Science
  tests/
```

Los `.pkl` vienen de la rama `data-science`, carpeta
`Data science/Modelo clasificador/`. Se copian aquí a propósito en vez de
referenciarlos: la imagen tiene que ser reproducible sin depender de otra rama.
