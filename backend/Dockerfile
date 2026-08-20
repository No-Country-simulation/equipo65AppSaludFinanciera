# =============================================================================
# Fintech Vital - imagen de la API (Spring Boot)
#
# ⚠️ Esta imagen NO modifica el codigo del backend: lo empaqueta tal como esta
# hoy. Eso significa que arranca con H2 EN MEMORIA, porque es lo que dice
# src/main/resources/application.properties y el pom.xml todavia no trae el
# driver de PostgreSQL.
#
# El compose de ops/ le pasa las variables SPRING_DATASOURCE_* apuntando al
# contenedor de la base de datos, y el driver (org.postgresql:postgresql) ya
# esta en el pom: la API se conecta a PostgreSQL sin tocar nada de la imagen.
#
# Construir:  docker build -t fintechvital/api:local backend/
# =============================================================================

# --- Etapa 1: compilar -------------------------------------------------------
# --platform=$BUILDPLATFORM: compila SIEMPRE en la arquitectura de quien
# construye, no en la de destino. Un .jar es bytecode y no depende de la
# arquitectura, asi que la etapa 2 (arm64) puede copiarlo tal cual.
#
# Sin esto, un `--platform linux/arm64` desde un portatil x86 pone a Maven y
# a javac a correr bajo emulacion qemu: el mismo build pasa de ~3 minutos a
# media hora larga. Las instancias de OCI son Ampere (arm64), asi que este
# cross-build es el camino normal para desplegar, no un caso raro.
FROM --platform=$BUILDPLATFORM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src

# El pom se copia solo primero para que la descarga de dependencias quede en su
# propia capa: cambiar una clase Java no vuelve a bajar medio Maven Central.
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline \
    || echo "AVISO: precarga de dependencias incompleta, se resolvera en el package"

COPY src ./src

# Red de seguridad de codificacion: si algun recurso vuelve a guardarse con la
# codificacion por defecto de Windows, Maven aborta en Linux con
# "MalformedInputException: Input length = 1" - compila en las maquinas del
# equipo y falla en el contenedor. La conversion es idempotente: lo que ya es
# UTF-8 valido no se toca.
RUN find src/main/resources -type f \( -name '*.properties' -o -name '*.yml' -o -name '*.yaml' \) 2>/dev/null | \
    while read -r f; do \
        if ! iconv -f UTF-8 -t UTF-8 "$f" >/dev/null 2>&1; then \
            iconv -f WINDOWS-1252 -t UTF-8 "$f" -o "$f.utf8" && mv "$f.utf8" "$f"; \
            echo "AVISO: $f no estaba en UTF-8; convertido para este build"; \
        fi; \
    done

RUN mvn -B -DskipTests package

# El nombre del jar depende de la version del pom; se normaliza aqui para que
# la etapa siguiente no tenga que adivinarlo ni usar comodines en el ENTRYPOINT.
RUN cp target/*.jar /tmp/app.jar

# --- Etapa 2: ejecutar -------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.title="Fintech Vital - API" \
      org.opencontainers.image.description="API REST (Spring Boot) de Fintech Vital" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/No-Country-simulation/equipo65AppSaludFinanciera"

# Usuario sin privilegios: si alguien logra ejecutar codigo dentro del
# contenedor, no lo hace como root.
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app
COPY --from=build --chown=spring:spring /tmp/app.jar /app/app.jar
USER spring

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom" \
    SERVER_PORT=8080 \
    TZ=UTC

EXPOSE 8080

# GET /api/v1/salud (CONTRATO_API §7): publico y ademas hace un SELECT 1, asi
# que un contenedor "healthy" implica que la base responde. Un healthcheck
# contra un endpoint autenticado marcaria el servicio como caido por un 401,
# que es exactamente la respuesta correcta de un servicio sano.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=8 \
    CMD wget -q --spider http://127.0.0.1:8080/api/v1/salud || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
