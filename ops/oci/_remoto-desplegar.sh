#!/usr/bin/env bash
# =============================================================================
# Lo que se ejecuta DENTRO de la instancia de OCI. Lo invoca _bastion.sh, que ya
# dejo en /tmp: compose.oci.yml, fv.env, el token y los datos del registro.
#
# Corre en modo ROOTLESS (como el usuario normal de la maquina) a proposito.
# Esta instancia la comparte otra aplicacion desplegada con podman COMO ROOT, y
# al usar dos almacenes de contenedores distintos:
#
#   - `podman ps` de uno NO ve los contenedores del otro;
#   - una limpieza (`podman container prune` / `image prune`) hecha como root NO
#     puede tocar nada de aqui, ni al reves;
#   - los limites de memoria son por contenedor, asi que ninguna de las dos se
#     come la RAM de la otra por accidente.
#
# Esa separacion es la razon de que las dos puedan convivir sin pisarse. No la
# deshagas moviendo esto a `sudo podman`.
# =============================================================================
set +e

DEST=/opt/fintechvital
USUARIO_ACTUAL="$(id -un)"

REG_HOST="$(cat /tmp/ocir_host 2>/dev/null)"
[ -z "$REG_HOST" ] && REG_HOST=mx-monterrey-1.ocir.io
OCIR_USUARIO="$(cat /tmp/ocir_usuario 2>/dev/null)"
NS="$(cat /tmp/ocir_namespace 2>/dev/null)"
REPO="$(cat /tmp/ocir_repo 2>/dev/null)"

COMPOSE="podman-compose --env-file $DEST/.env -f $DEST/compose.oci.yml"

echo "##### 0. Estado de partida #####"
free -m | head -2
df -h / | tail -1
echo

echo "##### 1. Instalando el stack en $DEST #####"
sudo mkdir -p "$DEST" && sudo chown "$USUARIO_ACTUAL:$USUARIO_ACTUAL" "$DEST" && chmod 750 "$DEST"
mv /tmp/compose.oci.yml "$DEST/compose.oci.yml" && chmod 640 "$DEST/compose.oci.yml"
mv /tmp/fv.env          "$DEST/.env"            && chmod 600 "$DEST/.env"
ls -la "$DEST"
echo

echo "##### 2. Login al registro de imagenes #####"
# El token llega en un archivo y NO por la linea de comandos: `podman login -p`
# lo dejaria en el historial y en la tabla de procesos de una maquina compartida.
if [ -s /tmp/ocir_token ] && [ -n "$OCIR_USUARIO" ]; then
  podman login "$REG_HOST" -u "$OCIR_USUARIO" --password-stdin < /tmp/ocir_token
  rc=$?
  shred -u /tmp/ocir_token 2>/dev/null || rm -f /tmp/ocir_token
  [ $rc -ne 0 ] && { echo "FALLO el login al registro"; exit 1; }
  echo "  login OK"
else
  rm -f /tmp/ocir_token
  echo "  (sin token nuevo; se usa el login que ya tuviera el usuario)"
fi
rm -f /tmp/ocir_usuario /tmp/ocir_namespace /tmp/ocir_repo /tmp/ocir_host
echo

echo "##### 3. Pre-vuelo: el compose renderiza sin variables sueltas #####"
# Si falta una variable con `:?`, el render falla AQUI y no despues de haber
# arrancado media aplicacion.
$COMPOSE config > /tmp/fv-render.yml 2>/tmp/fv-render.err
if [ $? -ne 0 ]; then echo "FALLO el render del compose:"; cat /tmp/fv-render.err; exit 1; fi

# Un '${' que sobreviva al render significa que podman-compose no supo
# expandirlo (el caso clasico es el default anidado `${VAR:-${OTRA}}`) y el
# contenedor recibiria el literal.
#
# Pero NO todo '${' del render es un fallo: `$${VAR}` en el compose es un escape
# DELIBERADO -- se renderiza como '${VAR}' para que lo expanda la shell DENTRO
# del contenedor, no compose. Los usan el healthcheck de la BD, el bucle de
# tasas y la espera del migrador. Un `grep '${'` a secas los marca como error y
# el gate se vuelve ruido que se acaba desactivando, que es peor que no tenerlo.
#
# Por eso se CUENTA: los '${' del render tienen que ser exactamente los que
# venian escapados. Si hay mas, algo no se expandio.
escapados=$(grep -o -F '$${' "$DEST/compose.oci.yml" | wc -l)
renderizados=$(grep -o -F '${' /tmp/fv-render.yml | wc -l)
if [ "$renderizados" -gt "$escapados" ]; then
  echo "ERROR: $renderizados '\${' en el render y solo $escapados escapes '\$\${' en el origen."
  echo "       Sobran $((renderizados - escapados)). Lineas implicadas:"
  grep -Fn '${' /tmp/fv-render.yml
  exit 1
fi
echo "  render limpio ($escapados escapes intencionados, 0 variables sin resolver)"
echo

echo "##### 4. Bajando las imagenes del registro #####"
# `pull` EXPLICITO: `up -d` reutiliza la :latest que ya tenga cacheada y el
# despliegue arrancaria la version anterior sin decir una palabra.
$COMPOSE pull db api ml web tunel 2>&1 | tail -20
echo

