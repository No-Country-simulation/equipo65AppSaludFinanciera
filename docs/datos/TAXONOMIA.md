# TAXONOMÍA - categorías, perfiles e indicadores

> ⚠️ **Ya NO está congelada, pero sigue siendo el catálogo VIGENTE.** El
> catálogo lo manda data science y la base de datos se adapta (ver
> [`../../../db/README.md`](../../db/README.md)); este documento describe lo
> que rige hoy, no una lista inmutable.
>
> Lo que **no** cambió es por qué importa: estos slugs son **idénticos en las 4
> capas** — notebooks de DS, servicio FastAPI, Spring Boot, PostgreSQL y el
> frontend. Un slug mal escrito en una capa rompe la demo y es de los bugs más
> difíciles de ver ("¿por qué el gráfico muestra una barra vacía?"). **Cambiar
> uno rompe cuatro capas a la vez, así que se avisa al equipo.**
>
> **Regla**: `snake_case`, **sin acentos**, sin espacios, en singular.
> Las etiquetas legibles (con acentos, mayúsculas y **en 3 idiomas**) son **solo
> para la UI** y vienen del endpoint `GET /api/v1/categorias`. **El frontend no las
> hardcodea, y mucho menos las traduce por su cuenta.**
>
> 🌎 **El proyecto es trilingüe**: `es` · `pt` · `en` ([ADR-0009](../adr/0009-multi-idioma.md)).
> **Los slugs NO se traducen nunca** - son los mismos en las tres. Lo que se traduce
> son las etiquetas (§1.1), los perfiles (§2) y los textos de las recomendaciones (§4).

## §1 Categorías de transacción (12) {#categorias}

| # | Slug (canónico) | Tipo | Qué incluye |
|---|---|---|---|
| 1 | `alimentacion` | gasto | Supermercado, restaurantes, delivery, cafés, panadería |
| 2 | `transporte` | gasto | Combustible, transporte público, apps de movilidad, peajes, estacionamiento, mantenimiento del auto |
| 3 | `vivienda` | gasto | Alquiler, hipoteca, expensas, mantenimiento, muebles |
| 4 | `servicios` | gasto | Luz, gas, agua, internet, telefonía, cable |
| 5 | `salud` | gasto | Farmacia, consultas, estudios, seguro médico, óptica, dentista |
| 6 | `educacion` | gasto | Colegiatura, cursos, libros, material de estudio, plataformas educativas |
| 7 | `entretenimiento` | gasto | Streaming, cine, bares, videojuegos, eventos, viajes de ocio, gimnasio |
| 8 | `compras` | gasto | Ropa, calzado, electrónica, hogar, regalos, e-commerce genérico |
| 9 | `finanzas` | gasto | Pago de deuda, préstamos, intereses, comisiones bancarias, seguros, impuestos |
| 10 | `ahorro_inversion` | movimiento | Transferencias a ahorro, plazo fijo, inversiones, fondos, cripto |
| 11 | `ingresos` | ingreso | Salario, freelance, ventas, rentas, reintegros |
| 12 | `otros` | gasto | **Comodín**: no clasificable, o confianza del modelo < 0.40 (RN6) |

### §1.1 Etiquetas por idioma {#etiquetas}

Viven en la tabla `categoria_i18n` (12 × 3 = 36 filas), sembrada por migración.
Las sirve `GET /api/v1/categorias` según el `Accept-Language`.

| Slug | 🇪🇸 `es` | 🇧🇷 `pt` | 🇺🇸 `en` |
|---|---|---|---|
| `alimentacion` | Alimentación | Alimentação | Food |
| `transporte` | Transporte | Transporte | Transport |
| `vivienda` | Vivienda | Moradia | Housing |
| `servicios` | Servicios | Contas e serviços | Utilities |
| `salud` | Salud | Saúde | Health |
| `educacion` | Educación | Educação | Education |
| `entretenimiento` | Entretenimiento | Entretenimento | Entertainment |
| `compras` | Compras | Compras | Shopping |
| `finanzas` | Finanzas | Finanças | Finance |
| `ahorro_inversion` | Ahorro e inversión | Poupança e investimento | Savings & investment |
| `ingresos` | Ingresos | Receitas | Income |
| `otros` | Otros | Outros | Other |

