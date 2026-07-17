#!/usr/bin/env bash
# movil-emulador.sh - arranca el emulador Android e inicia Expo apuntandole
# Uso:
#   ./scripts/macos/movil-emulador.sh              # AVD por defecto: Pixel_9
#   ./scripts/macos/movil-emulador.sh otro_avd
# Requiere Android SDK (ANDROID_HOME) con un AVD creado, y Node.
# (En macOS tambien esta la opcion del simulador de iOS: cd mobile && npx expo start --ios)
# Equivalente Windows: scripts/windows/movil-emulador.ps1
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AVD="${1:-Pixel_9}"

# En macOS Android Studio instala el SDK en ~/Library/Android/sdk
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULADOR="$SDK/emulator/emulator"
ADB="$SDK/platform-tools/adb"

if [[ ! -x "$EMULADOR" ]]; then
  echo "ERROR: no se encontro el emulador en $EMULADOR. Define ANDROID_HOME." >&2
  exit 1
fi

if ! "$EMULADOR" -list-avds | grep -qx "$AVD"; then
  echo "ERROR: el AVD '$AVD' no existe. Disponibles:" >&2
  "$EMULADOR" -list-avds >&2
  exit 1
fi

# 1. Arrancar el emulador si no hay ninguno corriendo
if "$ADB" devices | grep -Eq 'emulator-[0-9]+[[:space:]]+device'; then
  echo "Ya hay un emulador corriendo."
else
  echo "Arrancando emulador $AVD..."
  nohup "$EMULADOR" -avd "$AVD" >/dev/null 2>&1 &
fi

# 2. Esperar a que el sistema termine de bootear
echo "Esperando el boot de Android (puede tardar 1-2 min)..."
"$ADB" wait-for-device
booteado=""
for _ in $(seq 1 60); do
  if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    booteado="1"
    break
  fi
  sleep 3
done
if [[ -z "$booteado" ]]; then
  echo "ERROR: el emulador no termino de bootear en 3 minutos." >&2
  exit 1
fi
echo "Emulador listo."

# 3. Lanzar Expo apuntando al emulador (instala Expo Go si hace falta)
cd "$RAIZ/mobile"
echo "Iniciando Expo (Ctrl+C para salir)..."
npx expo start --android
