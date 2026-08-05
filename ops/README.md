# ops/ — levantar el proyecto entero

Un solo comando levanta **base de datos + API + web** en contenedores. Es el
mismo `compose.yml` en local, en staging y en producción: lo que cambia es el
archivo de entorno.

```bash
./ops/stack.sh arriba          # Linux / macOS
.\ops\stack.ps1 arriba         # Windows
```

Y para comprobar que todo funciona de verdad:

```bash
./ops/stack.sh probar
```

Funciona igual con **Docker** y con **Podman**: el script detecta cuál hay vivo
y, si hace falta, arranca la máquina de Podman o Docker Desktop.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `arriba` | Construye y levanta todo en segundo plano |
| `efimero` | Levanta en **primer plano**; al salir con **Ctrl+C borra contenedores, red y volumen**. Para probar sin dejar nada ocupando RAM ni disco |
| `abajo` | Para y elimina los contenedores. **Los datos se conservan** |
| `estado` | Qué está corriendo |
| `logs [servicio]` | Sigue los logs (`logs db`, `logs api`, `logs web`) |
| `probar` | Pruebas de humo: esquema, migraciones, taxonomía, semilla, API y web |
| `rebuild` | Reconstruye las imágenes sin caché |
| `migrar` | Aplica migraciones nuevas sobre una base que ya existe |
| `psql` | Consola SQL (no necesitas tener `psql` instalado) |
| `tunel` | Levanta el stack + Cloudflare Tunnel (dominio público) |
| `limpiar` | Borra contenedores **y el volumen de datos**. Pide confirmación escrita |

Opciones: `-Motor docker|podman` (`MOTOR=` en bash) · `-Entorno .env.staging`
(`ENTORNO=` en bash) · `-Servicio` para `logs`.

```bash
# staging, con el tunel y el dominio publico
.\ops\stack.ps1 tunel -Entorno .env.staging
ENTORNO=.env.staging ./ops/stack.sh tunel
```

---

## Configuración

`ops/.env` se crea solo la primera vez a partir de `ops/.env.ejemplo`. **Está
gitignoreado**: el repositorio es público.

Lo mínimo que hay que revisar:

| Variable | Nota |
|---|---|
| `FV_PROYECTO` | **Aísla el entorno.** Un valor distinto por `.env`. Ver abajo |
| `POSTGRES_PASSWORD` | **Obligatoria.** En local cualquier cosa; fuera de local, generada y guardada fuera del repo |
| `FV_CARGAR_DEMO` | `si` en desarrollo · **`no` en producción** |
| `NEXT_PUBLIC_API_URL` | ⚠️ Se **hornea en el build**. Ver abajo |
| `PUERTO_WEB` · `PUERTO_API` · `PUERTO_DB` | Puertos del **host**. Distintos por entorno si quieres levantar varios a la vez |

### Varios entornos en la misma máquina

`FV_PROYECTO` da nombre al proyecto de compose, a los contenedores y al volumen
de datos. Con un valor distinto por entorno, **local y staging conviven**:

| | `.env` | `.env.staging` |
|---|---|---|
| `FV_PROYECTO` | `fintechvital` | `fintechvital-staging` |
| Contenedores | `fintechvital-db`, `-api`, `-web` | `fintechvital-staging-db`, `-api`, `-web` |
| Volumen | `fintechvital_datos_db` | `fintechvital-staging_datos_db` |
| Web · API | `:3000` · `:8080` | `:3100` · `:8180` |

```bash
./ops/stack.sh arriba                          # local
ENTORNO=.env.staging ./ops/stack.sh tunel      # staging, a la vez
```

> Antes de esto, todos los entornos compartían el mismo nombre: levantar staging
> **tumbaba el local** y reutilizaba su volumen. Como las contraseñas de base de
> datos son distintas por entorno, la API se quedaba en
> `password authentication failed` sin explicación aparente.

⚠️ **Cambiar `FV_PROYECTO` equivale a empezar de cero**: contenedores y volumen
nuevos. La base anterior sigue existiendo bajo el nombre viejo hasta que la
borres a mano.

