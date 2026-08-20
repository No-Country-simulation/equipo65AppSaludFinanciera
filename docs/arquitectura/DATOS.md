# Datos - modelo y migraciones (documento SUPERADO)

> ⛔ **Este documento describe un diseño que ya no es el vigente.** Se escribió en
> la S0, cuando el motor era Oracle Autonomous Database, y se conserva como
> registro de por qué el modelo quedó como quedó.
>
> **La fuente de verdad hoy es [`../../../db/README.md`](../../db/README.md)**,
> y el esquema real son las migraciones de `db/migraciones/`.
>
> **Qué cambió**, por si vienes de una versión vieja de este doc:
>
> | Aquí decía | Hoy es |
> |---|---|
> | Oracle Autonomous Database 23ai | **PostgreSQL 16** ([ADR-0014](../adr/0014-motor-postgresql.md)) |
> | Flyway | Migraciones propias: `db/migraciones/V<n>__*.sql` + `aplicar.sh`, con SHA-256 en `esquema_historial` |
> | `NUMBER`, `VARCHAR2`, `CLOB IS JSON` | `NUMERIC`, `TEXT`, **`JSONB`**, `UUID` nativo, `TIMESTAMPTZ` |
> | `password_hash` y `totp_secreto` dentro de `usuario` | Tabla aparte: **`usuario_seguridad`** |
> | ~10 tablas | **29 tablas** (banca, producto, catálogos, auditoría) |
> | Wallet mTLS | Conexión JDBC normal dentro de la red de compose |
>
> El diagrama de entidades al día está en
> [`DIAGRAMAS.md §3`](DIAGRAMAS.md), ya regenerado contra el esquema real.

Responsable: **DBA**. Motor original de este diseño: Oracle Autonomous Database
23ai (Always Free) en OCI.

## §1 Diagrama de entidades

```
  usuario ──1:N──► transaccion ──N:1──► categoria
     │                  │
     │                  └── moneda ──► tasa_cambio (para normalizar)
     │
     ├──1:N──► analisis ──1:N──► recomendacion
     ├──1:N──► refresh_token
     └──1:N──► evento_auditoria

  intento_login   (por email/IP, sin FK - el email puede no existir)
```

## §2 Tablas

### `usuario`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `NUMBER GENERATED ALWAYS AS IDENTITY` | PK |
| `email` | `VARCHAR2(255)` | **UNIQUE**, guardado en minúsculas |
| `password_hash` | `VARCHAR2(60)` | BCrypt cost 12 |
| `rol` | `VARCHAR2(20)` | `usuario` \| `admin`. Default `usuario` |
| `moneda_principal` | `CHAR(3)` | ISO-4217. Default `USD` |
| `idioma` | `CHAR(2)` | 🌎 `es`\|`pt`\|`en`. Default `es`. CHECK |
| `ingreso_mensual` | `NUMBER(18,2)` | Nullable hasta que lo cargue |
| `nivel_endeudamiento` | `NUMBER(3)` | 0-100. CHECK |
| `frecuencia_ahorro` | `VARCHAR2(10)` | `nula`\|`baja`\|`media`\|`alta`. CHECK |
| `totp_secreto` | `VARCHAR2(64)` | **Cifrado**, NULL si no usa 2FA |
| `totp_activo` | `NUMBER(1)` | 0/1 |
| `creado_en` | `TIMESTAMP WITH TIME ZONE` | Default `SYSTIMESTAMP` |
| `actualizado_en` | `TIMESTAMP WITH TIME ZONE` | |

### `categoria` (catálogo - 12 filas, sembradas)

| Columna | Tipo | Nota |
|---|---|---|
| `slug` | `VARCHAR2(30)` | **PK**. Los 12 de [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md) |
| `tipo` | `VARCHAR2(15)` | `gasto` \| `ingreso` \| `movimiento` |
| `grupo` | `VARCHAR2(20)` | `esencial`\|`discrecional`\|`financiero`\|`no_gasto`\|`otro` |
| `umbral_ingreso` | `NUMBER(4,3)` | Umbral de `REC_CATEGORIA_EXCESO` |
| `orden` | `NUMBER(2)` | Para la UI |

