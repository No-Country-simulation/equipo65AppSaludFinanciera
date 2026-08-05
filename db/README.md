# Base de datos — Fintech Vital

PostgreSQL 16, empaquetado en una imagen que ya trae **el esquema y los datos de
ejemplo dentro**. La misma imagen sirve para local, staging y producción: lo
único que cambia es si se cargan los datos de ejemplo y cuál es la contraseña.

> Motor y su porqué: [ADR-0014](../frontend/docs/adr/0014-motor-postgresql.md).
> Taxonomía (catálogo **vigente**, ya no congelado): `frontend/docs/datos/TAXONOMIA.md`.

---

## Arrancar

Lo normal es levantar el stack entero:

```bash
ops/stack.sh arriba          # Linux / macOS
.\ops\stack.ps1 arriba       # Windows
```

Solo la base de datos:

```bash
docker build -t fintechvital/db:local db/
docker run -d --name fv-db \
  -e POSTGRES_PASSWORD=locald \
  -e FV_CARGAR_DEMO=si \
  -p 127.0.0.1:5432:5432 \
  fintechvital/db:local
```

Consola SQL: `ops/stack.sh psql` (entra por el contenedor, no hace falta tener
`psql` instalado).

### Variables

| Variable | Por defecto | Qué hace |
|---|---|---|
| `POSTGRES_DB` | `fintechvital` | Nombre de la base |
| `POSTGRES_USER` | `fintechvital` | Usuario dueño |
| `POSTGRES_PASSWORD` | *(ninguno)* | **Obligatoria.** Sin ella la imagen se niega a arrancar, y así debe ser |
| `FV_CARGAR_DEMO` | `no` | `si` carga los 4 usuarios de ejemplo. **En producción se queda en `no`** |
| `FV_CARGAR_DATASET` | `no` | `si` carga los 100 usuarios / 4.885 movimientos del equipo. Independiente del anterior |
| `FV_PASSWORD_DEMO` | *(vacía)* | Contraseña de los usuarios de ejemplo. Vacía = las cuentas existen pero nadie puede entrar |

---

## Cómo se aplica el esquema

```
db/
  migraciones/     V1__catalogos.sql ... V10__taxonomia_abierta.sql <- la fuente de verdad
  semillas/        demo.sql        <- 4 usuarios inventados
                   dataset.sql     <- 100 usuarios reales del equipo
                   dataset/*.csv   <- los CSV de origen, tal cual
  aplicar.sh       aplica lo pendiente y lo registra
  initdb/          hook del primer arranque
  Dockerfile
```

Dos caminos, un solo script:

1. **Volumen vacío** → la imagen ejecuta `initdb/00-inicializar.sh`, que llama a
   `aplicar.sh` y, si `FV_CARGAR_DEMO=si`, carga la semilla. Ocurre **una sola
   vez**: reiniciar el contenedor no repite nada ni pisa datos.
2. **Base que ya existe** → `ops/stack.sh migrar` levanta un contenedor de un
   solo uso que aplica lo pendiente.

Lo aplicado se anota en la tabla `esquema_historial` con su **SHA-256**. Si una
migración ya aplicada cambia de contenido, `aplicar.sh` **aborta**:

```
ERROR: V3__banca.sql ya estaba aplicada y su contenido cambio.
       Una migracion mergeada no se edita: se agrega una nueva.
```

Es a propósito. Editar una migración ya aplicada es la forma más común de que
dos entornos acaben con esquemas distintos sin que nadie se entere.

> El nombre de archivo sigue el convenio de **Flyway** (`V<n>__<nombre>.sql`)
> para poder adoptar Flyway más adelante sin renombrar nada.

### Añadir una migración

1. Crea `V11__lo_que_sea.sql`. **Nunca edites una anterior.**
2. `ops/stack.sh migrar`
3. Verifica con `ops/stack.sh probar`

---

## El modelo

30 tablas, 10 vistas y un rol de aplicacion. Agrupadas:

