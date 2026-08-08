"""
Pruebas del servicio de inferencia.

Lo que se comprueba aqui NO es la calidad del modelo (eso es trabajo del
notebook de Data Science), sino que **la costura con Spring se respeta**: los
slugs son los del proyecto, la forma del JSON es la del contrato, y el servicio
nunca devuelve algo que el backend no sepa interpretar.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import taxonomia
from app.main import app


@pytest.fixture(scope="module")
def cliente():
    # El TestClient dispara el lifespan, que es donde se cargan los .pkl.
    with TestClient(app) as c:
        yield c


# --------------------------------------------------------------------------
# /interno/v1/clasificar
# --------------------------------------------------------------------------

def test_clasificar_devuelve_la_forma_del_contrato(cliente):
    respuesta = cliente.post("/interno/v1/clasificar", json={
        "transacciones": [
            {"id": "t1", "descripcion": "Supermercado La Comer", "valor": 1240.50},
            {"id": "t2", "descripcion": "UBER *TRIP", "valor": 185.00},
            {"id": "t3", "descripcion": "NETFLIX.COM", "valor": 219.00},
        ]
    })
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    assert "modelo_version" in cuerpo
    assert [r["id"] for r in cuerpo["resultados"]] == ["t1", "t2", "t3"]
    for resultado in cuerpo["resultados"]:
        assert resultado["categoria"] in taxonomia.CATEGORIAS
        assert 0.0 <= resultado["confianza"] <= 1.0
        assert resultado["origen"] in ("modelo", "baseline")


@pytest.mark.parametrize("descripcion,esperado", [
    # Las TRES del ejemplo del enunciado. Es el curl que el jurado va a copiar
    # y pegar, asi que su salida tiene que coincidir con la que ahi se publica.
    ("Supermercado", "alimentacion"),
    ("Combustible", "transporte"),
    ("Streaming", "entretenimiento"),
    # Espanol
    ("Supermercado La Comer", "alimentacion"),
    ("UBER *TRIP 4821", "transporte"),
    ("NETFLIX.COM", "entretenimiento"),
    ("Farmacias del Ahorro", "salud"),
    ("Pago de alquiler", "vivienda"),
    ("CFE ELECTRICIDAD", "servicios"),
    # Portugues - ADR-0009. Es lo que mas facil se rompe y lo que un jurado
    # brasileno va a escribir en la demo.
    ("IFOOD *PEDIDO", "alimentacion"),
    ("PIX RECEBIDO SALARIO", "ingresos"),
    ("CONTA DE LUZ ENEL", "servicios"),
    ("MAGAZINE LUIZA", "compras"),
    ("DROGASIL", "salud"),
    # Ingles
    ("WHOLE FOODS MARKET", "alimentacion"),
    ("SHELL GAS STATION", "transporte"),
    # Marcas con guion: `normalizar()` lo convierte en espacio, asi que la
    # forma separada tiene que estar en la lista de palabras clave.
    ("WAL-MART #1234", "alimentacion"),
])
def test_clasifica_en_los_tres_idiomas(cliente, descripcion, esperado):
    """
    El proyecto es trilingue y los slugs no se traducen.

    Estas descripciones son justo las del CONTRATO_MODELO: si alguna volviera
    "otros", seria el fallo que ese documento marca como el peor momento
    posible de la demo.
    """
    respuesta = cliente.post("/interno/v1/clasificar",
                             json={"transacciones": [{"descripcion": descripcion}]})
    assert respuesta.json()["resultados"][0]["categoria"] == esperado


@pytest.mark.parametrize("descripcion,esperado", [
    # ⚠️ Regresion real: al anadir "ahorro" como palabra generica de
    # `ahorro_inversion`, estas farmacias mexicanas -- que llevan "Ahorro" en el
    # nombre -- se iban a la categoria equivocada. `ahorro_inversion` se evalua
    # antes que `salud`, asi que ganaba la palabra suelta.
    ("Farmacia del Ahorro", "salud"),
    ("FARMACIAS GUADALAJARA DEL AHORRO", "salud"),
    # Y el ahorro de verdad tiene que seguir funcionando.
    ("Transferencia a ahorro", "ahorro_inversion"),
    ("Cuenta de ahorro", "ahorro_inversion"),
])
def test_ahorro_no_se_come_a_las_farmacias(cliente, descripcion, esperado):
    respuesta = cliente.post("/interno/v1/clasificar",
                             json={"transacciones": [{"descripcion": descripcion}]})
    assert respuesta.json()["resultados"][0]["categoria"] == esperado


def test_descripcion_sin_senal_cae_en_otros(cliente):
    """RN6: sin senal suficiente se responde `otros`, nunca una categoria inventada."""
    respuesta = cliente.post("/interno/v1/clasificar",
                             json={"transacciones": [{"descripcion": "ZZQQ 99811"}]})
    resultado = respuesta.json()["resultados"][0]
    assert resultado["categoria"] == "otros"
    assert resultado["confianza"] < taxonomia.UMBRAL_CONFIANZA


def test_sin_id_se_usa_el_indice(cliente):
    respuesta = cliente.post("/interno/v1/clasificar", json={
        "transacciones": [{"descripcion": "Netflix"}, {"descripcion": "Uber"}]
    })
    assert [r["id"] for r in respuesta.json()["resultados"]] == ["0", "1"]


def test_mas_de_500_transacciones_es_422(cliente):
    respuesta = cliente.post("/interno/v1/clasificar", json={
        "transacciones": [{"descripcion": "Netflix"}] * 501
    })
    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "VALIDACION_ENTRADA"
    assert "traza_id" in respuesta.json()


def test_error_tiene_la_forma_de_la_api_publica(cliente):
    """Mismo {codigo, mensaje, detalles, traza_id} que Spring: un solo parser."""
    respuesta = cliente.post("/interno/v1/clasificar",
                             json={"transacciones": [{"descripcion": ""}]})
    cuerpo = respuesta.json()
    assert respuesta.status_code == 422
    assert set(cuerpo) == {"codigo", "mensaje", "detalles", "traza_id"}
    assert cuerpo["detalles"][0]["campo"].endswith("descripcion")


# --------------------------------------------------------------------------
# /interno/v1/perfil
# --------------------------------------------------------------------------

INDICADORES_SANOS = {
    "tasa_ahorro": 0.22,
    "ratio_endeudamiento": 0.10,
    "ratio_gasto_ingreso": 0.70,
    "ratio_gasto_esencial": 0.45,
    "ratio_gasto_discrecional": 0.25,
    "concentracion_gasto": 0.30,
    "frecuencia_ahorro_num": 3,
    "ratio_recurrente": 0.10,
}


def test_perfil_devuelve_la_forma_del_contrato(cliente):
    respuesta = cliente.post("/interno/v1/perfil", json={"indicadores": INDICADORES_SANOS})
    cuerpo = respuesta.json()

    assert respuesta.status_code == 200
    assert cuerpo["perfil"] in taxonomia.PERFILES
    assert cuerpo["origen"] in ("modelo", "baseline")
    # El contrato: probabilidad == probabilidades[perfil] y las 3 suman 1.0.
    assert cuerpo["probabilidad"] == cuerpo["probabilidades"][cuerpo["perfil"]]
    assert abs(sum(cuerpo["probabilidades"].values()) - 1.0) < 0.01
    assert set(cuerpo["probabilidades"]) == set(taxonomia.PERFILES)


def test_perfil_rechaza_campos_de_mas(cliente):
    """
    El contrato manda SOLO los 8 indicadores.

    Hubo un campo `contexto` con montos absolutos mientras el M2 los pedia; ese
    modelo ya no esta y el campo se retiro. Si alguien lo vuelve a mandar, mejor
    un 422 que aceptarlo en silencio y que nadie note que se ignora.
    """
    respuesta = cliente.post("/interno/v1/perfil", json={
        "indicadores": INDICADORES_SANOS,
        "contexto": {"ingreso_mensual": 45000},
    })
    assert respuesta.status_code == 422


#: Alguien en mala situacion, con los 8 indicadores COHERENTES entre si.
#
# ⚠️ La coherencia importa. Una version anterior de este test partia de
# INDICADORES_SANOS y solo cambiaba `tasa_ahorro` a -0.05, dejando
# `ratio_gasto_ingreso` en 0.70. Eso es imposible: si gastas el 70% de tu
# ingreso, tu tasa de ahorro es 0.30, no -0.05. El modelo nunca vio una
# combinacion asi -- el backend las calcula todas desde las mismas
# transacciones, asi que siempre encajan -- y respondia con las tres
# probabilidades repartidas, que es lo razonable ante algo fuera de rango.
INDICADORES_EN_RIESGO = {
    "tasa_ahorro": -0.05,             # gasta mas de lo que gana
    "ratio_endeudamiento": 0.62,
    "ratio_gasto_ingreso": 1.05,      # coherente con la tasa de ahorro
    "ratio_gasto_esencial": 0.60,
    "ratio_gasto_discrecional": 0.30,
    "concentracion_gasto": 0.40,
    "frecuencia_ahorro_num": 0,       # no ahorra nunca
    "ratio_recurrente": 0.15,
}


def test_endeudamiento_alto_da_riesgo(cliente):
    respuesta = cliente.post("/interno/v1/perfil", json={"indicadores": INDICADORES_EN_RIESGO})
    assert respuesta.json()["perfil"] == "en_riesgo"


def test_faltan_indicadores_es_422(cliente):
    respuesta = cliente.post("/interno/v1/perfil",
                             json={"indicadores": {"tasa_ahorro": 0.1}})
    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "VALIDACION_ENTRADA"


# --------------------------------------------------------------------------
# /interno/v1/salud
# --------------------------------------------------------------------------

def test_salud_reporta_los_artefactos(cliente):
    cuerpo = cliente.get("/interno/v1/salud").json()
    assert cuerpo["estado"] in ("ok", "degradado")
    assert cuerpo["modelo_transacciones"]["clases"] == 12
    assert cuerpo["modelo_perfil"]["clases"] == 3


def test_los_slugs_publicados_son_los_de_la_taxonomia(cliente):
    cuerpo = cliente.get("/interno/v1/categorias").json()
    assert cuerpo["categorias"] == list(taxonomia.CATEGORIAS)
    assert cuerpo["perfiles"] == list(taxonomia.PERFILES)


# --------------------------------------------------------------------------
# Los modelos y la taxonomia
# --------------------------------------------------------------------------

def test_m1_devuelve_los_slugs_del_proyecto(cliente):
    """
    M1 ya emite los 12 slugs directamente, sin mapa de traduccion.

    Si Data Science renombrara una clase, este test cae antes de que el servicio
    empiece a descartar predicciones en silencio.
    """
    from app.inferencia import artefactos

    assert artefactos.clasificador is not None, "M1 no cargo"
    desconocidas = set(map(str, artefactos.clasificador.classes_)) - set(taxonomia.CATEGORIAS)
    assert not desconocidas, f"M1 devuelve clases fuera de la taxonomia: {desconocidas}"


def test_m2_usa_los_8_indicadores_del_contrato(cliente):
    """
    Los nombres de las features de M2 tienen que ser EXACTAMENTE los 8 del
    contrato (TAXONOMIA §3).

    Si no coincidieran, el servicio no fallaria: caeria a la regla determinista
    en cada peticion y nadie se enteraria de que el modelo dejo de usarse.
    """
    from app.inferencia import artefactos

    assert artefactos.modelo_perfil is not None, "M2 no cargo"
    assert list(artefactos.modelo_perfil.feature_names_in_) == list(INDICADORES_SANOS)


def test_m2_predice_las_tres_clases(cliente):
    """
    Un perfil sano tiene que poder salir `saludable`.

    No es una comprobacion de metrica: es de producto. Un M2 anterior nunca
    predecia esa clase (f1 = 0.00), y con el conectado ningun usuario podria
    haber recibido un diagnostico bueno, ni ahorrando el 40% de su sueldo.
    """
    respuesta = cliente.post("/interno/v1/perfil", json={"indicadores": INDICADORES_SANOS})
    cuerpo = respuesta.json()
    assert cuerpo["origen"] == "modelo"
    assert cuerpo["perfil"] == "saludable", cuerpo["probabilidades"]


def test_el_modelo_contesta_cuando_esta_seguro(cliente):
    """
    El diseno es "modelo primero, baseline si no esta seguro".

    Hoy M1 casi nunca supera el umbral -- se entreno con pocas descripciones --
    asi que la mayoria de los resultados salen con `origen: baseline`. Este test
    NO exige que gane uno u otro: exige que el campo `origen` sea coherente con
    la confianza, que es lo que permite saber quien contesto cuando esto cambie.
    """
    respuesta = cliente.post("/interno/v1/clasificar", json={
        "transacciones": [{"descripcion": d} for d in
                          ["Supermercado", "IFOOD *PEDIDO", "NETFLIX.COM", "ZZQQ 99811"]]
    })
    for resultado in respuesta.json()["resultados"]:
        if resultado["origen"] == "modelo":
            assert resultado["confianza"] >= taxonomia.UMBRAL_CONFIANZA, \
                "el modelo no deberia contestar por debajo del umbral"
