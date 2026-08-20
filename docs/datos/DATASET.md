# DATASET - construcción, versionado y evaluación

El enunciado **obliga a construir el dataset propio**. Elegimos **generación
sintética por el equipo** (ver [`../adr/0006-dataset-sintetico.md`](../adr/0006-dataset-sintetico.md)):
control total del balance de clases, cero PII, cero problemas de licencia.

Responsables: las 2 personas de **Data Science** + la de **Data**.

## §1 La objeción que hay que anticipar

> *"¿Su modelo funciona o solo memorizó las reglas con las que ustedes mismos
> generaron los datos?"*

Es **la primera pregunta que va a hacer un jurado técnico**, y con razón: si se
generan los datos con una regla y se entrena un modelo con esos datos, el modelo
aprende esa regla y saca F1 = 0.99. Eso no demuestra nada.

Nos defendemos con **cuatro cosas concretas**, no con retórica:

1. **Ruido y ambigüedad deliberados** (§5): ~8% de etiquetas volteadas a la clase
   vecina, descripciones ambiguas reales, montos con solapamiento entre perfiles.
   El techo de rendimiento deja de ser 1.00.
2. **Un baseline honesto** (§7): el clasificador por keywords. Si el modelo no le
   gana con claridad, lo decimos.
3. **Un set de validación escrito a mano** (§6): ~300 transacciones que **una
   persona escribió**, no el generador. Es el único test que mide generalización
   de verdad. Se reporta la métrica en ese set **por separado**.
4. **Decir la verdad en el notebook.** "Los datos son sintéticos; el set
   manual mide la generalización real y ahí el macro-F1 baja de 0.94 a 0.87" es
   una frase que **suma** puntos, no que los resta.

## §2 Estructura

```
ml/dataset/
  generar.py            Generador principal (CLI)
  catalogos/
    comercios.yaml      Comercios reales por categoria y por pais
    plantillas.yaml     Plantillas de descripcion (formatos de extracto bancario)
    perfiles.yaml       Arquetipos de usuario (ver §4)
  salida/               Generado, NO se commitea (va en .gitignore)
    transacciones.csv
    usuarios.csv
    metadata.json
  manual/
    validacion_manual.csv   300 transacciones escritas A MANO -> SI se commitea
```

**El CSV generado no se commitea** (pesa, y se regenera con una semilla). **Sí se
commitea el generador y su semilla**, para que sea reproducible, y el set manual.

## §3 Esquema de salida

`transacciones.csv` - para el modelo **M1** (clasificador de transacciones):

| Columna | Tipo | Ejemplo | Nota |
|---|---|---|---|
| `usuario_id` | int | `1042` | FK a `usuarios.csv` |
| `fecha` | date | `2026-06-14` | |
| `descripcion` | string | `COMPRA SORIANA HIPER 4821` | **La única feature de M1** |
| `valor` | decimal | `-1240.50` | Negativo = gasto, positivo = ingreso |
| `moneda` | string | `MXN` | ISO-4217 |
| `categoria` | string | `alimentacion` | **La etiqueta.** Uno de los 12 slugs |
| `es_recurrente` | bool | `false` | Para calcular `ratio_recurrente` |
| `idioma` | string | `es` | 🌎 `es`\|`pt`\|`en`. **Solo para evaluar por idioma** - **M1 NO lo recibe como feature** (lo infiere del texto) |

`usuarios.csv` - para el modelo **M2** (clasificador de perfil):

| Columna | Tipo | Ejemplo |
|---|---|---|
| `usuario_id` | int | `1042` |
| `ingreso_mensual` | decimal | `28000.00` |
| `moneda_principal` | string | `MXN` |
| `nivel_endeudamiento` | int | `35` |
| `frecuencia_ahorro` | string | `baja` |
| `perfil` | string | `en_observacion` |

> El notebook de M2 **no consume `usuarios.csv` directo**: primero calcula los 8
> indicadores agregando `transacciones.csv` por usuario, **con exactamente las
> mismas fórmulas que Spring Boot** ([`TAXONOMIA.md`](TAXONOMIA.md) §3). Esas
> fórmulas viven en `ml/comun/indicadores.py` y hay un **test de paridad** contra
> los valores que produce Spring. Si divergen, el modelo se entrenó con features
> distintas a las que va a recibir en producción - es el bug silencioso más caro
> del proyecto.

## §4 Arquetipos de usuario

El generador no tira números al azar: instancia **arquetipos** con variación.
Esto produce correlaciones realistas entre indicadores (quien tiene deuda alta
suele tener ahorro bajo), que es justo lo que M2 debe aprender.

