#!/usr/bin/env bash
# =============================================================================
# Orquesta el despliegue DESDE el contenedor `fv-deployer`:
#   1. saca el token de OCIR del OCI Vault (con la llave API),
#   2. prepara los archivos que viajan a la instancia,
#   3. delega en _bastion.sh, que abre el tunel, los copia y ejecuta el remoto.
#
# Montajes esperados:
#   /keys  carpeta de credenciales (solo lectura)
#   /fv    ops/oci  (este directorio, con oci.env)
#   /cfg   ops/     (compose.oci.yml y los .env de cada entorno)
# =============================================================================
set +e

CONF=/fv/oci.env
leer() { grep -E "^\s*$1\s*=" "$CONF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d ' \r'; }

cp /keys/oci/oci_api_key.pem /tmp/k.pem && chmod 600 /tmp/k.pem
export OCI_CLI_KEY_FILE=/tmp/k.pem
export SUPPRESS_LABEL_WARNING=True

VAULT="$(leer OCI_VAULT_OCID)"

: > /tmp/ocir_token
if [ -n "$VAULT" ]; then
  echo "=== Sacando el token de OCIR del Vault ===" >&2
  oci secrets secret-bundle get-secret-bundle-by-name \
    --secret-name OCIR_TOKEN --vault-id "$VAULT" \
    --query 'data."secret-bundle-content".content' --raw-output 2>/dev/null \
    | base64 -d > /tmp/ocir_token

  # Sin salto de linea final: `podman login --password-stdin` se traga el \n
  # como parte de la contrasena y el registro responde "invalid
  # username/password" con un token perfectamente valido.
  printf '%s' "$(cat /tmp/ocir_token)" > /tmp/ocir_token

  if [ -s /tmp/ocir_token ]; then
    echo "  token leido ($(wc -c < /tmp/ocir_token) chars, no se imprime)" >&2
  else
    echo "  AVISO: el Vault no devolvio el token. Se usara el login que ya tenga la instancia." >&2
    : > /tmp/ocir_token
  fi
else
  echo "=== Sin OCI_VAULT_OCID: se reutiliza el login de la instancia ===" >&2
fi

cp /cfg/compose.oci.yml /tmp/compose.oci.yml || { echo "falta ops/compose.oci.yml" >&2; exit 1; }
cp "/cfg/${ENTORNO:-.env.prod}" /tmp/fv.env  || { echo "falta ops/${ENTORNO:-.env.prod}" >&2; exit 1; }

# El usuario de OCIR viaja al remoto en un archivo: alli no hay forma de leer
# oci.env, que se queda en el contenedor.
leer OCIR_USUARIO   > /tmp/ocir_usuario
leer OCIR_NAMESPACE > /tmp/ocir_namespace
leer OCIR_REPO      > /tmp/ocir_repo
# El host del registro se deriva de la region: <region>.ocir.io
printf '%s' "$(leer OCI_REGION).ocir.io" > /tmp/ocir_host

exec bash /fv/_bastion.sh /fv/_remoto-desplegar.sh \
  /tmp/compose.oci.yml /tmp/fv.env /tmp/ocir_token \
  /tmp/ocir_usuario /tmp/ocir_namespace /tmp/ocir_repo /tmp/ocir_host