| Migración | Contenido |
|---|---|
| `V1__catalogos` | `idioma`, `moneda`, `tasa_cambio`, `ciudad`, **`categoria` (12)**, **`categoria_i18n` (36)**, `perfil`, `perfil_i18n` |
| `V2__usuarios_y_seguridad` | `usuario`, `usuario_seguridad`, `codigo_respaldo_2fa`, `refresh_token`, `intento_login`, `evento_auditoria` |
| `V3__banca` | `cuenta_bancaria`, `cuenta_usuario`, `tarjeta`, `tarjeta_credito`, `historial_buro` |
| `V4__transacciones` | `transaccion` + índices |
| `V5__analisis` | `modelo_ia`, `analisis`, `recomendacion`, `resumen_mensual` |
| `V6__producto` | `plan_ahorro`, `aporte_plan`, `presupuesto`, `evento_calendario` |
| `V7__vistas` | `fn_a_base()` + las 8 vistas |
| `V8__roles_y_permisos` | Rol `fintechvital_app` con privilegios minimos |
| `V9__subcategorias` | `subcategoria` (34) + columna en `transaccion` + trigger de coherencia |
| `V10__taxonomia_abierta` | Catálogo adaptable, etiquetas con respaldo, origen de los datos derivados |

### Decisiones que conviene conocer antes de tocar nada

**La transacción cuelga del usuario, no de la tarjeta.**
En el modelo previo, `transacciones` solo tenía `id_tarjeta`, y encima
*nullable*. Eso dejaba a los pagos en efectivo **sin dueño**, y las vistas
—que unían transacción → tarjeta → cuenta → usuario— los descartaban en
silencio: dashboard incompleto y ningún error. Ahora `usuario_id` es `NOT NULL`;
cuenta y tarjeta son opcionales porque de verdad lo son.

**El signo es el dato.**
`valor` es `NUMERIC(14,2)` con signo: `> 0` ingreso, `< 0` gasto (RN4, igual que
el contrato de la API). `tipo_movimiento` existe igualmente, pero es una
**columna generada**: la mantiene PostgreSQL y no puede desincronizarse.

**Nada de etiquetas traducidas dentro de la BD.**
Las tablas y las vistas devuelven **slugs**. Las etiquetas legibles viven en
`categoria_i18n` y `perfil_i18n`, una fila por idioma. El modelo anterior tenía
una vista con `CASE ... THEN 'En riesgo'` — texto de interfaz en español dentro
de la base de datos de un proyecto trilingüe.

**No se guarda el número de tarjeta.**
Solo `ultimos4` y, opcionalmente, un hash. Guardar el PAN completo mete el
proyecto en alcance PCI-DSS, y en un repositorio público es una mala historia
que contar delante de un jurado.

**Lo derivado no se almacena.** Saldo de cuenta, saldo usado de la tarjeta,
ahorrado de una meta y gastado de un presupuesto **se calculan** en vistas. Dos
copias del mismo número acaban discrepando siempre.

**La taxonomia NO esta congelada: la manda data science.**
El catalogo es dato, no contrato. Anadir, renombrar o retirar una categoria es un
`INSERT`/`UPDATE` en `categoria`: no toca esquema, ni entidades, ni tipos. Si
falta la traduccion, `vw_categoria_etiqueta` cae a espanol y luego al slug; una
categoria retirada se marca `activa = FALSE` en vez de borrarse, para no
reescribir el historico.

⚠️ Lo que se pierde: antes, un slug mal escrito rompia la compilacion del
frontend. Ahora no. La compensacion es que **todo lo que dependia de la lista
cerrada la lee de esta tabla**: etiquetas, umbrales (`umbral_ingreso`) y
agrupacion de los indicadores (`grupo`).

**Dos niveles de categoria, no uno.**
Las **12** macro-categorias son las que predice el modelo, las que viajan en
`resumen_gastos` y sobre las que operan los umbrales de las reglas.
Las **34** `subcategoria` son el detalle del extracto (`barberia`, `metrobus`,
`zapatos_de_tacon`) y cuelgan cada una de una de las 12.

Vinieron del catalogo del equipo (rama `base-datos`). Meterlas en `categoria`
habria roto el modelo, el contrato y todos los graficos; descartarlas habria
tirado el detalle que hace util la app ("gastaste 380 en barberia" dice mucho
mas que "gastaste en compras"). Un trigger impide que la subcategoria y la
macro-categoria de un mismo movimiento se contradigan, y si solo llega la
subcategoria, deduce la macro.

