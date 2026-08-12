#!/usr/bin/env bash
# stack.sh - enciende y apaga Fintech Vital entero (base de datos + modelo +
# API + web) con UN solo comando, en contenedores.
#
# Para el dia a dia bastan tres:
#
#   ./ops/stack.sh arriba     lo enciende todo
#   ./ops/stack.sh probar     comprueba que todo responde de verdad
#   ./ops/stack.sh abajo      lo apaga (los datos se conservan)
#
#   ./ops/stack.sh ayuda      la lista completa, explicada
#
# Equivalente en Windows: ops\stack.ps1
#
# Lo que el script resuelve solo, para no tener que saber de contenedores:
#
#   - Elige el motor que ademas TENGA compose, no solo el que este encendido.
#     Podman no trae compose incorporado y se apoya en el de Docker.
#   - Si un PUERTO esta ocupado por otro programa, se mueve al siguiente libre
#     en vez de fallar. Se desactiva con PUERTOS_FIJOS=si.
#   - Crea ops/.env la primera vez copiando ops/.env.ejemplo.
set -uo pipefail

ops="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_file="$ops/compose.yml"
# ENTORNO permite apuntar a otro archivo: ENTORNO=.env.prod ./ops/stack.sh arriba
env_file="${ENTORNO:-$ops/.env}"
[ -f "$env_file" ] || env_file="$ops/${ENTORNO:-.env}"
env_ejemplo="$ops/.env.ejemplo"

verde=$'\033[32m'; rojo=$'\033[31m'; amarillo=$'\033[33m'; gris=$'\033[90m'; cyan=$'\033[36m'; fin=$'\033[0m'
ok()    { printf '%s[ OK  ]%s %s\n' "$verde" "$fin" "$1"; }
err()   { printf '%s[ERROR]%s %s\n' "$rojo" "$fin" "$1"; }
aviso() { printf '%s[AVISO]%s %s\n' "$amarillo" "$fin" "$1"; }
info()  { printf '%s[ --  ]%s %s\n' "$gris" "$fin" "$1"; }
titulo(){ printf '\n%s== %s ==%s\n' "$cyan" "$1" "$fin"; }

accion="${1:-arriba}"
argumento="${2:-}"

mostrar_ayuda() {
    cat <<'AYUDA'

  Fintech Vital - encender el proyecto entero

  Levanta la base de datos, el modelo, la API y la web en contenedores.
  No hace falta instalar Java, Node, Python ni PostgreSQL: va todo dentro.

  LO QUE USARAS CASI SIEMPRE
    ./ops/stack.sh arriba      Enciende todo. La primera vez tarda unos minutos
                               (construye las imagenes); despues, segundos.
    ./ops/stack.sh probar      Comprueba de verdad que responde: base de datos,
                               login real, API y web.
    ./ops/stack.sh abajo       Lo apaga. Los datos NO se borran.

  CUANDO ALGO NO VA
    ./ops/stack.sh estado      Que hay encendido ahora mismo.
    ./ops/stack.sh logs api    Lo que dice un servicio por dentro (db | api |
                               ml | web | tunel). Ctrl+C para salir.
    ./ops/stack.sh reiniciar   Apaga y enciende sin reconstruir.
    ./ops/stack.sh rebuild     Reconstruye las imagenes desde cero. Es lo que
                               toca si cambiaste codigo y no se refleja, o si
                               tocaste NEXT_PUBLIC_API_URL.

  DE VEZ EN CUANDO
    ./ops/stack.sh efimero     Enciende todo y, al pulsar Ctrl+C, lo borra sin
                               dejar rastro (ni datos ni RAM ocupada).
    ./ops/stack.sh migrar      Aplica cambios nuevos de base de datos.
    ./ops/stack.sh psql        Consola SQL contra la base de datos.
    ./ops/stack.sh limpiar     BORRA los datos y empieza de cero.
    ./ops/stack.sh tunel       Como "arriba", pero exige el token de Cloudflare.

  OPCIONES (variables de entorno)
    MOTOR=docker|podman        Fuerza el motor de contenedores.
    ENTORNO=.env.staging       Usa otro archivo de configuracion.
    PUERTOS_FIJOS=si           No buscar puertos alternativos si el que toca
                               esta ocupado (por defecto SI busca).

  Mas detalle, y que hacer cuando algo falla, en ops/README.md

AYUDA
}