### ⚠️ La trampa de `NEXT_PUBLIC_API_URL`

Es una variable de Next.js: se incrusta en el JavaScript **durante el build**.
Cambiarla y reiniciar el contenedor **no hace nada** — hay que reconstruir:

```bash
./ops/stack.sh rebuild
```

Y quien hace esa llamada es **el navegador del usuario**, no el contenedor. Por
eso tiene que ser una URL que el navegador pueda resolver:

| Entorno | Valor |
|---|---|
| local | `http://localhost:8080/api/v1` |
| staging | `https://api-staging.fintechvital.com/api/v1` |
| producción | `https://api.fintechvital.com/api/v1` |

Poner `http://api:8080` no funciona: ese nombre solo existe dentro de la red de
contenedores.

---

## Servicios

| Servicio | Imagen | Puerto local | Notas |
|---|---|---|---|
| `db` | `fintechvital/db:local` | 5432 | PostgreSQL 16 con esquema y semilla dentro |
| `api` | `fintechvital/api:local` | 8080 | Spring Boot sobre JRE 21 |
| `web` | `fintechvital/web:local` | 3000 | Next.js 15 (`output: standalone`) |
| `migrador` | *(perfil `migrar`)* | — | Un solo uso: aplica migraciones pendientes |
| `tunel` | `cloudflare/cloudflared` | *(perfil `tunel`)* | Publica el stack en el dominio |

Los puertos se publican en **`127.0.0.1`** a propósito: en Podman rootless sobre
WSL2 el reenvío a `0.0.0.0` no siempre llega, y además evita exponer la base de
datos a la red local sin querer.

---

## Cloudflare Tunnel (dominio público)

```bash
# En ops/.env
CLOUDFLARE_TUNNEL_TOKEN=<el token del túnel>

./ops/stack.sh tunel
```

`cloudflared` corre **dentro del compose**, así que comparte red con los demás
servicios. En el panel de Cloudflare, los *public hostnames* apuntan a los
**nombres de servicio**, no a `localhost`:

| Hostname | Servicio |
|---|---|
| `staging.fintechvital.com` | `http://web:3000` |
| `api-staging.fintechvital.com` | `http://api:8080` |

**No hay que cambiar ningún puerto.** Lo que sí hay que hacer:

1. Reconstruir la web con `NEXT_PUBLIC_API_URL=https://api-staging.fintechvital.com/api/v1`
   (ya está en `ops/.env.staging`).
2. ✅ **CORS**: resuelto en `backend/.../config/CorsConfig.java`. Los orígenes se
   pasan por `FV_CORS_ORIGINS` y el preflight de `/api/auth/login` responde
   `access-control-allow-origin: https://staging.fintechvital.com`. Un origen
   ajeno recibe **403**.
3. Para probar el móvil contra staging:
   `EXPO_PUBLIC_API_URL=https://api-staging.fintechvital.com/api/v1`. Con el
   dominio público, el teléfono ya **no necesita estar en la misma Wi-Fi**.

Si `cloudflared` se lanza suelto con `docker run`, **no puede ver** a `web` ni a
`api`: está en otra red. Por eso está integrado en el compose.

---

## Consumo de memoria

Cada servicio tiene techo (`db` 512 MB, `api` 768 MB, `web` 512 MB), así que los
contenedores no crecen sin control.

En **Windows**, sin embargo, lo que se ve en el administrador de tareas es
`Vmmem`/`WSL`: la VM de WSL2 en la que corre el motor. Por defecto puede tomar
**hasta la mitad de la RAM del equipo** y no la devuelve. Se limita creando
`%UserProfile%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

Después `wsl --shutdown` y volver a arrancar el motor. Con eso el stack completo
se mueve cómodo en ~4 GB en vez de crecer hasta 8–16 GB.

Si aun así molesta, `./ops/stack.sh efimero` deja la máquina exactamente como
estaba al pulsar Ctrl+C.
