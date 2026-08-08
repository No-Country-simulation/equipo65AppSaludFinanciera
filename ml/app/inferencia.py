"""
Carga de los artefactos .pkl de Data Science y la inferencia sobre ellos.

⚠️ LEER ANTES DE TOCAR ESTE ARCHIVO
====================================

**M1 (categorias)** ya tiene la forma que pide el CONTRATO_MODELO: un
``Pipeline`` que recibe la descripcion en crudo y devuelve uno de los 12 slugs,
con ``predict_proba``. Dentro lleva un ``FeatureUnion`` de dos TF-IDF (word 1-2
y ``char_wb`` 3-5), que es justo lo que hace falta para que funcione en los tres
idiomas. **No hay que preparar ninguna feature**: se le pasa el texto y ya.

La clasificacion es **modelo primero, baseline si el modelo no esta seguro**:

- Si ``max(predict_proba) >= UMBRAL_CONFIANZA``, manda el modelo.
- Si no, responde el baseline por palabras clave.
- El campo ``origen`` dice cual de los dos contesto.

El baseline no es un parche temporal: es la red que cubre los comercios que el
modelo nunca vio. Medido en el notebook sobre marcas NUEVAS, el modelo solo saca
macro-F1 0.58 y el sistema completo 0.60 -- un nombre de marca inventado no lleva
ninguna pista dentro. Con comercios ya conocidos, en cambio, el modelo acierta
practicamente siempre, y ahi el baseline no interviene.

**M2 (perfil) SI esta conectado.** Recibe los 8 indicadores del contrato con sus
nombres exactos (TAXONOMIA §3), predice las tres clases y le gana al baseline
(macro-F1 0.89 contra 0.80). Se sigue cayendo a la regla determinista si el
modelo no cargo o si la inferencia falla, nunca se inventa un perfil.

El orden de las features importa y no se confia en el del diccionario: se
construye el DataFrame usando ``feature_names_in_`` del propio modelo. Si algun
dia el modelo se reentrena con otro orden, sigue funcionando.

Las metricas y como se obtuvieron estan en ``notebooks/modelos_fintech_vital.ipynb``.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

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

        Manda el modelo; la regla determinista queda como red de seguridad para
        cuando el artefacto no cargo o la inferencia falla. Nunca se inventa un
        perfil.
        """
        resultado = self._perfil_con_modelo(indicadores)
        if resultado is not None:
            return (*resultado, ORIGEN_MODELO)

        slug, probabilidades = taxonomia.perfil_por_reglas(
            float(indicadores.get("tasa_ahorro", 0.0)),
            float(indicadores.get("ratio_endeudamiento", 0.0)),
        )
        return slug, probabilidades, ORIGEN_BASELINE

    def _perfil_con_modelo(
        self, indicadores: dict[str, float]
    ) -> tuple[str, dict[str, float]] | None:
        if self.modelo_perfil is None:
            return None
        try:
            # El orden lo manda el MODELO, no el diccionario que llego. Pasar las
            # 8 columnas en otro orden no da error: da una prediccion equivocada
            # en silencio, que es el peor fallo posible aqui.
            columnas = list(self.modelo_perfil.feature_names_in_)
            fila = pd.DataFrame([[float(indicadores[c]) for c in columnas]], columns=columnas)

            crudas = self.modelo_perfil.predict_proba(fila)[0]
            probabilidades = {p: 0.0 for p in taxonomia.PERFILES}
            for etiqueta, valor in zip(self.modelo_perfil.classes_, crudas):
                slug = str(etiqueta)
                if slug not in taxonomia.PERFILES:
                    log.warning("M2 devolvio un perfil fuera de la taxonomia: %r", slug)
                    return None
                probabilidades[slug] = round(float(valor), 3)

            ganador = max(probabilidades, key=probabilidades.__getitem__)
            return ganador, probabilidades
        except KeyError as e:
            log.warning("Falta el indicador %s: se usa la regla determinista", e)
            return None
        except Exception as e:  # noqa: BLE001
            log.warning("Fallo la inferencia de perfil, se usa la regla: %s", e)
            return None

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
                "en_uso": cargados[ARCHIVO_M2],
                # La regla determinista queda de red de seguridad si el
                # artefacto no cargo o la inferencia falla.
                "baseline_activo": True,
            },
            "artefactos": cargados,
            "errores": self.errores,
        }


#: Instancia unica del proceso. La rellena el arranque de FastAPI.
artefactos = Artefactos()
