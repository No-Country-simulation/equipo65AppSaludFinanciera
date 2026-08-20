#!/usr/bin/env bash
# publicar.sh - deja un entorno listo para entregar, de una sola pasada.
#
#   ENTORNO=.env.prod ./ops/publicar.sh
#
# Hace, en este orden y sin pasos manuales:
#
#   1. Compila el APK de Android apuntando a la API de ESE entorno.
#   2. COMPRUEBA que la URL correcta quedo dentro del APK.
#   3. Lo copia a frontend/web/public/, que es de donde lo sirve la web.
#   4. Reconstruye las imagenes de los contenedores, ya con el APK dentro.
#   5. Levanta el stack (y el tunel, si el entorno trae token).
#
# El problema que resuelve: NEXT_PUBLIC_APK_URL apunta a un archivo dentro de
# frontend/web/public/, pero el .apk esta en .gitignore (son ~110 MB por build),
# asi que NO viaja en el clon. Si se construye la imagen de la web sin haberlo
# copiado antes, el boton de descarga da 404 - y no se nota hasta que alguien
# lo pulsa, normalmente el jurado.
#
#   SIN_APK=1   no compilar el APK (reutiliza el que ya este en public/)
#   SOLO_APK=1  compilar y copiar el APK, sin tocar los contenedores
#
# Equivalente en Windows: ops\publicar.ps1

set -euo pipefail

ops="$(cd "$(dirname "$0")" && pwd)"
raiz="$(dirname "$ops")"
movil="$raiz/frontend/mobile"
destino="$raiz/frontend/web/public/fintech-vital.apk"

env_file="${ENTORNO:-$ops/.env}"
[ -f "$env_file" ] || env_file="$ops/${ENTORNO:-.env}"

verde=$'\033[32m'; rojo=$'\033[31m'; ama=$'\033[33m'; gris=$'\033[90m'; cyan=$'\033[36m'; fin=$'\033[0m'
ok()    { printf '%s[ OK  ]%s %s\n' "$verde" "$fin" "$1"; }
err()   { printf '%s[ERROR]%s %s\n' "$rojo"  "$fin" "$1"; }
aviso() { printf '%s[AVISO]%s %s\n' "$ama"   "$fin" "$1"; }
info()  { printf '%s[ --  ]%s %s\n' "$gris"  "$fin" "$1"; }
titulo(){ printf '\n%s== %s ==%s\n' "$cyan" "$1" "$fin"; }
nota()  { printf '%s  %s%s\n' "$gris" "$1" "$fin"; }

leer_env() {
    local valor
    valor="$(grep -E "^\s*$1\s*=" "$env_file" 2>/dev/null | head -1 | cut -d= -f2- || true)"
    valor="${valor%%#*}"
    valor="$(printf '%s' "$valor" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
    printf '%s' "${valor:-$2}"
}

if [ ! -f "$env_file" ]; then
    err "No encuentro el archivo de entorno: $env_file"
    nota 'Usa ENTORNO=.env.staging o ENTORNO=.env.prod'
    exit 1
fi

api_url="$(leer_env NEXT_PUBLIC_API_URL '')"
apk_url="$(leer_env NEXT_PUBLIC_APK_URL '')"

titulo 'Entorno'
nota "Archivo : $env_file"
nota "API     : $api_url"
nota "APK     : ${apk_url:-(desactivado: NEXT_PUBLIC_APK_URL vacia)}"

# --------------------------------------------------------------------- APK ---
if [ -z "${SIN_APK:-}" ] && [ -n "$apk_url" ]; then

    titulo 'APK de Android'

    if [ ! -x "$movil/android/gradlew" ] && [ ! -f "$movil/android/gradlew" ]; then
        err 'Falta frontend/mobile/android. El proyecto no esta prebuildeado.'
        nota 'Genera la carpeta nativa con:  cd frontend/mobile && npx expo prebuild -p android'
        exit 1
    fi

    # Gradle necesita un JDK. Sin esto el error que sale es criptico.
    if ! command -v java >/dev/null 2>&1; then
        err 'No encuentro java en el PATH, y Gradle lo necesita.'
        nota 'Instala un JDK 17+ (por ejemplo Temurin) y vuelve a abrir la terminal.'
        exit 1
    fi

    if [ -z "$api_url" ]; then
        err 'El entorno no define NEXT_PUBLIC_API_URL, asi que no se contra que compilar el APK.'
        exit 1
    fi

    # La app movil lee EXPO_PUBLIC_API_URL; la web, NEXT_PUBLIC_API_URL. Se
    # apunta el APK a la MISMA API que la web de este entorno, que es justo lo
    # que se olvida cuando se compila a mano: queda un APK de staging colgado
    # de la web de produccion.
    export EXPO_PUBLIC_API_URL="$api_url"
    info "Compilando contra $api_url"
    nota 'La primera vez Gradle tarda varios minutos. Despues usa cache.'

    ( cd "$movil/android" && sh ./gradlew assembleRelease --console=plain )

    generado="$movil/android/app/build/outputs/apk/release/app-release.apk"
    if [ ! -f "$generado" ]; then
        err "Gradle dijo que si, pero no encuentro $generado"
        exit 1
    fi

    # Comprobacion que justifica el script: que la URL este DENTRO del APK.
    info 'Comprobando que la URL correcta quedo dentro del APK...'
    if command -v unzip >/dev/null 2>&1; then
        if unzip -p "$generado" 'assets/*.bundle' 2>/dev/null | grep -qF "$api_url"; then
            ok "El APK apunta a $api_url"
        else
            err "El APK NO contiene $api_url."
            nota 'Casi seguro gano frontend/mobile/.env sobre la variable de entorno.'
            nota "Pon ahi EXPO_PUBLIC_API_URL=$api_url y vuelve a lanzarlo."
            exit 1
        fi
    else
        aviso 'Sin unzip no puedo mirar dentro del APK; me lo salto.'
    fi

    cp -f "$generado" "$destino"
    mb="$(du -m "$destino" | cut -f1)"
    ok "Copiado a frontend/web/public/fintech-vital.apk (${mb} MB)"

elif [ -n "${SIN_APK:-}" ]; then
    titulo 'APK de Android'
    info 'Saltado (SIN_APK=1).'
    if [ -f "$destino" ]; then
        nota 'Se reutiliza el que ya esta en public/. Ojo: puede apuntar a otra API.'
    else
        aviso 'Y no hay ninguno en public/: el boton de descarga dara 404.'
    fi
elif [ -z "$apk_url" ]; then
    titulo 'APK de Android'
    info 'NEXT_PUBLIC_APK_URL esta vacia: la web no pinta el bloque de descarga.'
fi

if [ -n "${SOLO_APK:-}" ]; then
    titulo 'Listo'
    nota 'Solo se pidio el APK (SOLO_APK=1). Los contenedores no se han tocado.'
    exit 0
fi

# ------------------------------------------------------------ contenedores ---
titulo 'Imagenes y stack'
info 'Reconstruyendo con el APK ya en su sitio...'

# Se delega en stack.sh: ya sabe encontrar el motor, elegir puertos libres y
# encender el tunel si el entorno trae token. Duplicar eso aqui seria pedir que
# los dos scripts se desincronicen.
ENTORNO="${ENTORNO:-.env}" "$ops/stack.sh" rebuild

titulo 'Publicado'
nota "Comprueba que responde:   ENTORNO=${ENTORNO:-.env} ./ops/stack.sh probar"
nota 'Los 3 ejemplos del enunciado:   node ops/ejemplos.mjs'
