# Despliegue en OCI: referencia técnica

Todo lo necesario para desplegar Fintech Vital en la instancia de Oracle Cloud,
lo que usa cada paso y **cómo hacerlo a mano** si los scripts fallan.

Versión no técnica: [`DESPLIEGUE_NUBE.md`](DESPLIEGUE_NUBE.md).
Entornos y Cloudflare en general: [`../docs/DESPLIEGUE.md`](../docs/DESPLIEGUE.md).

> **Estado**: última subida el **2026-08-21** (§12). Los tres hostnames
> responden 200, `/api/v1/docs` se ve sin token, `ops/ejemplos.mjs` pasa
> **54/54** contra producción y la cuenta del jurado entra sin 2FA.

---

## 1. Topología

```
        Navegador
            |  HTTPS
      [ Cloudflare ]                      certificados, anti-DDoS, cache
            |  túnel saliente (QUIC)
            |  ── no hay puerto abierto en el origen ──
  ┌─────────┴───────────────────────────────────────────────┐
  │  OCI · instancia en subred privada, SIN IP pública       │
  │  VM.Standard.A1.Flex · 1 OCPU · 6 GB · 48 GB · arm64     │
  │  Entrada de administración: solo el Bastion.             │
  │                                                          │
  │  ── podman ROOTLESS ───────────────────  Fintech Vital   │
  │     tunel ──> web:3000                                   │
  │           └─> api:8080 ──┬─> ml:8000                     │
  │                          └─> db:5432 ──> volumen         │
  │     publicados solo en 127.0.0.1: 3200 / 8280 / 5633     │
  │                                                          │
  │  ── podman ROOT ──────────  otra aplicacion, ajena a     │
  │     (no la tocamos)         este repositorio             │
  └──────────────────────────────────────────────────────────┘
```

### La instancia está compartida

La instancia ya alojaba **otra aplicación en producción**, ajena a este
repositorio. Las dos conviven, y el aislamiento es deliberado:

| | Fintech Vital |
|---|---|
| Almacén de contenedores | `podman` **rootless**, usuario `ubuntu` |
| Directorio | `/opt/fintechvital` |
| Proyecto compose | `fintechvital-prod` |
| Puertos del host | solo `127.0.0.1:3200/8280/5633` |
| Túnel | contenedor dentro del propio compose |

La otra aplicación corre como **root** y publica en el `:80` del host. Son dos
almacenes de contenedores distintos: `podman ps` de uno **no ve** al otro, y no
es una convención de nombres sino dos grafos separados.

> ⚠️ **No muevas esto a `sudo podman`.** El mantenimiento del otro stack hace
> `podman container prune -f` e `image prune -f` como root. Hoy no alcanza nada
> nuestro; desplegando Fintech Vital como root, ese `prune` se llevaría por
> delante los contenedores parados — el `migrador`, entre otros — sin avisar.

### Consumo medido (2026-08-20, tras desplegar)

```
Fintech Vital  ~452 MB   api 237 · ml 133 · web 48 · db 18 · túnel 15
Total sistema  1256 MB / 5903 MB   ·   disponible 4647 MB
Disco          15 GB / 48 GB
```

**La memoria y el disco sobran. El recurso escaso es la CPU: 1 OCPU para las
dos aplicaciones.** Por eso todos los servicios llevan techo de `cpus` en
`compose.oci.yml`: no reparten CPU de forma fina, pero evitan que una fuga se
coma el core y deje sin aire al resto de la máquina.

---

## 2. Qué se usa

| Pieza | Para qué | Dónde se configura |
|---|---|---|
| **OCIR** (OCI Container Registry) | Almacén de las 4 imágenes arm64 | `<region>.ocir.io/<namespace>/<repo>/*`, en `oci.env` |
| **OCI Bastion** | Túnel SSH temporal a la VM privada | `ops/oci/_bastion.sh` |
| **OCI Vault** | Guarda `OCIR_TOKEN` | `ops/oci/_desplegar.sh` |
| **Cloudflare Tunnel** | Única entrada pública | servicio `tunel` de `compose.oci.yml` |
| **podman-compose 1.0.6** | Orquestador en la VM | `/opt/fintechvital/compose.oci.yml` |
| **podman + qemu** | Construir arm64 desde x86 | tu máquina |

