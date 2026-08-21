# Despliegue

De la máquina de cada uno a `fintechvital.com`. Es el **mismo stack** en los tres
entornos; lo que cambia es el archivo de entorno y, en producción, dónde corre.

| Entorno | Archivo | Dónde corre | Dominio | Datos de ejemplo |
|---|---|---|---|---|
| local | `ops/.env` | tu máquina | `localhost` | `si` |
| staging | `ops/.env.staging` | tu máquina, expuesta por el túnel | `staging.fintechvital.com` | `si` |
| **producción** | `ops/.env.prod` | **instancia de OCI** | `fintechvital.com` | **`no`** |

> ✅ **Producción está en pie desde el 2026-08-20** y se opera con
> `ops/oci/desplegar.ps1`, no con `stack.ps1`: las imágenes se construyen para
> **arm64**, se suben a OCI Container Registry y la instancia se las baja. Todo
> el procedimiento está en
> [`../ops/DESPLIEGUE_NUBE_TECNICO.md`](../ops/DESPLIEGUE_NUBE_TECNICO.md), y la
> versión sin tecnicismos en
> [`../ops/DESPLIEGUE_NUBE.md`](../ops/DESPLIEGUE_NUBE.md).
>
> Lo que sigue en este documento es lo **común a los tres entornos** (Cloudflare,
> CORS, variables, migraciones y respaldos).

```bash
./ops/stack.sh arriba                       # local
ENTORNO=.env.staging ./ops/stack.sh tunel   # staging
```

En Windows, `.\ops\stack.ps1 arriba` y `.\ops\stack.ps1 tunel -Entorno .env.staging`.

**Producción va aparte**, porque corre en otra máquina y con imágenes ya
construidas:

```powershell
.\ops\oci\publicar-imagenes.ps1    # construye arm64 y sube a OCIR
.\ops\oci\desplegar.ps1            # despliega en la instancia
.\ops\oci\desplegar.ps1 -Accion estado
```

Ningún `.env` entra al repositorio (están en `.gitignore`); solo `.env.ejemplo`.

---

## Staging con Cloudflare Tunnel

El túnel es la **única puerta de entrada**: no se abre ningún puerto en el router
ni se expone ninguna IP.

### 1. Token en el entorno

```bash
# ops/.env.staging
CLOUDFLARE_TUNNEL_TOKEN=<el token del túnel>
FV_CARGAR_DEMO=si
POSTGRES_PASSWORD=<generada>
NEXT_PUBLIC_API_URL=https://api-staging.fintechvital.com/api/v1
```

### 2. Hostnames en el panel de Cloudflare

`cloudflared` corre **dentro del compose**, así que comparte red con los demás
servicios. Por eso los *public hostnames* apuntan a los **nombres de servicio**:

| Public hostname | Service |
|---|---|
| `staging.fintechvital.com` | `http://web:3000` |
| `api-staging.fintechvital.com` | `http://api:8080` |

> ⚠️ Si lanzas `cloudflared` suelto con `docker run`, **no puede ver** a `web` ni
> a `api`: está en otra red y los nombres no resuelven. Tendría que apuntar a
> `host.docker.internal:3000`. Por eso está integrado en el compose.

### 3. Levantar

```bash
ENTORNO=.env.staging ./ops/stack.sh tunel
```

### ¿Hay que cambiar los puertos?

**No.** Los puertos internos (`3000`, `8080`, `5432`) se quedan igual, y los
publicados en `127.0.0.1` siguen sirviendo para depurar en local. El túnel entra
por la red de contenedores, no por los puertos publicados.

Lo que **sí** hay que hacer son estas tres cosas:

#### 1. Reconstruir la web con la URL pública

`NEXT_PUBLIC_API_URL` se **hornea en el build** de Next.js. Cambiarla y
reiniciar no hace nada:

```bash
ENTORNO=.env.staging ./ops/stack.sh rebuild
```

Y tiene que ser una URL que **el navegador del usuario** pueda resolver
(`https://api-staging.fintechvital.com/api/v1`), no `http://api:8080`, que solo
existe dentro de la red de contenedores.

#### 2. ✅ CORS de la API — resuelto

Con la web en un dominio y la API en otro, **todas** las peticiones del navegador
son *cross-origin*, y sin CORS bien puesto la web se ve pero no carga nada.

Ya no hay `@CrossOrigin(origins = "*")` suelto por los controladores: la
configuración es **global y única**, en
[`CorsConfig.java`](../backend/src/main/java/com/fintechvital/api/config/CorsConfig.java),
con los orígenes por entorno en `FV_CORS_ORIGINS` (separados por comas). Un
origen ajeno recibe **403**.

```
FV_CORS_ORIGINS=http://localhost:3000,https://staging.fintechvital.com
```

#### 3. Móvil contra staging

```bash
# frontend/mobile/.env
EXPO_PUBLIC_API_URL=https://api-staging.fintechvital.com/api/v1
```

Ventaja: con el dominio público, el teléfono físico ya **no necesita estar en la
misma Wi-Fi** que la máquina de desarrollo.

