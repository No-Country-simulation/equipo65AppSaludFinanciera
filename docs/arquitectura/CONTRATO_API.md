# CONTRATO - API REST pública (Spring Boot)

> 🧊 **CONGELADO.** Backend, web y DS construyen contra este doc **sin esperarse**.
> Cambiarlo requiere un ADR y avisar al equipo. Un campo renombrado sin avisar
> rompe la demo.

Base URL: `/api/v1` · Formato: JSON (UTF-8) · Documentación viva: Swagger UI en
`/api/v1/docs` (springdoc-openapi genera el OpenAPI desde el código; **este doc
manda hasta que el código exista**).

## §1 Convenciones

- **Nombres de campo**: `snake_case` en el JSON (para coincidir con el ejemplo
  literal del enunciado), aunque en Java sean `camelCase`
  (`@JsonNaming(SnakeCaseStrategy.class)`).
- **Montos**: número decimal, 2 decimales. `BigDecimal` en Java, **nunca** `double`.
- **Fechas**: ISO-8601 (`2026-07-13` o `2026-07-13T14:30:00Z`).
- **Slugs**: categorías y perfiles siempre en `snake_case` sin acentos. Lista
  cerrada en [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md).
- **Auth**: `Authorization: Bearer <access_token>` salvo donde diga "público".
- **Idempotencia**: no aplica en el MVP (nada de dinero real en juego).
- 🌎 **Idioma**: cabecera `Accept-Language: es | pt | en` (default **`es`**). Ver §10.

## §2 Respuesta de error (uniforme, siempre)

Todo error - 400, 401, 403, 404, 409, 422, 429, 500 - devuelve exactamente esta
forma. **Nunca un stacktrace, nunca un HTML de Spring.**

```json
{
  "codigo": "VALIDACION_ENTRADA",
  "mensaje": "La solicitud tiene campos invalidos",
  "detalles": [
    { "campo": "ingreso_mensual", "error": "debe ser mayor que 0" },
    { "campo": "transacciones", "error": "se requieren al menos 3 elementos" }
  ],
  "traza_id": "9f2c1a5e-4b7d-4a1e-8c3f-0d6e2b9a7c11"
}
```

`detalles` puede ser `[]`. `traza_id` siempre está (se loguea junto al error).
Catálogo completo de `codigo` → [`../operacion/ERRORES.md`](../operacion/ERRORES.md).

## §3 Endpoint del enunciado (PÚBLICO - no se toca)

Este es **el endpoint que el jurado va a probar**. Su forma es literal del
enunciado del hackathon. No se le agregan campos obligatorios, no se le cambian
nombres, no se le pone auth.

### `POST /api/v1/analisis-financiero` · público

También expuesto en `POST /analisis-financiero` (sin prefijo) por compatibilidad
exacta con el enunciado.

**Entrada** - lo mínimo del enunciado:

```json
{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "frecuencia_ahorro": "Media",
  "transacciones": [
    { "descripcion": "Supermercado", "valor": 420 },
    { "descripcion": "Combustible",  "valor": 300 },
    { "descripcion": "Streaming",    "valor": 40 }
  ]
}
```

**Campos opcionales que aceptamos además** (nuestra extensión, retrocompatible):

