# Servicio de inferencia - Python 3.11 + FastAPI.
#
# 3.11 y no 3.12+ porque es la version en la que scikit-learn 1.6.1 tiene rueda
# precompilada para linux/amd64 y linux/arm64 (OCI es ARM). Sin rueda, la imagen
# se pone a compilar scipy y el build pasa de un minuto a veinte.
FROM python:3.11-slim

# Las dependencias van en una capa propia: cambiar el codigo no reinstala
# scikit-learn, que es lo que tarda.
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY artefactos/ ./artefactos/

# Sin usuario propio, el proceso corre como root dentro del contenedor: si
# alguien saliera de la aplicacion, saldria como root.
RUN useradd --create-home --shell /usr/sbin/nologin fintech && chown -R fintech /app
USER fintech

EXPOSE 8000

# El healthcheck apunta al mismo /interno/v1/salud que consulta Spring, asi que
# un artefacto que no cargo deja el contenedor en unhealthy en vez de aparentar
# que todo va bien.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/interno/v1/salud').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
