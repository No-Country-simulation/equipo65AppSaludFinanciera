#!/usr/bin/env bash
# financeAI - abre el menu de desarrollo en Linux o macOS.
# Uso: ./iniciar.sh          (equivalente a INICIAR.bat en Windows; vive en frontend/)
#      ./iniciar.sh 1        (ejecuta una opcion del menu y sale)
# Si da "Permission denied": chmod +x iniciar.sh scripts/linux/*.sh scripts/macos/*.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -s)" in
  Darwin) exec "$DIR/scripts/macos/menu.sh" "$@" ;;
  *)      exec "$DIR/scripts/linux/menu.sh" "$@" ;;
esac