### Archivos de este repositorio

```
ops/
├── compose.oci.yml              El stack con image: (no build:). Va a la VM.
├── .env.prod                    Secretos y config de producción. NO se commitea.
├── ejemplos.mjs                 Smoke test funcional (sirve contra producción).
└── oci/
    ├── oci.env                  Datos de la cuenta y rutas. NO se commitea.
    ├── oci.env.ejemplo          Plantilla del anterior (esta si se versiona).
    ├── desplegar.ps1            Punto de entrada:  desplegar | estado | logs | bajar
    ├── publicar-imagenes.ps1    Construye arm64 y sube a OCIR
    ├── deployer.Dockerfile      Imagen con oci-cli + ssh (se construye sola)
    ├── _desplegar.sh            Saca el token del Vault y prepara los archivos
    ├── _operar.sh               Genera el script remoto de estado/logs/bajar
    ├── _bastion.sh              Abre el túnel del Bastion y ejecuta en remoto
    └── _remoto-desplegar.sh     Lo que corre DENTRO de la instancia
```

---

## 3. Requisitos previos

### 3.1 Credenciales

Las llaves viven **fuera del repositorio**, en la carpeta a la que apunte
`OCI_LLAVES_DIR`:

| Archivo | Para qué |
|---|---|
| `oci/oci_api_key.pem` | Llave API de OCI (oci-cli) |
| `oci/bastion_rsa` + `.pub` | Sesión del Bastion. **Tiene que ser RSA**: el Bastion no acepta ed25519 |
| `oci/ssh_prod` | Entrar a la VM (ed25519). **Es otra llave, otro salto** |

Los OCID de la cuenta, el registro, la IP de la instancia y la ruta de las
llaves salen de **`ops/oci/oci.env`**, que se crea copiando la plantilla. Ese
archivo **no entra al repositorio** (lo excluye `*.env` del `.gitignore`):

```bash
cp ops/oci/oci.env.ejemplo ops/oci/oci.env    # y rellenarlo
```

Es el único sitio con datos de la cuenta: los scripts no llevan ninguno escrito.

### 3.2 Emulación arm64 (se pierde en cada reinicio de podman)

Las VMs son Ampere (arm64). Sin emulación registrada, el build produce imágenes
x86 que **suben sin protestar** y solo fallan al arrancar, con un `exec format
error` que no dice de dónde viene.

`tonistiigi/binfmt --install arm64` **falla en WSL** (`cannot mount
binfmt_misc`). Se registra a mano, con la bandera `F` (fix-binary, para que el
intérprete funcione dentro de contenedores):

```powershell
podman machine ssh "sudo mount -t binfmt_misc binfmt_misc /proc/sys/fs/binfmt_misc 2>/dev/null; true"
podman machine ssh "printf '%s' ':qemu-aarch64:M::\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\xb7\x00:\xff\xff\xff\xff\xff\xff\xff\x00\xff\xff\xff\xff\xff\xff\xff\xff\xfe\xff\xff\xff:/usr/bin/qemu-aarch64-static:OCF' | sudo tee /proc/sys/fs/binfmt_misc/register"

# Verificar. Tiene que responder aarch64:
podman run --rm --platform linux/arm64 docker.io/library/alpine:3 uname -m
```

> ⚠️ **Efecto secundario: puede romper los builds LOCALES.** Con la emulación
> registrada, un `./ops/stack.sh arriba` puede fallar con
> `exec container process '/bin/sh': Exec format error` **construyendo para tu
> propia máquina**: el intérprete de qemu se cuela donde no toca.
>
> Se nota sobre todo cuando la máquina de podman se ha reiniciado y `stack.sh`
> cae de vuelta en Docker Desktop, que no comparte esa configuración. Si te pasa:
>
> ```bash
> podman machine stop && podman machine start   # limpia el binfmt registrado
> ./ops/stack.sh arriba
> ```
>
> Y vuelve a registrar la emulación solo cuando vayas a publicar imágenes.

