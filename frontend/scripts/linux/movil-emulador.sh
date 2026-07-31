#!/usr/bin/env bash
# movil-emulador.sh - arranca el emulador Android e inicia Expo apuntandole
# Uso:
#   ./scripts/linux/movil-emulador.sh              # primer AVD de la maquina
#   ./scripts/linux/movil-emulador.sh Pixel_9 [--frio]
# Requiere Android SDK (ANDROID_HOME) con un AVD creado, y Node.
# Equivalente Windows: scripts/windows/movil-emulador.ps1
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# NO hay AVD "global": cada quien crea los suyos en Android Studio y viven en
# ~/.android/avd. Por eso no se cablea ningun nombre; si no se indica uno se
# toma el primero disponible. Para fijar el tuyo: export FINTECHVITAL_AVD=...
AVD="${1:-${FINTECHVITAL_AVD:-}}"
FRIO=""
for arg in "$@"; do [[ "$arg" == "--frio" ]] && FRIO="1"; done
[[ "$AVD" == "--frio" ]] && AVD=""

# En Linux el SDK suele quedar en ~/Android/Sdk
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
EMULADOR="$SDK/emulator/emulator"
ADB="$SDK/platform-tools/adb"

if [[ ! -x "$EMULADOR" ]]; then
  echo "ERROR: no se encontro el emulador en $EMULADOR. Define ANDROID_HOME." >&2
  exit 1
fi

AVDS="$("$EMULADOR" -list-avds | sed '/^[[:space:]]*$/d')"
if [[ -z "$AVDS" ]]; then
  echo "ERROR: no hay ningun AVD creado en esta maquina." >&2
  echo "Crea uno en Android Studio: More Actions > Virtual Device Manager > Create Device." >&2
  echo "Los AVD son LOCALES: no se comparten por el repo ni hay uno estandar del equipo." >&2
  exit 1
fi
if [[ -z "$AVD" ]]; then
  AVD="$(printf '%s
' "$AVDS" | head -n 1)"
  echo "Sin AVD indicado: uso el primero disponible ('$AVD'). Disponibles: $(printf '%s' "$AVDS" | tr '
' ' ')"
fi
if ! printf '%s
' "$AVDS" | grep -qx "$AVD"; then
  echo "ERROR: el AVD '$AVD' no existe en esta maquina. Disponibles: $(printf '%s' "$AVDS" | tr '
' ' ')" >&2
  exit 1
fi

# 1. Arrancar el emulador si no hay ninguno corriendo
if "$ADB" devices | grep -Eq 'emulator-[0-9]+[[:space:]]+device'; then
  echo "Ya hay un emulador corriendo."
else
  echo "Arrancando emulador $AVD..."
  # --frio anade -no-snapshot-load: si el emulador se mato de golpe queda un
  # snapshot sucio y arranca congelado (adb responde pero la UI no pinta).
  if [[ -n "$FRIO" ]]; then
    echo "Arranque en frio (sin snapshot)."
    nohup "$EMULADOR" -avd "$AVD" -no-snapshot-load >/dev/null 2>&1 &
  else
    nohup "$EMULADOR" -avd "$AVD" >/dev/null 2>&1 &
  fi
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
