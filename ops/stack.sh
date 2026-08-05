#!/usr/bin/env bash
# stack.sh - levanta y opera el stack completo de Fintech Vital en contenedores.
#
# Uso:
#   ./ops/stack.sh arriba          build + up de db, api y web
#   ./ops/stack.sh abajo           para y borra los contenedores (conserva los datos)
#   ./ops/stack.sh estado
#   ./ops/stack.sh logs db
#   ./ops/stack.sh probar          pruebas de humo del stack completo
#   ./ops/stack.sh rebuild         reconstruye las imagenes sin cache
#   ./ops/stack.sh migrar          aplica migraciones nuevas sobre la BD existente
#   ./ops/stack.sh psql            consola SQL contra la BD
#   ./ops/stack.sh limpiar         borra contenedores Y EL VOLUMEN DE DATOS
#
#   MOTOR=podman ./ops/stack.sh arriba     fuerza motor
#
# Equivalente en Windows: ops\stack.ps1
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

elegir_motor() {
    if [ -n "${MOTOR:-}" ]; then
        if motor_vivo "$MOTOR"; then echo "$MOTOR"; return 0; fi
        if [ "$MOTOR" = podman ] && command -v podman >/dev/null 2>&1; then
            info "Arrancando la maquina de Podman..."
            podman machine start >/dev/null 2>&1
            motor_vivo podman && { echo podman; return 0; }
        fi
        err "El motor forzado ($MOTOR) no responde."; return 1
    fi
    # Lo que YA este vivo primero: arrancar un motor cuesta minutos.
    motor_vivo docker && { echo docker; return 0; }
    motor_vivo podman && { echo podman; return 0; }
    if command -v podman >/dev/null 2>&1; then
        info "Arrancando la maquina de Podman..."
        podman machine start >/dev/null 2>&1
        motor_vivo podman && { echo podman; return 0; }
    fi
    return 1
}

# podman compose delega en un docker-compose externo y lo anuncia por stderr.
export PODMAN_COMPOSE_WARNING_LOGS=false

motor="$(elegir_motor)" || {
    err "Ningun motor de contenedores disponible (ni Docker ni Podman)."
    echo "  Instala uno con: ./frontend/scripts/linux/verificar-requisitos.sh --instalar-podman"
    exit 1
}
info "Motor: $motor"

if ! "$motor" compose version >/dev/null 2>&1; then
    err "$motor no tiene subcomando 'compose' disponible."
    [ "$motor" = podman ] && echo "  Podman necesita un proveedor de compose: instala docker-compose."
    exit 1
fi

compose() { "$motor" compose -f "$compose_file" --env-file "$env_file" "$@"; }

leer_env() {
    local valor
    valor="$(grep -E "^\s*$1\s*=" "$env_file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '[:space:]')"
    if [ -n "$valor" ]; then echo "$valor"; else echo "$2"; fi
}

puerto_web="$(leer_env PUERTO_WEB 3000)"
puerto_api="$(leer_env PUERTO_API 8080)"
puerto_db="$(leer_env PUERTO_DB 5432)"
db_nombre="$(leer_env POSTGRES_DB fintechvital)"
db_usuario="$(leer_env POSTGRES_USER fintechvital)"

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
        if curl -fsS -o /dev/null --max-time 10 -X POST \
             -H 'Content-Type: application/json' \
             -d '{"ingreso_mensual":4500,"nivel_endeudamiento":25,"frecuencia_ahorro":"Media","transacciones":[{"descripcion":"Supermercado","valor":420}]}' \
             "http://127.0.0.1:$puerto_api/api/v1/analisis-financiero"; then
            ok 'POST /api/v1/analisis-financiero responde'
        else
            aviso 'POST /api/v1/analisis-financiero NO existe todavia (la API lo expone en /api/analisis-financiero y con otra forma). Ver docs/REVISION_API.md'
        fi
    else
        err "La API no respondio en el puerto $puerto_api"; ((fallos++))
    fi

    titulo 'Web'
    if esperar_http "http://127.0.0.1:$puerto_web/es/login"; then
        ok "Web responde en http://localhost:$puerto_web (es | pt | en)"
    else
        err "La web no respondio en el puerto $puerto_web"; ((fallos++))
    fi

    echo
    if [ "$fallos" -eq 0 ]; then
        printf '%sStack verificado: todo responde.%s\n' "$verde" "$fin"; return 0
    fi
    printf '%sHay %s comprobacion(es) en rojo.%s\n' "$rojo" "$fallos" "$fin"; return 1
}