```json
{
  "moneda": "USD",
  "transacciones": [
    { "descripcion": "Supermercado", "valor": 420, "fecha": "2026-07-01", "moneda": "USD" }
  ]
}
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `ingreso_mensual` | decimal | ✅ | `> 0` |
| `nivel_endeudamiento` | número | ✅ | `0 <= n <= 100` (porcentaje) |
| `frecuencia_ahorro` | string | ✅ | `Nula` \| `Baja` \| `Media` \| `Alta` (case-insensitive) |
| `transacciones` | array | ✅ | mínimo 3, máximo 500 |
| `transacciones[].descripcion` | string | ✅ | 1-200 chars, no vacío |
| `transacciones[].valor` | decimal | ✅ | `> 0` (se interpreta como gasto - ver RN4) |
| `transacciones[].fecha` | date | ❌ | ISO-8601. Default: hoy |
| `transacciones[].moneda` | string | ❌ | ISO-4217. Default: `moneda` raíz o `USD` |
| `moneda` | string | ❌ | ISO-4217. Default `USD` |

**Salida 200** - superconjunto del ejemplo del enunciado (los 4 campos del
enunciado están **exactamente** como los pide; el resto es nuestro valor agregado):

```json
{
  "perfil_financiero": "En observación",
  "probabilidad": 0.82,
  "resumen_gastos": {
    "alimentacion": 420,
    "transporte": 300,
    "entretenimiento": 40
  },
  "recomendaciones": [
    "Monitorear los gastos recurrentes de entretenimiento",
    "Aumentar la reserva financiera mensual"
  ],

  "perfil_codigo": "en_observacion",
  "probabilidades": {
    "saludable": 0.11,
    "en_observacion": 0.82,
    "en_riesgo": 0.07
  },
  "indicadores": {
    "tasa_ahorro": 0.831,
    "ratio_endeudamiento": 0.25,
    "ratio_gasto_ingreso": 0.169,
    "ratio_gasto_esencial": 0.16,
    "ratio_gasto_discrecional": 0.009,
    "concentracion_gasto": 0.553,
    "frecuencia_ahorro_num": 2,
    "ratio_recurrente": 0.053
  },
  "transacciones_clasificadas": [
    { "descripcion": "Supermercado", "valor": 420, "categoria": "alimentacion",    "confianza": 0.96 },
    { "descripcion": "Combustible",  "valor": 300, "categoria": "transporte",      "confianza": 0.94 },
    { "descripcion": "Streaming",    "valor": 40,  "categoria": "entretenimiento", "confianza": 0.91 }
  ],
  "recomendaciones_detalle": [
    {
      "codigo": "REC_DISCRECIONAL_ALTO",
      "texto": "Monitorear los gastos recurrentes de entretenimiento",
      "parametros": {},
      "prioridad": "media",
      "indicador": "ratio_recurrente"
    },
    {
      "codigo": "REC_CONCENTRACION",
      "texto": "Mas de la mitad de tu gasto esta en la categoria Alimentación: revisa si es sostenible",
      "parametros": { "categoria": "alimentacion" },
      "prioridad": "media",
      "indicador": "concentracion_gasto"
    }
  ],
  "moneda": "USD",
  "idioma": "es",
  "modelo_version": "1.0.0",
  "analizado_en": "2026-07-13T14:30:00Z"
}
```

> ⚠️ **`perfil_financiero` es la etiqueta legible** (`"En observación"` / `"Em
> observação"` / `"Under observation"`, según `Accept-Language`) porque así lo
> muestra el enunciado. `perfil_codigo` es el slug estable (`en_observacion`) -
> **es el que consume el frontend y el que se guarda en BD.**
> Misma lógica en `resumen_gastos`: las claves son **siempre los slugs**, nunca las
> etiquetas traducidas. Un `resumen_gastos` con la clave `"Alimentação"` rompería
> todos los gráficos al cambiar de idioma.
>
> **`recomendaciones_detalle[].codigo` + `parametros`** permiten que el frontend
> renderice su propio texto si quiere. `texto` es la versión ya traducida por el
> backend, para quien consuma la API directamente (el jurado con `curl`).

### `POST /api/v1/transacciones/clasificar` · público

Clasificación sola, sin análisis de perfil (lo pide el enunciado como endpoint aparte).

```jsonc
// Entrada
{ "transacciones": [ { "descripcion": "Farmacia del Ahorro", "valor": 150 } ] }

// Salida 200
{
  "modelo_version": "1.0.0",
  "transacciones_clasificadas": [
    { "descripcion": "Farmacia del Ahorro", "valor": 150, "categoria": "salud", "confianza": 0.93 }
  ]
}
```

