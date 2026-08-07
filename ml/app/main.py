"""
Servicio de inferencia (FastAPI). CONTRATO_MODELO §4.

Regla que lo gobierna: **es inferencia pura, sin logica de negocio**. Recibe
features, devuelve predicciones. Los indicadores, el motor de reglas y la
persistencia viven en Spring Boot. Si aqui se calculara un indicador, la misma
formula existiria en dos lenguajes y divergiria.

No se expone a internet: vive en la red interna del compose (y en la VCN privada
en OCI). Solo Spring lo llama, con la cabecera ``X-Clave-Interna``.
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import esquemas, taxonomia
from .inferencia import VERSION_MODELO, artefactos

logging.basicConfig(
    level=os.getenv("FV_LOG_NIVEL", "INFO"),
    format="%(asctime)s %(levelname)-5s %(name)s - %(message)s",
)
log = logging.getLogger("fv.ml")

#: Autenticacion entre servicios. Vacia = desactivada, que es lo comodo en
#: local; en despliegue viene de ops/.env y Spring manda la misma.
CLAVE_INTERNA = os.getenv("FV_CLAVE_INTERNA", "")


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # Los .pkl se cargan UNA vez al arrancar. Hacerlo por peticion costaria
    # cientos de milisegundos (son 100 arboles) y agotaria el timeout de 5 s
    # que Spring da a este servicio.
    artefactos.cargar()
    estado = artefactos.estado()
    log.info("Artefactos listos, estado=%s", estado["estado"])
    if estado["errores"]:
        log.error("Artefactos con error: %s", estado["errores"])
    yield


app = FastAPI(
    title="Fintech Vital - servicio de modelo",
    version=VERSION_MODELO,
    lifespan=ciclo_de_vida,
    docs_url="/interno/v1/docs",
    openapi_url="/interno/v1/openapi.json",
)


# --------------------------------------------------------------------------
# Errores con la forma del contrato
# --------------------------------------------------------------------------

def error(codigo: str, mensaje: str, estado_http: int, detalles=None) -> JSONResponse:
    traza = str(uuid.uuid4())
    log.info("[%s] %s - %s", traza, codigo, mensaje)
    return JSONResponse(
        status_code=estado_http,
        content={
            "codigo": codigo,
            "mensaje": mensaje,
            "detalles": detalles or [],
            "traza_id": traza,
        },
    )


@app.exception_handler(RequestValidationError)
async def validacion_invalida(_: Request, exc: RequestValidationError) -> JSONResponse:
    """422 con la MISMA forma que la API publica, no el 422 por defecto de FastAPI."""
    detalles = [
        {
            # loc trae ('body', 'transacciones', 0, 'descripcion'); interesa la cola.
            "campo": ".".join(str(p) for p in e["loc"][1:]) or "cuerpo",
            "error": e["msg"],
        }
        for e in exc.errors()
    ]
    return error("VALIDACION_ENTRADA", "La solicitud tiene campos invalidos",
                 status.HTTP_422_UNPROCESSABLE_ENTITY, detalles)


@app.exception_handler(Exception)
async def error_inesperado(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Error inesperado", exc_info=exc)
    return error("ERROR_INTERNO", "Ocurrio un error inesperado",
                 status.HTTP_500_INTERNAL_SERVER_ERROR)


def clave_valida(recibida: str | None) -> bool:
    """Sin clave configurada no se exige nada: es el modo local."""
    return not CLAVE_INTERNA or recibida == CLAVE_INTERNA


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------

@app.post("/interno/v1/clasificar", response_model=esquemas.RespuestaClasificar)
async def clasificar(
    peticion: esquemas.PeticionClasificar,
    x_clave_interna: str | None = Header(default=None),
):
    """
    Categoria de cada descripcion. Sin estado.

    ⚠️ Hoy la mayoria de las descripciones las resuelve el BASELINE por palabras
    clave, no el modelo: el encoder que entrego Data Science solo reconoce 18
    nombres de comercio exactos. El campo ``origen`` de cada resultado dice cual
    de los dos respondio. Ver la cabecera de ``inferencia.py``.
    """
    if not clave_valida(x_clave_interna):
        return error("NO_AUTORIZADO", "Clave interna invalida", status.HTTP_401_UNAUTHORIZED)

    resultados = []
    for indice, transaccion in enumerate(peticion.transacciones):
        categoria, confianza, origen = artefactos.clasificar(
            transaccion.descripcion, transaccion.valor
        )
        resultados.append(esquemas.ResultadoClasificacion(
            id=transaccion.id or str(indice),
            categoria=categoria,
            confianza=confianza,
            origen=origen,
        ))

    return esquemas.RespuestaClasificar(modelo_version=VERSION_MODELO, resultados=resultados)


@app.post("/interno/v1/perfil", response_model=esquemas.RespuestaPerfil)
async def perfil(
    peticion: esquemas.PeticionPerfil,
    x_clave_interna: str | None = Header(default=None),
):
    """
    Perfil financiero a partir de los indicadores que YA calculo Spring.

    ⚠️ Sin ``contexto`` (ingreso, ahorro y score en montos) responde la regla
    determinista: el modelo de Data Science se entreno con montos absolutos y no
    se pueden reconstruir desde los ratios. Ver la cabecera de ``inferencia.py``.
    """
    if not clave_valida(x_clave_interna):
        return error("NO_AUTORIZADO", "Clave interna invalida", status.HTTP_401_UNAUTHORIZED)

    slug, probabilidades, origen = artefactos.perfil(
        peticion.indicadores.model_dump(),
        peticion.contexto.model_dump() if peticion.contexto else None,
    )

    return esquemas.RespuestaPerfil(
        modelo_version=VERSION_MODELO,
        perfil=slug,
        probabilidad=probabilidades[slug],
        probabilidades=probabilidades,
        # El contrato la marca opcional en v1.0. Los .pkl actuales no dan
        # importancia local (haria falta SHAP), asi que va vacia y el frontend
        # simplemente no pinta esa seccion.
        explicacion=[],
        origen=origen,
    )


@app.get("/interno/v1/salud")
async def salud():
    """
    Estado del servicio. Lo consume ``/api/v1/salud`` de Spring y el healthcheck
    del contenedor.

    Devuelve 503 si algun artefacto no cargo, para que el stack lo note en vez
    de servir predicciones a medias sin avisar.
    """
    estado = artefactos.estado()
    codigo = status.HTTP_200_OK if estado["estado"] == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=codigo, content=estado)


@app.get("/interno/v1/categorias")
async def categorias():
    """Los slugs que este servicio puede devolver. Util para verificar la costura."""
    return {"categorias": list(taxonomia.CATEGORIAS), "perfiles": list(taxonomia.PERFILES)}