# ----------------------------------------------------------------- acciones ---
case "$accion" in
    arriba)
        titulo 'Construyendo y levantando el stack'
        compose up -d --build || { err 'Fallo el levantamiento del stack.'; exit 1; }
        echo; compose ps; echo
        ok "Web: http://localhost:$puerto_web"
        ok "API: http://localhost:$puerto_api"
        ok "BD:  localhost:$puerto_db  (base $db_nombre, usuario $db_usuario)"
        echo; echo 'Comprueba que todo funciona con: ./ops/stack.sh probar'
        ;;
    efimero)
        # Modo "no me dejes basura": corre EN PRIMER PLANO y al salir con Ctrl+C
        # borra contenedores, red y volumen de datos. Para una prueba rapida sin
        # dejar nada ocupando RAM ni disco.
        titulo 'Stack efimero - Ctrl+C para salir y limpiar TODO'
        aviso 'Al salir se borran contenedores, red y VOLUMEN DE DATOS (la BD se recrea vacia la proxima vez).'
        limpiar_efimero() {
            echo
            titulo 'Limpiando'
            compose down -v --remove-orphans
            [ "${BORRAR_IMAGENES:-no}" = "si" ] && compose down --rmi local >/dev/null 2>&1
            ok 'Todo limpio: sin contenedores, sin volumen, sin RAM ocupada.'
        }
        trap limpiar_efimero EXIT INT TERM
        compose up --build
        ;;
    tunel)
        titulo 'Levantando el stack + Cloudflare Tunnel'
        if [ -z "$(leer_env CLOUDFLARE_TUNNEL_TOKEN '')" ]; then
            err 'Falta CLOUDFLARE_TUNNEL_TOKEN en el archivo de entorno.'; exit 1
        fi
        compose --profile tunel up -d --build
        compose ps
        echo
        info 'En el panel de Cloudflare, los public hostnames apuntan a los NOMBRES DE SERVICIO:'
        echo '    staging.fintechvital.com      ->  http://web:3000'
        echo '    api-staging.fintechvital.com  ->  http://api:8080'
        aviso 'La web hornea NEXT_PUBLIC_API_URL en el build: para staging tiene que ser https://api-staging.fintechvital.com/api/v1 y hay que reconstruir.'
        ;;
    abajo)     compose down; ok 'Stack detenido. El volumen de datos se conserva.' ;;
    reiniciar) compose restart; compose ps ;;
    estado)    compose ps ;;
    logs)      if [ -n "$argumento" ]; then compose logs -f --tail 100 "$argumento"; else compose logs -f --tail 100; fi ;;
    rebuild)   titulo 'Reconstruyendo imagenes sin cache'; compose build --no-cache; compose up -d; compose ps ;;
    migrar)    titulo 'Aplicando migraciones pendientes'; compose --profile migrar run --rm migrador ;;
    psql)      echo "Consola SQL sobre $db_nombre. Salir: \\q"; compose exec db psql -U "$db_usuario" -d "$db_nombre" ;;
    limpiar)
        printf '%sEsto BORRA el volumen de datos de PostgreSQL. Los datos no se recuperan.%s\n' "$amarillo" "$fin"
        read -r -p 'Escribe BORRAR para confirmar: ' r
        if [ "$r" = "BORRAR" ]; then compose down -v; ok 'Contenedores y volumen eliminados.'
        else info 'Cancelado.'; fi
        ;;
    probar)    probar_stack; exit $? ;;
    *)
        err "Accion desconocida: $accion"
        echo 'Usa: arriba | abajo | reiniciar | estado | logs | probar | rebuild | migrar | psql | limpiar'
        exit 1
        ;;
esac