### 3.3 Login a OCIR

```powershell
# El token vive en el OCI Vault con el nombre OCIR_TOKEN.
# Usuario y host salen de oci.env (OCIR_USUARIO y OCI_REGION).
podman login <region>.ocir.io -u '<namespace>/Default/tu-correo@ejemplo.com'
```

> **Trampa cara.** No pases el token por tubería en PowerShell
> (`$token | podman login --password-stdin`): PS 5.1 termina cada línea en CRLF,
> podman se traga el `\r` como parte de la contraseña y OCIR responde
> *"invalid username/password"* **con un token perfectamente válido**. Este error
> es de los que cuestan una tarde entera, porque todo apunta a que el token
> caducó. Usa `-p $token` (con el token en una variable ya recortada con
> `.Trim()`), o `--password-stdin` desde bash.

---

## 4. Desplegar (camino corto)

```powershell
# 1. Construir las 4 imágenes arm64 y subirlas
.\ops\oci\publicar-imagenes.ps1

#    Solo lo que cambió (mucho más rápido):
.\ops\oci\publicar-imagenes.ps1 -Solo web,api

# 2. Desplegar en la instancia
.\ops\oci\desplegar.ps1

# 3. Verificar de verdad
$env:FV_API_URL="https://api.fintechvital.com/api/v1"; node ops\ejemplos.mjs
```

Operación:

```powershell
.\ops\oci\desplegar.ps1 -Accion estado    # qué corre, cuánto consume, si responde
.\ops\oci\desplegar.ps1 -Accion logs      # últimas líneas de cada servicio
.\ops\oci\desplegar.ps1 -Accion bajar     # apaga (conserva el volumen)
```

---

## 5. Desplegar a mano, paso a paso

Si los scripts fallan o quieres entender qué hacen. Todo esto es exactamente lo
que automatizan.

### 5.1 Construir y subir las imágenes

```bash
REG=<region>.ocir.io/<namespace>/<repo>        # los valores, en ops/oci/oci.env

podman build --platform linux/arm64 -t $REG/db:latest  db
podman build --platform linux/arm64 -t $REG/ml:latest  ml
podman build --platform linux/arm64 -t $REG/api:latest backend

# La web hornea sus NEXT_PUBLIC_* en el build: tienen que ser las de producción.
podman build --platform linux/arm64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fintechvital.com/api/v1 \
  --build-arg NEXT_PUBLIC_APK_URL=/fintech-vital.apk \
  -t $REG/web:latest frontend/web

for i in db ml api web; do podman push $REG/$i:latest; done
```

> El APK (~110 MB) **no viaja en el clon**. Si no está en
> `frontend/web/public/fintech-vital.apk` cuando construyes la web, el botón de
> descarga da 404 y no se nota hasta que alguien lo pulsa. Genéralo antes con
> `.\ops\publicar.ps1 -SoloApk -Entorno .env.prod`, o construye con
> `NEXT_PUBLIC_APK_URL=` vacío para que la web no pinte el bloque.

### 5.2 Abrir el túnel del Bastion

Necesitas `oci-cli`. Lo más simple es usar la imagen del deployer:

```bash
podman build -f ops/oci/deployer.Dockerfile -t fv-deployer ops/oci
podman run --rm -it \
  -e OCI_CLI_USER=<user_ocid> -e OCI_CLI_TENANCY=<tenancy_ocid> \
  -e OCI_CLI_FINGERPRINT=<fingerprint> -e OCI_CLI_REGION=mx-monterrey-1 \
  -v <OCI_LLAVES_DIR>:/keys:ro -v "$PWD/ops/oci:/fv:ro" \
  fv-deployer bash
```

Ya dentro:

