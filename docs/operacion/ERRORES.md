# Catálogo de errores

Todo error de la API devuelve **esta forma**, siempre. Nunca un stacktrace, nunca un
HTML de Spring, nunca un `500` pelado.

```json
{
  "codigo": "VALIDACION_ENTRADA",
  "mensaje": "La solicitud tiene campos invalidos",
  "detalles": [
    { "campo": "ingreso_mensual", "error": "debe ser mayor que 0" }
  ],
  "traza_id": "9f2c1a5e-4b7d-4a1e-8c3f-0d6e2b9a7c11"
}
```

`detalles` puede ser `[]`. **`traza_id` siempre está** y se loguea junto al error:
es lo que permite que un usuario diga "me falló" y se pueda encontrar el log exacto.

> **Regla: al agregar un código de error nuevo, se agrega a esta tabla en el mismo
> PR.** Un catálogo desactualizado es peor que ninguno.

## Validación (422)

| Código | Cuándo |
|---|---|
| `VALIDACION_ENTRADA` | Falla genérica de validación (el detalle está en `detalles`) |
| `TRANSACCIONES_INSUFICIENTES` | Menos de 3 transacciones (RN7) |
| `TRANSACCIONES_EXCEDIDAS` | Más de 500 en una sola petición |
| `INGRESO_INVALIDO` | `ingreso_mensual <= 0` (RN7) - no se puede dividir por cero |
| `ENDEUDAMIENTO_INVALIDO` | Fuera de `[0, 100]` |
| `FRECUENCIA_AHORRO_INVALIDA` | No es `Nula`/`Baja`/`Media`/`Alta` |
| `MONEDA_NO_SOPORTADA` | No está en la lista de [`TAXONOMIA`](../datos/TAXONOMIA.md) §6 |
| `CATEGORIA_INVALIDA` | Se intentó asignar una categoría fuera de las 12 |
| `CSV_INVALIDO` | Cabecera incorrecta o archivo ilegible |
| `CSV_DEMASIADO_GRANDE` | > 5 MB o > 5.000 filas |

## Autenticación y autorización

| Código | HTTP | Cuándo |
|---|---|---|
| `CREDENCIALES_INVALIDAS` | 401 | Email o contraseña incorrectos. **El mensaje NO distingue cuál** (evita enumeración de usuarios) |
| `TOKEN_EXPIRADO` | 401 | El access token venció → el cliente usa el refresh |
| `TOKEN_INVALIDO` | 401 | Firma inválida o malformado |
| `REFRESH_INVALIDO` | 401 | No existe, expiró o fue revocado |
| `REFRESH_REUSADO` | 401 | ⚠️ **Se reusó un refresh ya consumido → se revocó toda la familia.** Se audita: es señal de robo de token |
| `CODIGO_2FA_INVALIDO` | 401 | El TOTP no coincide |
| `REQUIERE_2FA` | 200 | *No es un error*: el login fue correcto pero falta el código. Se responde `{"requiere_2fa": true}` sin tokens |
| `SIN_PERMISO` | 403 | Autenticado, pero el rol no alcanza |
| `EMAIL_YA_REGISTRADO` | 409 | |
| `PASSWORD_DEBIL` | 422 | Menos de 10 caracteres |
| `CUENTA_BLOQUEADA` | 429 | 5 fallos de login → 15 min. Incluye `Retry-After` |
| `LIMITE_EXCEDIDO` | 429 | Rate limit. Incluye `Retry-After` |

> **`SIN_PERMISO` (403) NO se usa para "el recurso no es tuyo".** Para eso se
> devuelve **404** (`NO_ENCONTRADO`): un 403 confirmaría que el recurso existe, y eso
> ya es una filtración. Ver [`../seguridad/SEGURIDAD.md`](../seguridad/SEGURIDAD.md) §3.

## Recursos

| Código | HTTP | Cuándo |
|---|---|---|
| `NO_ENCONTRADO` | 404 | No existe **o no es tuyo** (RN9) |
| `JSON_MALFORMADO` | 400 | No parsea |

> **Una URL que no existe y no lleva token responde `NO_AUTENTICADO` (401), no
> 404** (desde 2026-08-20). Es consecuencia de que la API pase a exigir token por
> defecto: antes, lo que no estuviera declarado quedaba abierto. El cuerpo sigue
> siendo el sobre de siempre, con su `codigo` y su `traza_id`.
>
> A cambio, un desconocido no puede usar la API para averiguar **qué rutas
> existen**. Con token, un recurso ajeno o inexistente sigue devolviendo
> `NO_ENCONTRADO` (404), que es lo que importa para la RN9. Ver
> [`../seguridad/SEGURIDAD.md`](../seguridad/SEGURIDAD.md) §3.

## Sistema

| Código | HTTP | Cuándo |
|---|---|---|
| `ML_NO_DISPONIBLE` | **503** | ⚠️ El servicio de ML no responde (timeout 5 s o error). **NUNCA se devuelve una predicción inventada ni un valor por defecto.** El frontend muestra error + "Reintentar" |
| `MODELO_NO_CARGADO` | 503 | El ML está vivo pero no pudo cargar el `.joblib` |
| `BD_NO_DISPONIBLE` | 503 | La BD no responde |
| `ERROR_INTERNO` | 500 | Lo inesperado. **El detalle va al log con el `traza_id`, nunca al cliente** |

> **`ML_NO_DISPONIBLE` es el error más importante de esta tabla.** Es la regla de
> **cero datos falsos** aplicada al backend: si el modelo no puede predecir, lo
> decimos. No hay "modo degradado" que invente un perfil financiero - en fintech eso
> sería peor que fallar.

## Errores del servicio de ML (interno)

Misma forma. Solo los ve Spring, nunca el usuario final.

| Código | HTTP |
|---|---|
| `VALIDACION_ENTRADA` | 422 |
| `MODELO_NO_CARGADO` | 503 |
| `ERROR_INTERNO` | 500 |