> ⚠️ **Las traducciones al portugués las tiene que revisar alguien que lo hable**
> (pendiente en `PENDIENTES_ANGEL`). Un portugués que se nota traducido con Google
> ante un jurado brasileño es **peor que no tener portugués**. Ojo especialmente con
> `servicios` → en Brasil "contas" (facturas) es lo natural, no "serviços".

**Notas que evitan discusiones más tarde:**

- El enunciado del hackathon lista *"Ocio"*, pero su propio ejemplo de salida usa
  la clave `entretenimiento`. **Ganamos consistencia con el ejemplo**: el slug es
  `entretenimiento`. El enunciado permite explícitamente *"otras categorías
  definidas por el equipo"*.
- `otros` es la **única** categoría de escape. Si el modelo duda, cae ahí - nunca
  devuelve `null` ni una categoría inventada.
- `ahorro_inversion` **no es un gasto**: sale de la cuenta pero no se consume.
  Por eso tiene tipo `movimiento` y **se excluye del `gasto_total`** (ver §3). Es
  un error de diseño clásico contar el ahorro como gasto: penalizaría al usuario
  justamente por ahorrar.
- `finanzas` **sí es gasto** (el interés y las comisiones son dinero que se va).

### Agrupaciones (las usan los indicadores)

```
ESENCIAL      = alimentacion + vivienda + servicios + salud + transporte
DISCRECIONAL  = entretenimiento + compras
FINANCIERO    = finanzas
NO_GASTO      = ahorro_inversion + ingresos
GASTO_TOTAL   = ESENCIAL + DISCRECIONAL + FINANCIERO + educacion + otros
```

> `educacion` queda **fuera** de ESENCIAL y de DISCRECIONAL a propósito: es una
> inversión en capital humano y meterla en cualquiera de los dos sesga el
> diagnóstico. Cuenta en `GASTO_TOTAL` pero no en los dos ratios.

## §2 Perfiles financieros (3) {#perfiles}

| Slug (canónico) | Color UI | Significado |
|---|---|---|
| `saludable` | verde | Ahorra con consistencia, deuda baja, gasto bajo control. |
| `en_observacion` | ámbar | Se sostiene, pero hay señales de alerta (ahorro fino, deuda creciente o gasto concentrado). |
| `en_riesgo` | rojo | Gasta más de lo que ingresa, o la deuda es insostenible, o no ahorra nada. |

**Etiquetas por idioma:**

| Slug | 🇪🇸 `es` | 🇧🇷 `pt` | 🇺🇸 `en` |
|---|---|---|---|
| `saludable` | Saludable | Saudável | Healthy |
| `en_observacion` | En observación | Em observação | Under observation |
| `en_riesgo` | En riesgo | Em risco | At risk |

> ⚠️ `perfil_financiero` en la respuesta de la API es **la etiqueta legible en el
> idioma pedido** (`"En observación"` / `"Em observação"` / `"Under observation"`),
> porque así lo muestra el enunciado. `perfil_codigo` es el **slug estable**.
> **BD, modelo y frontend usan SIEMPRE el slug**; la etiqueta es solo presentación.

### Reglas de etiquetado del dataset (heurística de referencia)

El dataset sintético necesita una etiqueta de perfil. Se genera con esta regla, y
**el modelo M2 aprende de ella pero no la copia** (aprende las zonas grises y las
interacciones entre indicadores que una regla rígida no captura).