```bash
export OCI_CLI_KEY_FILE=/keys/oci/oci_api_key.pem
BASTION=<OCI_BASTION_OCID de ops/oci/oci.env>

# 1. Crear la sesión de port-forwarding
oci bastion session create-port-forwarding --bastion-id "$BASTION" \
  --target-private-ip <OCI_INSTANCIA_IP> --target-port 22 \
  --ssh-public-key-file /keys/oci/bastion_rsa.pub --session-ttl 10800

# 2. Esperar a que quede ACTIVE y leer su endpoint
oci bastion session get --session-id <ocid-de-la-sesion> \
  --query 'data."ssh-metadata".command' --raw-output

# 3. Abrir el forward local (ojo a las opciones ssh-rsa, ver §9)
ssh -i /keys/oci/bastion_rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa \
    -o StrictHostKeyChecking=no -f -N -L 2202:<OCI_INSTANCIA_IP>:22 \
    <session-ocid>@host.bastion.mx-monterrey-1.oci.oraclecloud.com

# 4. Entrar a la VM (llave DISTINTA)
ssh -i /keys/oci/ssh_prod -p 2202 ubuntu@127.0.0.1
```

### 5.3 En la instancia

```bash
# Como usuario ubuntu, NUNCA con sudo (ver §1).
sudo mkdir -p /opt/fintechvital && sudo chown ubuntu:ubuntu /opt/fintechvital

# Copiados antes por scp: compose.oci.yml y el .env
cd /opt/fintechvital
chmod 600 .env

podman login <region>.ocir.io -u '<namespace>/Default/<correo>'

C="podman-compose --env-file /opt/fintechvital/.env -f /opt/fintechvital/compose.oci.yml"

$C config > /tmp/render.yml     # pre-vuelo: falla aquí si falta una variable
$C pull db api ml web tunel     # EXPLÍCITO: up -d no se baja una :latest nueva
$C up -d
```

### 5.4 Verificar

```bash
# En la instancia
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8280/api/v1/salud   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3200/es/login       # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:80/                 # la otra app de la maquina, intacta

# Desde fuera
curl -sI https://fintechvital.com | head -1
curl -s  https://api.fintechvital.com/api/v1/salud
FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs          # 54/54
```

---

## 6. Supervivencia a reinicios

`restart: unless-stopped` solo actúa mientras el demonio está vivo. Para
contenedores **rootless** hacen falta dos cosas más, y **ninguna viene por
defecto**:

```bash
# 1. Linger: sin esto, systemd cierra la sesión del usuario al desconectar el
#    SSH y se lleva por delante todos sus contenedores.
sudo loginctl enable-linger ubuntu

# 2. Quien los vuelve a levantar tras reiniciar la máquina.
systemctl --user enable --now podman-restart.service
```

Ambas están aplicadas en la instancia (verificado 2026-08-20).

---

## 7. Cloudflare

El token de `ops/.env.prod` identifica **un** túnel. Los *public hostnames* se
configuran en *Zero Trust > Networks > Tunnels > (el túnel) > Public Hostnames*,
y apuntan a **nombres de servicio**, no a `localhost`, porque `cloudflared` corre
dentro del compose y comparte su red:

| Hostname | Service |
|---|---|
| `fintechvital.com` | `http://web:3000` |
| `www.fintechvital.com` | `http://web:3000` |
| `api.fintechvital.com` | `http://api:8080` |

> **Un token, un túnel.** Correr el mismo token en dos stacks hace que Cloudflare
> los vea como dos réplicas del mismo origen y **reparta el tráfico entre ellos**.
> El túnel de producción tiene que ser distinto del de staging.

`FV_CORS_ORIGINS` debe incluir los dos orígenes (`fintechvital.com` y
`www.fintechvital.com`). El valor por defecto del compose **no incluye `www`**,
y sin él la web carga pero el navegador bloquea todas las llamadas a la API.

---

## 8. Trampas (todas se toparon de verdad en este despliegue)

### 8.1 El allowlist del Bastion tiene una sola IP y rota con el ISP

