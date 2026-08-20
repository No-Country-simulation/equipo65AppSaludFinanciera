# Los 3 ejemplos reales de uso

> ✅ **Verificados contra PRODUCCIÓN el 2026-08-20**: `ops/ejemplos.mjs` pasa
> **54/54** comprobaciones contra <https://api.fintechvital.com>. (La primera
> verificación fue el 2026-08-07, contra el stack local.) Las salidas de abajo
> son las que devuelve el sistema, no predicciones.
>
> Para volver a comprobarlo, sin instalar nada más que Node:
>
> ```bash
> FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs
> ```
>
> O contra tu máquina, con `./ops/stack.sh arriba` levantado y sin `FV_API_URL`.

**Requisito mínimo #8 del enunciado**: *"Mínimo de tres ejemplos reales de uso"*.

Estos 3 casos son **entregable evaluado** y además el **smoke test** del proyecto:
están automatizados en `scripts/ejemplos.sh` y se ejecutan en cada release. Los
números de este doc son la **fuente de verdad**: si el sistema devuelve otra cosa,
o hay un bug, o hay que actualizar este doc a propósito.

Todos los valores están calculados a mano con las fórmulas de
[`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md) §3 y §4.

---

## Ejemplo 1 - El caso literal del enunciado (perfil: **Saludable**)

Es el `curl` que el jurado va a copiar y pegar. **Tiene que funcionar sí o sí.**

```bash
curl -X POST http://localhost:8080/api/v1/analisis-financiero \
  -H "Content-Type: application/json" \
  -d '{
    "ingreso_mensual": 4500,
    "nivel_endeudamiento": 25,
    "frecuencia_ahorro": "Media",
    "transacciones": [
      { "descripcion": "Supermercado", "valor": 420 },
      { "descripcion": "Combustible",  "valor": 300 },
      { "descripcion": "Streaming",    "valor": 40 }
    ]
  }'
