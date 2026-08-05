# =============================================================================
# Fintech Vital - imagen de la base de datos (PostgreSQL 16)
#
# Es la imagen oficial de PostgreSQL con el esquema del proyecto y la semilla
# de ejemplo dentro. La misma imagen sirve para local, para la demo y para
# produccion; lo unico que cambia es si se cargan o no los datos de ejemplo
# (FV_CARGAR_DEMO) y la contrasena, que siempre viene de fuera.
#
# Construir:  docker build -t fintechvital/db:local db/
# Probar:     docker run --rm -e POSTGRES_PASSWORD=x -e FV_CARGAR_DEMO=si -p 5432:5432 fintechvital/db:local
# =============================================================================
FROM postgres:16-alpine

LABEL org.opencontainers.image.title="Fintech Vital - base de datos" \
      org.opencontainers.image.description="PostgreSQL 16 con el esquema de Fintech Vital y semilla de ejemplo opcional" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/No-Country-simulation/equipo65AppSaludFinanciera"

# El nombre de la BD y el usuario si tienen default: son publicos y no son un
# secreto. POSTGRES_PASSWORD NO lo tiene a proposito - la imagen oficial se
# niega a arrancar sin el, y esa es exactamente la barrera que queremos.
ENV POSTGRES_DB=fintechvital \
    POSTGRES_USER=fintechvital \
    FV_MIGRACIONES_DIR=/opt/fintechvital/migraciones \
    FV_SEMILLAS_DIR=/opt/fintechvital/semillas \
    FV_CARGAR_DEMO=no

COPY migraciones/ /opt/fintechvital/migraciones/
COPY semillas/    /opt/fintechvital/semillas/
COPY aplicar.sh   /opt/fintechvital/aplicar.sh
COPY tasas.sh     /opt/fintechvital/tasas.sh
COPY initdb/      /docker-entrypoint-initdb.d/

# Los .sh se escriben en Windows: se normalizan los finales de linea aqui para
# que no fallen con "bad interpreter: /bin/sh^M". Es el error mas comun del
# equipo trabajando en Windows y arreglarlo en la imagen lo elimina de raiz.
RUN sed -i 's/\r$//' /opt/fintechvital/*.sh /docker-entrypoint-initdb.d/*.sh \
 && chmod +x /opt/fintechvital/*.sh /docker-entrypoint-initdb.d/*.sh

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
    CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1

EXPOSE 5432
