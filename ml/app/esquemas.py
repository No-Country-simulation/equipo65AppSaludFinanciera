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
    #: El contrato lo marca opcional. Aqui SI se usa cuando esta: es una de las
    #: features que pide el modelo de Data Science.
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


class ContextoPerfil(BaseModel):
    """
    Montos absolutos que pide el modelo .pkl de Data Science.

    ⚠️ NO forma parte del CONTRATO_MODELO original, y es opcional a proposito.
    El contrato manda solo ratios, porque la regla dura del proyecto es que el
    modelo sea inmune a la moneda. Pero ``modelo_perfil_salud.pkl`` se entreno
    con ingreso, ahorro y score en montos, y esos tres no se pueden reconstruir
    desde un ratio.

    Si el backend los manda, se usa el modelo. Si no, se aplica la regla
    determinista. Asi el contrato sigue funcionando tal como esta escrito.
    """

    ingreso_mensual: float
    ahorro_actual: float
    score_buro: float


class PeticionPerfil(BaseModel):
    indicadores: Indicadores
    contexto: ContextoPerfil | None = None


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
