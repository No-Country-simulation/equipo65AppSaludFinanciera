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


def test_perfil_sin_contexto_usa_la_regla(cliente):
    respuesta = cliente.post("/interno/v1/perfil", json={"indicadores": INDICADORES_SANOS})
    cuerpo = respuesta.json()

    assert respuesta.status_code == 200
    assert cuerpo["perfil"] in taxonomia.PERFILES
    assert cuerpo["origen"] == "baseline"
    # El contrato: probabilidad == probabilidades[perfil] y las 3 suman 1.0.
    assert cuerpo["probabilidad"] == cuerpo["probabilidades"][cuerpo["perfil"]]
    assert abs(sum(cuerpo["probabilidades"].values()) - 1.0) < 0.01
    assert set(cuerpo["probabilidades"]) == set(taxonomia.PERFILES)


def test_perfil_con_contexto_usa_el_modelo(cliente):
    respuesta = cliente.post("/interno/v1/perfil", json={
        "indicadores": INDICADORES_SANOS,
        "contexto": {"ingreso_mensual": 45000, "ahorro_actual": 20000, "score_buro": 800},
    })
    cuerpo = respuesta.json()

    assert cuerpo["origen"] == "modelo"
    assert cuerpo["perfil"] in taxonomia.PERFILES
    assert set(cuerpo["probabilidades"]) == set(taxonomia.PERFILES)


def test_endeudamiento_alto_da_riesgo(cliente):
    indicadores = {**INDICADORES_SANOS, "tasa_ahorro": -0.05, "ratio_endeudamiento": 0.62}
    respuesta = cliente.post("/interno/v1/perfil", json={"indicadores": indicadores})
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
# Traduccion de etiquetas
# --------------------------------------------------------------------------

def test_las_etiquetas_del_pkl_mapean_a_slugs_validos():
    """
    Si Data Science renombra una clase, este test cae antes de que el servicio
    empiece a devolver `otros` en silencio en produccion.
    """
    for slug in taxonomia.ETIQUETA_A_CATEGORIA.values():
        assert slug in taxonomia.CATEGORIAS
    for slug in taxonomia.ETIQUETA_A_PERFIL.values():
        assert slug in taxonomia.PERFILES


def test_el_mapa_cubre_todas_las_clases_del_modelo(cliente):
    """El mapa tiene que cubrir TODAS las clases que el .pkl puede devolver."""
    from app.inferencia import artefactos

    if artefactos.modelo_categoria is not None:
        for etiqueta in artefactos.modelo_categoria.classes_:
            assert str(etiqueta) in taxonomia.ETIQUETA_A_CATEGORIA, \
                f"clase sin mapear en ETIQUETA_A_CATEGORIA: {etiqueta!r}"
    if artefactos.modelo_perfil is not None:
        for etiqueta in artefactos.modelo_perfil.classes_:
            assert str(etiqueta) in taxonomia.ETIQUETA_A_PERFIL, \
                f"clase sin mapear en ETIQUETA_A_PERFIL: {etiqueta!r}"