## §4 Auth

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/api/v1/auth/registro` | público | `{email, password, moneda_principal, nombre, apellido, fecha_nacimiento, genero?, telefono?, ciudad?, idioma?}` → 201 + usuario. Password mín. 10 chars. Ver §4.1. |
| POST | `/api/v1/auth/login` | público | `{email, password, codigo_totp?}` → `{access_token, refresh_token, expira_en, requiere_2fa}` |
| POST | `/api/v1/auth/refresh` | público* | `{refresh_token}` → nuevo par. **Rotación**: el refresh usado se revoca. |
| POST | `/api/v1/auth/logout` | 🔒 | Revoca el refresh token actual. |
| POST | `/api/v1/auth/2fa/iniciar` | 🔒 | → `{secreto, otpauth_uri}` para el QR. |
| POST | `/api/v1/auth/2fa/activar` | 🔒 | `{codigo_totp}` → confirma y activa. Devuelve códigos de respaldo. |
| POST | `/api/v1/auth/2fa/codigos-respaldo` | 🔒 | Regenera los códigos de respaldo (borra los anteriores). |
| DELETE | `/api/v1/auth/2fa` | 🔒 | `{password}` → desactiva 2FA. **La UI ya no lo expone** (ADR-0013). |
| GET | `/api/v1/usuarios/me` | 🔒 | Perfil del usuario. |
| PATCH | `/api/v1/usuarios/me` | 🔒 | `{ingreso_mensual?, nivel_endeudamiento?, frecuencia_ahorro?, moneda_principal?, idioma?}` |

**Login con 2FA activo**: si el usuario tiene 2FA y no manda `codigo_totp`, el
login responde **200** con `{ "requiere_2fa": true }` y **sin tokens**. El cliente
pide el código y reintenta. (No 401: el password era correcto.)

> 🔒 **2FA OBLIGATORIO** ([ADR-0013](../adr/0013-2fa-obligatorio-en-registro.md)):
> se configura durante el registro (alta → `2fa/iniciar` → `2fa/activar`), así que
> **todo usuario activo tiene 2FA** y el login **siempre** exige `codigo_totp`.

### §4.1 Datos personales en el alta

`USUARIOS` exige `nombre`, `apellido` y `fecha_nacimiento` (NOT NULL), así que el
registro los recibe. `genero` (`M`|`F`), `telefono`, `ciudad` e `idioma` son opcionales.
La edad **no se envía ni se guarda**: se calcula desde `fecha_nacimiento`.

**`ciudad` es el NOMBRE de una del catálogo** (`GET /api/v1/ciudades`), no texto
libre: en la BD es una FK (`usuario.ciudad_id`). Se resuelve sin distinguir
mayúsculas ni acentos (`São Paulo` = `Sao Paulo`), y **si no está en el catálogo
la API responde 422** sobre el campo `ciudad`. No se ignora en silencio: un dato
que la persona rellena y desaparece sin aviso es peor que un error — es
exactamente el fallo que tuvo esta pantalla.

**`idioma`** es el idioma con el que se hizo el alta. Si no se manda, la cuenta
queda en `es` aunque el registro se haya hecho en `/pt`, y al entrar desde otro
dispositivo la app se abre en el idioma equivocado.

El usuario que devuelven el alta, el login y `GET /usuarios/me` trae la ciudad
**aplanada** en tres campos — `ciudad`, `estado_region` y `pais` — para que el
perfil no tenga que conocer la tabla `ciudad`.

**Tokens**: access JWT HS256, TTL **15 min**, claims `sub` (id), `email`, `rol`.
Refresh opaco (random 256 bits), TTL **7 días**, guardado **hasheado** en BD,
rotativo. Reúso de un refresh ya usado → **se revoca toda la familia** y se
audita (detección de robo de token).

## §5 Transacciones (🔒 usuario autenticado)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/v1/transacciones?desde&hasta&categoria&pagina&tam` | Lista paginada del usuario. |
| POST | `/api/v1/transacciones` | Alta manual. `{descripcion, valor, moneda?, fecha?}` → clasifica al vuelo. |
| POST | `/api/v1/transacciones/importar` | **CSV** (`multipart/form-data`). Máx 5 MB / 5.000 filas. |
| PATCH | `/api/v1/transacciones/{id}` | Corrige la categoría → `categoria_origen = "usuario"` (RN3). |
| DELETE | `/api/v1/transacciones/{id}` | Borra. |

**Formato del CSV** (cabecera obligatoria, separador `,`, UTF-8):

```csv
fecha,descripcion,valor,moneda
2026-07-01,Supermercado La Comer,-1240.50,MXN
2026-07-02,Salario julio,28000.00,MXN
```

Respuesta del import: `{ "importadas": 148, "rechazadas": 2, "errores": [{ "fila": 17, "error": "valor no es un numero" }] }`
- import **parcial permitido**: las filas válidas entran, las rotas se reportan.

## §6 Análisis (🔒 usuario autenticado)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/v1/analisis` | Ejecuta el análisis sobre las transacciones del usuario en un rango y **lo persiste**. Body: `{desde?, hasta?}`. Devuelve el mismo cuerpo que §3 + `id`. |
| GET | `/api/v1/analisis?pagina&tam` | **Historial** de análisis (resumen). |
| GET | `/api/v1/analisis/{id}` | Un análisis completo (foto inmutable - RN1). |
| GET | `/api/v1/analisis/evolucion?desde&hasta` | **Serie temporal** para el gráfico de evolución. |

