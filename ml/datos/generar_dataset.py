"""
Genera los dos datasets de entrenamiento, de forma REPRODUCIBLE.

    python ml/datos/generar_dataset.py

Produce:
    dataset_transacciones.csv  -> M1: descripcion -> categoria (12 slugs)
    dataset_perfiles.csv       -> M2: los 8 indicadores -> perfil (3 slugs)

Por que un dataset generado y no uno real: el enunciado §10.1 dice que **cada
equipo construye su propio conjunto de datos** y admite explicitamente
generarlos por simulacion; es lo que decidio ADR-0006. Ademas no existe un
dataset publico de transacciones bancarias etiquetadas en los tres idiomas del
proyecto, y usar datos bancarios reales de personas no seria aceptable.

Todo va con semilla fija: dos ejecuciones dan el mismo CSV, asi que el
entrenamiento es reproducible y los numeros del notebook se pueden repetir.
"""

from __future__ import annotations

import csv
import random
from pathlib import Path

import numpy as np

from comercios import CIUDADES, COMERCIOS, CONCEPTOS, PLANTILLAS

SEMILLA = 42
AQUI = Path(__file__).resolve().parent

# Cuantas variantes de extracto se generan por comercio. Con ~3 el modelo ve el
# nombre limpio y un par de formas sucias, que es lo que necesita `char_wb`.
VARIANTES_POR_COMERCIO = 4


def _referencia(rng: random.Random) -> str:
    return "".join(rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(rng.randint(4, 8)))


def generar_transacciones() -> list[dict[str, str]]:
    """Descripciones de transaccion con su categoria, en los tres idiomas."""
    rng = random.Random(SEMILLA)
    filas: list[dict[str, str]] = []
    vistos: set[str] = set()

    for categoria, por_idioma in COMERCIOS.items():
        for idioma, comercios in por_idioma.items():
            for comercio in comercios:
                plantillas = rng.sample(
                    PLANTILLAS[idioma],
                    min(VARIANTES_POR_COMERCIO, len(PLANTILLAS[idioma])),
                )
                for plantilla in plantillas:
                    descripcion = plantilla.format(
                        c=comercio,
                        ref=_referencia(rng),
                        num=rng.randint(100, 9999),
                        ciudad=rng.choice(CIUDADES[idioma]),
                    )
                    # Los extractos suelen venir en mayusculas, pero no siempre.
                    if rng.random() < 0.45:
                        descripcion = descripcion.upper()

                    if descripcion in vistos:
                        continue
                    vistos.add(descripcion)
                    filas.append({
                        "descripcion": descripcion,
                        "categoria_slug": categoria,
                        "idioma": idioma,
                        # El comercio del que sale esta variante. Es lo que
                        # permite partir por GRUPO al evaluar: si "Burger King"
                        # cae en entrenamiento, TODAS sus variantes van ahi y
                        # ninguna se cuela en prueba.
                        "comercio": comercio,
                    })

    # Conceptos genericos ("Combustible", "Streaming", "Pago de Alquiler"). Van
    # tal cual y con poco ruido: en un extracto aparecen limpios, y ademas son
    # la forma que usa el ejemplo del enunciado.
    for categoria, por_idioma in CONCEPTOS.items():
        for idioma, conceptos in por_idioma.items():
            for concepto in conceptos:
                for variante in (concepto, concepto.upper(),
                                 f"{concepto} {rng.choice(CIUDADES[idioma])}"):
                    if variante in vistos:
                        continue
                    vistos.add(variante)
                    filas.append({
                        "descripcion": variante,
                        "categoria_slug": categoria,
                        "idioma": idioma,
                        "comercio": concepto,
                    })

    rng.shuffle(filas)
    return filas


