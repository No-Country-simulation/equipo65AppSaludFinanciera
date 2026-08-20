# Seguridad

Dominio **fintech** + **repositorio público** + **aplicación publicada en
internet**. Las tres cosas suben la vara.

> **Este documento distingue tres estados, siempre**: ✅ *implementado y
> verificado*, 🟡 *implementado pero sin comprobar*, ⬜ *decidido y NO hecho*.
> Un documento de seguridad que describe intenciones como si fueran controles es
> peor que no tenerlo: hace que nadie vaya a mirar.
>
> Última revisión contra el código y contra producción: **2026-08-20**.

## §1 La regla número uno

> 🔴 **EL REPOSITORIO ES PÚBLICO. NINGÚN SECRETO ENTRA AL REPO. NUNCA.**

Un secreto commiteado a un repo público se considera **comprometido para siempre**,
aunque se borre en el commit siguiente: los bots de escaneo lo encuentran en
minutos, y el historial de git lo conserva.

**Lo que NUNCA se commitea:**

| | Dónde vive en su lugar |
|---|---|
| Llaves de API de OCI y llaves SSH | Fuera del repo, en la carpeta a la que apunta `OCI_LLAVES_DIR` |
| Los OCID, la huella y el namespace de la cuenta | `ops/oci/oci.env`, gitignorado. La plantilla `oci.env.ejemplo` sí se versiona, con placeholders |
| La clave de firma del JWT (`FV_JWT_SECRETO`) | OCI Vault → `ops/.env.prod` → `/opt/fintechvital/.env` en `0600` |
| La clave interna API↔ML (`FV_CLAVE_INTERNA`) | Igual |
| El token del túnel de Cloudflare | Igual |
| La contraseña de PostgreSQL | Igual |
| Cualquier `.env` con valores reales | Solo se publican los `.env.ejemplo`, con placeholders |
| Volcados de la base de datos | Fuera del repo. `*.dump` está en `.gitignore` |

**Defensas activas hoy:**

- ✅ **`.gitignore` en tres niveles** (raíz, `frontend/`, y reglas propias de cada
  módulo) con `*.env`, `*.pem`, `*.key`, `*.p12`, `*.jks`, `*.tfstate*`,
  `wallet*.zip`, `.oci/`. Se conservan reglas de tecnologías que ya no usamos
  (wallet de Oracle, Terraform) **a propósito**: un certificado filtrado no se
  puede "desfiltrar", y la regla no molesta.
- ✅ **Auditoría manual antes de publicar.** La última (2026-08-20) revisó los
  473 archivos publicables: sin llaves privadas, sin tokens, sin OCID reales, sin
  IPs públicas, y sin ninguno de esos archivos en el historial.
- ⬜ **`gitleaks` en pre-commit y en CI.** **Está decidido y NO está montado**: no
  existe `.github/workflows/` en el repositorio ni ningún hook instalado. Mientras
  no lo esté, el control es el de arriba — humano, y por tanto olvidable. Es el
  hueco más barato de tapar de toda esta lista.

**Si un secreto se filtra igual**: (1) **rotarlo inmediatamente** - es lo primero,
antes que nada; (2) revocar el anterior; (3) recién después limpiar el historial.
Limpiar el historial sin rotar es teatro.

## §2 Autenticación (ver [ADR-0004](../adr/0004-auth-propio-jwt.md))

| Control | Implementación | |
|---|---|---|
| Contraseñas | **BCrypt cost 12**, mínimo 10 caracteres | ✅ |
| Access token | JWT HS256, TTL **15 min** (`FV_JWT_TTL_ACCESS`) | ✅ |
| Refresh token | Opaco, **hasheado en BD**, TTL 7 días, **rotativo** | ✅ |
| **Detección de robo** | Reúso de un refresh consumido → revoca toda la familia + audita | ✅ implementado · ⬜ **sin test** |
| 2FA | TOTP propio (RFC 6238), verificado con los vectores del estándar, con códigos de respaldo de un solo uso | ✅ |
| Bloqueo por fuerza bruta | **5 fallos** sobre el mismo email → **15 min** (429 + `Retry-After`) | ✅ |
| Auditoría | Tabla `evento_auditoria` (login, cambio de contraseña, baja…) | ✅ escribe · ⬜ sin endpoint para leerla |