**Síntoma**: `Permission denied (publickey)` al abrir el forward.
**Causa real**: tu IP pública cambió y no está en el CIDR allowlist del Bastion.
**Por qué engaña**: es el mismo mensaje que da un problema de llaves, así que se
diagnostica el problema equivocado. **Comprueba la IP antes de tocar llaves.**

```bash
curl -s ifconfig.me                                             # tu IP ahora
oci bastion bastion get --bastion-id "$BASTION" \
  --query 'data."client-cidr-block-allow-list"'                 # la permitida
oci bastion bastion update --bastion-id "$BASTION" \
  --client-cidr-list '["<TU_IP>/32"]' --force
```

Si la infraestructura se gestiona con Terraform, actualiza también allí el
allowlist: de lo contrario el siguiente `apply` revierte el cambio y el bastión
vuelve a rechazarte.

### 8.2 OpenSSH 9 rechaza las llaves RSA del Bastion

El Bastion exige RSA; OpenSSH 9 desactivó `ssh-rsa` (firma SHA-1) por defecto.
Mismo síntoma que 8.1. Solución: `-o PubkeyAcceptedKeyTypes=+ssh-rsa -o
PubkeyAcceptedAlgorithms=+ssh-rsa -o HostKeyAlgorithms=+ssh-rsa`.

### 8.3 Compilar Java bajo emulación tarda una eternidad

Un `--platform linux/arm64` a secas pone a Maven y a `javac` a correr sobre qemu.
El `.jar` es bytecode y **no depende de la arquitectura**, así que la etapa de
compilación puede correr nativa:

```dockerfile
FROM --platform=$BUILDPLATFORM maven:3.9-eclipse-temurin-21 AS build
```

Aplicado en `backend/Dockerfile`. El build pasó de decenas de minutos a ~3.
La etapa 2 (runtime) sí es arm64 y solo copia el jar.

### 8.4 Un `:` dentro de `${VAR:?mensaje}` rompe el YAML

```yaml
# ROMPE: "mapping values are not allowed here"
TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN:?falta el token: no hay entrada}
# BIEN: entrecomillado y sin ":" dentro del mensaje
TUNNEL_TOKEN: "${CLOUDFLARE_TUNNEL_TOKEN:?falta el token. Sin el no hay entrada}"
```

El texto del `:?` va crudo al YAML. Lo peor es que el error apunta a la línea del
token, no al mensaje que lo rompió.

### 8.5 podman-compose 1.0.6 ignora `profiles:`

**Levanta todos los servicios del archivo**, tengan perfil o no. Por eso
`compose.oci.yml` no usa perfiles y asume que `migrador` y `tasas` arrancan
siempre. Si dependes de perfiles para que algo NO arranque, en esta versión no
funciona.

### 8.6 `condition: service_healthy` no se respeta

podman-compose 1.0.6 lo traduce a un simple `--requires`, que **ordena** el
arranque pero **no espera** a que el otro esté sano.

El `migrador` salía con código 2 y `Connection refused` contra `db`. Y por ser un
contenedor de un solo uso, el fallo quedaba enterrado en un `podman ps -a` que
nadie mira: el stack parecía perfecto. **Arreglado** metiendo un bucle
`pg_isready` con tope de 120 s en el propio `command` del servicio.

Comprobación de que el arreglo sirve:

```bash
podman ps -a --filter name=fintechvital-prod-migrador --format '{{.Status}}'
podman logs fintechvital-prod-migrador
# Antes:   Exited (2)  ...  psql: error: Connection refused
# Después: Exited (0)  ...  Base lista tras 0 s; Migraciones: 0 aplicadas, 10 ya estaban.
```

### 8.7 `up -d` NO recrea los contenedores, y dice que si

La peor de todas, porque el despliegue **reporta exito**.

`up -d` a secas se encuentra con que el nombre del contenedor ya existe y falla
con `container name is already in use`. podman-compose 1.0.6 reacciona haciendo
`podman start` de lo que ya habia; sobre un contenedor que ya corre, `start` no
hace nada. Resultado: el compose nuevo se copio, el `pull` bajo la imagen nueva,
el script termino en verde... y la instancia siguio ejecutando exactamente los
contenedores viejos.

