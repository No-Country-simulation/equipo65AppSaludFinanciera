#!/bin/sh
# =============================================================================
# Se ejecuta UNA sola vez: cuando el contenedor arranca sobre un volumen vacio.
# Si el volumen ya tiene datos, la imagen oficial de PostgreSQL no llama a este
# hook, asi que reiniciar el contenedor NUNCA reaplica nada ni pisa datos.
#
# Para aplicar migraciones nuevas sobre una BD que ya existe se usa el servicio
# `migrador` del compose, que llama al mismo aplicar.sh.
# =============================================================================
set -eu

/opt/fintechvital/aplicar.sh

# psql con las opciones comunes. FV_PASSWORD_DEMO se pasa SIEMPRE, aunque este
# vacia: si la variable no se define, psql deja el `:'pwdemo'` literal en el SQL
# y PostgreSQL falla con un error de sintaxis.
cargar() {
    psql --no-psqlrc --quiet -v ON_ERROR_STOP=1 \
        -v pwdemo="${FV_PASSWORD_DEMO:-}" \
        -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" \
        -f "$1"
}

# --- Semilla demo: 4 usuarios inventados, uno por idioma ---------------------
case "${FV_CARGAR_DEMO:-no}" in
    si|SI|s|S|yes|true|1)
        echo "==> FV_CARGAR_DEMO activo: cargando datos de ejemplo"
        cargar /opt/fintechvital/semillas/demo.sql
        ;;
    *)
        echo "==> Sin datos de ejemplo (FV_CARGAR_DEMO=${FV_CARGAR_DEMO:-no})."
        echo "    Es lo correcto en produccion: la entrega va con CERO datos mock."
        ;;
esac

# --- Dataset del equipo: 100 usuarios y 5.000 movimientos --------------------
# Independiente de la semilla demo: se pueden cargar los dos, uno o ninguno.
case "${FV_CARGAR_DATASET:-no}" in
    si|SI|s|S|yes|true|1)
        echo "==> FV_CARGAR_DATASET activo: cargando el dataset del equipo"
        cargar /opt/fintechvital/semillas/dataset.sql
        ;;
    *)
        echo "==> Sin dataset del equipo (FV_CARGAR_DATASET=${FV_CARGAR_DATASET:-no})."
        ;;
esac