### ⚠️ El 2FA es obligatorio en la interfaz, no en la API

[ADR-0013](../adr/0013-2fa-obligatorio-en-registro.md) dice "2FA obligatorio", y
el alta de la web y del móvil **efectivamente lo impone**: el registro es un flujo
de cuatro pasos (cuenta → finanzas → QR y verificación → códigos de respaldo) del
que no se sale sin activar el segundo factor.

Pero **el servidor no lo exige**. `AuthService` pide el código TOTP solo
`if (credenciales.isTotpActivo())`, así que quien llame a la API directamente —
con `curl`, o desde Swagger — puede registrarse y usar la cuenta **sin 2FA**.

No es una contradicción escondida: es una decisión de alcance, porque el endpoint
público del enunciado y el alta tenían que poder probarse con un `curl`. Pero hay
que decirlo como es. Cerrarlo de verdad significaría marcar la cuenta como
*incompleta* hasta activar el TOTP y rechazar el resto de endpoints mientras
tanto.

**Reglas no negociables al escribir la auth:**

1. **No se inventa criptografía.** Spring Security + `jjwt`. La única pieza propia
   es el TOTP, y se aceptó **porque se verifica contra los vectores de prueba de
   la RFC 6238**, que están en `TotpServiceTest`.
2. **Comparación en tiempo constante** para tokens y códigos TOTP
   (`MessageDigest.isEqual`), no `String.equals` - evita *timing attacks*.
3. **El token en claro jamás** se guarda en BD, se loguea, ni aparece en un error.
4. **La clave del JWT sale del entorno**, nunca del código. La aplicación avisa si
   mide menos de 32 bytes, y el valor por defecto dice en su propio texto que es
   solo para desarrollo.

## §3 Autorización (RN9) - la regla que más fácil se rompe

> **Un usuario solo ve sus propios datos. Sin excepciones.**

- ✅ **TODA** query filtra por `usuario_id` **sacado del JWT**, nunca de un
  parámetro de la petición. Si un endpoint recibe `?usuario_id=`, está mal
  diseñado.
- ✅ Si un recurso existe pero **no es tuyo** → **404**, no 403. Un 403 confirma
  que el recurso existe, y eso ya es una filtración.
- ⬜ **NO hay un test que lo compruebe.** El backend tiene cuatro archivos de
  test — indicadores, motor de reglas, TOTP y el de contexto — y ninguno cubre el
  aislamiento entre usuarios.

> 🔴 **Este es el peor hueco del proyecto.** No porque esté mal implementado
> (está bien: el `usuario_id` sale del token en todos los servicios), sino porque
> **nada avisaría si dejara de estarlo**. Un `findAll()` en una refactorización
> apresurada convierte la aplicación en un visor de datos ajenos y todos los
> tests siguen en verde. Si solo se escribe **un** test más en este proyecto, es
> este.

### Por defecto se exige token (desde 2026-08-20)

`SecurityConfig` terminaba en `.anyRequest().permitAll()` y abría `/api/**`
entero. Con todas las rutas declaradas explícitamente arriba, **no dejaba nada al
descubierto**, pero significaba que un endpoint nuevo nacía **público** salvo que
alguien se acordara de protegerlo: la autorización fallaba *abierta*.

Ahora termina en `.anyRequest().authenticated()` y el comodín está acotado a
`/api/auth/**`, que son los alias heredados sin `/v1`. El olvido se nota con un
401 en vez de pasar desapercibido.

## §4 Entrada y datos