Se detecto porque, tras "desplegar" un cambio de definicion, `podman ps` seguia
marcando `Up 21 minutes`.

**Siempre `up -d --force-recreate`.** Y el script comprueba despues que los
contenedores son realmente nuevos (`§6b`): si alguno lleva mas de 5 minutos
arriba, avisa de que el despliegue no se aplico.

> Nota sobre ese gate: su primera version leia la fecha con
> `--format '{{.State.StartedAt}}'`, que imprime la forma Go del `time.Time`
> (`2026-08-20 15:58:12.123 +0000 UTC`). `date -d` no sabe leerla, el `|| echo 0`
> de red de seguridad la convertia en el epoch, y declaraba "viejos" unos
> contenedores recien creados. Un gate que grita cuando todo esta bien se acaba
> ignorando, que es peor que no tenerlo. La fecha se saca ahora del JSON, donde
> va en RFC3339, y si no se puede interpretar lo dice en vez de inventarse una
> antiguedad.

### 8.8 `up -d` no se baja la imagen nueva

Reutiliza la `:latest` que ya tenga cacheada. Sin un `pull` explícito antes, el
despliegue arranca **la versión anterior** y todo parece correcto. Es la clase de
fallo que se descubre preguntándose por qué el arreglo "no funcionó".

### 8.9 Una migración "editada" que nadie editó (finales de línea)

`aplicar.sh` guarda el SHA-256 de cada migración en `esquema_historial` y
**aborta** si una ya aplicada cambia de contenido. Es la regla correcta, pero el
SHA se calculaba sobre el archivo *tal como entraba en la imagen*, y eso depende
de con qué finales de línea lo tenga checkouteado quien construye.

Consecuencia: el mismo commit da un SHA en una máquina con CRLF y otro distinto
en un clon recién hecho con LF. El síntoma es una migración **intacta** denunciada
como editada, normalmente en la máquina de otra persona y con prisa.

Salió el 2026-08-21: `V1__catalogos.sql` cambió de SHA por dos motivos a la vez
(una línea de comentario editada **y** la renormalización a LF del
`.gitattributes`), y el migrador se negaba a arrancar.

**Arreglado en `db/Dockerfile`**: ahora normaliza también los `.sql`, así que el
SHA depende solo del contenido. Activarlo desplaza una única vez los SHA de una
base ya desplegada, y hay que re-basar `esquema_historial`:

```sql
-- Solo tras comprobar que el contenido normalizado es equivalente.
UPDATE esquema_historial SET sha256 = '<sha del archivo ya normalizado>'
 WHERE version = 'V1';
```

> **Cómo se comprueba que re-basar es seguro**, en vez de dar por hecho que sí:
> se compara el contenido **ya normalizado** de cada migración entre el commit
> desplegado y el actual. Si coinciden byte a byte, el único cambio fue de
> formato. Las que no coincidan se miran con `diff` una por una.
>
> ```bash
> for f in $(ls db/migraciones/V*__*.sql | sort -V); do
>   b=$(basename "$f")
>   viejo=$(git show "<commit-desplegado>:db/migraciones/$b" | tr -d '' | sha256sum)
>   nuevo=$(tr -d '' < "$f" | sha256sum)
>   [ "$viejo" = "$nuevo" ] && echo "$b OK" || echo "$b >>> REVISAR"
> done
> ```
>
> Y el SHA que se escribe en la base se saca **de la imagen construida**, no del
> cálculo local:
> `podman run --rm <imagen-db> sha256sum /opt/fintechvital/migraciones/V1__catalogos.sql`

### 8.10 Swagger UI cuelga de `/api/v1/swagger-ui/`, no de `/swagger-ui/`

Con `springdoc.swagger-ui.path=/api/v1/docs`, springdoc **no** sirve la página en
esa ruta: responde `302` hacia `/api/v1/swagger-ui/index.html`. Es decir, cuelga
sus recursos del **mismo prefijo**, no del `/swagger-ui/` de la raíz.

