#!/usr/bin/env bash
# menu.sh - menu interactivo de desarrollo del frontend (web + movil)
# Uso:
#   ./iniciar.sh (en frontend/, detecta el sistema), o directo:
#   ./scripts/linux/menu.sh
#   ./scripts/linux/menu.sh 1     # ejecuta UNA opcion y sale (no interactivo)
# Equivalente Windows: scripts/windows/menu.ps1 (INICIAR.bat)
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$DIR/../.." && pwd)"

mostrar_menu() {
  cat <<'FIN'

=================================================
    financeAI - menu de desarrollo (frontend)
=================================================
  [1] Verificar requisitos de la maquina (doctor)
  [2] Web: levantar en contenedor  -> http://localhost:3000
  [3] Web: rebuild del contenedor sin cache
  [4] Web: detener el contenedor
  [5] Web: modo desarrollo (npm run dev, recarga en vivo)
  [6] Movil: emulador Android + Expo
  [7] Movil: Expo para telefono fisico (QR con Expo Go)
  [8] Instalar dependencias (web y mobile)
  [9] Verificar codigo (lint + build web, lint + tsc movil)
  [0] Salir

FIN
}

ejecutar() {
  case "$1" in
    1) "$DIR/verificar-requisitos.sh" ;;
    2) "$DIR/web-docker.sh" ;;
    3) "$DIR/web-docker.sh" --rebuild ;;
    4) "$DIR/web-docker.sh" --down ;;
    5)
      echo "Next.js en modo desarrollo en http://localhost:3000 (Ctrl+C para salir)..."
      (cd "$RAIZ/web" && npm run dev)
      ;;
    6) "$DIR/movil-emulador.sh" ;;
    7)
      echo "El telefono necesita la app Expo Go y estar en el MISMO Wi-Fi que esta maquina."
      echo "Escanea el QR que va a aparecer (Ctrl+C para salir)..."
      (cd "$RAIZ/mobile" && npx expo start)
      ;;
    8)
      echo "--- web: npm install ---"
      (cd "$RAIZ/web" && npm install)
      echo "--- mobile: npm install ---"
      (cd "$RAIZ/mobile" && npm install)
      ;;
    9)
      (cd "$RAIZ/web" && echo "--- web: lint ---" && npm run lint && echo "--- web: build ---" && npm run build)
      (cd "$RAIZ/mobile" && echo "--- mobile: lint ---" && npm run lint && echo "--- mobile: tsc --noEmit ---" && npx tsc --noEmit)
      ;;
    *) echo "Opcion no valida: \"$1\"" ;;
  esac
}

if [[ $# -gt 0 ]]; then
  ejecutar "$1"
  exit $?
fi

while true; do
  mostrar_menu
  read -rp "Elige una opcion: " eleccion
  [[ "$eleccion" == "0" ]] && break
  ejecutar "$eleccion" || true
  echo ""
  read -rp "Enter para volver al menu " _ || true
done