# La ayuda se atiende ANTES de buscar motor: quien todavia no tiene Docker
# instalado tambien necesita poder leerla.
case "$accion" in
    ayuda|-h|--help) mostrar_ayuda; exit 0 ;;
esac

# ------------------------------------------------------------------ entorno ---
if [ ! -f "$env_file" ]; then
    if [ -f "$env_ejemplo" ]; then
        cp "$env_ejemplo" "$env_file"
        aviso "No habia ops/.env: se creo desde ops/.env.ejemplo. Revisalo antes de desplegar fuera de local."
    else
        err "Falta ops/.env y tampoco esta ops/.env.ejemplo."
        exit 1
    fi
fi

# ------------------------------------------------------- motor de contenedores ---
motor_vivo() { command -v "$1" >/dev/null 2>&1 && "$1" info >/dev/null 2>&1; }
# Docker trae compose dentro. Podman NO: delega en un docker-compose externo y,
# si no lo encuentra, falla a mitad del build con un error opaco. Por eso "listo"
# exige las dos cosas, y no solo que el motor responda.
motor_con_compose() { motor_vivo "$1" && "$1" compose version >/dev/null 2>&1; }

explicar_sin_compose() {
    err "$1 esta funcionando, pero no sabe leer el archivo compose.yml."
    if [ "$1" = podman ]; then
        echo
        echo '  Podman no trae "compose" incorporado: usa el de Docker, y falta esa pieza.'
        echo '  Instala una de las dos:'
        echo '      sudo apt install docker-compose-plugin     # o el equivalente de tu distro'
        echo '      pip install podman-compose'
        echo
        echo '  Al terminar, vuelve a correr:  ./ops/stack.sh arriba'
    else
        echo '  Reinstala Docker con el plugin de compose (docker-compose-plugin).'
    fi
}

elegir_motor() {
    if [ -n "${MOTOR:-}" ]; then
        if motor_con_compose "$MOTOR"; then echo "$MOTOR"; return 0; fi
        if [ "$MOTOR" = podman ] && command -v podman >/dev/null 2>&1; then
            info "Podman esta instalado pero apagado. Lo enciendo (tarda ~1 minuto)..." >&2
            podman machine start >/dev/null 2>&1
            motor_con_compose podman && { echo podman; return 0; }
        fi
        # Codigo 3 = "ya he explicado el problema con detalle": esta funcion
        # corre dentro de $(...), asi que exit solo mata a la subshell y quien
        # llama tiene que saber si hace falta un mensaje generico o no.
        if motor_vivo "$MOTOR"; then explicar_sin_compose "$MOTOR" >&2; exit 3; fi
        err "El motor que pediste ($MOTOR) no responde." >&2; exit 3
    fi
    # Lo que YA este encendido y COMPLETO primero: arrancar un motor cuesta
    # minutos, y quedarse con uno a medias solo retrasa el fallo hasta el build.
    motor_con_compose docker && { echo docker; return 0; }
    motor_con_compose podman && { echo podman; return 0; }
    if command -v podman >/dev/null 2>&1 && ! motor_vivo podman; then
        info "Podman esta instalado pero apagado. Lo enciendo (tarda ~1 minuto)..." >&2
        podman machine start >/dev/null 2>&1
        motor_con_compose podman && { echo podman; return 0; }
    fi
    # Vivo pero sin compose: es un fallo distinto de "no hay motor", y se
    # arregla de otra manera. Merece su propio mensaje (codigo 3, ver arriba).
    for m in docker podman; do
        if motor_vivo "$m"; then explicar_sin_compose "$m" >&2; exit 3; fi
    done
    return 1
}

# podman compose delega en un docker-compose externo y lo anuncia por stderr.
export PODMAN_COMPOSE_WARNING_LOGS=false

motor="$(elegir_motor)"; codigo_motor=$?
# 3 = el problema ya se explico con detalle; anadir el mensaje generico solo
# confundiria ("no hay motor" cuando si lo hay, solo le falta compose).
if [ "$codigo_motor" -eq 3 ]; then exit 1; fi
if [ "$codigo_motor" -ne 0 ] || [ -z "$motor" ]; then
    err "No encuentro ningun motor de contenedores en este equipo."
    echo
    echo '  El proyecto corre dentro de contenedores, asi que hace falta uno:'
    echo '      Docker:  https://docs.docker.com/engine/install/'
    echo '      Podman:  ./frontend/scripts/linux/verificar-requisitos.sh --instalar-podman'
    echo
    echo '  Instala uno y vuelve a correr:  ./ops/stack.sh arriba'
    exit 1