```

**Indicadores calculados:**

| Indicador | Valor | Cómo |
|---|---|---|
| `tasa_ahorro` | `0.831` | `(4500 - 760) / 4500` |
| `ratio_endeudamiento` | `0.250` | `25 / 100` |
| `ratio_gasto_ingreso` | `0.169` | `760 / 4500` |
| `ratio_gasto_esencial` | `0.160` | `(420 + 300) / 4500` |
| `ratio_gasto_discrecional` | `0.009` | `40 / 4500` |
| `concentracion_gasto` | `0.553` | `420 / 760` |
| `frecuencia_ahorro_num` | `2` | Media |
| `ratio_recurrente` | `0.000` | Ninguna descripcion se repite (TAXONOMIA §3 exige ≥ 2 veces) |

**Perfil**: `saludable`, con probabilidad **0.875**.

> ⚠️ **Verificado contra la API el 2026-08-07.** Este doc predecía
> `en_observacion`, que es lo que devuelve la *regla determinista* (el
> endeudamiento de 0.25 supera su umbral de 0.20). Pero el perfil lo decide
> **M2**, y con una tasa de ahorro del 83% y deuda moderada responde
> `saludable`.
>
> **Cómo se defiende ante el jurado**: es coherente con los datos recibidos —
> esta persona gasta el 17% de su ingreso. Y el sistema **no lo oculta**: la
> primera recomendación avisa de que los datos están incompletos.
>
> 🔸 **Decisión pendiente de producto**: se puede discutir si con
> `REC_DATOS_PARCIALES` activa conviene topar el perfil en `en_observacion`, para
> no felicitar a alguien que simplemente no cargó sus gastos. Hoy **no** se topa:
> sería una regla de negocio nueva que no está en TAXONOMIA.

**Reglas que disparan**: `REC_DATOS_PARCIALES` (alta) + `REC_CONCENTRACION` (media).

> ### ⚠️ Discrepancia con el enunciado - importante, y hay que saber defenderla
>
> El enunciado muestra como salida esperada estas dos recomendaciones:
> *"Monitorear los gastos recurrentes de entretenimiento"* y *"Aumentar la reserva
> financiera mensual"*.
>
> **Con esta entrada, nuestro sistema NO las genera, y tiene razón**: 3
> transacciones que suman 760 sobre un ingreso de 4.500 implican una tasa de ahorro
> del **83%**. Decirle a esa persona que "aumente su reserva financiera" sería
> incorrecto. El ejemplo del enunciado es **ilustrativo del formato**, no un caso
> internamente consistente.
>
> **Nuestra respuesta es mejor**: detectamos que los datos están incompletos
> (`REC_DATOS_PARCIALES`) y lo decimos, en vez de fingir un diagnóstico sobre el
> 17% del ingreso. Esto **hay que mencionarlo en la presentación** - es un punto a
> favor, no un incumplimiento: el formato de salida cumple exactamente lo pedido
> (`perfil_financiero`, `probabilidad`, `resumen_gastos`, `recomendaciones`).

**Respuesta esperada** (probabilidades sujetas al modelo entrenado):

```json
{
  "perfil_financiero": "Saludable",
  "probabilidad": 0.875,
  "resumen_gastos": {
    "alimentacion": 420,
    "transporte": 300,
    "entretenimiento": 40
  },
  "recomendaciones": [
    "Los gastos registrados cubren solo el 17% de tu ingreso: carga mas transacciones para un analisis mas preciso",
    "Mas de la mitad de tu gasto esta en la categoria Alimentación: revisa si es sostenible"
  ],
  "perfil_codigo": "saludable",
  "indicadores": {
    "tasa_ahorro": 0.831,
    "ratio_endeudamiento": 0.25,
    "ratio_gasto_ingreso": 0.169,
    "ratio_gasto_esencial": 0.16,
    "ratio_gasto_discrecional": 0.009,
    "concentracion_gasto": 0.553,
    "frecuencia_ahorro_num": 2,
    "ratio_recurrente": 0.0
  },
  "transacciones_clasificadas": [
    { "descripcion": "Supermercado", "valor": 420, "categoria": "alimentacion",    "confianza": 0.97, "origen": "modelo" },
    { "descripcion": "Combustible",  "valor": 300, "categoria": "transporte",      "confianza": 0.93, "origen": "modelo" },
    { "descripcion": "Streaming",    "valor": 40,  "categoria": "entretenimiento", "confianza": 0.99, "origen": "modelo" }
  ],
  "moneda": "USD",
  "modelo_version": "0.2.0"
}
```

---

## Ejemplo 2 - Mes completo, usuario sobreendeudado (perfil: **En riesgo**)

Un mes real de gastos, con descripciones tal como salen de un extracto bancario.
**Este es el ejemplo que demuestra que el clasificador de texto funciona de verdad.**

```bash
curl -X POST http://localhost:8080/api/v1/analisis-financiero \
  -H "Content-Type: application/json" \
  -d '{
    "ingreso_mensual": 28000,
    "nivel_endeudamiento": 55,
    "frecuencia_ahorro": "Nula",
    "moneda": "MXN",
    "transacciones": [
      { "descripcion": "COMPRA SORIANA HIPER 4821",  "valor": 6200 },
      { "descripcion": "OXXO TIENDA 1832",           "valor": 900 },
      { "descripcion": "UBER *TRIP HELP.UBER.COM",   "valor": 1800 },
      { "descripcion": "GASOLINERA PEMEX 7781",      "valor": 2400 },
      { "descripcion": "RENTA DEPTO JUL",            "valor": 9000 },
      { "descripcion": "DOM. CFE SUMINISTRO",        "valor": 1100 },
      { "descripcion": "TELMEX INTERNET",            "valor": 600 },
      { "descripcion": "FCIA GUADALAJARA SUC 112",   "valor": 800 },
      { "descripcion": "NETFLIX.COM AMSTERDAM",      "valor": 219 },
      { "descripcion": "MERPAGO*SPOTIFY",            "valor": 129 },
      { "descripcion": "CINEPOLIS VIP",              "valor": 450 },
      { "descripcion": "LIVERPOOL DEPTO 22",         "valor": 3200 },
      { "descripcion": "PAGO TC VISA INTERESES",     "valor": 4800 }
    ]
  }'
