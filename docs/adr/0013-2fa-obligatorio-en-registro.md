# ADR-0013 - El 2FA es obligatorio y se configura en el registro

- **Estado**: Aceptada
- **Fecha**: 2026-07-24
- **Matiza**: [ADR-0004](0004-auth-propio-jwt.md) (auth propio con JWT), donde el
  2FA TOTP figuraba como **opcional**.

## Contexto

Hasta ahora el 2FA era un "activar si querés" dentro del perfil: la cuenta nacía
sin segundo factor y el usuario podía activarlo (o no) más tarde. En la práctica
eso significa que **casi nadie lo activa**, y para un producto que muestra el
comportamiento financiero de una persona es una postura débil de seguridad.

Además, el flujo opcional tenía dos problemas concretos en la interfaz:

1. La web mostraba el secreto TOTP **como texto** (`<code>{secreto}</code>`), no
   como QR escaneable: en la práctica, inusable con una app autenticadora.
2. La app móvil directamente **no tenía** flujo de 2FA.

El modelo de datos del equipo ya soporta el caso obligatorio: `USUARIOS_SEGURIDAD`
(1:1, con `totp_secret` y `totp_activo`) y `CODIGOS_RESPALDO_2FA`.

## Decisión

**El 2FA es obligatorio y se configura durante el registro.**

- El alta es un asistente: crear cuenta → **mostrar QR** (desde `otpauth_uri`) →
  confirmar con un código → **entregar códigos de respaldo**. La cuenta no queda
  operativa hasta completarlo.
- **El login siempre pide el código TOTP** tras la contraseña.
- **No hay "desactivar 2FA"** en la interfaz. El perfil solo permite **regenerar
  los códigos de respaldo**. `DELETE /auth/2fa` se mantiene en el contrato para no
  romperlo, pero la UI no lo expone.
- Los **códigos de respaldo** son la única vía de recuperación.

Un usuario activo siempre tiene `totp_activo = TRUE`; `totp_activo = FALSE` solo
existe durante el alta, entre `iniciar` y `activar`.

## Alternativas consideradas

- **Seguir opcional** (estado previo): descartada. Es la opción cómoda pero deja
  la seguridad en manos de la inercia del usuario; casi nadie lo activaría, y el
  jurado puede señalarlo con razón en una app financiera.
- **Obligatorio pero configurable después** (banner insistente): descartada. Añade
  estados intermedios (cuenta activa sin 2FA) que hay que manejar en cada pantalla,
  a cambio de poco.
- **Añadir una librería de QR**: descartada a favor de un **encoder propio en TS
  puro** (`src/lib/qr.ts`), sin dependencias, verificado bit a bit contra la
  librería `qrcode`. Evita sumar dependencias distintas en web y en Expo.

## Consecuencias

- ✅ Todas las cuentas nacen con segundo factor. Postura defendible ante el jurado.
- ✅ El QR es real y escaneable en web y móvil, con el mismo código de generación.
- ❌ El alta es más larga (3 pasos). Mitigación: el asistente muestra el progreso y
  los pasos son cortos.
- ❌ **Riesgo de bloqueo del usuario** si pierde el teléfono y los códigos. Es el
  costo aceptado de la obligatoriedad; por eso los códigos se entregan con opción
  de descarga y se pueden regenerar desde el perfil.
- ⚠️ **En el mock nada se valida**: `activar2fa` solo comprueba que el código tenga
  6 dígitos y el login no verifica el TOTP. La validación real (derivar el código
  del secreto, ventana de tiempo, anti-replay con `totp_ultimo_paso`) es
  responsabilidad del backend, que todavía no existe.