| Arquetipo | % | Ingreso | Deuda | Ahorro | Patrón de gasto | Perfil dominante |
|---|---|---|---|---|---|---|
| Estudiante | 12% | bajo | baja | nula/baja | educación + transporte + entretenimiento | `en_observacion` |
| Joven profesional | 20% | medio | media | media | entretenimiento + compras altos | `en_observacion` |
| Familia | 25% | medio-alto | media | baja | alimentación + vivienda + educación dominan | `en_observacion` |
| Ahorrador disciplinado | 15% | medio | baja | alta | esencial bajo, `ahorro_inversion` alto | `saludable` |
| Sobreendeudado | 15% | medio-bajo | **alta** | nula | `finanzas` alto (intereses), déficit | `en_riesgo` |
| Alto ingreso | 8% | alto | baja | alta | compras y entretenimiento altos pero % bajo | `saludable` |
| Ingreso irregular (freelance) | 5% | variable | media | baja | ingresos esporádicos, gasto estable | `en_riesgo` / `en_observacion` |

**Balance objetivo de perfiles**: ~30% `saludable`, ~40% `en_observacion`,
~30% `en_riesgo`. Desbalanceado a propósito, pero no brutalmente. Se usa
`class_weight='balanced'` en el entrenamiento y se reporta **macro-F1**, no accuracy.

**Volumen objetivo**: **~2.000 usuarios** × ~30 transacciones/mes × 6 meses
≈ **360.000 transacciones**. Es más que suficiente y entrena en minutos.

## §5 Realismo: qué hace el generador para no ser trivial

Sin esto, el dataset es un juguete. **Cada punto de esta lista es una defensa ante
el jurado.**

1. **Descripciones con formato de extracto bancario real**, no `"Supermercado"`:
   ```text
   COMPRA SORIANA HIPER 4821       PAGO TC VISA ****3312
   UBER   *TRIP HELP.UBER.COM      NETFLIX.COM      AMSTERDAM
   MERPAGO*SPOTIFY                 DOM. CFE SUMINISTRO
   FCIA GUADALAJARA SUC 112        TRANSF. RECIBIDA NOMINA
   ```
   Ruido real: mayúsculas, códigos de sucursal, asteriscos, abreviaturas,
   truncamientos, prefijos de pasarela (`MERPAGO*`, `PAYU*`, `DLO*`).
2. **Ambigüedad genuina**: `"OXXO"` puede ser `alimentacion` o `servicios` (ahí se
   paga la luz). `"MERCADOPAGO"` puede ser cualquier cosa. Estos casos se etiquetan
   con la categoría **mayoritaria real**, y el modelo va a fallar en algunos -
   **está bien**, eso es lo que pasa en producción.
3. 🌎 **TRES IDIOMAS Y TRES MERCADOS** (ver §5.1 - es lo más importante de esta lista).
4. **Estacionalidad por mercado**: aguinaldo en diciembre (MX) y **13º salário** en
   noviembre/diciembre (BR); regreso a clases en agosto (MX) y en **febrero** (BR);
   gasto alto en diciembre en los tres.
5. **Recurrencia**: las suscripciones (`es_recurrente = true`) aparecen el mismo
   día de cada mes con el mismo monto ±2%.
6. **Ruido de etiqueta (~8%)**: se voltea la etiqueta de perfil a la clase vecina
   (`saludable ↔ en_observacion ↔ en_riesgo`, nunca de `saludable` a `en_riesgo`).
   Simula que la realidad no obedece reglas limpias.
7. **Errores de carga (~1%)**: montos con typos, descripciones vacías o truncadas.
   El pipeline **tiene que sobrevivirlos** - y así se prueba la validación.

**Semilla fija** (`--semilla 42`) → reproducible. El `metadata.json` guarda la
semilla, la versión del generador y los conteos por clase.

### §5.1 🌎 Tres idiomas, tres mercados - lo más importante de este documento

El proyecto habla **español, portugués e inglés** ([ADR-0009](../adr/0009-multi-idioma.md)),
y **una parte importante del jurado es de Brasil**. Eso significa que
**el modelo M1 tiene que clasificar descripciones en portugués**, y el único lugar de
donde puede aprenderlo es **este dataset**.

> 🔴 **Si el generador solo produce comercios mexicanos, el modelo devolverá `otros`
> ante `IFOOD *PEDIDO`.** No con un error: **en silencio.** Y eso pasaría delante del
> jurado brasileño. **Este es el riesgo más concreto y más caro de todo el proyecto.**

