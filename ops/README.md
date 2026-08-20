# ops/ — encender el proyecto entero

> **¿Buscas el despliegue en la nube (fintechvital.com)?**
> Explicado para cualquiera: [`DESPLIEGUE_NUBE.md`](DESPLIEGUE_NUBE.md) ·
> Referencia técnica y procedimiento manual:
> [`DESPLIEGUE_NUBE_TECNICO.md`](DESPLIEGUE_NUBE_TECNICO.md)


Un solo comando levanta **base de datos + modelo + API + web** en contenedores.
No hace falta instalar Java, Node, Python ni PostgreSQL en tu equipo: va todo
dentro.

```powershell
.\ops\stack.ps1 arriba         # Windows
```
```bash
./ops/stack.sh arriba          # Linux / macOS
```

Cuando termine te dice la dirección que hay que abrir en el navegador. Y para
comprobar que funciona de verdad (no solo que arrancó):

```bash
./ops/stack.sh probar
```

Si no sabes qué comando usar, pide la lista explicada:

```bash
./ops/stack.sh ayuda
```

## Lo único que tienes que instalar

**Docker Desktop** o **Podman**, cualquiera de los dos. El script detecta el que
tengas y, si está apagado, lo enciende él.

| | |
|---|---|
| Docker Desktop | `winget install Docker.DockerDesktop` |
| Podman *(más ligero, sin permisos de administrador)* | `.\frontend\scripts\windows\verificar-requisitos.ps1 -InstalarPodman` |

> **Si acabas de instalarlo, no cierres la terminal ni la reabras.** El script
> vuelve a leer el PATH por su cuenta, así que encuentra Docker aunque la
> consola que tienes abierta todavía no lo vea.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `arriba` | Enciende todo. **Túnel incluido** si el entorno trae token |
| `probar` | Comprueba de verdad: esquema, migraciones, taxonomía, semilla, login real, el endpoint del enunciado y la web |
| `abajo` | Lo apaga, **túnel incluido**. **Los datos se conservan** |
| `estado` | Qué está encendido, y en qué direcciones responde |
| `logs [servicio]` | Lo que dice un servicio por dentro (`db`, `api`, `ml`, `web`, `tunel`) |
| `reiniciar` | Apaga y enciende sin reconstruir |
| `rebuild` | Reconstruye las imágenes desde cero |
| `efimero` | Enciende en primer plano; al pulsar **Ctrl+C borra contenedores, red y datos**. Para probar sin dejar nada |
| `migrar` | Aplica migraciones nuevas sobre una base que ya existe |
| `psql` | Consola SQL (no necesitas tener `psql` instalado) |
| `tunel` | Como `arriba`, pero **falla** si falta el token en vez de seguir sin túnel |
| `limpiar` | **Borra los datos** y empieza de cero. Pide confirmación escrita |
| `ayuda` | La lista completa, explicada en castellano |

Opciones: `-Motor docker|podman` (`MOTOR=` en bash) · `-Entorno .env.staging`
(`ENTORNO=`) · `-Solo db,api` · `-Servicio` para `logs` · `-PuertosFijos`
(`PUERTOS_FIJOS=si`).

```bash
# staging, con el túnel y el dominio público
.\ops\stack.ps1 tunel -Entorno .env.staging
ENTORNO=.env.staging ./ops/stack.sh tunel
```

---

## Si el puerto está ocupado, se aparta solo

El motivo más común de que esto no arranque es que otro programa ya esté usando
el 3000, el 8080 o el 5432 — un `npm run dev` olvidado, un PostgreSQL instalado
en el equipo, otro proyecto. Antes, compose fallaba con `port is already
allocated` sin decir quién lo ocupaba.

Ahora el script lo comprueba **antes** de arrancar y, si hace falta, usa el
siguiente puerto libre:

```
[AVISO] El puerto 3000 lo esta usando otro programa (node). Pongo la web en el 3001.
[AVISO] El puerto 8080 lo esta usando otro programa (java). Pongo la API en el 8081.
[ --  ] La web se construira apuntando a la API en el puerto 8081.
```

Tres detalles que importan:

- **La web se reconstruye apuntando al puerto nuevo de la API.** Sin esto la web
  cargaría pero el login daría `TypeError: Failed to fetch`, porque el navegador
  seguiría pidiendo al 8080, donde ya no hay nadie.
- **Si el puerto lo ocupa tu propio stack, no se mueve nada**: es el proyecto ya
  encendido, y compose reutiliza el contenedor.
- **`estado` y `probar` siguen los puertos de verdad**, preguntándoselos al
  contenedor. Aunque el `.env` diga 3000 y esté corriendo en 3001, aciertan.

Se comprueban dos cosas distintas, porque una sola deja huecos: que el puerto se
pueda **abrir** en `127.0.0.1` (detecta el choque duro con otro contenedor) y
que no haya **nadie escuchando** en él (Windows deja convivir un `0.0.0.0:3000`
ajeno con nuestro `127.0.0.1:3000`, y entonces «localhost:3000» es ambiguo y
acabas mirando la aplicación equivocada sin enterarte).

Para desactivarlo — por ejemplo si un túnel o un proxy dependen del número
exacto — usa `-PuertosFijos` (`PUERTOS_FIJOS=si`): entonces falla en vez de
moverse.

---

## Cuando algo no va

### «Docker no responde» justo después de instalarlo

Ya no debería pasar. Windows solo lee el PATH al abrir una terminal **nueva**,
así que la que tenías abierta no veía el programa recién instalado. El script
relee el PATH del registro y mira también las carpetas de instalación
habituales, así que lo encuentra igualmente:

```
[ --  ] Docker estaba instalado pero esta consola no lo veia (PATH antiguo). Ya lo encontre.
```

### «podman no tiene subcomando compose»

Podman **no trae compose incorporado**: usa el de Docker. Si tienes Docker
Desktop instalado, el script encuentra su `docker-compose.exe` solo. Si no:

```powershell
winget install Docker.DockerCompose      # solo esa pieza, ~10 MB
winget install Docker.DockerDesktop      # o Docker entero
```

El script ya no elige un motor que esté encendido pero **no sepa leer el
compose**: comprueba las dos cosas antes, en vez de fallar a mitad del build.

### `failed to solve: process "/bin/sh -c npm run build"`

La web no llegó a compilar. **La última línea no es el error** — es solo el
resumen. Sube por el registro hasta la primera línea que empiece por
`Type error`, `Error:` o `Module not found`: ahí están el archivo y la línea.

Si **no hay ninguna** y el registro corta de golpe, casi siempre es falta de
**memoria**: el equipo mata el proceso sin decir nada. Se arregla dándole más
RAM a WSL en `%UserProfile%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

Después `wsl --shutdown` y volver a abrir Docker.

Para pedir ayuda al equipo, manda el registro **completo**, no una captura de la
última línea:

```powershell
.\ops\stack.ps1 arriba *> registro-error.txt
```
```bash
./ops/stack.sh arriba > registro-error.txt 2>&1
```

### `TypeError: Failed to fetch` en el navegador

La web cargó, pero **no consigue hablar con la API**. Por orden de probabilidad:

1. **La API no está encendida.** Compruébalo: `.\ops\stack.ps1 estado` — la
   columna STATUS tiene que decir `healthy` en `api`. Si el stack falló al
   construir, no hay API y esto es lo que se ve.
2. **Estás usando `npm run dev` suelto en `frontend/web`, sin el resto.** Esa
   web no tiene API contra la que hablar. O levantas el stack entero con
   `arriba`, o levantas al menos la base y la API con `-Solo db,api,ml`.
3. **La web apunta a un puerto donde no hay nadie.** `NEXT_PUBLIC_API_URL` se
   **hornea en el build** (ver abajo). Si la cambiaste, hace falta `rebuild`.
4. **CORS**, solo si web y API están en dominios distintos (staging). Los
   orígenes permitidos se pasan por `FV_CORS_ORIGINS`.

### La base de datos parece corrupta o quiero empezar de cero

```bash
./ops/stack.sh limpiar     # borra los datos, pide confirmación escrita
./ops/stack.sh arriba      # se recrea vacía (con la semilla, si FV_CARGAR_DEMO=si)
```

> `limpiar` **ahora sí borra de verdad**. Hasta ahora, en Windows, el `-v` se
> perdía por el camino y el volumen sobrevivía: parecía que había limpiado y no
> era cierto.

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
| `PUERTO_WEB` · `PUERTO_API` · `PUERTO_DB` | Puertos del **host**. Si están ocupados, el script usa otros |

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
| `ml` | `fintechvital/ml:local` | *(interno)* | FastAPI + scikit-learn. **No publica puerto**: solo lo llama la API |
| `web` | `fintechvital/web:local` | 3000 | Next.js 15 (`output: standalone`) |
| `migrador` | *(perfil `migrar`)* | — | Un solo uso: aplica migraciones pendientes |
| `tunel` | `cloudflare/cloudflared` | *(perfil `tunel`)* | Publica el stack en el dominio |

Los puertos se publican en **`127.0.0.1`** a propósito: en Podman rootless sobre
WSL2 el reenvío a `0.0.0.0` no siempre llega, y además evita exponer la base de
datos a la red local sin querer.

---

## Cloudflare Tunnel (dominio público)

**El túnel va pegado al ciclo de vida del stack**: se enciende con `arriba` y se
apaga con `abajo`. No hay que acordarse de nada.

```bash
# En el archivo de entorno (ops/.env, ops/.env.staging...)
CLOUDFLARE_TUNNEL_TOKEN=<el token del túnel>

