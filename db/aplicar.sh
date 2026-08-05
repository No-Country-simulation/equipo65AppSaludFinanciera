#!/bin/sh
# =============================================================================
# Aplica las migraciones pendientes, en orden, y las registra.
#
# Se usa desde dos sitios y hace lo mismo en los dos:
#   1. Dentro de la imagen, en el primer arranque sobre un volumen vacio
#      (/docker-entrypoint-initdb.d/00-inicializar.sh).
#   2. Como paso suelto contra una BD que ya existe, para aplicar lo nuevo sin
#      recrear nada:  docker compose run --rm migrador
#
# Conexion: usa las variables PG* estandar de libpq (PGHOST, PGPORT, PGUSER,
# PGPASSWORD, PGDATABASE). Si no estan, cae a las POSTGRES_* que define la
# imagen oficial, que es el caso del arranque inicial por socket unix.
#
# Es idempotente: lo ya aplicado se salta. Y si una migracion YA APLICADA
# cambio de contenido, aborta - editar una migracion mergeada es la forma mas
# comun de que dos entornos terminen con esquemas distintos y nadie se entere.
# =============================================================================
set -eu

DIR_MIGRACIONES="${FV_MIGRACIONES_DIR:-/opt/fintechvital/migraciones}"

: "${PGUSER:=${POSTGRES_USER:-postgres}}"
: "${PGDATABASE:=${POSTGRES_DB:-$PGUSER}}"
export PGUSER PGDATABASE

psql_run() {
    psql --no-psqlrc --quiet -v ON_ERROR_STOP=1 "$@"
}

if [ ! -d "$DIR_MIGRACIONES" ]; then
    echo "ERROR: no existe el directorio de migraciones: $DIR_MIGRACIONES" >&2
    exit 1
fi

echo "==> Base de datos: $PGDATABASE (usuario $PGUSER)"

# --- Registro de lo aplicado -------------------------------------------------
psql_run <<'SQL'
CREATE TABLE IF NOT EXISTS esquema_historial (
    version      TEXT        PRIMARY KEY,
    nombre       TEXT        NOT NULL,
    sha256       TEXT        NOT NULL,
    aplicada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE esquema_historial IS
    'Migraciones aplicadas. El nombre de archivo sigue el convenio de Flyway (V<n>__<nombre>.sql) para poder adoptar Flyway sin renombrar nada.';
SQL

aplicadas=0
saltadas=0

# El orden lo da `sort -V`: V2 va antes que V10, cosa que `sort` normal no hace.
for archivo in $(find "$DIR_MIGRACIONES" -maxdepth 1 -name 'V*__*.sql' | sort -V); do
    base=$(basename "$archivo")
    version=${base%%__*}
    nombre=${base#*__}
    nombre=${nombre%.sql}
    suma=$(sha256sum "$archivo" | cut -d' ' -f1)

    registrada=$(psql_run -tAc \
        "SELECT sha256 FROM esquema_historial WHERE version = '$version'")

    if [ -n "$registrada" ]; then
        if [ "$registrada" != "$suma" ]; then
            echo "ERROR: $base ya estaba aplicada y su contenido cambio." >&2
            echo "       Una migracion mergeada no se edita: se agrega una nueva." >&2
            exit 1
        fi
        saltadas=$((saltadas + 1))
        continue
    fi

    echo "--> aplicando $base"
    # Cada migracion corre en su propia transaccion: si falla a la mitad no
    # deja el esquema en un estado intermedio.
    psql_run --single-transaction -f "$archivo"
    psql_run -c "INSERT INTO esquema_historial (version, nombre, sha256)
                 VALUES ('$version', '$nombre', '$suma')"
    aplicadas=$((aplicadas + 1))
done

echo "==> Migraciones: $aplicadas aplicadas, $saltadas ya estaban."