```
en_riesgo        si  tasa_ahorro < 0        (gasta mas de lo que ingresa)
                 o   ratio_endeudamiento > 0.40
                 o   (frecuencia_ahorro_num == 0 y ratio_gasto_ingreso > 0.95)

saludable        si  tasa_ahorro >= 0.20
                 y   ratio_endeudamiento <= 0.20
                 y   frecuencia_ahorro_num >= 2

en_observacion   en cualquier otro caso     (la mayoria)
```

+ **ruido controlado (~8% de las filas)**: se voltea la etiqueta a la clase
vecina. Sin ruido, el modelo aprendería la regla exacta y sacaría F1 = 1.00, que
es una señal de que el problema está mal planteado - y un jurado técnico lo nota.
Ver [`DATASET.md`](DATASET.md) §5.

## §3 Indicadores (8) {#indicadores}

**Los calcula Spring Boot**, no el ML (ver [`../arquitectura/CONTRATO_MODELO.md`](../arquitectura/CONTRATO_MODELO.md) §1).
Son las **8 features del modelo M2**, en este orden.

Todos los montos ya vienen **normalizados a la moneda principal del usuario**
(RN5), así que los ratios son adimensionales y **la moneda se cancela sola** -
por eso el modelo funciona igual con pesos, dólares o guaraníes.

| # | Indicador | Fórmula | Rango | Interpretación |
|---|---|---|---|---|
| 1 | `tasa_ahorro` | `(ingreso_mensual - GASTO_TOTAL) / ingreso_mensual` | `(-∞, 1]` | Cuánto le sobra. **Negativo = gasta más de lo que gana.** |
| 2 | `ratio_endeudamiento` | `nivel_endeudamiento / 100` | `[0, 1]` | Lo informa el usuario (0-100 en la API). |
| 3 | `ratio_gasto_ingreso` | `GASTO_TOTAL / ingreso_mensual` | `[0, ∞)` | `> 1` = déficit. |
| 4 | `ratio_gasto_esencial` | `ESENCIAL / ingreso_mensual` | `[0, ∞)` | Cuánto se va en lo que no se puede recortar. |
| 5 | `ratio_gasto_discrecional` | `DISCRECIONAL / ingreso_mensual` | `[0, ∞)` | Cuánto se va en lo recortable. |
| 6 | `concentracion_gasto` | `max(gasto_por_categoria) / GASTO_TOTAL` | `[0, 1]` | `> 0.5` = todo el gasto en una sola cosa. |
| 7 | `frecuencia_ahorro_num` | `{nula:0, baja:1, media:2, alta:3}` | `{0,1,2,3}` | Lo informa el usuario (string en la API → int aquí). |
| 8 | `ratio_recurrente` | `GASTO_RECURRENTE / GASTO_TOTAL` | `[0, 1]` | Suscripciones y débitos automáticos. Ver nota. |

**Casos borde (obligatorio implementarlos así):**

- `ingreso_mensual = 0` → **no se calcula nada**: la API devuelve `422` (RN7).
  Nunca dividir por cero.
- `GASTO_TOTAL = 0` (usuario sin gastos) → `concentracion_gasto = 0`,
  `ratio_recurrente = 0`, `tasa_ahorro = 1`.
- Todos los ratios se **redondean a 3 decimales** antes de mandarlos al ML. Si
  Spring manda 15 decimales y el notebook entrenó con 3, hay *skew* de features.
- `tasa_ahorro` se **acota a `[-2, 1]`** antes de mandarla (un outlier de -47 por
  un ingreso mal cargado envenena la predicción).

**Nota sobre `ratio_recurrente`**: en v1.0 un gasto es "recurrente" si su
descripción normalizada aparece **≥ 2 veces** en el período analizado con montos
similares (±10%). Es una heurística de Spring, no un modelo. Suficiente para el
MVP; detectar suscripciones de verdad es un problema aparte (ver ROADMAP).

## §4 Motor de reglas → recomendaciones

**Vive en Spring Boot.** Determinista, auditable, explicable. **No es un LLM** -
ver [`../adr/0007-recomendaciones-por-reglas.md`](../adr/0007-recomendaciones-por-reglas.md).