---

## Producción

`ops/.env.prod` (no viaja en el repo: `.gitignore` lo excluye por `.env.*`) lleva
secretos propios, distintos de los de staging, y la base **arranca vacía**. Es el
archivo que `ops/oci/desplegar.ps1` copia a la instancia como `/opt/fintechvital/.env`
con permisos `0600`.

```bash
# ops/.env.prod - lo esencial
FV_PROYECTO=fintechvital-prod                  # aísla contenedores y volumen
POSTGRES_PASSWORD=<generada, fuera del repo>
FV_CARGAR_DEMO=no                              # cero datos mock en la entrega
FV_CARGAR_DATASET=no
FV_JWT_SECRETO=<openssl rand -base64 48>
FV_CLAVE_INTERNA=<openssl rand -base64 32>     # API <-> ML
FV_CORS_ORIGINS=https://fintechvital.com,https://www.fintechvital.com
NEXT_PUBLIC_API_URL=https://api.fintechvital.com/api/v1
CLOUDFLARE_TUNNEL_TOKEN=<token de producción, distinto al de staging>
PUERTO_WEB=3200  PUERTO_API=8280  PUERTO_DB=5633
```

> ⚠️ **`FV_CORS_ORIGINS` hay que definirla explícitamente.** El valor por defecto
> de `compose.yml` **no incluye `www`**, y como ese defecto gana sobre el de
> `CorsConfig.java`, sin esta línea `www.fintechvital.com` carga la web pero el
> navegador bloquea todas las llamadas a la API.

`FV_CARGAR_DEMO=no` **no es opcional**: la regla del proyecto es *cero datos mock
en la entrega*. Solo tiene efecto en el primer arranque sobre un volumen vacío,
así que no basta con cambiarlo después.

### La cuenta del jurado

La única excepción a lo anterior. Producción lleva **una** cuenta de
demostración, `ana.torres@ejemplo.mx`, para que el jurado entre y vea el producto
sin registrarse — el alta obliga a activar 2FA con una app de autenticación, y
eso es una barrera de más para quien solo viene a evaluar. Es también la cuenta
con la que se graba el video.

No se carga con `FV_CARGAR_DEMO` (que ya no puede actuar sobre un volumen con
datos), sino contra la base ya en pie:

```powershell
.\ops\oci\desplegar.ps1 -Accion semilla-jurado
```

Corre [`db/semillas/jurado.sql`](../db/semillas/jurado.sql), que reutiliza la
semilla demo entera y **borra a Bruno, Carla y Emily**: en producción sobra con
un usuario. Es **re-ejecutable a propósito** — la contraseña la tiene gente de
fuera del equipo, así que si alguien le borra los movimientos a Ana, se vuelve a
lanzar y queda como estaba. Conviene hacerlo la víspera de grabar.

La contraseña sale de `FV_PASSWORD_DEMO` en `ops/.env.prod` (gitignoreado) y
**no se publica en el repositorio**: viaja en la entrega de No Country y en la
descripción del video.

> ⚠️ **Sigue sin correrse `frontend/e2e/contrato.mjs` contra producción**, pero
> por otro motivo que antes. Antes fallaba porque Ana no existía allí; ahora
> existe, y el riesgo es el contrario:
>
> - Su contraseña por defecto es `Demo1234!`, no la de producción. Cinco intentos
>   fallidos sobre el mismo correo en 15 minutos **bloquean la cuenta 15 minutos**
>   (`LimitadorLoginService`), y la suite hace bastantes más. Sería una forma
>   tonta de quedarse sin cuenta justo antes de grabar.
> - Da de alta un usuario desechable y lo borra al terminar: filas reales en la
>   base de producción.
> - Corrige la categoría de un movimiento y la deja como estaba, pero
>   `categoria_origen` se queda en `usuario` y ya no vuelve a `modelo`.
>
> Contra producción se comprueban el endpoint público del enunciado y un alta
> real (`ops/ejemplos.mjs`). El contrato se corre en local y en staging.

### Cloudflare: los tres hostnames

El túnel de producción es **suyo propio**. Un token identifica **un** túnel, y
correr el mismo en dos stacks hace que Cloudflare los vea como dos réplicas del
mismo origen y **reparta el tráfico entre ellos**: `fintechvital.com` acabaría
sirviendo staging la mitad de las veces.

En *Zero Trust → Networks → Tunnels →* el túnel de producción *→ Public Hostnames*.
Los destinos son **nombres de servicio**, no `localhost`, porque `cloudflared`
corre dentro del compose y comparte su red:

| Public hostname | Service |
|---|---|
| `fintechvital.com` | `http://web:3000` |
| `www.fintechvital.com` | `http://web:3000` |
| `api.fintechvital.com` | `http://api:8080` |

Al guardar cada hostname, Cloudflare **crea solo el registro DNS** (un `CNAME`
proxied a `<id-del-túnel>.cfargotunnel.com`). No hay que añadirlo a mano, y en el
apex funciona por *CNAME flattening*.