Si la lista de rutas públicas solo trae `/swagger-ui/**`, `/api/v1/docs` redirige
a un **401** y la documentación queda inaccesible sin token, que es justo lo que
el enunciado pide que se vea.

Mientras la regla por defecto fue `anyRequest().permitAll()` esto no se notaba:
el fail-open tapaba el hueco. Al pasar a `authenticated()` salió a la luz, **ya en
producción** (2026-08-21). Se comprueba siguiendo la redirección, no pidiendo la
ruta a secas:

```bash
curl -sL -o /dev/null -w '%{http_code} %{url_effective}
'      https://api.fintechvital.com/api/v1/docs      # tiene que dar 200
```

### 8.11 PowerShell 5.1 convierte stderr en un falso error

Un ejecutable nativo que escribe en stderr se envuelve en `NativeCommandError`;
con `$ErrorActionPreference = 'Stop'` **aborta el script aunque el proceso haya
devuelto 0**. Como los scripts mandan el progreso a stderr, esto se caía siempre
en la primera línea. Solución: `'Continue'`, control por `$LASTEXITCODE`, y
`2>&1 | ForEach-Object { "$_" }` para que la salida se vea como texto normal.

### 8.12 La URL de la API va horneada en la web

`NEXT_PUBLIC_*` se resuelve en tiempo de build. Cambiarla y reiniciar el
contenedor **no hace nada**: hay que reconstruir la imagen y volver a subirla.

---

## 9. Diagnóstico rápido

| Síntoma | Causa más probable | Qué hacer |
|---|---|---|
| `Permission denied (publickey)` en el bastión | Tu IP rotó | §8.1. Comprueba la IP **antes** que las llaves |
| `Permission denied` con la IP correcta | OpenSSH 9 vs ssh-rsa | §8.2 |
| `exec format error` al arrancar | Imagen x86 en VM arm64 | §3.2 y reconstruir |
| `invalid username/password` en OCIR con token válido | CRLF de PowerShell | §3.3 |
| El despliegue "funciona" pero con código viejo | Falta `--force-recreate` o el `pull` | §8.7 y §8.8 |
| `ya estaba aplicada y su contenido cambio` | Finales de línea, no una edición real | §8.9 |
| `/api/v1/docs` da 401 | Falta `/api/v1/swagger-ui/**` en las rutas públicas | §8.10 |
| `mapping values are not allowed here` | `:` dentro de un `${VAR:?...}` | §8.4 |
| La web carga pero no trae datos | `FV_CORS_ORIGINS` sin `www` | §7 |
| El botón de descarga da 404 | El APK no estaba al construir | §5.1 |
| Todo apagado tras reiniciar la VM | Falta linger / podman-restart | §6 |

Logs:

```powershell
.\ops\oci\desplegar.ps1 -Accion logs
```

o en la instancia: `podman logs -f fintechvital-prod-api`.

---

## 10. Bajar y limpiar

```powershell
.\ops\oci\desplegar.ps1 -Accion bajar     # para los contenedores, CONSERVA el volumen
```

Borrar los datos es irreversible y se hace a mano, a conciencia:

```bash
podman volume rm fintechvital-prod_datos_db
```

Copia de seguridad antes de cualquier cosa que toque la base:

```bash
podman exec fintechvital-prod-db pg_dump -U fintechvital -Fc fintechvital \
  > respaldo-$(date +%F).dump
```

---

## 11. Registro del despliegue del 2026-08-20

Lo que se hizo, en orden:

1. **Se retiró el proyecto que ocupaba antes ese hueco** en la instancia
   (5 contenedores rootless, ~258 MB de memoria y ~2.2 GB de imágenes).
   Contenedores, redes e imágenes propias eliminados; **volúmenes y su árbol de
   código conservados**, así que es reversible. `cloudflared` y
   `postgres:16-alpine` se dejaron: los reutiliza Fintech Vital.