| Riesgo | Defensa | |
|---|---|---|
| **SQL injection** | JPA y consultas parametrizadas. **Nunca** concatenar SQL | ✅ |
| **Bomba de CSV** | Máx **5 MB** y **5.000 filas**, validado antes de parsear | ✅ |
| **Payload gigante** | Entre **3 y 500** transacciones por análisis → 422 | ✅ |
| **XSS** | React escapa por defecto. **Nunca** `dangerouslySetInnerHTML` con datos del usuario (una descripción de transacción **es** dato del usuario) | ✅ |
| **Errores que filtran** | Respuesta uniforme con `traza_id`. El stacktrace va al log, **nunca** al cliente | ✅ comprobado en producción: 404 y 422 devuelven el JSON del catálogo |
| **Enumeración de usuarios** | El mensaje de login no distingue "no existe" de "contraseña incorrecta" | ✅ |
| **CORS** | Orígenes explícitos por entorno en `FV_CORS_ORIGINS`. **Nunca `*`** | ✅ comprobado: un origen ajeno recibe **403** en producción |
| **Dinero** | `DECIMAL(12,2)` en BD, `BigDecimal` en Java, `Decimal` en Python. **Nunca `double`** | ✅ |

## §5 Red (ver [ADR-0005](../adr/0005-infra-oci-privada.md))

- ✅ **Cero reglas de ingress desde internet.** La instancia no tiene IP pública,
  no hay puerto abierto y no hay SSH expuesto. Los puertos del host solo escuchan
  en `127.0.0.1`.
- ✅ El **Cloudflare Tunnel** es una conexión **saliente**. Es estrictamente más
  seguro que abrir el 443 y poner un firewall delante: no hay nada que escanear.
- ✅ **OCI Bastion** es el único acceso administrativo, con sesiones efímeras y
  una lista blanca de IP de origen.
- ✅ El **servicio de ML no está expuesto**: vive en la red interna, sin publicar
  puerto, y solo la API lo llama.
- 🟡 **TLS y anti-DDoS los pone Cloudflare.** El **WAF con reglas gestionadas es
  de pago**; en el plan gratuito hay protección DDoS y poco más. No conviene
  contarlo como si hubiera un WAF configurado, porque no lo hay.

### Lo que la API publica sin token, y por qué

| Ruta | Por qué es pública |
|---|---|
| `POST /analisis-financiero` y `/api/v1/analisis-financiero` | **Es literal del enunciado.** El jurado tiene que poder probarlo con un `curl`, sin registrarse |
| `POST /api/v1/transacciones/clasificar` | Igual: el segundo endpoint del enunciado |
| `GET /api/v1/salud` | Comprobación de vida |
| `GET /api/v1/categorias`, `/monedas`, `/ciudades` | Catálogos. `ciudades` lo pide el **formulario de registro**, donde todavía no hay token |
| `POST /api/v1/auth/registro`, `/login`, `/refresh` | Obvio |
| `GET /api/v1/docs` y `/openapi.json` | Documentación. Es el **requisito 6** del enunciado |

**Todo lo demás exige token**, y cada consulta filtra además por el usuario del
token (§3).

### Sobre publicar Swagger: por qué se queda

Publicar la especificación de una API **no es una vulnerabilidad**. Lo que
protege un endpoint es la autenticación, no que su ruta sea difícil de adivinar;
una API cuya seguridad depende de que nadie conozca sus rutas ya está rota, y un
atacante las descubre igual con un diccionario. Stripe, GitHub y Twilio publican
la suya entera.

Además, aquí **es un entregable**: el enunciado pide "API documentada" y el
jurado va a entrar a `/api/v1/docs`. Quitarlo de producción restaría sin sumar
seguridad.

Lo que sí hay que vigilar es lo que Swagger **facilita**, que es descubrir y
disparar los endpoints públicos desde un botón:

> ⬜ **Los dos endpoints públicos del enunciado NO tienen límite de peticiones**,
> y son los que llaman al servicio de modelo. El
> [`CONTRATO_API`](../arquitectura/CONTRATO_API.md) §9 promete *20 req/min/IP*
> sobre `/analisis-financiero` y *100 req/min/usuario* en el resto: **eso no está
> implementado**. Lo único que existe es el bloqueo de login por email (§2).
>
> Importa por dónde corre: **1 OCPU compartida con otra aplicación en
> producción**. Un bucle contra `/analisis-financiero` es la forma más barata de
> tumbar la máquina, y Swagger lo pone a un clic. **Es el hueco de seguridad más
> accionable que queda.**

### La consola de H2 estaba publicada (corregido)

`spring.h2.console.enabled` venía en `true` por defecto y `SecurityConfig` dejaba
`/h2-console/**` abierto, así que el servlet quedaba servido en producción:
`https://api.fintechvital.com/h2-console/` respondía **200**.