**Redirección `www` → apex** (opcional pero recomendable: evita que Google indexe
el sitio dos veces). *Rules → Redirect Rules → Create*, en el plan gratuito:

- Si `hostname` **equals** `www.fintechvital.com`
- Entonces `Dynamic` → `concat("https://fintechvital.com", http.request.uri.path)`,
  código **301**, *preserve query string*.

Con la redirección puesta, `www` igual necesita su hostname en el túnel y su
origen en `FV_CORS_ORIGINS`: la regla actúa en el borde de Cloudflare, pero si el
hostname no existe el visitante recibe un error 1016 antes de llegar a la regla.

### Antes de publicar

- [ ] `FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs` en verde
- [ ] `FV_CARGAR_DEMO=no` y sin usuarios de ejemplo en la base
- [ ] Contraseñas generadas, distintas de las de staging, fuera del repo
- [ ] `FV_CORS_ORIGINS` con los dos dominios de producción (no `*`, no `localhost`)
- [ ] Token de túnel de producción distinto al de staging
- [ ] Los tres *public hostnames* creados y resolviendo
- [ ] `frontend/web/public/fintech-vital.apk` copiado **antes** del build, o
      `NEXT_PUBLIC_APK_URL` vacía (el APK no viaja en el clon)
- [ ] Copia de seguridad de la base hecha y **restaurada** una vez para comprobar
- [ ] `git log -p` sin ninguna credencial: el repositorio es **público**

---

## Subir las imágenes a un registro

En producción **la instancia no compila nada**: se baja imágenes ya construidas
de **OCI Container Registry (OCIR)**. Un script se encarga de las cuatro:

```powershell
.\ops\oci\publicar-imagenes.ps1              # las 4
.\ops\oci\publicar-imagenes.ps1 -Solo web,api  # solo lo que cambió
```

> ⚠️ Las instancias de OCI del plan gratuito son **ARM64 (Ampere)**. Construir
> en un portátil x86 sin decirlo produce imágenes x86 que **suben sin protestar**
> y solo fallan al arrancar, con un `exec format error` que no dice de dónde
> viene. El script fuerza `--platform linux/arm64`; para que eso no tarde media
> hora bajo emulación, `backend/Dockerfile` compila el `.jar` en la arquitectura
> del anfitrión (`FROM --platform=$BUILDPLATFORM`) y solo la etapa de ejecución
> es arm64.

El detalle — registrar la emulación, el login a OCIR y cómo hacerlo todo a mano
si el script falla — está en
[`../ops/DESPLIEGUE_NUBE_TECNICO.md`](../ops/DESPLIEGUE_NUBE_TECNICO.md) §3 y §5.

En la instancia se usa `ops/compose.oci.yml`, que trae `image:` en vez de
`build:`, y el despliegue hace **`pull` explícito + `up -d --force-recreate`**:
sin lo primero arranca la imagen vieja que tenía cacheada, y sin lo segundo no
recrea nada y aun así reporta éxito.

---

## Base de datos: migraciones en un entorno vivo

El hook del primer arranque **no se vuelve a ejecutar nunca** sobre un volumen
que ya tiene datos. Para aplicar migraciones nuevas:

```bash
ENTORNO=.env.prod ./ops/stack.sh migrar
```

Levanta un contenedor de un solo uso que aplica lo pendiente y se va. Lo
aplicado queda registrado con su SHA-256 en `esquema_historial`; si alguien
editó una migración ya aplicada, **aborta** en vez de dejar dos entornos
distintos en silencio.

Copia de seguridad antes de tocar nada:

```bash
# Local o staging
docker exec fintechvital-db pg_dump -U fintechvital -Fc fintechvital > respaldo-$(date +%F).dump

# En la instancia de OCI (el contenedor se llama distinto: otro proyecto compose)
podman exec fintechvital-prod-db pg_dump -U fintechvital -Fc fintechvital > respaldo-$(date +%F).dump
```

---

## Memoria

Cada servicio tiene techo: `db` 512 MB, `api` 768 MB, `web` 512 MB.

En **Windows**, lo que se ve crecer en el administrador de tareas es `Vmmem`/WSL:
la VM del motor de contenedores, que por defecto puede tomar **hasta la mitad de
la RAM del equipo**. Se limita en `%UserProfile%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

Luego `wsl --shutdown` y volver a arrancar el motor.

Para pruebas rápidas sin dejar nada corriendo, `./ops/stack.sh efimero`: corre en
primer plano y al salir con **Ctrl+C borra contenedores, red y volumen**.

---

## Plan B de la demo

Producción está en pie, pero el plan B sigue vigente: si el túnel o la
infraestructura fallan el día de la entrega, **se corre en local y se graba**. La
demo no depende de que OCI esté en pie
([ADR-0008](../docs/adr/0008-infra-no-bloquea-app.md)).

Por eso la semilla de ejemplo es **determinista**: los mismos datos siempre, en
cualquier máquina. La grabación es reproducible.
