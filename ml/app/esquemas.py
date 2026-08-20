"""
Esquemas de entrada y salida (CONTRATO_MODELO §4).

Los nombres de campo son EXACTOS: es la costura entre Data Science y Backend, y
un campo mal escrito aqui obliga a tocar las dos mitades.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------
# /interno/v1/clasificar
# --------------------------------------------------------------------------

class TransaccionEntrada(BaseModel):
    #: Eco: se devuelve tal cual para que Spring reasocie. Si no viene, se usa
    #: el indice de la lista.
    id: str | None = None
    descripcion: str = Field(min_length=1, max_length=200)
    #: El contrato lo marca opcional y se acepta, pero HOY NO SE USA: M1
    #: clasifica solo por el texto (ver `inferencia.clasificar`). Se mantiene en
    #: el esquema para no romper a Spring, que ya lo manda, y porque un modelo
    #: futuro con el monto como feature no exigiria cambiar el contrato.
    valor: float | None = None


class PeticionClasificar(BaseModel):
    #: Maximo 500 por llamada, como el contrato. Mas que eso es un import, y un
    #: import se trocea en el backend.
    transacciones: list[TransaccionEntrada] = Field(min_length=1, max_length=500)


class ResultadoClasificacion(BaseModel):
    id: str
    categoria: str
    confianza: float
    #: Añadido al contrato (aditivo, no rompe a Spring): dice si la categoria la
    #: puso el modelo o el baseline por palabras clave. Sin esto no hay forma de
    #: saber que parte de la demo la esta sosteniendo cada uno.
    origen: Literal["modelo", "baseline"]


class RespuestaClasificar(BaseModel):
    modelo_version: str
    resultados: list[ResultadoClasificacion]


# --------------------------------------------------------------------------
# /interno/v1/perfil
# --------------------------------------------------------------------------

class Indicadores(BaseModel):
    """Los 8 indicadores de TAXONOMIA §3, TODOS obligatorios."""

    model_config = ConfigDict(extra="forbid")

    tasa_ahorro: float
    ratio_endeudamiento: float
    ratio_gasto_ingreso: float
    ratio_gasto_esencial: float
    ratio_gasto_discrecional: float
    concentracion_gasto: float
    frecuencia_ahorro_num: int = Field(ge=0, le=3)
    ratio_recurrente: float


class PeticionPerfil(BaseModel):
    """
    Solo los 8 indicadores, como manda el contrato.

    Hubo aqui un campo `contexto` con montos absolutos, porque el M2 anterior se
    habia entrenado con ingreso y ahorro en pesos. Ese modelo ya no esta y el
    campo se retiro: el contrato dice ratios y ahora no hay ninguna razon para
    aceptar otra cosa.

    `extra="forbid"` porque por defecto Pydantic **ignora en silencio** lo que no
    reconoce. Si alguien vuelve a mandar `contexto` creyendo que se usa, es mejor
    un 422 que un analisis que parece tenerlo en cuenta y no lo hace. Es el mismo
    fallo silencioso que ya costo un rato con `modelo_version`.
    """

    model_config = ConfigDict(extra="forbid")

    indicadores: Indicadores


class RespuestaPerfil(BaseModel):
    modelo_version: str
    perfil: str
    probabilidad: float
    probabilidades: dict[str, float]
    #: Opcional en v1.0 segun el contrato: si el modelo no la puede dar, va
    #: vacia y el frontend no pinta esa seccion.
    explicacion: list[dict] = Field(default_factory=list)
    origen: Literal["modelo", "baseline"]


# --------------------------------------------------------------------------
# Errores - misma forma que la API publica (CONTRATO_API §2)
# --------------------------------------------------------------------------

class DetalleError(BaseModel):
    campo: str
    error: str


class RespuestaError(BaseModel):
    codigo: str
    mensaje: str
    detalles: list[DetalleError] = Field(default_factory=list)
    traza_id: str