`GET /analisis/evolucion` → 200:

```json
{
  "moneda": "MXN",
  "puntos": [
    { "fecha": "2026-05-31", "perfil_codigo": "en_riesgo",      "probabilidad": 0.77, "tasa_ahorro": -0.05, "ratio_endeudamiento": 0.48 },
    { "fecha": "2026-06-30", "perfil_codigo": "en_observacion", "probabilidad": 0.61, "tasa_ahorro":  0.04, "ratio_endeudamiento": 0.41 },
    { "fecha": "2026-07-31", "perfil_codigo": "saludable",      "probabilidad": 0.68, "tasa_ahorro":  0.18, "ratio_endeudamiento": 0.33 }
  ]
}
```

## §6.1 Banca (🔒 usuario autenticado)

El banco **ya tiene** estos datos (ver `CAMBIOS_INTERFACES.md`): la app los lee, y
solo las tarjetas y los eventos se administran desde la interfaz.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/v1/cuentas` | Cuentas del usuario (`CUENTAS_BANCARIAS`). |
| GET | `/api/v1/tarjetas` | Tarjetas + subtipo crédito (límite, día de corte, día de pago). |
| POST | `/api/v1/tarjetas` | Alta de tarjeta. |
| PATCH | `/api/v1/tarjetas/{id}` | Edita tarjeta (incluye `estado`: activa/bloqueada/cancelada). |
| DELETE | `/api/v1/tarjetas/{id}` | Baja de tarjeta. |
| GET | `/api/v1/buro/salud` | Score de buró vigente + historial (`HISTORIAL_BURO`). |
| GET | `/api/v1/eventos` | Eventos de calendario del usuario. |
| POST | `/api/v1/eventos` | Crea evento `{fecha, titulo, tipo, monto?}`. |
| PATCH | `/api/v1/eventos/{id}` | Edita evento. |
| DELETE | `/api/v1/eventos/{id}` | Borra evento. |

`GET /transacciones` acepta además `?tarjeta={id}` para filtrar por tarjeta, y cada
transacción incluye `comercio`, `medio_operacion`
(`app_movil`|`portal_web`|`cajero`|`sucursal`|`pos`) e `id_tarjeta`.

`tipo` de evento: `pago` | `cobro` | `recordatorio` (slugs, no se traducen).

> ⚠️ Estas rutas son **extensión del contrato** introducida por el frontend `0.2.0`
> y todavía **no están implementadas en backend**. Al formalizarlas conviene
> revisarlas con el equipo (y, para los eventos, crear la tabla propuesta en
> `CAMBIOS_BASE_DATOS.md` §5).

## §7 Operación

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/api/v1/salud` | público | `{estado, version, ml: {estado, modelo_version}, bd: {estado}}` - el LB y el túnel lo usan. |
| GET | `/api/v1/monedas` | público | Monedas soportadas + tasa vigente (desde la caché en BD). |
| GET | `/api/v1/categorias` | público | Catálogo de las 12 categorías (slug + etiqueta). **El frontend lo consume, no hardcodea la lista.** |
| GET | `/api/v1/ciudades` | público | `{ciudades: [{id, nombre, estado_region, pais}]}`. Público porque lo pide el **formulario de registro**, donde aún no hay token. |
| GET | `/api/v1/auditoria` | 🔒 admin | Eventos de seguridad, paginado. |

## §8 Códigos HTTP

| Código | Cuándo |
|---|---|
| 200 | OK |
| 201 | Recurso creado (registro, alta de transacción) |
| 400 | JSON malformado |
| 401 | Sin token, token expirado o inválido |
| 403 | Autenticado pero sin permiso (RN9: intenta ver datos de otro) |
| 404 | No existe (o no es tuyo - devolvemos 404, no 403, para no filtrar existencia) |
| 409 | Email ya registrado |
| 422 | Validación de negocio (campos inválidos, < 3 transacciones, ingreso ≤ 0) |
| 429 | Rate limit / bloqueo por intentos fallidos. Incluye header `Retry-After`. |
| 500 | Error interno (con `traza_id`; nunca detalle interno al cliente) |
| 503 | El servicio de ML no responde. **Nunca se inventa una predicción.** |

