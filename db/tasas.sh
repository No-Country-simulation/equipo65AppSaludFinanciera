#!/bin/sh
# =============================================================================
# Actualiza tasa_cambio desde ExchangeRate-API.
#
# CONSUMO DE CUOTA - lo importante:
#
#   El endpoint /latest/USD devuelve TODAS las monedas en UNA sola peticion, asi
#   que no se gasta una llamada por moneda. Con refresco cada 6 h:
#
#       4 llamadas/dia x 31 dias = 124 al mes,  sobre 1500 disponibles = 8 %
#
#   Sobra muchisimo margen. Incluso con local, staging y produccion
#   consultando cada uno por su cuenta serian 372 al mes (25 %).
#
#   Ademas, en el plan gratuito las tasas se actualizan UNA VEZ AL DIA: cada 6 h
#   ya es cuatro veces mas frecuente de lo que cambian los datos. Si algun dia
#   hiciera falta recortar, subir a 12 o 24 h no pierde nada.
#
# SI LA API FALLA NO PASA NADA: quedan las ultimas tasas vigentes en la tabla y
# se usa la mas reciente <= fecha del movimiento. La demo no se cae por un
# tercero (ADR-0008).
# =============================================================================
set -u

: "${EXCHANGERATE_API_KEY:=}"
: "${FV_MONEDA_BASE:=USD}"

: "${PGUSER:=${POSTGRES_USER:-postgres}}"
: "${PGDATABASE:=${POSTGRES_DB:-$PGUSER}}"
export PGUSER PGDATABASE

if [ -z "$EXCHANGERATE_API_KEY" ]; then
    echo "==> Sin EXCHANGERATE_API_KEY: no se actualizan las tasas."
    echo "    La aplicacion sigue funcionando con las tasas semilla de V1."
    exit 0
fi

url="https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/${FV_MONEDA_BASE}"

# La base puede tardar en aceptar conexiones justo despues de arrancar. Se
# espera en vez de perder el ciclo entero.
intento=0
while [ "$intento" -lt 10 ]; do
    pg_isready -q && break
    intento=$((intento + 1))
    echo "    esperando a la base de datos... ($intento/10)"
    sleep 6
done
if ! pg_isready -q; then
    echo "AVISO: la base de datos no responde. Se reintenta en el proximo ciclo."
    exit 0
fi

echo "==> Consultando tasas (base ${FV_MONEDA_BASE})..."
# -q sin la clave en el log: la URL la lleva dentro.
respuesta=$(wget -qO- --timeout=20 "$url" 2>/dev/null)

if [ -z "$respuesta" ]; then
    echo "AVISO: la API no respondio. Se conservan las tasas anteriores."
    exit 0
fi

case "$respuesta" in
    *'"result":"success"'*) ;;
    *)
        # El mensaje de error puede traer la clave: se recorta.
        echo "AVISO: la API devolvio un error. Se conservan las tasas anteriores."
        echo "$respuesta" | head -c 200 | sed "s/${EXCHANGERATE_API_KEY}/<clave>/g"
        exit 0
        ;;
esac

# El JSON lo interpreta PostgreSQL, no el shell: jsonb ya sabe hacerlo y asi no
# hay que parsear a mano con grep, que se rompe en cuanto cambia el formato.
psql --no-psqlrc --quiet -v ON_ERROR_STOP=1 -v resp="$respuesta" <<'SQL'
WITH origen AS (
    SELECT :'resp'::jsonb AS j
),
tasas AS (
    SELECT
        upper(clave)            AS moneda,
        valor::numeric          AS por_unidad_base,
        -- La API da "cuantas unidades de X vale 1 USD". Nosotros guardamos lo
        -- contrario: cuantos USD vale 1 unidad de X. De ahi la inversa.
        to_timestamp((j->>'time_last_update_unix')::bigint)::date AS vigente
    FROM origen,
         jsonb_each_text(j->'conversion_rates') AS r(clave, valor)
    WHERE valor::numeric > 0
)
INSERT INTO tasa_cambio (moneda_origen, moneda_base, vigente_desde, tasa, fuente, actualizado_en)
SELECT t.moneda, 'USD', t.vigente, ROUND(1 / t.por_unidad_base, 6), 'exchangerate-api', now()
FROM tasas t
-- Solo las monedas que el proyecto soporta: el endpoint devuelve ~160 y no
-- tiene sentido guardarlas todas.
JOIN moneda m ON m.codigo = t.moneda
ON CONFLICT (moneda_origen, moneda_base, vigente_desde) DO UPDATE
    SET tasa = EXCLUDED.tasa,
        fuente = EXCLUDED.fuente,
        actualizado_en = now();

\echo '==> Tasas vigentes:'
SELECT moneda_origen, tasa, vigente_desde, fuente
FROM tasa_cambio t1
WHERE moneda_base = 'USD'
  AND vigente_desde = (SELECT max(vigente_desde) FROM tasa_cambio t2
                        WHERE t2.moneda_origen = t1.moneda_origen AND t2.moneda_base = 'USD')
ORDER BY moneda_origen;
SQL
