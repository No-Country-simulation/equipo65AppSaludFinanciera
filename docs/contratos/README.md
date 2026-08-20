# Tests de contrato

[`casos.json`](casos.json) es un archivo de casos pensado para que **los dos lados**
de la costura DS↔Backend ejecutaran los mismos: 34 transacciones reales de los tres
mercados con su categoría esperada, los 3 ejemplos del enunciado con sus indicadores
ya calculados, y los invariantes que debe cumplir toda respuesta.

> ⚠️ **Estado real (2026-08-20): el archivo existe y NADIE lo ejecuta.**
>
> Se diseñó un arnés en los dos lados (`ml/tests/test_contrato.py` en pytest y
> `ContratoMlTest.java` en JUnit) y **ninguno de los dos llegó a escribirse**. Hoy
> `casos.json` solo aparece citado en documentación. Tampoco hay CI que lo corra.
>
> **Lo que sí existe y sí se ejecuta**:
>
> | Qué | Dónde | Cubre |
> |---|---|---|
> | 17 tests del servicio de inferencia | `ml/tests/test_servicio.py` | Que la forma del JSON y los slugs son los del contrato |
> | 35 casos de contrato de la API | `frontend/e2e/contrato.mjs` | La API real de punta a punta |
> | 54 comprobaciones funcionales | `ops/ejemplos.mjs` | Los 3 ejemplos del enunciado, **contra producción** |
>
> Entre los tres cubren buena parte de lo que este archivo perseguía, pero **por
> caminos distintos y sin compartir los casos**. Cablear `casos.json` a un test de
> verdad sigue siendo trabajo pendiente y barato: el archivo ya está escrito.

**Por qué se pensó así**: era lo que garantizaba que el stub y el servicio real
fueran **intercambiables**. El backend construyó semanas contra un stub (`ml-fake`,
que ya no está en el repositorio); el día de la integración se cambió `ML_URL` y
funcionó a la primera — pero eso se comprobó a mano, no con estos casos.

> Un contrato que solo vive en un `.md` **se rompe en silencio**.

## Qué verifica

| Bloque | Qué |
|---|---|
| `clasificar.casos_{es,pt,en}` | **34 transacciones reales** de los 3 mercados → su categoría esperada |
| `clasificar.casos_borde` | Texto no clasificable → `otros` (RN6) |
| `clasificar.invalidos` | Entradas rotas → `422` |
| `perfil.casos` | Los **3 ejemplos** de [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md), con los indicadores ya calculados |
| `invariantes` | Lo que se verifica en **toda** respuesta (categorías siempre de las 12, probabilidades suman 1…) |

## 🇧🇷 Los casos en portugués no son opcionales

`casos_pt` incluye `IFOOD *PEDIDO`, `PIX RECEBIDO SALARIO`, `CONTA DE LUZ ENEL`,
`MAGAZINE LUIZA`. **Buena parte del jurado es de Brasil.**

Si el modelo devuelve `otros` ante `IFOOD`, eso **tiene que fallar en una prueba**
semanas antes de la demo, no durante. Es exactamente el trabajo que haría este
archivo si estuviera cableado. Mientras tanto, el caso está cubierto de otra forma:
el dataset de M1 se entrena en los tres idiomas y `ml/README.md` reporta la
**macro-F1 por idioma**. Ver [ADR-0009](../adr/0009-multi-idioma.md).

## Reglas

1. **Cambiar `casos.json` = cambiar el contrato** → requiere ADR y avisar al equipo.
2. **Al agregar un caso, se agrega una sola vez.** Es un archivo compartido: cuando
   se cablee, los dos lados lo leen del mismo sitio.
3. ~~El stub debe pasar los mismos casos que el real~~ — el stub ya no existe: el
   servicio real está en uso desde 2026-08-07.

## Nota sobre el modelo real y la confianza

Los casos de `clasificar` afirman la **categoría**, no la confianza exacta (que
depende del entrenamiento). La confianza solo se valida como invariante: está en
`[0,1]`, y si es `< 0.40` la categoría tiene que ser `otros`.
