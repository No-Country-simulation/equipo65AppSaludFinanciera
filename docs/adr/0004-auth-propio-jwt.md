# ADR-0004 - Autenticación propia con JWT (sin proveedor externo)

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13

## Contexto

El dashboard necesita cuentas de usuario. El dominio es **fintech**: un jurado
espera ver seguridad tomada en serio, no un login de juguete.

El equipo **quiere construirlo desde cero** para poder integrar varias capas de
seguridad y aprender en el proceso. Hay 3 personas de backend con capacidad para
hacerlo bien.

## Decisión

**Autenticación propia con Spring Security**, sin proveedor externo:

- Registro/login con email + contraseña. **BCrypt cost 12**, mínimo 10 caracteres.
- **Access token**: JWT HS256, TTL 15 min.
- **Refresh token**: opaco (256 bits aleatorios), TTL 7 días, guardado **hasheado**
  (SHA-256) en BD, **rotativo**.
- **Detección de robo de token**: el reúso de un refresh ya consumido revoca **toda
  la familia** de tokens y genera un evento de auditoría.
- **2FA con TOTP** (RFC 6238), opcional, con códigos de respaldo de un solo uso.
- **Rate limiting** (nginx + Spring) y **bloqueo de 15 min tras 5 intentos fallidos**.
- **Auditoría** de eventos de seguridad en tabla dedicada.

## Alternativas consideradas

**OAuth con Google.** No hay que manejar contraseñas, menos superficie de ataque.
Descartada: requiere crear credenciales en Google Cloud (dependencia externa y un
pendiente para Angel), complica la demo offline, y -lo decisivo- **el equipo
explícitamente quiere construir la auth**. Además, un login "Entrar con Google" no
demuestra nada de seguridad ante el jurado.

**Proveedor externo (Supabase Auth, Auth0, Keycloak).** Rápido y sólido.
Descartada: mete una dependencia **fuera de OCI**, y el jurado evalúa la
arquitectura sobre OCI. Keycloak además sería un cuarto contenedor pesado en una
instancia de 6 GB.

**Sesiones con cookie de servidor** en vez de JWT. Sería *más simple y más seguro*
para una app monolítica. Descartada porque el frontend es una SPA/Next.js separada
del backend y el JWT encaja mejor con el modelo de la API pública. *(Nota honesta:
para este caso concreto la diferencia de seguridad es marginal; se elige JWT por
encaje arquitectónico, no porque sea "mejor".)*

## Consecuencias

**A favor:**

- Cero dependencias fuera de OCI.
- Las 4 capas de seguridad (refresh rotativo, 2FA, rate limit, auditoría) son
  **material concreto para la presentación** en un dominio donde eso importa.
- Los 3 de backend tienen un bloque de trabajo claro, autónomo y bien delimitado.

**En contra (asumido - y hay que respetarlo):**

- **Hay que hacerlo bien.** Escribir autenticación es donde más fácil se
  introducen vulnerabilidades. Reglas no negociables:
  - **No se inventa criptografía.** Se usa Spring Security, `jjwt` (o
    `java-jwt`) y una librería TOTP conocida. **Nunca** una implementación propia
    de HMAC, de hashing o de comparación de tokens.
  - El JWT se firma con una clave de **≥ 256 bits** que sale de **OCI Vault**, no
    de `application.yml`.
  - La comparación de tokens y códigos TOTP usa **comparación en tiempo constante**
    (evita timing attacks).
  - El token en claro **jamás** se guarda en BD, ni se loguea, ni aparece en un
    mensaje de error.
- **El logout de un JWT no es instantáneo**: el access token sigue siendo válido
  hasta que expira (máximo 15 min). Es el trade-off inherente a los JWT. Lo
  aceptamos: el TTL corto lo acota, y el refresh sí se revoca al instante.
- Más código que mantener y que testear. Los tests de auth son **obligatorios**
  (ver [`../proceso/PRUEBAS.md`](../proceso/PRUEBAS.md)).
