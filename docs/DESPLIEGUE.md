# Despliegue

De la máquina de cada uno a `fintechvital.com`. Es el **mismo `compose.yml`** en
los tres entornos; lo único que cambia es el archivo de entorno.

| Entorno | Archivo | Dominio | Datos de ejemplo |
|---|---|---|---|
| local | `ops/.env` | `localhost` | `si` |
| staging | `ops/.env.staging` | `staging.fintechvital.com` | `si` |
| producción | `ops/.env.prod` | `fintechvital.com` | **`no`** |

```bash
./ops/stack.sh arriba                       # local
ENTORNO=.env.staging ./ops/stack.sh tunel   # staging
ENTORNO=.env.prod    ./ops/stack.sh arriba  # producción
```

En Windows: `.\ops\stack.ps1 arriba -Entorno .env.prod`.

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

`ops/.env.prod` ya está escrito (no viaja en el repo: `.gitignore` lo excluye por
`.env.*`). Lleva secretos propios, distintos de los de staging, y la base
**arranca vacía**.

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
así que no basta con cambiarlo después. Consecuencia a tener presente: **la suite
`frontend/e2e/contrato.mjs` no corre contra producción**, porque inicia sesión con
la cuenta de ejemplo `ana.torres@ejemplo.mx`, que aquí no existe. Contra
producción se comprueba el endpoint público del enunciado y un alta real.

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

- [ ] `ENTORNO=.env.prod ./ops/stack.sh probar` en verde
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

Para desplegar en las instancias de OCI sin compilar allí:

```bash
# Construir
docker build -t ghcr.io/no-country-simulation/fintechvital-db:0.4.0  db/
docker build -t ghcr.io/no-country-simulation/fintechvital-api:0.4.0 backend/
docker build -t ghcr.io/no-country-simulation/fintechvital-web:0.4.0 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fintechvital.com/api/v1 \
  frontend/web/

# Publicar
echo "$GHCR_TOKEN" | docker login ghcr.io -u <usuario> --password-stdin
docker push ghcr.io/no-country-simulation/fintechvital-db:0.4.0
docker push ghcr.io/no-country-simulation/fintechvital-api:0.4.0
docker push ghcr.io/no-country-simulation/fintechvital-web:0.4.0
```

> ⚠️ Las instancias de OCI del plan gratuito son **ARM64 (Ampere)**. Si se
> construye en un portátil x86, hay que hacerlo multi-arquitectura o la imagen no
> arranca allí:
>
> ```bash
> docker buildx build --platform linux/amd64,linux/arm64 -t <imagen> --push db/
> ```
>
> Las imágenes base que usamos (`postgres:16-alpine`, `eclipse-temurin:21-jre-alpine`,
> `node:22-alpine`) ya son multi-arquitectura.

En la instancia, `ops/compose.yml` se usa con `image:` en vez de `build:`, y solo
hace falta `docker compose pull && docker compose up -d`.

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
docker exec fintechvital-db pg_dump -U fintechvital -Fc fintechvital > respaldo-$(date +%F).dump
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

Si el túnel o la infraestructura fallan el día de la entrega:
**se corre en local y se graba**. La demo no depende de que OCI esté en pie
([ADR-0008](../frontend/docs/adr/0008-infra-no-bloquea-app.md)).

Por eso la semilla de ejemplo es **determinista**: los mismos datos siempre, en
cualquier máquina. La grabación es reproducible.
