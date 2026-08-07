"""
Carga de los artefactos .pkl de Data Science y la inferencia sobre ellos.

⚠️ LEER ANTES DE TOCAR ESTE ARCHIVO
====================================

Los artefactos que hay hoy en ``artefactos/`` cubren una parte del problema y
tienen limites concretos. Estan medidos cargando los .pkl, y explican por que
este modulo hace lo que hace:

``encoder_descripcion.pkl`` es un **LabelEncoder**, no un vectorizador de texto
    Conoce 18 nombres de comercio EXACTOS. ``transform(["Starbucks"])`` lanza
    ``ValueError``, y tambien lo lanza ``"BURGER KING"`` -- distingue
    mayusculas. Una descripcion real de extracto (``UBER *TRIP``,
    ``WAL-MART #1234``) no va a estar en esa lista, asi que para esas el modelo
    no puede opinar.

``modelo_categoria.pkl`` pide 5 features, no solo la descripcion
    ``monto_scaled``, ``desc_encoded``, ``es_fin_de_semana``,
    ``ratio_gasto_ingreso`` y ``score_scaled``. Dos de ellas no existen al
    clasificar: ``ratio_gasto_ingreso`` lo calcula Spring DESPUES, sobre las
    transacciones ya clasificadas, y el score de buro es de la persona, no de
    la transaccion. Se rellenan con el valor neutro tras el escalado, lo que
    aleja la inferencia de las condiciones de entrenamiento.

``modelo_perfil_salud.pkl`` trabaja con MONTOS ABSOLUTOS
    Pide ingreso, ahorro y score de buro, no los 8 ratios del contrato. El
    proyecto usa ratios a proposito para que el modelo sea inmune a la moneda,
    y esos montos no son derivables desde un ratio: por eso solo se usa cuando
    la peticion trae ``contexto``.

Que hace este modulo con eso
----------------------------

Sirve el contrato **tal cual**, para que la integracion con Spring sea
directa, y por dentro:

- Usa el modelo **cuando puede responder** (descripcion entre las 18 conocidas
  / contexto con montos presente).
- Cae al **baseline documentado** en el resto de los casos. No es un invento:
  el propio CONTRATO_MODELO §5 define el clasificador por palabras clave y la
  regla determinista como los baselines que los modelos deben superar.
- **Dice siempre por que camino fue** (campo ``origen``), para que nadie
  confunda una prediccion del modelo con una del baseline.

Cuando llegue un M1 de texto (TF-IDF con ``char_wb``, como pide el contrato),
se cambia la carga y el resto sigue igual.
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
VERSION_MODELO = "0.1.0"

ORIGEN_MODELO = "modelo"
ORIGEN_BASELINE = "baseline"


class Artefactos:
    """
    Los .pkl cargados en memoria, una sola vez al arrancar.

    Se cargan al arranque y no por peticion porque ``modelo_categoria.pkl`` son
    100 arboles: deserializarlo tarda cientos de milisegundos, y hacerlo en cada
    llamada agotaria el timeout de 5 s que Spring da al servicio.
    """

    def __init__(self) -> None:
        self.encoder = None
        self.modelo_categoria = None
        self.modelo_perfil = None
        self.scaler_monto = None
        self.scaler_score = None
        self.errores: list[str] = []
        # Los LabelEncoder no son thread-safe para escritura, pero aqui solo se
        # leen. El lock protege la carga perezosa en el arranque.
        self._lock = threading.Lock()

    def cargar(self) -> None:
        with self._lock:
            for atributo, archivo in (
                ("encoder", "encoder_descripcion"),
                ("modelo_categoria", "modelo_categoria"),
                ("modelo_perfil", "modelo_perfil_salud"),
                ("scaler_monto", "scaler_monto"),
                ("scaler_score", "scaler_score"),
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

    # ------------------------------------------------------------------ M1 ---

    @property
    def comercios_conocidos(self) -> dict[str, int]:
        """
        Mapa ``descripcion normalizada -> codigo`` del LabelEncoder.

        Se precalcula normalizado para poder reconocer ``BURGER KING`` o
        ``burger  king`` como el ``Burger King`` que el encoder aprendio. El
        encoder por si solo solo acepta la cadena exacta.
        """
        if self.encoder is None:
            return {}
        if not hasattr(self, "_comercios"):
            self._comercios = {
                taxonomia.normalizar(str(etiqueta)): indice
                for indice, etiqueta in enumerate(self.encoder.classes_)
            }
        return self._comercios

    def clasificar(self, descripcion: str, valor: float | None) -> tuple[str, float, str]:
        """
        Categoria de una descripcion. Devuelve ``(slug, confianza, origen)``.

        Primero se intenta con el modelo, y solo si la descripcion es una de las
        18 que conoce. Para todo lo demas, el baseline por palabras clave -- que
        es lo que de verdad cubre las descripciones reales y los tres idiomas.
        """
        slug, confianza, origen = self._clasificar_con_modelo(descripcion, valor)
        if slug is None:
            slug, confianza = taxonomia.clasificar_por_palabras(descripcion)
            origen = ORIGEN_BASELINE

        # RN6: por debajo del umbral no se arriesga una categoria, se dice
        # "otros". Vale para los dos caminos.
        if confianza < taxonomia.UMBRAL_CONFIANZA:
            return taxonomia.CATEGORIA_COMODIN, round(confianza, 2), origen
        return slug, round(confianza, 2), origen

    def _clasificar_con_modelo(
        self, descripcion: str, valor: float | None
    ) -> tuple[str | None, float, str]:
        if self.modelo_categoria is None or self.encoder is None:
            return None, 0.0, ORIGEN_BASELINE

        codigo = self.comercios_conocidos.get(taxonomia.normalizar(descripcion))
        if codigo is None:
            # El modelo no puede opinar: su encoder no conoce este texto y
            # forzarlo lanzaria ValueError.
            return None, 0.0, ORIGEN_BASELINE

        try:
            fila = self._features_categoria(codigo, valor)
            probabilidades = self.modelo_categoria.predict_proba(fila)[0]
            etiqueta = str(self.modelo_categoria.classes_[probabilidades.argmax()])
            slug = taxonomia.ETIQUETA_A_CATEGORIA.get(etiqueta)
            if slug is None:
                # El modelo devolvio una etiqueta que no esta en el mapa: es un
                # modelo mas nuevo que este codigo. Mejor "otros" que un slug
                # inventado que romperia los graficos del frontend.
                log.warning("Etiqueta de categoria desconocida: %r", etiqueta)
                return taxonomia.CATEGORIA_COMODIN, 0.0, ORIGEN_MODELO
            return slug, float(probabilidades.max()), ORIGEN_MODELO
        except Exception as e:  # noqa: BLE001
            log.warning("Fallo la inferencia de categoria, se usa el baseline: %s", e)
            return None, 0.0, ORIGEN_BASELINE

    def _features_categoria(self, codigo: int, valor: float | None) -> pd.DataFrame:
        """
        Las 5 features que pide ``modelo_categoria.pkl``.

        ⚠️ Solo dos de las cinco se pueden rellenar de verdad desde lo que manda
        el contrato (la descripcion y el valor). Las otras tres son contexto que
        NO existe en el momento de clasificar:

        - ``es_fin_de_semana``: el contrato de /clasificar no manda la fecha.
        - ``ratio_gasto_ingreso``: es un indicador que Spring calcula DESPUES,
          sobre el conjunto de transacciones ya clasificadas. Pedirlo aqui seria
          circular.
        - ``score_scaled``: el buro es de la persona, no de la transaccion, y
          /clasificar es publico y sin usuario.

        Se rellenan con el valor neutro tras el escalado (0.0 = la media del
        entrenamiento). Es la opcion menos mala, pero cambia el comportamiento
        respecto al entrenamiento, y es otra razon por la que la salida de este
        camino se marca como ``origen: modelo`` y no se confunde con la verdad.
        """
        monto_escalado = 0.0
        if valor is not None and self.scaler_monto is not None:
            # El modelo se entreno con el monto en positivo (la columna
            # `Cantidad_Monto`), asi que se manda el valor absoluto: el signo lo
            # pone el backend segun sea ingreso o gasto.
            monto_escalado = float(
                self.scaler_monto.transform(pd.DataFrame(
                    [[abs(valor)]], columns=list(self.scaler_monto.feature_names_in_)
                ))[0][0]
            )

        return pd.DataFrame(
            [[monto_escalado, float(codigo), 0.0, 0.0, 0.0]],
            columns=list(self.modelo_categoria.feature_names_in_),
        )

    # ------------------------------------------------------------------ M2 ---

    def perfil(
        self, indicadores: dict[str, float], contexto: dict[str, float] | None
    ) -> tuple[str, dict[str, float], str]:
        """
        Perfil financiero. Devuelve ``(slug, probabilidades, origen)``.

        El modelo de Data Science pide ingreso, ahorro y score de buro en
        montos absolutos, que NO se pueden derivar de los 8 ratios del contrato.
        Por eso solo se usa cuando el backend manda esos datos en ``contexto``;
        si no, se aplica la regla determinista, que es el baseline que el propio
        contrato define.
        """
        if contexto and self.modelo_perfil is not None:
            resultado = self._perfil_con_modelo(indicadores, contexto)
            if resultado is not None:
                return (*resultado, ORIGEN_MODELO)

        slug, probabilidades = taxonomia.perfil_por_reglas(
            float(indicadores.get("tasa_ahorro", 0.0)),
            float(indicadores.get("ratio_endeudamiento", 0.0)),
        )
        return slug, probabilidades, ORIGEN_BASELINE

    def _perfil_con_modelo(
        self, indicadores: dict[str, float], contexto: dict[str, float]
    ) -> tuple[str, dict[str, float]] | None:
        try:
            fila = pd.DataFrame(
                [[
                    float(contexto["ingreso_mensual"]),
                    float(contexto["ahorro_actual"]),
                    float(contexto["score_buro"]),
                    float(indicadores.get("tasa_ahorro", 0.0)),
                    float(indicadores.get("ratio_endeudamiento", 0.0)),
                ]],
                columns=list(self.modelo_perfil.feature_names_in_),
            )
            crudas = self.modelo_perfil.predict_proba(fila)[0]

            probabilidades = {p: 0.0 for p in taxonomia.PERFILES}
            for etiqueta, valor in zip(self.modelo_perfil.classes_, crudas):
                slug = taxonomia.ETIQUETA_A_PERFIL.get(str(etiqueta))
                if slug is None:
                    log.warning("Etiqueta de perfil desconocida: %r", etiqueta)
                    return None
                probabilidades[slug] = round(float(valor), 3)

            ganador = max(probabilidades, key=probabilidades.__getitem__)
            return ganador, probabilidades
        except KeyError as e:
            log.info("Falta %s en el contexto: se usa la regla determinista", e)
            return None
        except Exception as e:  # noqa: BLE001
            log.warning("Fallo la inferencia de perfil, se usa la regla: %s", e)
            return None

    # --------------------------------------------------------------- salud ---

    def estado(self) -> dict[str, Any]:
        cargados = {
            "encoder_descripcion": self.encoder is not None,
            "modelo_categoria": self.modelo_categoria is not None,
            "modelo_perfil_salud": self.modelo_perfil is not None,
            "scaler_monto": self.scaler_monto is not None,
            "scaler_score": self.scaler_score is not None,
        }
        return {
            "estado": "ok" if all(cargados.values()) else "degradado",
            "modelo_transacciones": {
                "version": VERSION_MODELO,
                "cargado": cargados["modelo_categoria"],
                "clases": len(taxonomia.CATEGORIAS),
                # Se expone a proposito: deja a la vista que el modelo solo
                # cubre 18 comercios y que el resto lo resuelve el baseline.
                "comercios_conocidos": len(self.comercios_conocidos),
                "baseline_activo": True,
            },
            "modelo_perfil": {
                "version": VERSION_MODELO,
                "cargado": cargados["modelo_perfil_salud"],
                "clases": len(taxonomia.PERFILES),
                "requiere_contexto": True,
            },
            "artefactos": cargados,
            "errores": self.errores,
        }


#: Instancia unica del proceso. La rellena el arranque de FastAPI.
artefactos = Artefactos()