2. Se actualizó el allowlist del Bastion a la IP pública actual (§8.1).
3. Se registró la emulación arm64 (§3.2).
4. Se hizo `backend/Dockerfile` apto para cross-build (§8.3).
5. Se construyeron y subieron las 4 imágenes arm64 a OCIR.
6. Se desplegó con `compose.oci.yml` en `/opt/fintechvital`, rootless.
7. Se activaron linger y `podman-restart` (§6).
8. Durante la puesta a punto salieron cuatro fallos que el propio despliegue
   destapó y que quedan corregidos en los scripts: el YAML del túnel (§8.4), el
   `migrador` que arrancaba antes que la base (§8.6), el `up -d` que no recreaba
   nada (§8.7) y el gate de recreación que daba un falso positivo (§8.7, nota).
9. **Verificado**: `fintechvital.com`, `www` y `api` responden 200;
   `ejemplos.mjs` pasa 54/54; la base arranca vacía (0 usuarios, 40 tablas, 10
   migraciones); la otra aplicación de la instancia, intacta y respondiendo.

Estado final de la máquina: **1256 MB / 5903 MB** de memoria y **15 GB / 48 GB**
de disco, con las dos aplicaciones corriendo.

---

## 12. Registro del despliegue del 2026-08-21 (cuenta del jurado)

Subida de los cambios de la rama `feat/cuenta-jurado-produccion` más la carga de
la cuenta de demostración. Orden y hallazgos:

1. **Re-registrada la emulación arm64**: se había perdido al reiniciar la máquina
   de podman desde la subida anterior (§3.2). Es lo primero que hay que mirar.
2. **Reconstruidas `db`, `api` y `web`**. `ml` no se tocó: lo único que cambió
   ahí fue su README, y eso no entra en la imagen.
3. **Re-basado `esquema_historial`** (§8.9). `V1__catalogos.sql` había cambiado de
   SHA por una línea de comentario **y** por la renormalización a LF, así que el
   migrador abortaba. Antes de re-basar se comprobó que las 10 migraciones son
   equivalentes una vez normalizadas, y los SHA nuevos se sacaron **de la imagen
   construida**, no de un cálculo local. `db/Dockerfile` ahora normaliza los
   `.sql`, de modo que esto no se repite en otra máquina.
4. **Desplegado** con `--force-recreate`; migrador en `exit=0`,
   `0 aplicadas, 10 ya estaban`.
5. **Sembrada la cuenta del jurado** (`-Accion semilla-jurado`):
   `ana.torres@ejemplo.mx`, **182 movimientos y 13 análisis**, `totp_activo = f`.
   Antes de lanzarla se midió el alcance del `DELETE FROM recomendacion WHERE
   orden > 5` que trae `demo.sql` **sin acotar por usuario**: en producción
   afectaba a **0 filas**, así que era seguro. Queda como riesgo latente si algún
   usuario real llega a tener más de 5 recomendaciones.
6. **Corregida una regresión propia de esta subida** (§8.10): al pasar la API a
   `anyRequest().authenticated()`, `/api/v1/docs` empezó a devolver 401 porque
   springdoc redirige a `/api/v1/swagger-ui/index.html`, que no estaba entre las
   rutas públicas. Se detectó comprobando el endpoint **siguiendo la
   redirección**; pedir `/docs` a secas no lo habría revelado. Se añadió
   `/api/v1/swagger-ui/**`, se reconstruyó `api` y se volvió a desplegar.
7. **Verificado**: los 4 hostnames de la web (es/en/pt y `www`) en 200;
   `/api/v1/docs` y `/api/v1/openapi.json` en 200 **sin token**;
   `/api/v1/analisis` sin token en **401** (el fail-closed funciona);
   `/h2-console/` en 401; login del jurado por el dominio público devolviendo
   `access_token` y sirviendo sus 13 análisis; `ejemplos.mjs` **54/54**.

Los 5 usuarios reales que ya se habían registrado en producción conservan sus
datos: la limpieza de `demo.sql` está acotada por UUID fijos y se comprobó antes
y después.