⚠️ El mapeo de las 34 lo tiene que **confirmar data science**. Las decisiones
discutibles estan marcadas en `V9__subcategorias.sql`: cuidado personal
(`barberia`, `salon_de_belleza`, `maquillaje`) se agrupo en `compras` por ser
gasto discrecional, porque la taxonomia congelada no tiene una categoria propia.

**Multi-moneda de verdad.** `fn_a_base(monto, moneda, fecha)` convierte con la
tasa **de la fecha del movimiento**, no la de hoy. Convertir un gasto de mayo con
la tasa de julio es un error grande en LatAm. `tasa_cambio` guarda una fila por
día y no sobrescribe.

> Esta última regla ya evitó un bug real: `ratio_recurrente` daba **10.4** con
> rango `[0,1]`, porque sumaba los gastos recurrentes en pesos y los dividía
> entre un total ya convertido a dólares.

### Las vistas

| Vista | Para qué |
|---|---|
| `vw_saldo_cuenta` | Saldo (no se almacena) |
| `vw_tarjeta_credito` | Límite, usado y disponible |
| `vw_gasto_mensual_categoria` | Base del gráfico de gastos y del `resumen_gastos` |
| `vw_resumen_mensual_calculado` | Regenera la tabla-caché `resumen_mensual` |
| `vw_indicadores_mensuales` | **Los 8 indicadores** de `TAXONOMIA.md` §3 |
| `vw_meta_progreso` | `ahorrado` y avance |
| `vw_presupuesto_uso` | `gastado` del mes en curso |
| `vw_buro_vigente` | Último registro de buró por usuario |

⚠️ `vw_indicadores_mensuales` **no es la fuente de verdad**: los indicadores que
se le mandan al modelo los calcula Spring Boot (`CONTRATO_MODELO.md` §1). La
vista aplica las mismas fórmulas para poder **contrastar** ambos resultados. Si
no coinciden, hay un bug en alguno de los dos — que es justo lo que se quiere
detectar.

---

## Datos de ejemplo

`FV_CARGAR_DEMO=si` crea 4 usuarios que cubren los 3 perfiles **y los 3
idiomas**, con 12 meses de movimientos (agosto 2025 – julio 2026):

| Usuario | Moneda | Idioma | Perfil | Por qué |
|---|---|---|---|---|
| Ana Torres | MXN | es | `saludable` | Ahorra ~49%, deuda 12% |
| Bruno Silva | BRL | **pt** | `en_observacion` | Ahorra ~21%, deuda 28% |
| Carla Méndez | MXN | es | `en_riesgo` | Gasta más de lo que ingresa, deuda 47%, no ahorra |
| Emily Carter | USD | **en** | `saludable` | Ahorra ~28%, deuda 18% |

Bruno y Emily estan ahi a proposito: la demo trilingue necesita datos que se
vean **naturales** en cada idioma (`IFOOD *PEDIDO`, `Aluguel`, `Payroll
deposit`, `Whole Foods`), no "Supermercado" traducido a mano.

Sale: **672 movimientos, 48 análisis, 128 recomendaciones, 48 puntos de buró**,
5 metas, 10 presupuestos y 9 eventos.

**Los análisis no están escritos a mano**: se derivan de los propios movimientos
con las fórmulas de `TAXONOMIA.md` §3 y la heurística de etiquetado de §2. Si
alguien cambia un movimiento de la semilla, el análisis cambia con él. Nunca se
contradicen, que es el fallo típico de los datos de demo.

Es re-ejecutable: borra los 4 usuarios y los recrea.

---

## Dataset del equipo (opcional)

`FV_CARGAR_DATASET=si` carga los datos que produjo el equipo en la rama
`base-datos`: **100 usuarios y 4.885 movimientos** de enero a julio de 2026, con
sus cuentas, tarjetas y buro. Es independiente de la semilla demo — se pueden
activar los dos.

Sirve para probar con volumen real y para que data science explore sin levantar
el backend. Los CSV de origen estan tal cual en `db/semillas/dataset/`.

El mapeo (`db/semillas/dataset.sql`) resuelve cuatro cosas que el CSV no trae
resueltas:

| Problema del CSV | Como se resuelve |
|---|---|
| Las transacciones **no tienen `id_usuario`**, solo `id_tarjeta` | Se deriva por `tarjeta → cuenta → cuenta_usuario` |
| El importe viene siempre positivo, con el tipo aparte | Se convierte a **valor con signo** (RN4) |
| `id_categoria` (1..34) apunta al catalogo del banco | Se traduce a `subcategoria_slug` + su macro de las 12 |
| El "numero de tarjeta" viene entero | Se guardan solo los 4 ultimos digitos y un hash |

### Lo que hay que saber antes de fiarse de estos datos

**115 de los 5.000 movimientos (2,3%) vienen sin importe** y se descartan: un
movimiento sin monto no es un movimiento, y meterlo con 0 falsearia todos los
ratios. Es un hueco del CSV de origen, no del mapeo.

**`nivel_endeudamiento` y `frecuencia_ahorro` no vienen en el CSV**, y son 2 de
las 3 entradas del endpoint del enunciado. En vez de inventarlos, se **derivan de
senal real** y se marcan como derivados (`*_origen = 'derivado'`):

| Campo | De donde sale | Fiabilidad |
|---|---|---|
| `nivel_endeudamiento` | Score de buro (400..844), relacion inversa con anclas 350→65% y 850→5% | **Estimacion.** La deuda del buro viene en 0.00 para los 100, asi que el score es la unica senal |
| `frecuencia_ahorro` | En cuantos de sus meses le sobro dinero (>=75% alta, >=50% media, >=25% baja) | **Buena**: sale de lo que la persona hizo con su dinero, no de una opinion |

La marca importa: la interfaz deberia mostrarlos como *estimado* y pedir
confirmacion, y **data science no deberia entrenar tratandolos como verdad de
campo**. Sin esa marca, un derivado es indistinguible de un dato declarado en
cuanto sale de la base — y eso contamina el modelo en silencio.

### Analisis: no hace falta esperar al modelo

Se generan **599 analisis** para estos usuarios con `modelo_version =
'0.0.0-heuristica'` y `modelo_id` NULL, porque el analisis tiene dos mitades y
solo una necesita machine learning: los 8 indicadores y el motor de reglas son
**deterministas**, y el perfil se etiqueta con la heuristica documentada en
TAXONOMIA §2 (la misma con la que se etiqueta el dataset de entrenamiento).

Cuando data science entregue el modelo, sus analisis entran con su propia
version y estos quedan distinguibles de un vistazo. Por eso `modelo_version` es
una columna y no un detalle.

**Los `password_hash` del CSV no sirven**: los 100 usuarios comparten el mismo
valor y mide 55 caracteres (BCrypt son 60). Se sustituyen por un hash real de
`FV_PASSWORD_DEMO`, igual que en la semilla demo.

### Darle contraseña a los usuarios demo

El campo `password_hash` de la semilla es un **centinela inválido** a propósito:
no es el hash de ninguna contraseña, así que `BCrypt.matches()` siempre devuelve
`false` y **no se puede entrar con estas cuentas**. Un repositorio público con un
hash válido y conocido es una credencial publicada.

Para poder hacer login en una demo local, genera un hash y ponlo tú:

```bash
# Genera un hash BCrypt (el prefijo $2y$ de htpasswd es compatible con Spring)
htpasswd -bnBC 12 "" 'TuPasswordDeDemo' | tr -d ':\n'

# Y aplícalo
ops/stack.sh psql
=# UPDATE usuario_seguridad SET password_hash = '<el hash>'
   WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE '%ejemplo%');
```

---

## Producción

```bash
POSTGRES_PASSWORD=<generada, fuera del repo>
FV_CARGAR_DEMO=no
```

`FV_CARGAR_DEMO=no` no es opcional: la regla del proyecto es **cero datos mock
en la entrega**.

El volumen `fintechvital_datos_db` es donde viven los datos. `ops/stack.sh
abajo` lo conserva; `limpiar` lo **borra** y pide confirmación escrita.

Copia de seguridad:

```bash
docker exec fintechvital-db pg_dump -U fintechvital -Fc fintechvital > respaldo.dump
docker exec -i fintechvital-db pg_restore -U fintechvital -d fintechvital --clean < respaldo.dump
```