def generar_perfiles(n: int = 3000) -> list[dict[str, str]]:
    """
    Perfiles financieros: los 8 indicadores de TAXONOMIA §3 -> uno de 3 slugs.

    ⚠️ Los indicadores NO se sortean independientes. Se simula primero una
    persona (ingreso, gastos por grupo, deuda, habito de ahorro) y **los 8
    indicadores se calculan a partir de ella**, igual que hace el backend. Si se
    sortearan sueltos saldrian combinaciones imposibles -- alguien que gasta el
    120% de su ingreso y a la vez ahorra el 30% -- y el modelo aprenderia a
    separar ruido, no comportamiento.

    La etiqueta sale de una puntuacion compuesta sobre los indicadores, con un
    poco de ruido en la frontera para que el modelo no memorice un corte exacto
    y aprenda una transicion suave.
    """
    rng = np.random.default_rng(SEMILLA)
    filas: list[dict[str, str]] = []

    for _ in range(n):
        # Tres arquetipos, para que las tres clases esten representadas. Sin
        # esto la simulacion produce sobre todo perfiles del medio y la clase
        # `saludable` queda tan escasa que el modelo deja de predecirla.
        arquetipo = rng.choice(["ordenado", "justo", "apretado"], p=[0.34, 0.33, 0.33])

        if arquetipo == "ordenado":
            gasto_total = rng.uniform(0.45, 0.80)
            endeudamiento = rng.uniform(0.00, 0.25)
            frecuencia = int(rng.choice([2, 3], p=[0.3, 0.7]))
        elif arquetipo == "justo":
            gasto_total = rng.uniform(0.75, 1.00)
            endeudamiento = rng.uniform(0.15, 0.45)
            frecuencia = int(rng.choice([1, 2], p=[0.5, 0.5]))
        else:
            gasto_total = rng.uniform(0.95, 1.45)
            endeudamiento = rng.uniform(0.35, 0.80)
            frecuencia = int(rng.choice([0, 1], p=[0.7, 0.3]))

        # El gasto se reparte entre esencial, discrecional y el resto.
        peso_esencial = rng.uniform(0.45, 0.80)
        peso_discrecional = rng.uniform(0.10, min(0.45, 1.0 - peso_esencial))
        esencial = gasto_total * peso_esencial
        discrecional = gasto_total * peso_discrecional

        tasa_ahorro = float(np.clip(1.0 - gasto_total, -2.0, 1.0))
        concentracion = float(np.clip(rng.beta(2.2, 3.0), 0.0, 1.0))
        recurrente = float(np.clip(rng.beta(2.0, 6.0), 0.0, 1.0))

        # Puntuacion: cuanto mas alto, peor. Los pesos siguen la lectura de
        # TAXONOMIA §4 -- deficit y deuda pesan mas que la concentracion.
        riesgo = (
            2.6 * max(0.0, -tasa_ahorro)
            + 1.8 * endeudamiento
            + 1.1 * max(0.0, gasto_total - 0.85)
            + 0.5 * max(0.0, esencial - 0.60)
            + 0.4 * max(0.0, discrecional - 0.30)
            + 0.3 * max(0.0, concentracion - 0.50)
            + 0.25 * (3 - frecuencia) / 3
            - 1.5 * max(0.0, tasa_ahorro)
        )
        riesgo += rng.normal(0.0, 0.10)   # frontera difusa, no un corte exacto

        if riesgo < 0.10:
            perfil = "saludable"
        elif riesgo < 0.62:
            perfil = "en_observacion"
        else:
            perfil = "en_riesgo"

        filas.append({
            "tasa_ahorro": f"{tasa_ahorro:.3f}",
            "ratio_endeudamiento": f"{endeudamiento:.3f}",
            "ratio_gasto_ingreso": f"{gasto_total:.3f}",
            "ratio_gasto_esencial": f"{esencial:.3f}",
            "ratio_gasto_discrecional": f"{discrecional:.3f}",
            "concentracion_gasto": f"{concentracion:.3f}",
            "frecuencia_ahorro_num": str(frecuencia),
            "ratio_recurrente": f"{recurrente:.3f}",
            "perfil_slug": perfil,
        })

    return filas


def escribir(nombre: str, filas: list[dict[str, str]]) -> None:
    destino = AQUI / nombre
    with open(destino, "w", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=list(filas[0]))
        escritor.writeheader()
        escritor.writerows(filas)
    print(f"  -> {nombre}: {len(filas)} filas")


if __name__ == "__main__":
    print("Generando datasets (semilla fija, reproducible)")
    transacciones = generar_transacciones()
    escribir("dataset_transacciones.csv", transacciones)

    perfiles = generar_perfiles()
    escribir("dataset_perfiles.csv", perfiles)

    from collections import Counter
    print("\nM1 por categoria:")
    for k, v in sorted(Counter(f["categoria_slug"] for f in transacciones).items()):
        print(f"    {k:18s} {v:5d}")
    print("\nM1 por idioma:")
    for k, v in sorted(Counter(f["idioma"] for f in transacciones).items()):
        print(f"    {k:18s} {v:5d}")
    print("\nM2 por perfil:")
    for k, v in sorted(Counter(f["perfil_slug"] for f in perfiles).items()):
        print(f"    {k:18s} {v:5d}")