echo "##### 5. Comprobando que las imagenes son arm64 #####"
# Una imagen x86 subida por error entra al registro sin quejarse y solo falla al
# arrancar, con un "exec format error" que no dice de donde viene.
for img in db api ml web; do
  arq=$(podman image inspect "$REG_HOST/$NS/$REPO/$img:latest" --format '{{.Architecture}}' 2>/dev/null)
  echo "  $img -> ${arq:-DESCONOCIDA}"
  if [ "$arq" != "arm64" ]; then echo "ERROR: $img no es arm64"; exit 1; fi
done
echo

echo "##### 6. Levantando el stack #####"
# --force-recreate NO es opcional, y esto costo un despliegue en falso:
#
# `up -d` a secas se encuentra con que el nombre del contenedor ya existe, falla
# con "container name is already in use", y podman-compose 1.0.6 REACCIONA
# haciendo `podman start` de lo que ya habia. Sobre un contenedor que ya corre,
# `start` no hace nada. Resultado: el compose nuevo se copio, el `pull` bajo la
# imagen nueva, el script dijo OK... y la instancia siguio ejecutando
# exactamente los contenedores viejos. Se detecto porque tras "desplegar" un
# cambio de definicion los contenedores seguian marcando "Up 21 minutes".
#
# Con --force-recreate se destruyen y se vuelven a crear siempre, asi que lo que
# corre es lo que dice el archivo. Cuesta unos segundos de corte por servicio;
# el tunel se reconecta solo.
$COMPOSE up -d --force-recreate 2>&1 | tail -25
echo

# Comprobacion de que la recreacion OCURRIO de verdad: si algun contenedor lleva
# arriba mas de 5 minutos, no se recreo y el despliegue es una ilusion.
#
# La fecha se saca del JSON y NO de `--format '{{.State.StartedAt}}'`: con el
# template, podman imprime la forma Go del time.Time ("2026-08-20 15:58:12.123
# +0000 UTC"), que `date -d` NO sabe leer. La primera version de este gate hacia
# justo eso, con un `|| echo 0` de red de seguridad, asi que al fallar el parseo
# calculaba "now - 0" = 56 años de antiguedad y declaraba VIEJOS unos
# contenedores recien creados. Un gate que grita cuando todo esta bien acaba
# ignorandose, que es peor que no tenerlo. En el JSON la fecha va en RFC3339.
echo "##### 6b. Verificando que los contenedores son NUEVOS #####"
viejos=0
ahora=$(date +%s)
for c in db ml api web tunel; do
  arrancado=$(podman inspect "fintechvital-prod-$c" 2>/dev/null               | grep -m1 '"StartedAt"' | cut -d'"' -f4)
  if [ -z "$arrancado" ]; then echo "  $c: no existe"; continue; fi
  epoca=$(date -d "$arrancado" +%s 2>/dev/null)
  if [ -z "$epoca" ]; then
    # Sin fecha legible no se puede afirmar nada: se dice, no se inventa.
    echo "  $c: no pude interpretar la fecha de arranque ('$arrancado')"
    continue
  fi
  seg=$(( ahora - epoca ))
  if [ "$seg" -gt 300 ]; then
    echo "  AVISO: $c lleva ${seg}s arriba, NO se recreo"
    viejos=$((viejos+1))
  else
    echo "  $c recreado hace ${seg}s"
  fi
done
[ "$viejos" -gt 0 ] && echo "  ERROR: $viejos contenedor(es) siguen siendo los viejos. El despliegue NO se aplico."
echo

echo "##### 7. Esperando a que la API responda #####"
# La API arranca despues de la BD y del modelo, y en 1 OCPU compartido la JVM
# tarda. Se espera al endpoint que ademas hace SELECT 1 contra PostgreSQL, asi
# que un 200 aqui significa "API viva Y base respondiendo".
ok=""
for i in $(seq 1 60); do
  cod=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:8280/api/v1/salud 2>/dev/null)
  if [ "$cod" = "200" ]; then ok=1; echo "  API 200 tras $((i*5))s"; break; fi
  sleep 5
done
[ -z "$ok" ] && echo "  AVISO: la API no dio 200 en 5 min (revisa: podman logs fintechvital-prod-api)"

echo "##### 8. Esperando a la web #####"
okw=""
for i in $(seq 1 36); do
  cod=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3200/es/login 2>/dev/null)
  if [ "$cod" = "200" ]; then okw=1; echo "  Web 200 tras $((i*5))s"; break; fi
  sleep 5
done
[ -z "$okw" ] && echo "  AVISO: la web no dio 200 en 3 min (revisa: podman logs fintechvital-prod-web)"
echo

echo "##### 9. Estado final #####"
echo "-- Fintech Vital (rootless) --"
podman ps --format '{{.Names}} | {{.Status}}'
echo
echo "-- consumo --"
podman stats --no-stream --format '{{.Name}} | {{.MemUsage}} | {{.CPUPerc}}'
echo
# La otra aplicacion de la maquina no deberia haberse enterado de nada. Se
# comprueba explicitamente porque "no la toque" es una suposicion, no un hecho.
echo "-- la otra aplicacion de la instancia sigue en pie --"
echo "   contenedores (root): $(sudo podman ps --format '{{.Names}}' 2>/dev/null | wc -l)"
curl -s -o /dev/null -w '   su health check local -> HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:80/ready
echo
echo "-- recursos --"
free -m | head -2
df -h / | tail -1
