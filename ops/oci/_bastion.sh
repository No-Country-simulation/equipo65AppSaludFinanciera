#!/usr/bin/env bash
# =============================================================================
# Abre UN forward de OCI Bastion hacia la instancia y ejecuta alli el script que
# se le pase. Corre DENTRO del contenedor `fv-deployer`, con la carpeta de
# llaves montada en /keys y este directorio (ops/oci) en /fv.
#
#   bash _bastion.sh <script-remoto.sh> [archivo-a-copiar ...]
#
# Por que un bastion y no ssh directo: la instancia esta en una subred PRIVADA,
# sin IP publica. La unica entrada es el servicio Bastion de OCI, que crea una
# sesion efimera y un tunel SSH hasta el :22 de la maquina.
#
# TRAMPAS que ya costaron tiempo:
#
#   1. El Bastion de OCI exige una llave RSA para SU sesion (bastion_rsa); a la
#      instancia se entra con OTRA llave (ssh_prod, ed25519). Son dos llaves
#      distintas en dos saltos distintos, no una.
#   2. OpenSSH 9.x rechaza ssh-rsa (firma SHA-1) por defecto, y el bastion
#      responde "Permission denied (publickey)" con una llave PERFECTAMENTE
#      valida. De ahi los -o PubkeyAcceptedKeyTypes=+ssh-rsa.
#   3. El allowlist de CIDR del bastion trae UNA IP publica fija. Cuando el ISP
#      la rota, el sintoma es el MISMO "Permission denied (publickey)" del punto
#      2, y se acaba diagnosticando el problema equivocado. Si falla, comprueba
#      tu IP (curl ifconfig.me) contra el allowlist ANTES de tocar llaves.
# =============================================================================
set +e

REMOTO="${1:?uso: _bastion.sh <script-remoto.sh> [archivos...]}"
shift

# --- Configuracion (ops/oci/oci.env, montado en /fv) -------------------------
CONF=/fv/oci.env
leer() { grep -E "^\s*$1\s*=" "$CONF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d ' \r'; }
if [ ! -f "$CONF" ]; then
  echo "Falta $CONF. Copia ops/oci/oci.env.ejemplo a ops/oci/oci.env y rellenalo." >&2
  exit 1
fi

BASTION="$(leer OCI_BASTION_OCID)"
IP="$(leer OCI_INSTANCIA_IP)"
PORT="$(leer OCI_INSTANCIA_PUERTO_LOCAL)"; PORT="${PORT:-2202}"
USUARIO="$(leer OCI_INSTANCIA_USUARIO)";   USUARIO="${USUARIO:-ubuntu}"
[ -z "$BASTION" ] && { echo "Falta OCI_BASTION_OCID en $CONF" >&2; exit 1; }
[ -z "$IP" ]      && { echo "Falta OCI_INSTANCIA_IP en $CONF" >&2; exit 1; }

# El mount /keys es de solo lectura y ssh exige 600 en las llaves privadas.
cp /keys/oci/oci_api_key.pem /tmp/k.pem       && chmod 600 /tmp/k.pem
cp /keys/oci/ssh_prod        /tmp/ssh_prod    && chmod 600 /tmp/ssh_prod
cp /keys/oci/bastion_rsa     /tmp/bastion_rsa && chmod 600 /tmp/bastion_rsa
export OCI_CLI_KEY_FILE=/tmp/k.pem

SSH_COMUN=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
           -o PubkeyAcceptedKeyTypes=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa
           -o HostKeyAlgorithms=+ssh-rsa)

# El bastion tiene cupo de sesiones activas; las viejas se acumulan y la
# siguiente creacion falla por quota, no por permisos.
echo "=== Limpiando sesiones de bastion previas ===" >&2
for sid in $(oci bastion session list --bastion-id "$BASTION" --all \
              --query 'data[?"lifecycle-state"==`ACTIVE`].id' --raw-output 2>/dev/null \
              | grep -oE "ocid1\.bastionsession[a-z0-9._-]+" | sort -u); do
  oci bastion session delete --session-id "$sid" --force >/dev/null 2>&1
done
sleep 5

echo "=== Creando sesion de bastion hacia $IP ===" >&2
oci bastion session create-port-forwarding --bastion-id "$BASTION" \
  --target-private-ip "$IP" --target-port 22 \
  --ssh-public-key-file /keys/oci/bastion_rsa.pub --session-ttl 10800 \
  --display-name "fv-$RANDOM" > /tmp/s.json 2>&1
sid=$(grep -oE "ocid1\.bastionsession[a-z0-9._-]+" /tmp/s.json | head -1)
[ -z "$sid" ] && { echo "FALLO crear la sesion de bastion:" >&2; head -20 /tmp/s.json >&2; exit 1; }

for i in $(seq 1 40); do
  st=$(oci bastion session get --session-id "$sid" --query 'data."lifecycle-state"' --raw-output 2>/dev/null)
  [ "$st" = "ACTIVE" ] && break
  sleep 6
done
[ "$st" = "ACTIVE" ] || { echo "La sesion no llego a ACTIVE (quedo en '$st')" >&2; exit 1; }

BHOST=$(oci bastion session get --session-id "$sid" --query 'data."ssh-metadata".command' --raw-output 2>/dev/null \
        | grep -oE "ocid1\.bastionsession[a-z0-9._-]+@host\.bastion\.[a-z0-9.-]+" | head -1)
[ -z "$BHOST" ] && { echo "No pude leer el endpoint del bastion" >&2; exit 1; }

# El forward tarda en quedar utilizable aunque `ssh -f` vuelva enseguida: se
# comprueba abriendo el socket, no confiando en el codigo de salida.
for t in 1 2 3 4 5; do
  ssh -i /tmp/bastion_rsa "${SSH_COMUN[@]}" -o ExitOnForwardFailure=yes \
      -o ServerAliveInterval=15 -o ServerAliveCountMax=60 -o TCPKeepAlive=yes \
      -f -N -L "$PORT:$IP:22" -p 22 "$BHOST" 2>>/tmp/fwd.log
  sleep 3
  if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then exec 3>&-; break; fi
  sleep 4
done
(exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null \
  || { echo "El forward :$PORT no levanto" >&2; tail -5 /tmp/fwd.log >&2; exit 1; }
exec 3>&-
echo "  tunel :$PORT -> $IP:22 OK" >&2

# Archivos extra (compose, .env) al /tmp del usuario remoto.
if [ "$#" -gt 0 ]; then
  echo "=== Copiando $# archivo(s) a la instancia ===" >&2
  scp -i /tmp/ssh_prod "${SSH_COMUN[@]}" -P "$PORT" "$@" "$USUARIO@127.0.0.1:/tmp/" \
    || { echo "FALLO el scp" >&2; exit 1; }
fi

echo "=== Ejecutando $REMOTO en la instancia ===" >&2
ssh -i /tmp/ssh_prod "${SSH_COMUN[@]}" -p "$PORT" "$USUARIO@127.0.0.1" 'bash -s' < "$REMOTO"