> Es tabla, no enum en el código: el endpoint `GET /api/v1/categorias` la sirve y
> **el frontend no hardcodea la lista**. Cambiar una etiqueta = un `UPDATE`, no un
> deploy de 3 servicios.

### `categoria_i18n` (🌎 catálogo de traducciones - 36 filas)

12 categorías × 3 idiomas. Sembrada por migración desde
[`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md) §1.1.

| Columna | Tipo | Nota |
|---|---|---|
| `categoria_slug` | `VARCHAR2(30)` | **FK** → `categoria`. PK compuesta |
| `idioma` | `CHAR(2)` | `es`\|`pt`\|`en`. PK compuesta |
| `etiqueta` | `VARCHAR2(60)` | La etiqueta legible (`Alimentación` / `Alimentação` / `Food`) |

> **Tabla aparte, no tres columnas `etiqueta_es`/`etiqueta_pt`/`etiqueta_en`.**
> Agregar un cuarto idioma con la tabla es un `INSERT`; con columnas sería un `ALTER
> TABLE` más un cambio en la entidad de Java, el DTO y el frontend. Cuesta lo mismo
> hoy y es correcto mañana.
>
> `GET /api/v1/categorias` hace `JOIN` con el `Accept-Language` de la petición y cae
> a `es` si el idioma no existe.

### `transaccion`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `NUMBER … IDENTITY` | PK |
| `usuario_id` | `NUMBER` | **FK** → `usuario`, `ON DELETE CASCADE` |
| `descripcion` | `VARCHAR2(200)` | |
| `valor` | `NUMBER(18,2)` | **Negativo = gasto, positivo = ingreso** (RN4) |
| `moneda` | `CHAR(3)` | ISO-4217 |
| `valor_base` | `NUMBER(18,2)` | Normalizado a USD, calculado al insertar |
| `fecha` | `DATE` | |
| `categoria_slug` | `VARCHAR2(30)` | **FK** → `categoria` |
| `categoria_origen` | `VARCHAR2(10)` | `modelo` \| `usuario` (RN3). CHECK |
| `confianza` | `NUMBER(3,2)` | 0.00-1.00. NULL si `categoria_origen = 'usuario'` |
| `modelo_version` | `VARCHAR2(20)` | Qué versión la clasificó |
| `es_recurrente` | `NUMBER(1)` | 0/1, calculado |
| `creado_en` | `TIMESTAMP WITH TIME ZONE` | |

**Índices**: `(usuario_id, fecha DESC)` ← el del listado paginado, es **el
índice que importa**. `(usuario_id, categoria_slug)` para el resumen.

### `analisis` (foto inmutable - RN1)

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `NUMBER … IDENTITY` | PK |
| `usuario_id` | `NUMBER` | **FK** |
| `perfil_codigo` | `VARCHAR2(20)` | `saludable`\|`en_observacion`\|`en_riesgo`. CHECK |
| `probabilidad` | `NUMBER(3,2)` | |
| `probabilidades` | `JSON` | Las 3 clases |
| `indicadores` | `JSON` | Los 8 indicadores **tal como se mandaron al ML** |
| `resumen_gastos` | `JSON` | `{categoria: monto}` |
| `moneda` | `CHAR(3)` | Moneda en la que se expresó |
| `desde` / `hasta` | `DATE` | Período analizado |
| `modelo_version` | `VARCHAR2(20)` | **Crítico**: reentrenar no reescribe análisis viejos |
| `creado_en` | `TIMESTAMP WITH TIME ZONE` | |

> 🌎 **El análisis NO guarda el idioma ni los textos traducidos.** Guarda
> `perfil_codigo` y, en `recomendacion`, el `codigo` + `parametros`. El texto se
> renderiza **al leerlo**, con el idioma de ese momento. Así, un usuario que cambia la
> UI a portugués ve **su historial completo en portugués**, no una mezcla de idiomas
> según el idioma que tenía el día que ejecutó cada análisis.

> **Guardar `indicadores` como JSON es a propósito**: es exactamente el vector de
> features que se le mandó al modelo. Sin esto, es imposible depurar *"¿por qué
> este análisis dio `en_riesgo`?"* tres semanas después.
>
> Oracle 23ai tiene tipo **`JSON` nativo**. Si la versión de Autonomous DB que nos
> toque fuera 19c, se usa `CLOB` + `CHECK (col IS JSON)`. **El DBA lo confirma al
> aprovisionar** - está en `PENDIENTES_ANGEL.md`.

### `recomendacion`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `NUMBER … IDENTITY` | PK |
| `analisis_id` | `NUMBER` | **FK** → `analisis`, `ON DELETE CASCADE` |
| `codigo` | `VARCHAR2(40)` | `REC_AHORRO_BAJO`, … (TAXONOMIA §4) |
| `parametros` | `JSON` | 🌎 `{"categoria":"alimentacion","pct":17}` - para interpolar el texto |
| `prioridad` | `VARCHAR2(10)` | `alta`\|`media`\|`baja`. CHECK |
| `indicador` | `VARCHAR2(30)` | Qué indicador la disparó |
| `orden` | `NUMBER(2)` | |

> 🌎 **Se guarda `codigo` + `parametros`, NO el texto renderizado.** Si se guardara el
> texto en español, el historial quedaría congelado en español para siempre y el
> usuario brasileño vería sus análisis viejos en un idioma que no eligió. El texto se
> arma al leer, desde el `ResourceBundle`.

### `tasa_cambio` (caché, alimentada por job)

| Columna | Tipo | Nota |
|---|---|---|
| `moneda_origen` | `CHAR(3)` | |
| `moneda_base` | `CHAR(3)` | Siempre `USD` en v1 |
| `tasa` | `NUMBER(18,6)` | 6 decimales: `COP`→`USD` es ~0.00024 |
| `vigente_desde` | `DATE` | **PK compuesta** con las dos monedas |
| `fuente` | `VARCHAR2(40)` | Qué API la trajo |
| `actualizado_en` | `TIMESTAMP WITH TIME ZONE` | |

> **No se sobrescribe: se inserta una fila nueva por día.** Cuesta lo mismo (son
> ~8 monedas × 1 fila/día = nada) y permite convertir cada transacción con la tasa
> **de su fecha**, que es lo correcto. Sobrescribir haría que el análisis de un
> gasto de mayo use la tasa de julio - y en LatAm eso es un error grande.
>
> El job corre cada 6 h. **Si la API externa falla, no pasa nada**: quedan las
> últimas tasas vigentes y se usa la más reciente ≤ fecha de la transacción. La
> demo nunca se cae por un tercero.

### `refresh_token`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `NUMBER … IDENTITY` | PK |
| `usuario_id` | `NUMBER` | **FK** |
| `token_hash` | `VARCHAR2(64)` | **SHA-256 del token.** El token en claro NUNCA se guarda |
| `familia_id` | `VARCHAR2(36)` | UUID. Rotar mantiene la familia |
| `expira_en` | `TIMESTAMP WITH TIME ZONE` | |
| `usado_en` | `TIMESTAMP WITH TIME ZONE` | NULL = no usado |
| `revocado_en` | `TIMESTAMP WITH TIME ZONE` | |
| `creado_en` | `TIMESTAMP WITH TIME ZONE` | |

> **Detección de robo**: si llega un refresh cuyo `usado_en` ya no es NULL, es que
> alguien lo reutilizó → **se revoca toda la `familia_id`** y se audita. El
> atacante y el usuario legítimo quedan ambos deslogueados; el usuario vuelve a
> entrar, el atacante no.

### `intento_login` y `evento_auditoria`

`intento_login`: `id`, `email`, `ip`, `exito` (0/1), `creado_en`. **Sin FK** (el
email puede no existir - hay que registrar los intentos contra cuentas
inexistentes). Índice en `(email, creado_en DESC)` para contar los 5 fallos.

`evento_auditoria`: `id`, `usuario_id` (FK, nullable), `tipo`, `ip`,
`user_agent`, `detalle` (JSON), `creado_en`. Tipos: `LOGIN_OK`, `LOGIN_FALLIDO`,
`BLOQUEO`, `PASSWORD_CAMBIADO`, `2FA_ACTIVADO`, `2FA_DESACTIVADO`,
`REFRESH_REUSADO`, `ANALISIS_EJECUTADO`.

## §3 Reglas transversales

- **Dinero**: `NUMBER(18,2)`. En Java `BigDecimal`, en Python `Decimal`. **Nunca
  `double`/`float`** - `0.1 + 0.2 != 0.3` y en fintech eso es inaceptable.
- **Tasas de cambio**: `NUMBER(18,6)` (6 decimales, no 2).
- **Tiempo**: `TIMESTAMP WITH TIME ZONE`, todo en **UTC**. La UI convierte.
  `fecha` de transacción es `DATE` (no tiene hora, y no queremos que un gasto del
  1° de julio se vuelva del 30 de junio por un huso).
- **Borrado**: borrado real con `ON DELETE CASCADE`. No hay soft-delete en el MVP
  (no lo necesitamos y complica todas las queries).
- **Aislamiento (RN9)**: **toda** query filtra por `usuario_id` sacado del JWT.
  Nunca de un parámetro de la petición. Sin excepciones.

## §4 Migraciones

Herramienta: **Flyway** (soporta Oracle; el DBA es el responsable de `db/`).

| # | Nombre | Qué hace |
|---|---|---|
| V1 | `init_catalogos` | `categoria` (12 filas) + **`categoria_i18n` (36 filas)** + `tasa_cambio` (semilla) |
| V2 | `usuarios_y_auth` | `usuario` (con `idioma`), `refresh_token`, `intento_login`, `evento_auditoria` |
| V3 | `transacciones` | `transaccion` + índices |
| V4 | `analisis` | `analisis`, `recomendacion` |

Reglas:

- La cadena **up debe correr limpia sobre una BD vacía**. Se verifica en CI
  levantando el contenedor de Oracle desde cero.
- **Nunca editar una migración ya mergeada a `develop`** - se agrega una nueva.
- Índices **solo con evidencia** (`EXPLAIN PLAN`). No se indexa "por si acaso".

## §5 Seeds

| Seed | Entorno | Qué carga |
|---|---|---|
| `categorias` | todos | Las 12 categorías. **Es parte de V1**, no es opcional. |
| `tasas_iniciales` | todos | Tasas de arranque, por si el job aún no corrió. |
| `demo` | local / demo | 3 usuarios de los ejemplos de [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md), con sus transacciones. **Re-ejecutable** (borra e inserta). |

> El seed `demo` es lo que hace que la demo del video sea **reproducible**: un
> comando y la BD queda exactamente como en el guion.

## §6 Trampas de Oracle (para el que viene de Postgres)

| Postgres | Oracle |
|---|---|
| `SERIAL` / `BIGSERIAL` | `NUMBER GENERATED ALWAYS AS IDENTITY` |
| `VARCHAR` / `TEXT` | `VARCHAR2(n)` / `CLOB` |
| `BOOLEAN` | `NUMBER(1)` + `CHECK (col IN (0,1))` |
| `LIMIT 10 OFFSET 20` | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` |
| `NOW()` | `SYSTIMESTAMP` |
| `ILIKE` | `LOWER(col) LIKE LOWER(?)` |
| `''` es distinto de `NULL` | **`''` ES `NULL`** ⚠️ |
| `RETURNING id` | `RETURNING id INTO ?` |

⚠️ **La grande**: en Oracle, **la cadena vacía es `NULL`**. Un
`descripcion VARCHAR2(200) NOT NULL` **no** rechaza `''` - lo convierte a `NULL` y
*entonces* falla, con un mensaje confuso. La validación de "no vacío" se hace en
Spring, no se delega a la BD.

**Conexión**: Autonomous DB exige **wallet (mTLS)**. El wallet es un `.zip` con
certificados: **NUNCA entra al repo** (que es público). Va en OCI Vault y lo
monta Ansible. En local, el contenedor de Oracle 23ai Free usa conexión normal
(sin wallet) - es la única diferencia entre local y OCI, y está encapsulada en el
perfil de Spring (`application-local.yml` vs `application-oci.yml`).