fi
motor_nombre="Docker"; [ "$motor" = podman ] && motor_nombre="Podman"
ok "Motor de contenedores: $motor_nombre"

compose() { "$motor" compose -f "$compose_file" --env-file "$env_file" "$@"; }

leer_env() {
    local valor
    valor="$(grep -E "^\s*$1\s*=" "$env_file" 2>/dev/null | head -1 | cut -d= -f2-)"
    # Comentario al final de la linea (convencion dotenv: espacio antes de #),
    # comillas y espacios sobrantes.
    valor="$(printf '%s' "$valor" | sed -E 's/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//; s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/')"
    if [ -n "$valor" ]; then echo "$valor"; else echo "$2"; fi
}

# El tunel va PEGADO al ciclo de vida del stack: sube con `arriba` y baja con
# `abajo`. Solo se enciende si el entorno trae token, porque `ops/.env` (local)
# no lo lleva y cloudflared entraria en bucle de reinicio sin el.
token_tunel="$(leer_env CLOUDFLARE_TUNNEL_TOKEN '')"
if [ -n "$token_tunel" ]; then perfil_arriba=(--profile tunel); else perfil_arriba=(); fi
# Al APAGAR se pasa el perfil siempre, haya token o no: si alguien levanto el
# tunel y despues vacio el token, sin esto el contenedor quedaria huerfano.
perfil_abajo=(--profile tunel)

puerto_web="$(leer_env PUERTO_WEB 3000)"
puerto_api="$(leer_env PUERTO_API 8080)"
puerto_db="$(leer_env PUERTO_DB 5432)"
db_nombre="$(leer_env POSTGRES_DB fintechvital)"
db_usuario="$(leer_env POSTGRES_USER fintechvital)"
cargar_demo="$(leer_env FV_CARGAR_DEMO no)"

# ------------------------------------------------------------------ puertos ---
# Un puerto ocupado es el motivo mas comun de que esto no arranque, y el error
# de compose no dice quien lo ocupa. Se comprueba ANTES y, si hace falta, se usa
# otro. PUERTOS_FIJOS=si lo desactiva.

