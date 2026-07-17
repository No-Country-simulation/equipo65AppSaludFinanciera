#!/usr/bin/env bash
# verificar-requisitos.sh - revisa que la maquina tenga todo lo necesario
# para trabajar con el frontend (web en contenedor y movil en emulador).
# Uso:
#   ./scripts/linux/verificar-requisitos.sh
# Salida: 0 = listo (puede haber avisos) | 1 = falta algo critico.
# Equivalente Windows: scripts/windows/verificar-requisitos.ps1
set -u

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FALLAS=0
AVISOS=0

ok()     { printf '\033[32m[ OK  ]\033[0m %s\n' "$1"; }
falta()  { printf '\033[31m[FALTA]\033[0m %s\n' "$1"; FALLAS=$((FALLAS + 1)); }
aviso()  { printf '\033[33m[AVISO]\033[0m %s\n' "$1"; AVISOS=$((AVISOS + 1)); }
info()   { printf '\033[90m[ --  ]\033[0m %s\n' "$1"; }
titulo() { printf '\n\033[36m== %s ==\033[0m\n' "$1"; }

# ----------------------------------------------------------------- basico ---
titulo "Basico (necesario para todo)"

if command -v git >/dev/null 2>&1; then
  ok "Git: $(git --version)"
else
  falta "Git no esta instalado (sudo apt install git / dnf install git)"
fi

if command -v node >/dev/null 2>&1; then
  ver="$(node -v | sed 's/^v//')"
  major="${ver%%.*}"
  if [[ "$major" -ge 20 ]]; then
    ok "Node.js: v$ver (se pide 20+)"
  else
    falta "Node.js v$ver es viejo: se necesita 20+ (LTS) -> https://nodejs.org"
  fi
else
  falta "Node.js no esta instalado (se necesita 20+ LTS) -> https://nodejs.org"
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm: v$(npm -v)"
else
  falta "npm no esta disponible (viene incluido con Node.js)"
fi

if [[ -d "$RAIZ/web/node_modules" ]]; then
  ok "Dependencias de web/ instaladas"
else
  aviso "Faltan dependencias de web/: correr (cd web && npm install) - opcion 8 del menu"
fi

if [[ -d "$RAIZ/mobile/node_modules" ]]; then
  ok "Dependencias de mobile/ instaladas"
else
  aviso "Faltan dependencias de mobile/: correr (cd mobile && npm install) - opcion 8 del menu"
fi

# ----------------------------------------------- contenedores (web docker) ---
titulo "Contenedores (web en Docker/Podman)"

motor=""
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "Docker instalado y el daemon responde"
    motor="docker"
  else
    aviso "Docker instalado pero el daemon NO responde (sudo systemctl start docker; revisa el grupo 'docker' de tu usuario)"
  fi
else
  info "Docker no esta instalado"
fi

if [[ -z "$motor" ]] && command -v podman >/dev/null 2>&1; then
  if podman info >/dev/null 2>&1; then
    ok "Podman responde (alternativa valida a Docker)"
    motor="podman"
  else
    aviso "Podman esta instalado pero no responde"
  fi
fi

if [[ -z "$motor" ]]; then
  if ! command -v docker >/dev/null 2>&1 && ! command -v podman >/dev/null 2>&1; then
    falta "Ni Docker ni Podman: instala uno -> https://docs.docker.com/engine/install/"
  else
    aviso "Sin motor de contenedores activo. La web puede correr igual: (cd web && npm run dev) - opcion 5 del menu"
  fi
fi

# --------------------------------------------- android (movil en emulador) ---
titulo "Android (app movil en emulador)"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
if [[ -d "$SDK" ]]; then
  ok "Android SDK: $SDK"
else
  aviso "Android SDK no encontrado: instala Android Studio y define ANDROID_HOME. (Con un telefono fisico + Expo Go NO se necesita)"
fi

EMULADOR="$SDK/emulator/emulator"
if [[ -x "$EMULADOR" ]]; then
  ok "Emulador de Android presente"
  avds="$("$EMULADOR" -list-avds 2>/dev/null | sed '/^$/d')"
  if [[ -n "$avds" ]]; then
    ok "AVDs disponibles: $(echo "$avds" | paste -sd ', ' -)"
  else
    aviso "No hay ningun AVD creado: Android Studio > Device Manager > Create device (ej. Pixel 9)"
  fi
else
  aviso "emulator no encontrado dentro del SDK"
fi

if [[ -x "$SDK/platform-tools/adb" ]]; then
  ok "adb presente (platform-tools)"
else
  aviso "adb no encontrado: instala 'Android SDK Platform-Tools'"
fi

# ---------------------------------------------------------------- sistema ---
titulo "Sistema"

info "$(uname -srm)"

ram_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || true)"
if [[ -n "${ram_kb:-}" ]]; then
  ram_gb=$((ram_kb / 1024 / 1024))
  if (( ram_gb >= 16 )); then
    ok "RAM: ${ram_gb} GB"
  elif (( ram_gb >= 8 )); then
    aviso "RAM: ${ram_gb} GB - alcanza, pero emulador + contenedor a la vez va a ir justo"
  else
    aviso "RAM: ${ram_gb} GB - por debajo de lo recomendado (8 GB minimo, 16 GB ideal)"
  fi
fi

libre_gb="$(df -Pk "$RAIZ" 2>/dev/null | awk 'NR==2 {printf "%d", $4 / 1024 / 1024}')"
if [[ -n "${libre_gb:-}" ]]; then
  if (( libre_gb >= 15 )); then
    ok "Disco libre: ${libre_gb} GB"
  else
    aviso "Disco libre: ${libre_gb} GB - Android Studio + SDK + imagenes de contenedor piden ~15 GB"
  fi
fi

if [[ -e /dev/kvm ]]; then
  ok "KVM disponible (aceleracion del emulador)"
else
  aviso "KVM no disponible: el emulador va a ir lento (habilita la virtualizacion en BIOS/UEFI y el modulo kvm)"
fi

# ----------------------------------------------------------------- resumen ---
echo ""
if (( FALLAS == 0 && AVISOS == 0 )); then
  echo "Todo listo: no falta nada."
elif (( FALLAS == 0 )); then
  echo "Listo para trabajar, con $AVISOS aviso(s). Revisa lo marcado en amarillo."
else
  echo "Faltan $FALLAS requisito(s) criticos (en rojo) y hay $AVISOS aviso(s)."
fi
echo "Guia paso a paso desde cero: docs/FRONTEND_DESDE_CERO.md"

(( FALLAS == 0 ))