Se evalúan todas; se devuelven **máximo 5**, ordenadas por prioridad (RN8).

> 🌎 **La regla NO produce texto: produce un `codigo` + `parametros`.** El texto se
> renderiza desde un *resource bundle* (`recomendaciones_{es,pt,en}.properties`) con
> el `Accept-Language` de la petición. **Nunca se hardcodea una frase en el motor de
> reglas** - si no, agregar portugués obligaría a tocar la lógica de negocio.

| Código | Condición | Prioridad | Parámetros |
|---|---|---|---|
| `REC_DATOS_PARCIALES` | `ratio_gasto_ingreso < 0.30` | **alta** | `{pct}` |
| `REC_DEFICIT` | `tasa_ahorro < 0` | **alta** | - |
| `REC_DEUDA_ALTA` | `ratio_endeudamiento > 0.40` | **alta** | - |
| `REC_AHORRO_BAJO` | `0 <= tasa_ahorro < 0.10` | **alta** | - |
| `REC_SIN_AHORRO` | `frecuencia_ahorro_num == 0` | **alta** | - |
| `REC_ESENCIAL_ALTO` | `ratio_gasto_esencial > 0.60` | media | - |
| `REC_DISCRECIONAL_ALTO` | `ratio_gasto_discrecional > 0.30` | media | - |
| `REC_CONCENTRACION` | `concentracion_gasto > 0.50` | media | `{categoria}` |
| `REC_RECURRENTE_ALTO` | `ratio_recurrente > 0.15` | media | - |
| `REC_CATEGORIA_EXCESO` | `gasto_categoria / ingreso > umbral(categoria)` | media | `{categoria}` (máx 2) |
| `REC_CONSOLIDA` | `tasa_ahorro >= 0.20 y ratio_endeudamiento <= 0.20` | baja | - |

### Textos por idioma

`{categoria}` se interpola con la **etiqueta traducida** de §1.1, no con el slug.

| Código | 🇪🇸 `es` |
|---|---|
| `REC_DATOS_PARCIALES` | Los gastos registrados cubren solo el {pct}% de tu ingreso: carga mas transacciones para un analisis mas preciso |
| `REC_DEFICIT` | Tus gastos superan tus ingresos: revisa los gastos no esenciales este mes |
| `REC_DEUDA_ALTA` | Tu nivel de endeudamiento es alto: prioriza reducir la deuda antes de nuevos gastos |
| `REC_AHORRO_BAJO` | Aumentar la reserva financiera mensual |
| `REC_SIN_AHORRO` | Establecer un ahorro automatico mensual, aunque sea un monto pequeno |
| `REC_ESENCIAL_ALTO` | Tus gastos esenciales consumen mas del 60% de tu ingreso: hay poco margen ante un imprevisto |
| `REC_DISCRECIONAL_ALTO` | Reducir los gastos en entretenimiento y compras liberaria margen de ahorro |
| `REC_CONCENTRACION` | Mas de la mitad de tu gasto esta en la categoria {categoria}: revisa si es sostenible |
| `REC_RECURRENTE_ALTO` | Monitorear los gastos recurrentes de entretenimiento |
| `REC_CATEGORIA_EXCESO` | Reducir los gastos en {categoria} |
| `REC_CONSOLIDA` | Buen manejo: considera invertir el excedente en lugar de dejarlo inmovilizado |