puerto_libre() {
    # Si se puede CONECTAR, hay algo escuchando ahi.
    if (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; then return 1; fi
    # Y por si escucha en otra interfaz de la maquina.
    if command -v ss >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1\$" && return 1
    elif command -v lsof >/dev/null 2>&1; then
        lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 && return 1
    fi
    return 0
}

quien_usa_puerto() {
    if command -v lsof >/dev/null 2>&1; then
        lsof -nP -iTCP:"$1" -sTCP:LISTEN -Fc 2>/dev/null | grep '^c' | head -1 | cut -c2-
    elif command -v ss >/dev/null 2>&1; then
        ss -ltnp 2>/dev/null | grep -E "[:.]$1 " | grep -oE 'users:\(\("[^"]+' | head -1 | sed 's/.*"//'
    fi
}

# Que puerto de ESTA maquina publica NUESTRO contenedor. Sirve para no mover un
# puerto que ocupa el propio stack, y para decir la verdad aunque se haya movido.
puerto_publicado() {
    local salida puerto
    salida="$(compose port "$1" "$2" 2>/dev/null | tail -1)"
    puerto="$(printf '%s' "$salida" | sed -nE 's/.*:([0-9]+)[[:space:]]*$/\1/p' | head -1)"
    if [ -n "$puerto" ]; then echo "$puerto"; else echo 0; fi
}

# Los avisos van a stderr: stdout es el puerto elegido y lo captura quien llama.
elegir_puerto() {
    local etiqueta="$1" servicio="$2" deseado="$3" interno="$4" quien p
    if puerto_libre "$deseado"; then echo "$deseado"; return 0; fi
    # Si quien lo ocupa somos nosotros mismos no hay conflicto: es el stack ya
    # encendido, y compose reutiliza el contenedor.
    if [ "$(puerto_publicado "$servicio" "$interno")" = "$deseado" ]; then echo "$deseado"; return 0; fi
    quien="$(quien_usa_puerto "$deseado")"
    if [ "${PUERTOS_FIJOS:-no}" = "si" ]; then
        err "El puerto $deseado ($etiqueta) esta ocupado${quien:+ por $quien}, y pediste PUERTOS_FIJOS=si." >&2
        echo "  Cierra ese programa, cambia el puerto en ops/.env, o quita PUERTOS_FIJOS." >&2
        exit 1
    fi
    for ((p = deseado + 1; p <= deseado + 60; p++)); do
        if puerto_libre "$p"; then
            aviso "El puerto $deseado esta ocupado${quien:+ por $quien}. Pongo $etiqueta en el $p." >&2
            echo "$p"; return 0
        fi
    done
    err "No hay ningun puerto libre entre $deseado y $((deseado + 60)) para $etiqueta." >&2
    exit 1
}

reservar_puertos() {
    # El `|| exit 1` no sobra: elegir_puerto corre dentro de $(...), asi que su
    # exit solo mata a la subshell. Sin esto el script seguiria con el puerto
    # vacio despues de haber dicho que abortaba.
    puerto_web="$(elegir_puerto 'la web'           web "$puerto_web" 3000)" || exit 1
    puerto_api="$(elegir_puerto 'la API'           api "$puerto_api" 8080)" || exit 1
    puerto_db="$(elegir_puerto  'la base de datos' db  "$puerto_db"  5432)" || exit 1
    # Las variables del entorno tienen prioridad sobre el --env-file, asi que
    # exportarlas basta para que compose publique donde toca sin tocar ops/.env.
    export PUERTO_WEB="$puerto_web" PUERTO_API="$puerto_api" PUERTO_DB="$puerto_db"
    # La web llama a la API desde el NAVEGADOR, con la URL horneada en el build.
    # Si la API se movio y no se ajusta esto, la web carga pero no puede iniciar
    # sesion: pediria a un 8080 donde ya no hay nadie, y el navegador lo cuenta
    # como "TypeError: Failed to fetch".
    local url; url="$(leer_env NEXT_PUBLIC_API_URL 'http://localhost:8080/api/v1')"
    if printf '%s' "$url" | grep -qE '^https?://(localhost|127\.0\.0\.1):[0-9]+'; then
        if ! printf '%s' "$url" | grep -qE "^https?://(localhost|127\.0\.0\.1):$puerto_api(/|$)"; then
            export NEXT_PUBLIC_API_URL="$(printf '%s' "$url" | sed -E "s#://(localhost|127\.0\.0\.1):[0-9]+#://\1:$puerto_api#")"
            info "La web se construira apuntando a la API en el puerto $puerto_api."
        fi
    fi
}

# Para las acciones que NO levantan nada: el .env dice 3000, pero el stack puede
# estar corriendo en 3001 porque la vez anterior estaba ocupado.
leer_puertos_reales() {
    local p
    p="$(puerto_publicado web 3000)"; [ "$p" != 0 ] && puerto_web="$p"
    p="$(puerto_publicado api 8080)"; [ "$p" != 0 ] && puerto_api="$p"
    p="$(puerto_publicado db  5432)"; [ "$p" != 0 ] && puerto_db="$p"
    return 0
}

resumen_arranque() {
    titulo 'Listo'
    echo
    printf '  Abre esto en el navegador:\n'
    printf '      %shttp://localhost:%s%s\n' "$verde" "$puerto_web" "$fin"
    echo
    echo '  Tambien esta disponible:'
    echo "      API y su documentacion   http://localhost:$puerto_api/api/v1/docs"
    echo "      Base de datos            localhost:$puerto_db  (base $db_nombre, usuario $db_usuario)"
    if [ "$cargar_demo" = "si" ]; then
        echo
        echo '  Usuario de ejemplo para entrar:  ana.torres@ejemplo.mx'
        echo '  (la contrasena es la de FV_PASSWORD_DEMO, en ops/.env)'
    fi
    echo
    echo '  Siguiente paso:   ./ops/stack.sh probar     comprueba que todo responde'
    echo '  Para apagarlo:    ./ops/stack.sh abajo      los datos se conservan'
    echo
}

explicar_fallo_arranque() {
    err 'No se pudo encender el stack.'
    echo
    echo '  El motivo esta en las lineas de arriba. Los habituales:'
    echo
    echo '    "failed to solve: process /bin/sh -c npm run build"'
    echo '        La web no llego a compilar. Sube por el registro hasta la primera'
    echo '        linea con "Type error", "Error:" o "Module not found". Si no hay'
    echo '        ninguna y corta de golpe, casi siempre es falta de MEMORIA.'
    echo
    echo '    "port is already allocated" / "bind: address already in use"'
    echo '        Un puerto ocupado. Este script ya busca otro solo; si aun asi'
    echo '        sale, corre ./ops/stack.sh abajo y vuelve a intentarlo.'
    echo
    echo '    "no space left on device"'
    echo '        Disco lleno de imagenes viejas:  docker system prune -a'
    echo
    echo '  Si vas a pedir ayuda, manda el registro COMPLETO:'
    echo '      ./ops/stack.sh arriba > registro-error.txt 2>&1'
    echo
}

# ------------------------------------------------------------------ pruebas ---
consulta() { compose exec -T db psql -U "$db_usuario" -d "$db_nombre" -tAc "$1" 2>/dev/null | tr -d '[:space:]'; }

esperar_http() {
    local url="$1" intentos="${2:-20}" i
    for ((i=0; i<intentos; i++)); do
        if curl -fsS -o /dev/null --max-time 5 "$url"; then return 0; fi
        sleep 3
    done
    return 1
}

probar_stack() {
    local fallos=0 v
    leer_puertos_reales

    titulo 'Base de datos'
    v="$(consulta "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"
    if [[ "$v" =~ ^[0-9]+$ ]] && [ "$v" -ge 20 ]; then ok "Esquema creado: $v tablas"
    else err "No se pudo contar las tablas (respuesta: '$v')"; ((fallos++)); fi

    v="$(consulta 'SELECT count(*) FROM esquema_historial')"
    esperadas="$(find "$(dirname "$ops")/db/migraciones" -maxdepth 1 -name 'V*__*.sql' 2>/dev/null | wc -l | tr -d ' ')"
    [ "${esperadas:-0}" -lt 1 ] && esperadas=1
    if [[ "$v" =~ ^[0-9]+$ ]] && [ "$v" -ge "$esperadas" ]; then ok "Migraciones aplicadas: $v de $esperadas"
    else err "Faltan migraciones: aplicadas '$v' de $esperadas. Corre: ./ops/stack.sh migrar"; ((fallos++)); fi

    v="$(consulta 'SELECT count(*) FROM categoria')"
    [ "$v" = "12" ] && ok 'Taxonomia: 12 categorias' || { err "Se esperaban 12 categorias, hay '$v'"; ((fallos++)); }

    v="$(consulta 'SELECT count(*) FROM categoria_i18n')"
    [ "$v" = "36" ] && ok 'i18n: 36 etiquetas (12 x 3 idiomas)' || { err "Se esperaban 36 etiquetas i18n, hay '$v'"; ((fallos++)); }

    v="$(consulta 'SELECT count(*) FROM usuario')"
    if [[ "$v" =~ ^[0-9]+$ ]] && [ "$v" -gt 0 ]; then
        ok "Semilla demo: $v usuarios"
        ok "Movimientos: $(consulta 'SELECT count(*) FROM transaccion')"
        ok "Analisis: $(consulta 'SELECT count(*) FROM analisis')"
        info "Perfiles presentes: $(compose exec -T db psql -U "$db_usuario" -d "$db_nombre" -tAc "SELECT string_agg(DISTINCT perfil_codigo, ', ') FROM analisis" 2>/dev/null | tr -d '\r')"
    else
        info 'Sin datos de ejemplo (FV_CARGAR_DEMO=no). Es lo esperado en produccion.'
    fi

    v="$(consulta 'SELECT count(*) FROM vw_indicadores_mensuales')"
    if [[ "$v" =~ ^[0-9]+$ ]]; then ok "Vista de indicadores responde ($v filas)"
    else err 'La vista vw_indicadores_mensuales fallo'; ((fallos++)); fi

    titulo 'API'
    if esperar_http "http://127.0.0.1:$puerto_api/api/v1/salud"; then
        ok "API responde en http://localhost:$puerto_api"
        # El login real demuestra que la API habla con la base de datos.
        if curl -fsS --max-time 10 -X POST -H 'Content-Type: application/json'              -d "{\"email\":\"ana.torres@ejemplo.mx\",\"password\":\"$(leer_env FV_PASSWORD_DEMO '')\"}"              "http://127.0.0.1:$puerto_api/api/v1/auth/login" | grep -q access_token; then
            ok 'Login contra la BD: devuelve token'
        else
            aviso 'El login no devolvio token (revisa FV_PASSWORD_DEMO y que la semilla este cargada)'
        fi
        # 4 transacciones y no 1: el endpoint exige entre 3 y 500, asi que con
        # una sola respondia 422 y la prueba lo contaba como caido.
        if curl -fsS --max-time 20 -X POST \
             -H 'Content-Type: application/json' \
             -d '{"ingreso_mensual":4500,"nivel_endeudamiento":25,"frecuencia_ahorro":"Media","transacciones":[{"descripcion":"Supermercado La Comer","valor":420},{"descripcion":"Renta departamento","valor":1500},{"descripcion":"Netflix","valor":199},{"descripcion":"Uber","valor":85}]}' \
             "http://127.0.0.1:$puerto_api/api/v1/analisis-financiero" | grep -q perfil_financiero; then
            ok 'Analisis del enunciado: responde con perfil financiero'
        else
            err 'POST /api/v1/analisis-financiero no respondio con un perfil'
            echo '  Es el endpoint que probara el jurado. Mira: ./ops/stack.sh logs api'
            ((fallos++))
        fi
    else
        err "La API no respondio en el puerto $puerto_api"
        echo '  Mira por que con: ./ops/stack.sh logs api'
        ((fallos++))
    fi

    titulo 'Web'
    if esperar_http "http://127.0.0.1:$puerto_web/es/login"; then
        ok "Web responde en http://localhost:$puerto_web (es | pt | en)"
    else
        err "La web no respondio en el puerto $puerto_web"
        echo '  Mira por que con: ./ops/stack.sh logs web'
        ((fallos++))
    fi

    echo
    if [ "$fallos" -eq 0 ]; then
        printf '%sTodo funciona. Abre http://localhost:%s%s\n' "$verde" "$puerto_web" "$fin"; return 0
    fi
    printf '%sHay %s comprobacion(es) en rojo.%s\n' "$rojo" "$fallos" "$fin"; return 1
}

# ----------------------------------------------------------------- acciones ---
case "$accion" in
    arriba)
        titulo 'Encendiendo Fintech Vital'
        echo '  La primera vez tarda varios minutos: hay que construir las imagenes.'
        echo '  Las siguientes son cuestion de segundos.'
        echo
        reservar_puertos
        compose "${perfil_arriba[@]}" up -d --build || { explicar_fallo_arranque; exit 1; }
        # Los contenedores existen, pero la API tarda en abrir el puerto. Se
        # espera aqui para no mandar a nadie a un navegador que dara error.
        echo
        info 'Contenedores creados. Esperando a que respondan...'
        leer_puertos_reales
        if esperar_http "http://127.0.0.1:$puerto_web/es/login" 20; then ok 'La web ya responde.'
        else aviso 'La web aun no responde. Dale un minuto y mira: ./ops/stack.sh estado'; fi
        if esperar_http "http://127.0.0.1:$puerto_api/api/v1/salud" 10; then ok 'La API ya responde.'
        else aviso 'La API aun no responde. Dale un minuto y mira: ./ops/stack.sh logs api'; fi
        if [ -n "$token_tunel" ]; then
            ok 'Tunel publico encendido. Se apaga solo con: ./ops/stack.sh abajo'
            echo '    https://staging.fintechvital.com      ->  http://web:3000'
            echo '    https://api-staging.fintechvital.com  ->  http://api:8080'
        fi
        resumen_arranque
        ;;
    efimero)
        # Modo "no me dejes basura": corre EN PRIMER PLANO y al salir con Ctrl+C
        # borra contenedores, red y volumen de datos. Para una prueba rapida sin
        # dejar nada ocupando RAM ni disco.
        titulo 'Modo temporal - Ctrl+C para salir y borrarlo todo'
        aviso 'Al salir se borran los contenedores Y LOS DATOS. La base se recrea vacia la proxima vez.'
        reservar_puertos
        limpiar_efimero() {
            echo
            titulo 'Limpiando'
            compose "${perfil_abajo[@]}" down -v --remove-orphans
            [ "${BORRAR_IMAGENES:-no}" = "si" ] && compose down --rmi local >/dev/null 2>&1
            ok 'Todo limpio: sin contenedores, sin volumen, sin RAM ocupada.'
        }
        trap limpiar_efimero EXIT INT TERM
        compose up --build
        ;;
    tunel)
        # Desde que `arriba` enciende el tunel solo, esta accion es un atajo
        # explicito: hace lo mismo pero falla fuerte si falta el token.
        titulo 'Encendiendo el stack + el tunel publico de Cloudflare'
        if [ -z "$token_tunel" ]; then
            err 'Falta CLOUDFLARE_TUNNEL_TOKEN en el archivo de entorno.'
            echo "  Anadelo a $env_file, o usa 'arriba' si no necesitas publicar nada."
            exit 1
        fi
        reservar_puertos
        compose --profile tunel up -d --build || { explicar_fallo_arranque; exit 1; }
        compose "${perfil_abajo[@]}" ps
        echo
        info 'En el panel de Cloudflare, los public hostnames apuntan a los NOMBRES DE SERVICIO:'
        echo '    staging.fintechvital.com      ->  http://web:3000'
        echo '    api-staging.fintechvital.com  ->  http://api:8080'
        aviso 'La web hornea NEXT_PUBLIC_API_URL en el build: para staging tiene que ser https://api-staging.fintechvital.com/api/v1 y hay que reconstruir.'
        ;;
    abajo)     compose "${perfil_abajo[@]}" down; ok 'Apagado. Los datos se conservan: al encenderlo otra vez estara todo como lo dejaste.' ;;
    reiniciar) compose "${perfil_abajo[@]}" restart; compose "${perfil_abajo[@]}" ps ;;
    # Con el perfil puesto, `ps` tambien lista el tunel; sin el, compose lo
    # filtra y parece que no estuviera corriendo.
    estado)
        compose "${perfil_abajo[@]}" ps
        leer_puertos_reales
        echo
        echo "  Web  ->  http://localhost:$puerto_web"
        echo "  API  ->  http://localhost:$puerto_api/api/v1/docs"
        echo "  BD   ->  localhost:$puerto_db"
        echo
        echo '  En la columna STATUS, "healthy" significa que ya responde de verdad.'
        ;;
    logs)
        if [ -n "$argumento" ]; then
            echo "  Mostrando lo que dice '$argumento' por dentro. Ctrl+C para salir."
            compose "${perfil_abajo[@]}" logs -f --tail 100 "$argumento"
        else
            echo '  Mostrando todos los servicios a la vez. Ctrl+C para salir.'
            echo '  Para uno solo:  ./ops/stack.sh logs api'
            compose "${perfil_abajo[@]}" logs -f --tail 100
        fi
        ;;
    rebuild)
        titulo 'Reconstruyendo desde cero'
        echo '  Sin aprovechar nada de lo ya construido. Tarda tanto como la primera vez.'
        reservar_puertos
        compose build --no-cache || { explicar_fallo_arranque; exit 1; }
        compose up -d
        compose "${perfil_abajo[@]}" ps
        leer_puertos_reales
        resumen_arranque
        ;;
    migrar)    titulo 'Aplicando los cambios pendientes de base de datos'; compose --profile migrar run --rm migrador ;;
    psql)      echo "Consola SQL sobre la base $db_nombre. Para salir escribe \\q y pulsa Enter."; compose exec db psql -U "$db_usuario" -d "$db_nombre" ;;
    limpiar)
        echo
        printf '%s  Esto BORRA la base de datos entera: usuarios, movimientos y analisis.%s\n' "$amarillo" "$fin"
        printf '%s  No se puede deshacer. La proxima vez que enciendas se creara vacia.%s\n' "$amarillo" "$fin"
        echo
        echo '  Si solo quieres apagar sin perder nada, cancela y usa: ./ops/stack.sh abajo'
        echo
        read -r -p 'Escribe BORRAR para confirmar: ' r
        if [ "$r" = "BORRAR" ]; then compose "${perfil_abajo[@]}" down -v; ok 'Contenedores y datos eliminados.'
        else info 'Cancelado: no se ha borrado nada.'; fi
        ;;
    probar)    probar_stack; exit $? ;;
    ayuda|-h|--help) mostrar_ayuda ;;
    *)
        err "No conozco la accion '$accion'."
        echo
        echo '  Lo que casi seguro querias:'
        echo '    ./ops/stack.sh arriba     encender todo'
        echo '    ./ops/stack.sh abajo      apagarlo'
        echo '    ./ops/stack.sh ayuda      ver la lista completa'
        echo
        exit 1
        ;;
esac