**Distribución objetivo de los ~2.000 usuarios sintéticos:**

| Mercado | Idioma | Moneda | % | Peso |
|---|---|---|---|---|
| 🇲🇽 México | `es` | `MXN` | 30% | |
| 🇧🇷 **Brasil** | **`pt`** | **`BRL`** | **30%** | **El jurado** |
| 🇺🇸 EE.UU. | `en` | `USD` | 20% | Idioma franco |
| 🇦🇷🇨🇴🇨🇱 Otros LatAm | `es` | `ARS`/`COP`/`CLP` | 20% | |

**El catálogo `comercios.yaml` necesita, como mínimo, esto:**

| Categoría | 🇲🇽 `es` | 🇧🇷 `pt` | 🇺🇸 `en` |
|---|---|---|---|
| `alimentacion` | SORIANA, OXXO, BODEGA AURRERA, LA COMER, RAPPI | **PAO DE ACUCAR, EXTRA, CARREFOUR BR, IFOOD, RAPPI BR** | WHOLE FOODS, TRADER JOES, DOORDASH, STARBUCKS |
| `transporte` | PEMEX, UBER, DIDI, METRO CDMX | **UBER, 99POP, POSTO IPIRANGA, BILHETE UNICO** | SHELL, UBER, LYFT, MTA |
| `vivienda` | RENTA DEPTO, INFONAVIT | **ALUGUEL, CONDOMINIO, CAIXA HABITACAO** | RENT, MORTGAGE, HOA FEE |
| `servicios` | CFE, TELMEX, IZZI, AGUA | **ENEL, CONTA DE LUZ, VIVO, CLARO BR, SABESP, NET** | CON EDISON, COMCAST, AT&T, VERIZON |
| `salud` | FARMACIA GUADALAJARA, IMSS, DR SIMI | **DROGARIA SAO PAULO, DROGASIL, UNIMED, HAPVIDA** | CVS PHARMACY, WALGREENS, BLUE CROSS |
| `educacion` | UNAM, PLATZI, COLEGIATURA | **ALURA, UDEMY BR, MENSALIDADE ESCOLAR, KUMON** | COURSERA, UDEMY, TUITION |
| `entretenimiento` | CINEPOLIS, NETFLIX, SMART FIT | **NETFLIX, SPOTIFY, CINEMARK, SMART FIT, GLOBOPLAY** | NETFLIX, AMC THEATRES, PLANET FITNESS |
| `compras` | LIVERPOOL, AMAZON MX, MERCADO LIBRE | **MAGAZINE LUIZA, AMERICANAS, MERCADO LIVRE, SHOPEE** | AMAZON, TARGET, WALMART, BEST BUY |
| `finanzas` | PAGO TC, INTERES, COMISION BANCARIA | **JUROS CARTAO, TARIFA BANCARIA, NUBANK FATURA, IOF** | CREDIT CARD INTEREST, BANK FEE, APR CHARGE |
| `ahorro_inversion` | TRANSF A INVERSION, CETES, GBM | **APLICACAO CDB, TESOURO DIRETO, XP INVESTIMENTOS** | VANGUARD, FIDELITY, 401K CONTRIBUTION |
| `ingresos` | NOMINA, TRANSF RECIBIDA SUELDO | **PIX RECEBIDO, SALARIO, DEPOSITO SALARIO, 13o SALARIO** | DIRECT DEPOSIT, PAYROLL, SALARY |

> **`PIX RECEBIDO` no es opcional.** Pix es *el* medio de pago de Brasil. Un modelo
> que no lo reconoce, en un hackathon de Alura, es un modelo que no hizo la tarea.
>
> Ojo también con `finanzas` en Brasil: **`IOF`** (impuesto financiero) y
> **`TARIFA BANCARIA`** son terminología cotidiana allá y no existen en México.

**Consecuencias para el modelo** ([`../arquitectura/CONTRATO_MODELO.md`](../arquitectura/CONTRATO_MODELO.md) §5):

- **Un solo modelo M1** entrenado con los tres idiomas mezclados (no tres modelos, y
  **sin** detección previa de idioma).
- El `TfidfVectorizer` **debe** incluir **`char_wb` de 3-5 caracteres**. Es lo que
  captura las raíces compartidas (`farmac-` ↔ `farmác-`, `supermerc-` ↔ `supermerc-`)
  y hace que el modelo generalice entre español y portugués. **Sin `char_wb`, esto no
  funciona.**
- **Se reporta macro-F1 POR IDIOMA.** Un 0.90 global que esconde un 0.62 en portugués
  es una métrica que miente, y hay que verlo antes de la demo, no durante.

