#!/usr/bin/env bash
# =============================================================================
# Acciones de operacion sobre el stack ya desplegado (no vuelve a desplegar):
#
#   ACCION=estado  -> que hay corriendo, cuanto consume, si responde
#   ACCION=logs    -> ultimas lineas de cada servicio
#   ACCION=bajar   -> apaga Fintech Vital (NO toca la otra aplicacion que
#                     comparte la instancia)
#
# Lo lanza desplegar.ps1 -Accion <...>. Genera el script remoto y lo manda por
# el mismo tunel de Bastion que usa el despliegue.
# =============================================================================
set +e

ACCION="${ACCION:-estado}"
cp /keys/oci/oci_api_key.pem /tmp/k.pem && chmod 600 /tmp/k.pem
export OCI_CLI_KEY_FILE=/tmp/k.pem

# Los heredocs van CITADOS ('EOF') para que nada se expanda aqui: el script se
# escribe tal cual y lo interpreta la shell de la instancia.
case "$ACCION" in

  estado)
    cat > /tmp/remoto.sh <<'EOF'
set +e
echo "##### Fintech Vital (rootless) #####"
podman ps -a --format '{{.Names}} | {{.Status}}'
echo
echo "##### Consumo #####"
podman stats --no-stream --format '{{.Name}} | {{.MemUsage}} | {{.CPUPerc}}'
echo
echo "##### Responde? #####"
curl -s -o /dev/null -w '  API local -> HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:8280/api/v1/salud
curl -s -o /dev/null -w '  Web local -> HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:3200/es/login
echo
# La instancia la comparte otra aplicacion, desplegada como root en su propio
# almacen de contenedores. No deberia haberse enterado de nada de lo nuestro,
# pero "no la toque" es una suposicion, no un hecho: se comprueba.
echo "##### La otra aplicacion de la instancia #####"
echo "  contenedores en pie: $(sudo podman ps --format '{{.Names}}' 2>/dev/null | wc -l)"
curl -s -o /dev/null -w '  su health check local -> HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:80/ready
echo
echo "##### Recursos de la maquina #####"
free -m | head -2
df -h / | tail -1
EOF
    ;;

  logs)
    cat > /tmp/remoto.sh <<'EOF'
set +e
for c in db ml api web tunel; do
  echo "########## $c ##########"
  podman logs --tail 30 "fintechvital-prod-$c" 2>&1 | tail -30
  echo
done
echo "########## migrador (un solo uso) ##########"
podman logs fintechvital-prod-migrador 2>&1 | tail -15
EOF
    ;;

  bajar)
    cat > /tmp/remoto.sh <<'EOF'
set +e
DEST=/opt/fintechvital
COMPOSE="podman-compose --env-file $DEST/.env -f $DEST/compose.oci.yml"

echo "##### Bajando Fintech Vital #####"
# Se para el tunel primero: el dominio deja de anunciarse antes de que los
# servicios de detras empiecen a caerse, en vez de servir 502 durante la bajada.
podman stop -t 20 fintechvital-prod-tunel 2>/dev/null && echo "  tunel parado"
$COMPOSE down 2>&1 | tail -15
echo
echo "##### Estado tras bajar #####"
podman ps -a --format '{{.Names}} | {{.Status}}'
echo
echo "##### El volumen de datos SE CONSERVA #####"
# `down` no borra volumenes. Para borrar los datos de verdad, a conciencia:
#   podman volume rm fintechvital-prod_datos_db
podman volume ls
echo
echo "##### La otra aplicacion de la instancia sigue intacta #####"
echo "  contenedores en pie: $(sudo podman ps --format '{{.Names}}' 2>/dev/null | wc -l)"
curl -s -o /dev/null -w '  su health check local -> HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:80/ready
EOF
    ;;

  *)
    echo "Accion desconocida: $ACCION" >&2
    exit 1
    ;;
esac

exec bash /fv/_bastion.sh /tmp/remoto.sh