```

**Clasificación esperada** (13 transacciones, 7 categorías):

| Categoría | Monto | Transacciones |
|---|---|---|
| `vivienda` | 9.000 | Renta |
| `alimentacion` | 7.100 | Soriana, Oxxo |
| `finanzas` | 4.800 | Intereses de tarjeta |
| `transporte` | 4.200 | Uber, Pemex |
| `compras` | 3.200 | Liverpool |
| `servicios` | 1.700 | CFE, Telmex |
| `entretenimiento` | 798 | Netflix, Spotify, Cinépolis |
| `salud` | 800 | Farmacia |
| **Total** | **31.598** | |

**Indicadores:**

| Indicador | Valor | Cómo |
|---|---|---|
| `tasa_ahorro` | **`-0.129`** | `(28000 - 31598) / 28000` = `-0.1285` exacto → **gasta más de lo que gana**. Es un **empate** en el tercer decimal y el backend redondea con `HALF_UP`, o sea alejándose del cero. Este doc decía `-0.128`; lo corrigió `ops/ejemplos.mjs` el 2026-08-19 |
| `ratio_endeudamiento` | `0.550` | Muy por encima del umbral de 0.40 |
| `ratio_gasto_ingreso` | `1.129` | `> 1` = déficit |
| `ratio_gasto_esencial` | `0.814` | El 81% del ingreso en lo irrecortable |
| `ratio_gasto_discrecional` | `0.143` | |
| `concentracion_gasto` | `0.285` | La vivienda es lo más pesado |
| `frecuencia_ahorro_num` | `0` | No ahorra |
| `ratio_recurrente` | `0.000` | Ver la nota de abajo: un mes suelto no tiene repeticiones |

**Perfil**: `en_riesgo` - dispara **tres** condiciones a la vez (`tasa_ahorro < 0`,
`ratio_endeudamiento > 0.40`, y no ahorra).

**Recomendaciones** (4, ordenadas por prioridad):

| Prioridad | Código | Texto |
|---|---|---|
| **alta** | `REC_DEFICIT` | "Tus gastos superan tus ingresos: revisa los gastos no esenciales este mes" |
| **alta** | `REC_DEUDA_ALTA` | "Tu nivel de endeudamiento es alto: prioriza reducir la deuda antes de nuevos gastos" |
| **alta** | `REC_SIN_AHORRO` | "Establecer un ahorro automatico mensual, aunque sea un monto pequeno" |
| media | `REC_ESENCIAL_ALTO` | "Tus gastos esenciales consumen mas del 60% de tu ingreso: hay poco margen ante un imprevisto" |

---

## Ejemplo 3 - Usuario ordenado, con ahorro e inversión (perfil: **Saludable**)

Demuestra dos cosas importantes: que el sistema **no inventa problemas** cuando no
los hay, y que **`ahorro_inversion` NO cuenta como gasto** (si contara,
penalizaríamos a esta persona justamente por ahorrar).

```bash
curl -X POST http://localhost:8080/api/v1/analisis-financiero \
  -H "Content-Type: application/json" \
  -d '{
    "ingreso_mensual": 45000,
    "nivel_endeudamiento": 10,
    "frecuencia_ahorro": "Alta",
    "moneda": "MXN",
    "transacciones": [
      { "descripcion": "COMPRA SORIANA HIPER 4821",     "valor": 5500 },
      { "descripcion": "RESTAURANTE LA CASA DE TONO",   "valor": 1800 },
      { "descripcion": "UBER *TRIP HELP.UBER.COM",      "valor": 900 },
      { "descripcion": "GASOLINERA PEMEX 7781",         "valor": 1600 },
      { "descripcion": "RENTA DEPTO JUL",               "valor": 11000 },
      { "descripcion": "DOM. CFE SUMINISTRO",           "valor": 900 },
      { "descripcion": "TELMEX INTERNET",               "valor": 700 },
      { "descripcion": "FCIA GUADALAJARA SUC 112",      "valor": 400 },
      { "descripcion": "NETFLIX.COM AMSTERDAM",         "valor": 219 },
      { "descripcion": "MERPAGO*SPOTIFY",               "valor": 129 },
      { "descripcion": "SMART FIT MENSUALIDAD",         "valor": 700 },
      { "descripcion": "AMAZON MX MARKETPLACE",         "valor": 1500 },
      { "descripcion": "PLATZI SUSCRIPCION ANUAL",      "valor": 500 },
      { "descripcion": "TRANSF. A INVERSION GBM",       "valor": 9000 }
    ]
  }'