| Código | 🇧🇷 `pt` |
|---|---|
| `REC_DATOS_PARCIALES` | As despesas registradas cobrem apenas {pct}% da sua renda: adicione mais transações para uma análise mais precisa |
| `REC_DEFICIT` | Suas despesas superam sua renda: revise os gastos não essenciais deste mês |
| `REC_DEUDA_ALTA` | Seu nível de endividamento está alto: priorize reduzir a dívida antes de novos gastos |
| `REC_AHORRO_BAJO` | Aumente sua reserva financeira mensal |
| `REC_SIN_AHORRO` | Estabeleça uma poupança automática mensal, mesmo que seja um valor pequeno |
| `REC_ESENCIAL_ALTO` | Suas despesas essenciais consomem mais de 60% da sua renda: há pouca margem para imprevistos |
| `REC_DISCRECIONAL_ALTO` | Reduzir gastos com entretenimento e compras liberaria margem para poupar |
| `REC_CONCENTRACION` | Mais da metade dos seus gastos está na categoria {categoria}: avalie se é sustentável |
| `REC_RECURRENTE_ALTO` | Monitore os gastos recorrentes com assinaturas |
| `REC_CATEGORIA_EXCESO` | Reduzir os gastos com {categoria} |
| `REC_CONSOLIDA` | Boa gestão: considere investir o excedente em vez de deixá-lo parado |

| Código | 🇺🇸 `en` |
|---|---|
| `REC_DATOS_PARCIALES` | Your recorded expenses cover only {pct}% of your income: add more transactions for a more accurate analysis |
| `REC_DEFICIT` | Your expenses exceed your income: review non-essential spending this month |
| `REC_DEUDA_ALTA` | Your debt level is high: prioritize paying it down before taking on new expenses |
| `REC_AHORRO_BAJO` | Increase your monthly financial reserve |
| `REC_SIN_AHORRO` | Set up an automatic monthly savings transfer, even if it is a small amount |
| `REC_ESENCIAL_ALTO` | Essential expenses consume over 60% of your income: little room for the unexpected |
| `REC_DISCRECIONAL_ALTO` | Cutting entertainment and shopping would free up room to save |
| `REC_CONCENTRACION` | More than half of your spending is in {categoria}: consider whether it is sustainable |
| `REC_RECURRENTE_ALTO` | Keep an eye on your recurring subscription costs |
| `REC_CATEGORIA_EXCESO` | Reduce spending on {categoria} |
| `REC_CONSOLIDA` | Well managed: consider investing the surplus instead of leaving it idle |

> ⚠️ **El portugués de esta tabla lo escribió el equipo, no un nativo.**
> **Hay que hacerlo revisar** (pendiente D17). Ver [ADR-0009](../adr/0009-multi-idioma.md).

**Umbrales por categoría** (`umbral(categoria)`, fracción del ingreso):

| Categoría | Umbral | | Categoría | Umbral |
|---|---|---|---|---|
| `alimentacion` | 0.35 | | `entretenimiento` | 0.15 |
| `vivienda` | 0.35 | | `compras` | 0.15 |
| `transporte` | 0.20 | | `finanzas` | 0.20 |
| `servicios` | 0.15 | | `educacion` | 0.25 |
| `salud` | 0.20 | | `otros` | 0.10 |

> Estos umbrales son un punto de partida razonable (basados en reglas comunes de
> presupuesto tipo 50/30/20), **no son ciencia**. Se ajustan con la distribución
> real del dataset en la S2 y se documenta el porqué en el notebook. Están aquí
> para que backend pueda implementar el motor **hoy**, sin esperar a DS.

## §5 Frecuencia de ahorro

| API (string, case-insensitive) | Slug BD | `frecuencia_ahorro_num` |
|---|---|---|
| `Nula` | `nula` | 0 |
| `Baja` | `baja` | 1 |
| `Media` | `media` | 2 |
| `Alta` | `alta` | 3 |

## §6 Monedas soportadas (v1.0)

`USD` · `MXN` · `ARS` · `COP` · `CLP` · `PEN` · `BRL` · `EUR`

Moneda base de normalización interna: **`USD`**. Tasas cacheadas en la tabla
`tasa_cambio` (ver [`../arquitectura/DATOS.md`](../arquitectura/DATOS.md)),
refrescadas por un job cada 6 h desde una API externa. Si la API falla, **quedan
las últimas tasas vigentes** - la demo nunca se cae por un tercero.