**No era explotable**: H2 rechaza conexiones remotas mientras no se active
`webAllowOthers`, y respondía *"remote connections are disabled"*. Tampoco había
RCE conocida — la versión es H2 2.2.224, posterior a los CVE de `RUNSCRIPT`.

Pero es superficie que no pinta nada ahí: la base de producción es PostgreSQL, la
consola no sirve para nada, revela qué hay debajo, y **una sola opción de
configuración la habría convertido en un cliente SQL abierto a internet dentro de
la red privada** — exactamente lo que el diseño de §5 evita. Ahora el valor por
defecto es `false`; en local se enciende con `SPRING_H2_CONSOLE_ENABLED=true`.

> ⚠️ **Requiere redespliegue para surtir efecto**: mientras no se vuelva a
> publicar la imagen de la API, la consola sigue servida en producción.

## §6 Datos personales

> ⚠️ **Cambió con la publicación.** Mientras el proyecto solo corría en local, se
> podía afirmar que no había datos personales reales. **Ya no**:
> `fintechvital.com` está abierto a internet y **cualquiera puede registrarse con
> su correo real y cargar sus movimientos**. Eso son datos personales, y de los
> sensibles: información financiera.

- ✅ **El dataset de entrenamiento es sintético**: no hay PII real en los
  modelos. Es una ventaja legal y conviene decirlo.
- ✅ **La base de producción arranca vacía**, sin cuentas de ejemplo. Las del demo
  (`ana.torres@ejemplo.mx` y compañía) solo existen en local y en staging.
- ✅ **Exportación y baja de cuenta** están implementadas
  (`GET /usuarios/me/exportacion`, `DELETE /usuarios/me`), que es lo que pediría
  el derecho de acceso y de supresión.
- ✅ Las contraseñas y los tokens se tratan como de producción, porque **ahora lo
  son**.
- 🟡 **Encuadre legal.** El proyecto es una demo de hackathon y así lo dicen los
  términos, pero desde que acepta altas reales conviene no escribir que "no
  aplica" ninguna normativa. Lo prudente para la entrega: mantener la base **sin
  datos que no sean del propio equipo**, y no promocionar el registro fuera del
  jurado. Ver los legales de la web (`/legales`, `/privacidad`).

## §7 Checklist previo a la entrega

Lo marcado ✅ se comprobó el **2026-08-20**, contra producción donde aplica.

| | ✅ |
|---|---|
| Ni una credencial en el repo ni en el historial | ✅ auditado a mano sobre los 473 archivos publicables. ⚠️ **No con `gitleaks`**: no está montado (§1) |
| No hay `.env`, wallet, `.tfstate` ni `.pem` en el repo | ✅ |
| CORS no es `*` | ✅ un origen ajeno recibe **403** en producción |
| Ningún endpoint devuelve un stacktrace | ✅ 404 y 422 devuelven el JSON del catálogo con `traza_id` |
| Nada de administración expuesto (actuator, consola de BD) | ✅ no hay actuator; H2 **apagado por defecto** — ⚠️ **pendiente de redesplegar** (§5) |
| La API por defecto exige token | ✅ `anyRequest().authenticated()` desde el 2026-08-20 (§3) |
| **Rate limit en los endpoints públicos** | ⬜ **no implementado**. Es el hueco más accionable (§5) |
| El test de aislamiento por usuario (RN9) está y pasa | ⬜ **no existe** (§3) |
| El test de reúso de refresh token está y pasa | ⬜ **no existe**; la lógica sí está |
| Las dependencias no tienen CVEs críticos (`npm audit`, `pip-audit`, OWASP dependency-check) | ⬜ |
| En el video no se ve **ninguna** credencial | ⬜ |

### Si solo hay tiempo para tres cosas

1. **Rate limit en `/analisis-financiero` y `/transacciones/clasificar`.** Es lo
   único de esta lista que un tercero puede usar hoy contra la máquina.
2. **El test de aislamiento por usuario.** Barato de escribir, y protege la regla
   que más caro sale romper.
3. **Redesplegar** para que la consola de H2 deje de estar servida.