```

**El punto clave**: `TRANSF. A INVERSION GBM` se clasifica como
`ahorro_inversion`, que tiene tipo **`movimiento`**, no `gasto`. Por eso:

```
GASTO_TOTAL = 25.848      (NO incluye los 9.000 de inversion)
```

Si contáramos la inversión como gasto, `GASTO_TOTAL` sería 34.848, la tasa de
ahorro caería de **0.426 a 0.226**, y el diagnóstico se degradaría - **castigando a
alguien por invertir**. Es exactamente el error de diseño que la taxonomía evita.

**Indicadores:**

| Indicador | Valor |
|---|---|
| `tasa_ahorro` | **`0.426`** |
| `ratio_endeudamiento` | `0.100` |
| `ratio_gasto_ingreso` | `0.574` |
| `ratio_gasto_esencial` | `0.507` |
| `ratio_gasto_discrecional` | `0.057` |
| `concentracion_gasto` | `0.426` |
| `frecuencia_ahorro_num` | `3` |
| `ratio_recurrente` | `0.000` | Ver la nota de abajo |

**Perfil**: `saludable` - cumple las tres condiciones (ahorro ≥ 0.20, deuda ≤ 0.20,
frecuencia ≥ 2).

**Recomendaciones**: **una sola.**

| Prioridad | Código | Texto |
|---|---|---|
| baja | `REC_CONSOLIDA` | "Buen manejo: considera invertir el excedente en lugar de dejarlo inmovilizado" |

> **Que devuelva una sola recomendación es correcto, no un bug.** Un sistema que le
> inventa 5 problemas a alguien que hace las cosas bien pierde toda credibilidad. Si
> en la demo alguien pregunta *"¿por qué solo una?"*, la respuesta es: *porque no hay
> nada más que decirle.*

---

## ⚠️ `ratio_recurrente` siempre sale 0 en un análisis de un solo mes

**Verificado en los tres ejemplos.** Este documento predecía valores como `0.053`
o `0.060` asumiendo que Netflix y Spotify cuentan como recurrentes *por lo que
son*. No es así como está definido.

TAXONOMIA §3 lo define como: *"un gasto es recurrente si su descripción
normalizada aparece **≥ 2 veces** en el período analizado con montos similares
(±10%)"*. En un extracto de **un mes**, cada suscripción aparece **una sola
vez** — el cargo de Netflix de julio y el de agosto están en meses distintos.

Consecuencias, y conviene tenerlas presentes:

- El indicador `ratio_recurrente` vale `0.000` en cualquier llamada a
  `POST /analisis-financiero` con un solo período. **El backend lo calcula
  correctamente**: es la heurística la que necesita más de un mes.
- Por lo tanto la regla `REC_RECURRENTE_ALTO` (umbral `> 0.15`) **no puede
  dispararse** desde el endpoint del enunciado. Sí lo hará cuando el análisis
  corra sobre el histórico guardado del usuario, que es donde la repetición
  existe de verdad.

No se ha cambiado nada por esto: el comportamiento es el que especifica la
taxonomía. Queda anotado para que nadie lo lea como un fallo, y como **decisión
pendiente** por si se prefiere detectar suscripciones por catálogo de comercio
en vez de por repetición.

---

## Automatización

Los 3 casos están ejecutables en **[`ops/ejemplos.mjs`](../../ops/ejemplos.mjs)**:

```bash
node ops/ejemplos.mjs                                              # local
FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs   # producción
```

Sin dependencias (Node ≥ 18, `fetch` nativo) y corre igual en Windows y en Linux,
como `frontend/e2e/contrato.mjs`. Sale con código 1 si algo no cuadra, así que
sirve tal cual de smoke test.

**Qué comprueba, y qué no.** Estricto con lo determinista — `resumen_gastos`, los
8 indicadores, la categoría de cada transacción, `perfil_codigo` y los códigos de
recomendación: todo eso sale de las reglas y de la taxonomía. Tolerante con
`probabilidad`, que la decide M2 y cambia al reentrenar; de ella solo se verifica
que esté en `[0,1]` y que corresponda al perfil ganador.

> ✅ **53/54 comprobaciones en verde el 2026-08-19** contra
> `api-staging.fintechvital.com`. La única en rojo era el `-0.128` de arriba, que
> estaba mal **en este documento**: el sistema devolvía el valor correcto.

⚠️ **No corre en CI**: no hay workflows de GitHub Actions en el repositorio
todavía. Por ahora se lanza a mano antes de cada entrega.