ENTORNO=.env.staging ./ops/stack.sh arriba    # levanta stack + túnel
ENTORNO=.env.staging ./ops/stack.sh abajo     # apaga los dos
```

La condición es tener token: **si el entorno no lo trae, el stack sube igual y
el túnel se queda apagado**, que es justo lo que queremos en local (`ops/.env`
no lleva token). Sin esa comprobación `cloudflared` arrancaría sin credenciales
y entraría en bucle de reinicio.

`tunel` sigue existiendo como atajo explícito: hace lo mismo que `arriba` pero
**aborta** si falta el token, en vez de seguir en silencio sin publicar nada.

> Al apagar, el perfil se pasa **siempre**, haya token o no: si alguien levantó
> el túnel y después vació el token, sin eso el contenedor quedaría huérfano.

`cloudflared` corre **dentro del compose**, así que comparte red con los demás
servicios. En el panel de Cloudflare, los *public hostnames* apuntan a los
**nombres de servicio**, no a `localhost`:

| Hostname | Servicio |
|---|---|
| `staging.fintechvital.com` | `http://web:3000` |
| `api-staging.fintechvital.com` | `http://api:8080` |

### ¿Por qué el origen es `http` y no `https`?

Porque son **dos tramos distintos**, y el que ve el público sí es HTTPS:

```
navegador  --HTTPS-->  borde de Cloudflare  --túnel cifrado-->  cloudflared  --HTTP-->  web:3000
           (TLS del                          (QUIC/HTTP2 con    (mismo contenedor de
            dominio)                          credencial mTLS)   compose que la web)
```

Cloudflare **termina el TLS en su borde**: `https://staging.fintechvital.com` es
HTTPS de verdad, con certificado válido. Lo que va en `http://` es únicamente lo
que `cloudflared` habla con `web` y `api`, y ese tramo **nunca sale de la red de
compose** — de hecho los puertos ni siquiera están publicados hacia fuera.

Poner HTTPS ahí no aportaría nada y empeoraría las cosas: habría que generar
certificados autofirmados para `web` y `api` y luego decirle a `cloudflared` que
**no los verifique** (`noTLSVerify`), que es cifrado sin autenticación. Este es
el patrón que recomienda Cloudflare, no un atajo.

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

Cada servicio tiene techo (`db` 512 MB, `api` 768 MB, `ml` 512 MB, `web`
512 MB), así que los contenedores no crecen sin control.

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

⚠️ Cuidado con bajarlo **demasiado**: por debajo de ~4 GB, el build de la web
(Next.js compila 50 páginas) se queda sin memoria y muere sin mensaje claro.

Si aun así molesta, `./ops/stack.sh efimero` deja la máquina exactamente como
estaba al pulsar Ctrl+C.
