"""
Carga de los artefactos .pkl de Data Science y la inferencia sobre ellos.

⚠️ LEER ANTES DE TOCAR ESTE ARCHIVO
====================================

**M1 (categorias)** ya tiene la forma que pide el CONTRATO_MODELO: un
``Pipeline`` que recibe la descripcion en crudo y devuelve uno de los 12 slugs,
con ``predict_proba``. Dentro lleva un ``FeatureUnion`` de dos TF-IDF (word 1-2
y ``char_wb`` 3-5), que es justo lo que hace falta para que funcione en los tres
idiomas. **No hay que preparar ninguna feature**: se le pasa el texto y ya.

Su limitacion hoy es de ENTRENAMIENTO, no de diseno: se entreno con una lista
corta de descripciones, asi que reparte poca probabilidad y casi nunca supera el
umbral de confianza. Medido sobre 20 descripciones reales, el modelo por si solo
acierta 1 y el baseline por palabras clave acierta 20.

Por eso la clasificacion es **modelo primero, baseline si el modelo no esta
seguro**:

- Si ``max(predict_proba) >= UMBRAL_CONFIANZA``, manda el modelo.
- Si no, responde el baseline por palabras clave.
- El campo ``origen`` dice cual de los dos contesto.

Esto se ajusta solo: **el dia que Data Science reentrene con mas datos, el
modelo empieza a superar el umbral y toma el relevo sin tocar una linea de
codigo**. Y mientras tanto la aplicacion no se queda sin clasificar.

**M2 (perfil) NO esta conectado**, a proposito y por dos razones:

1. Sus features son otras. Pide ``ratio_ahorro``, ``ratio_vivienda``,
   ``ratio_deuda``, ``ratio_gasto_esencial``, ``ratio_gasto_discrecional``,
   ``ratio_fondo_emergencia``, ``ratio_cobertura_ingresos`` y
   ``ratio_margen_neto``. Los 8 indicadores del contrato (TAXONOMIA §3) son
   otros; solo coinciden dos, y ``ratio_fondo_emergencia`` no se puede calcular
   con lo que recibe la API.
2. En su propio reporte, la clase ``saludable`` sale con precision, recall y
   f1 = 0.00: el modelo **nunca predice ese perfil**. Conectarlo significaria
   que a nadie se le puede decir que sus finanzas estan bien.

Mientras tanto responde la regla determinista, que es el baseline que el propio
contrato define. El artefacto se carga igual para que ``/interno/v1/salud``
informe de que esta ahi.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import joblib

from . import taxonomia

log = logging.getLogger(__name__)

RUTA_ARTEFACTOS = Path(__file__).resolve().parent.parent / "artefactos"

#: Version que se reporta en las respuestas. Es la del SERVICIO, no la de los
#: .pkl (que no traen version dentro).
VERSION_MODELO = "0.2.0"

ORIGEN_MODELO = "modelo"
ORIGEN_BASELINE = "baseline"

ARCHIVO_M1 = "modelo_clasificador_salud_financiera"
ARCHIVO_M2 = "modelo_perfil_salud"


class Artefactos:
    """
    Los .pkl cargados en memoria, una sola vez al arrancar.

    Se cargan al arranque y no por peticion porque deserializar un pipeline con
    dos TF-IDF tarda cientos de milisegundos, y hacerlo en cada llamada agotaria
    el timeout de 5 s que Spring da al servicio.
    """

    def __init__(self) -> None:
        self.clasificador = None
        self.modelo_perfil = None
        self.errores: list[str] = []
        self._lock = threading.Lock()

    def cargar(self) -> None:
        with self._lock:
            for atributo, archivo in (
                ("clasificador", ARCHIVO_M1),
                ("modelo_perfil", ARCHIVO_M2),
            ):
                ruta = RUTA_ARTEFACTOS / f"{archivo}.pkl"
                try:
                    setattr(self, atributo, joblib.load(ruta))
                    log.info("Artefacto cargado: %s", archivo)
                except Exception as e:  # noqa: BLE001 - se reporta en /salud
                    # No se relanza: sin modelo el servicio sigue en pie con el
                    # baseline, que es mejor que devolver 503 a todo. El estado
                    # degradado se ve en /interno/v1/salud.
                    self.errores.append(f"{archivo}: {e}")
                    log.error("No se pudo cargar %s: %s", archivo, e)

            if self.clasificador is not None:
                log.info("M1 conoce %d categorias: %s",
                         len(self.clasificador.classes_), list(self.clasificador.classes_))

    # ------------------------------------------------------------------ M1 ---

    def clasificar(self, descripcion: str, valor: float | None = None) -> tuple[str, float, str]:
        """
        Categoria de una descripcion. Devuelve ``(slug, confianza, origen)``.

        `valor` no se usa: M1 clasifica solo por el texto, como pide el
        contrato. Se acepta en la firma porque el contrato lo declara opcional y
        una version futura del modelo podria incorporarlo.
        """
        slug, confianza = self._clasificar_con_modelo(descripcion)

        if slug is not None and confianza >= taxonomia.UMBRAL_CONFIANZA:
            return slug, round(confianza, 2), ORIGEN_MODELO

        # El modelo no esta seguro: responde el baseline. RN6 sigue aplicando,
        # asi que si el baseline tampoco encuentra senal, sale "otros".
        slug, confianza = taxonomia.clasificar_por_palabras(descripcion)
        if confianza < taxonomia.UMBRAL_CONFIANZA:
            return taxonomia.CATEGORIA_COMODIN, round(confianza, 2), ORIGEN_BASELINE
        return slug, round(confianza, 2), ORIGEN_BASELINE

    def _clasificar_con_modelo(self, descripcion: str) -> tuple[str | None, float]:
        if self.clasificador is None or not descripcion.strip():
            return None, 0.0
        try:
            probabilidades = self.clasificador.predict_proba([descripcion])[0]
            etiqueta = str(self.clasificador.classes_[probabilidades.argmax()])

            # El modelo ya devuelve los 12 slugs del proyecto. Si algun dia
            # devolviera otra cosa, mejor no arriesgar un valor que romperia los
            # graficos del frontend.
            if etiqueta not in taxonomia.CATEGORIAS:
                log.warning("M1 devolvio una categoria fuera de la taxonomia: %r", etiqueta)
                return None, 0.0
            return etiqueta, float(probabilidades.max())
        except Exception as e:  # noqa: BLE001
            log.warning("Fallo la inferencia de categoria, se usa el baseline: %s", e)
            return None, 0.0

    # ------------------------------------------------------------------ M2 ---

    def perfil(self, indicadores: dict[str, float]) -> tuple[str, dict[str, float], str]:
        """
        Perfil financiero. Devuelve ``(slug, probabilidades, origen)``.

        Hoy siempre responde la regla determinista. El porque esta en la
        cabecera del modulo: el M2 entregado pide otras 8 features y nunca
        predice ``saludable``.
        """
        slug, probabilidades = taxonomia.perfil_por_reglas(
            float(indicadores.get("tasa_ahorro", 0.0)),
            float(indicadores.get("ratio_endeudamiento", 0.0)),
        )
        return slug, probabilidades, ORIGEN_BASELINE

    # --------------------------------------------------------------- salud ---

    def estado(self) -> dict[str, Any]:
        cargados = {
            ARCHIVO_M1: self.clasificador is not None,
            ARCHIVO_M2: self.modelo_perfil is not None,
        }
        return {
            "estado": "ok" if all(cargados.values()) else "degradado",
            "modelo_transacciones": {
                "version": VERSION_MODELO,
                "cargado": cargados[ARCHIVO_M1],
                "clases": len(taxonomia.CATEGORIAS),
                "en_uso": True,
                # Se expone a proposito: deja a la vista que el baseline sigue
                # cubriendo lo que el modelo no clasifica con confianza.
                "baseline_activo": True,
                "umbral_confianza": taxonomia.UMBRAL_CONFIANZA,
            },
            "modelo_perfil": {
                "version": VERSION_MODELO,
                "cargado": cargados[ARCHIVO_M2],
                "clases": len(taxonomia.PERFILES),
                # Cargado pero NO conectado. Ver la cabecera del modulo.
                "en_uso": False,
                "motivo": "sus features no son los 8 indicadores del contrato "
                          "y no predice la clase saludable",
            },
            "artefactos": cargados,
            "errores": self.errores,
        }


#: Instancia unica del proceso. La rellena el arranque de FastAPI.
artefactos = Artefactos()