> **`503` es importante**: si FastAPI está caído, la API **no** devuelve un
> resultado degradado ni mock. Devuelve 503 y el frontend muestra
> error + "Reintentar". Es la regla de CERO datos mock, aplicada al backend.

## §9 CORS y rate limiting

- **CORS**: solo los orígenes del frontend, en `FV_CORS_ORIGINS`. En producción
  son `https://fintechvital.com` y `https://www.fintechvital.com`; en desarrollo,
  `http://localhost:3000`. **Nunca `*`**: un origen ajeno recibe **403**.
- **Rate limit**. ⚠️ **Lo único implementado hoy es el bloqueo por fuerza
  bruta**: tras **5 fallos** de login sobre el mismo email → **15 min**
  bloqueado, con `429` y `Retry-After`. Eso sí está y funciona.

  Lo demás de esta sección era el diseño y **no se llegó a implementar**, así que
  queda como pendiente, no como contrato cumplido:

  - ⬜ `/auth/login`, `/auth/registro`: 5 req / min / IP.
  - ⬜ `/analisis-financiero` y `/transacciones/clasificar` (públicos): 20 req / min / IP.
  - ⬜ Resto autenticado: 100 req / min / usuario.

  No hay nginx en el despliegue: la única capa delante es Cloudflare, y en el
  plan gratuito no hay reglas de rate limit configuradas. Los dos endpoints
  públicos llaman al servicio de modelo sobre **1 OCPU**, así que es el hueco más
  accionable que queda abierto. Ver
  [`../seguridad/SEGURIDAD.md`](../seguridad/SEGURIDAD.md) §5.

## §10 Idioma (`Accept-Language`) 🌎

El proyecto es trilingüe: **`es`** (default) · **`pt`** · **`en`**
([ADR-0009](../adr/0009-multi-idioma.md)).

**Resolución del idioma**, en este orden:

1. Cabecera `Accept-Language: pt` (o `pt-BR`, `en-US`… se toma solo el primer
   subtag).
2. Si el usuario está autenticado y no mandó la cabecera → su `usuario.idioma`.
3. Si nada de lo anterior, o el idioma no está soportado → **`es`**. **Nunca 4xx por
   un idioma desconocido**: se cae al default en silencio.

**Qué se traduce y qué NO** - esta tabla es la que hay que respetar:

| Se traduce ✅ | NO se traduce nunca ❌ |
|---|---|
| `perfil_financiero` (la etiqueta legible) | `perfil_codigo` (`en_observacion`) |
| `recomendaciones[]` (el array de strings) | `recomendaciones_detalle[].codigo` |
| `recomendaciones_detalle[].texto` | Las **claves** de `resumen_gastos` (son slugs) |
| `etiqueta` en `GET /api/v1/categorias` | `categoria` en `transacciones_clasificadas` |
| `mensaje` de los errores | `codigo` de los errores (`VALIDACION_ENTRADA`) |
| | Los nombres de los `indicadores` |

> 🔴 **La regla de oro: los identificadores nunca se traducen; el texto para humanos,
> siempre.** Si un día `resumen_gastos` llegara con la clave `"Alimentação"`, todos
> los gráficos del frontend se romperían al cambiar de idioma - y sería un bug muy
> difícil de ver.

**Respuesta**: siempre incluye `"idioma": "pt"` y la cabecera
`Content-Language: pt`, para que quede claro en qué idioma se respondió.

**Ejemplo** - mismo análisis, `Accept-Language: pt`:

```json
{
  "perfil_financiero": "Em observação",
  "probabilidad": 0.82,
  "resumen_gastos": { "alimentacion": 420, "transporte": 300, "entretenimiento": 40 },
  "recomendaciones": [
    "As despesas registradas cobrem apenas 17% da sua renda: adicione mais transações para uma análise mais precisa"
  ],
  "perfil_codigo": "en_observacion",
  "idioma": "pt"
}
```

Fíjate: **cambió el texto, no cambiaron las claves ni los slugs.**

**Implementación**: `MessageSource` de Spring con `ResourceBundle`
(`mensajes_es.properties`, `mensajes_pt.properties`, `mensajes_en.properties`).
El motor de reglas devuelve `codigo` + `parametros`; **jamás una frase hardcodeada**.