## §6 Splits y el set manual

| Split | % | Cómo |
|---|---|---|
| Train | 70% | **Split por `usuario_id`**, no por transacción |
| Validación | 15% | Idem |
| Test | 15% | Idem |
| **Manual** | - | **300 transacciones escritas a mano**, fuera del generador. 🌎 **100 por idioma** (es / pt / en) |

> ⚠️ **El split es POR USUARIO, no por transacción.** Si las transacciones del
> usuario 1042 caen unas en train y otras en test, hay **fuga de datos**: el
> modelo ya vio el patrón de gasto de ese usuario. La métrica sale inflada y es
> mentira. Este es **el error más común** en proyectos de hackathon y **se
> verifica con un test automático** (`ml/tests/test_no_hay_fuga.py`).

**El set manual** lo escriben personas del equipo (idealmente el de Data y alguien
de backend, para que no haya sesgo de quien construyó el generador): transacciones
que se les ocurran, con sus propias palabras. Se etiqueta a mano. **Es el único
número que mide generalización real** y se reporta aparte, siempre.

> 🌎 **Las 100 transacciones en portugués son las más importantes de las 300**, porque
> son las que predicen cómo se va a comportar el modelo ante el jurado brasileño. Si
> nadie del equipo habla portugués, **hay que conseguir a alguien que lo haga** - está
> en `PENDIENTES_ANGEL` (D17). Escribirlas con Google Translate mide lo que el modelo
> hace con Google Translate, no con portugués real.

## §7 Baselines (hay que batirlos, o explicar por qué no)

| Modelo | Baseline | Qué es |
|---|---|---|
| **M1** (transacciones) | Keywords/regex | Un diccionario `{"super": alimentacion, "uber": transporte, ...}`. Suele sacar **macro-F1 ~0.70** y es sorprendentemente duro de batir. |
| **M2** (perfil) | Regla determinista | La misma regla de etiquetado de [`TAXONOMIA.md`](TAXONOMIA.md) §2. **Por construcción saca ~0.92 en el set sintético** - batirla ahí no significa nada. **La comparación que importa es en el set manual / con ruido.** |

> El baseline de M2 es incómodo y hay que decirlo en el notebook: *"nuestra regla
> saca 0.92 porque generamos los datos con ella; el modelo aporta valor en las
> zonas grises y en el set manual, donde la regla cae a X y el modelo a Y."* Si
> el modelo **no** aporta valor, la conclusión honesta es usar la regla - y decirlo.

## §8 Versionado

`dataset-v{MAJOR.MINOR.PATCH}`. ⚠️ Se planeó guardarlo en **OCI Object Storage**
y **no se hizo**: el dataset vive en `ml/datos/` dentro del repositorio, y se
regenera con semilla fija, así que no hace falta almacenarlo aparte.

- `MAJOR` → cambia el esquema o la taxonomía (**requiere ADR**).
- `MINOR` → nuevos arquetipos/comercios, más volumen.
- `PATCH` → arreglo de un bug del generador.

Cada modelo guarda en su metadata el `dataset_version` con el que se entrenó
([`../arquitectura/CONTRATO_MODELO.md`](../arquitectura/CONTRATO_MODELO.md) §6).
Sin eso, en 3 semanas nadie va a saber con qué datos salió el modelo que está en
producción.

## §9 Entregable de Ciencia de Datos (lo que pide el enunciado)

El notebook `ml/notebooks/01_eda_y_modelos.ipynb` debe contener, **en este orden**,
porque es literalmente la lista del enunciado:

1. Exploración y limpieza (EDA) - distribuciones, nulos, outliers, balance de clases.
2. Procesamiento de variables financieras y textuales.
3. Ingeniería de atributos - los 8 indicadores, y por qué esos.
4. Clasificación de gastos (**M1**) - incluida la matriz de confusión.
5. Análisis del perfil financiero (**M2**).
6. Entrenamiento y evaluación - vs. baselines, y **en el set manual**.
7. Métricas - macro-F1, precisión/recall por clase, matriz de confusión, ROC-AUC.
8. Serialización - `joblib`, con el metadata de [`../arquitectura/CONTRATO_MODELO.md`](../arquitectura/CONTRATO_MODELO.md) §6.

> El notebook **es un entregable evaluado**, no un borrador. Markdown entre celdas
> explicando el **porqué** de cada decisión, gráficos con títulos y ejes, y una
> conclusión honesta al final (incluyendo qué **no** funcionó).
