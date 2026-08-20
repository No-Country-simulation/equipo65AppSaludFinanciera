# ADR-0006 - Dataset sintético generado por el equipo

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13

## Contexto

El enunciado es explícito: *"Cada equipo deberá construir su propio conjunto de
datos financieros"*, y permite obtenerlos de fuentes públicas, generarlos por
simulación, o construirlos a mano.

Necesitamos etiquetas para **dos** modelos:

- **M1**: descripción de transacción → categoría (12 clases).
- **M2**: indicadores financieros → perfil (3 clases).

El problema: **no existe un dataset público con etiquetas de "perfil financiero"**.
Esa etiqueta hay que inventarla de todos modos, venga de donde venga el dataset.

## Decisión

**Generación sintética por el equipo** (`ml/dataset/generar.py`), con arquetipos de
usuario, comercios reales de LatAm, y **ruido deliberado**.

**Más un set de validación de ~300 transacciones escritas a mano**, fuera del
generador, que es el único número que mide generalización real y se reporta
siempre por separado.

## Alternativas consideradas

**Solo fuentes públicas (Kaggle).** Más creíble a primera vista. Descartada: los
datasets de transacciones bancarias públicos están en **inglés**, con comercios de
EE.UU., y -lo decisivo- **no traen etiqueta de perfil financiero**. Habría que
inventarla igual, con lo cual se hereda el mismo problema de circularidad *y* se
pierde el control del balance de clases. Sumado a las licencias por revisar.

**Mixto: base pública + aumento sintético.** Es la opción intermedia y la más
defendible ante un jurado. Descartada por tiempo: traducir descripciones,
mapear categorías de otro esquema al nuestro y limpiar es **trabajo de días** que
las 2 personas de DS necesitan para modelar y para el notebook, que es el
entregable evaluado. *(Si sobra tiempo en la S4, se puede sumar una fuente pública
al set de validación - está en el ROADMAP.)*

## Consecuencias

**A favor:**

- **Control total del balance de clases** (~30/40/30 en perfiles), que es
  justamente lo que suele arruinar un clasificador entrenado con datos reales.
- **Cero PII, cero licencias**, cero riesgo legal.
- Multi-moneda y comercios locales reales desde el diseño.
- Reproducible con semilla fija.
- Las DS pueden **empezar hoy**, sin esperar a conseguir datos.

**En contra - y esto hay que mirarlo de frente:**

> **El riesgo real: circularidad.** Si generamos los datos con una regla y
> entrenamos un modelo con esos datos, el modelo aprende nuestra regla y saca
> F1 ≈ 0.99. **Eso no demuestra absolutamente nada**, y es la primera pregunta que
> va a hacer un jurado técnico.

Se mitiga con cuatro cosas concretas (detalle en
[`../datos/DATASET.md`](../datos/DATASET.md) §1):

1. **Ruido de etiqueta (~8%)** y ambigüedad genuina en las descripciones. El techo
   de rendimiento deja de ser 1.00.
2. **Baselines honestos**: el clasificador por keywords para M1, la regla
   determinista para M2. Si el modelo no les gana, se dice.
3. **El set de validación manual**, escrito por personas que no construyeron el
   generador. Es el único número que mide generalización de verdad.
4. **Decir la verdad en el notebook.** *"Los datos son sintéticos; en el set manual
   el macro-F1 baja de 0.94 a 0.87"* es una frase que **suma** credibilidad.

**El otro riesgo, más sutil**: el generador tiene un sesgo - el de quien lo
escribió. Si quien lo escribe cree que "los sobreendeudados gastan mucho en
entretenimiento", el modelo va a aprender exactamente eso, sea cierto o no. Por eso
el set manual **lo escriben otras personas** del equipo.
