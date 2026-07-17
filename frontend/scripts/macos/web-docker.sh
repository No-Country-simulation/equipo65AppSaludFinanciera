#!/usr/bin/env bash
# web-docker.sh - levanta la web (Next.js) en un contenedor en http://localhost:3000
# Uso:
#   ./scripts/macos/web-docker.sh            # build + up
#   ./scripts/macos/web-docker.sh --rebuild  # fuerza rebuild sin cache
#   ./scripts/macos/web-docker.sh --down     # detiene y elimina el contenedor
# Prefiere Docker; si el daemon no responde cae a Podman (misma imagen OCI).
# Equivalente Windows: scripts/windows/web-docker.ps1
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB="$RAIZ/web"
IMAGEN="financeai/web:local"
CONTENEDOR="financeai-web"

motor=""
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  motor="docker"
elif command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
  echo "Docker no disponible; usando Podman como alternativa."
  motor="podman"
else
  echo "ERROR: ni Docker ni Podman responden. Abre Docker Desktop (o 'podman machine start')." >&2
  exit 1
fi

if [[ "${1:-}" == "--down" ]]; then
  "$motor" rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
  echo "Contenedor detenido."
  exit 0
fi

cache_arg=()
[[ "${1:-}" == "--rebuild" ]] && cache_arg=(--no-cache)

echo "Construyendo imagen con $motor..."
"$motor" build "${cache_arg[@]+"${cache_arg[@]}"}" \
  --build-arg NEXT_PUBLIC_DATA_SOURCE=mock \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 \
  -t "$IMAGEN" "$WEB"

"$motor" rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
# bind a 127.0.0.1: mismo criterio que en Windows (Podman rootless)
"$motor" run -d --name "$CONTENEDOR" -p 127.0.0.1:3000:3000 "$IMAGEN" >/dev/null

echo "Esperando respuesta de la web..."
for _ in $(seq 1 30); do
  sleep 2
  if curl -fsS http://127.0.0.1:3000/es/login >/dev/null 2>&1; then
    echo ""
    echo "Web lista ($motor): http://localhost:3000 (es | pt | en)"
    echo "Demo: demo@financeai.dev con cualquier password de 10+ caracteres"
    exit 0
  fi
done

echo "AVISO: el contenedor arranco pero la web no respondio a tiempo. Revisa: $motor logs $CONTENEDOR" >&2
exit 1
