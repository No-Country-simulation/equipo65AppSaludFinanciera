"""
Taxonomia del proyecto y baselines.

Aqui viven dos cosas:

1. Los 12 slugs de categoria y los 3 de perfil (``docs/datos/TAXONOMIA.md``).
2. Los **baselines** que el propio CONTRATO_MODELO §5 define como la referencia
   a batir: el clasificador por palabras clave para M1 y la regla determinista
   para M2.

Los slugs NUNCA se traducen. Las etiquetas legibles las pone el backend desde
``categoria_i18n`` segun ``Accept-Language``.
"""

from __future__ import annotations

import re
import unicodedata

# --------------------------------------------------------------------------
# Slugs canonicos
# --------------------------------------------------------------------------

CATEGORIAS = (
    "alimentacion", "transporte", "vivienda", "servicios", "salud", "educacion",
    "entretenimiento", "compras", "finanzas", "ahorro_inversion", "ingresos", "otros",
)

PERFILES = ("saludable", "en_observacion", "en_riesgo")

#: Comodin de RN6: sin senal suficiente, se responde "otros" y nunca se inventa.
CATEGORIA_COMODIN = "otros"

#: RN6: por debajo de esta confianza el resultado se degrada a "otros".
#: El umbral vive aqui, en el ML, porque es una propiedad del modelo.
UMBRAL_CONFIANZA = 0.40


# --------------------------------------------------------------------------
# Normalizacion
# --------------------------------------------------------------------------
#
# Hubo aqui dos mapas (ETIQUETA_A_CATEGORIA / ETIQUETA_A_PERFIL) que traducian
# las etiquetas de los .pkl a los slugs del proyecto: el M1 anterior devolvia
# subcategorias con acentos ("Comida rapida", "Transporte/Bus") y el M2,
# perfiles con parentesis. Ya no hacen falta: los modelos actuales emiten los
# slugs canonicos directamente, que es como debe ser.

def normalizar(texto: str) -> str:
    """
    Minusculas, sin acentos y sin ruido de extracto bancario.

    Las descripciones reales no vienen limpias: ``UBER   *TRIP 4821``,
    ``WAL-MART #1234``, ``PIX RECEBIDO-SALARIO``. Se quitan acentos, digitos y
    separadores para que todas esas formas colapsen en algo comparable.
    """
    sin_acentos = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    limpio = re.sub(r"[^a-z ]+", " ", sin_acentos.lower())
    return re.sub(r"\s+", " ", limpio).strip()


# --------------------------------------------------------------------------
# Baseline por palabras clave
# --------------------------------------------------------------------------
#
# El CONTRATO_MODELO lo nombra explicitamente como "baseline a batir" de M1.
# Existe por dos razones:
#
#   1. Es la referencia contra la que se mide el modelo. Sin baseline, una
#      metrica del modelo no dice si es bueno o solo parece bueno.
#   2. Responde cuando el modelo no esta seguro. M1 ya tiene la arquitectura
#      correcta, pero se entreno con pocas descripciones y casi nunca supera el
#      umbral de confianza; hasta que se reentrene, esto es lo que sostiene la
#      clasificacion. Ver la cabecera de `inferencia.py`.
#
# Es multilingue (es / pt / en) porque ADR-0009 lo exige: buena parte del jurado
# es de Brasil y `IFOOD` devolviendo "otros" seria el peor momento de la demo.
#
# El orden importa: gana la PRIMERA categoria con alguna coincidencia, y estan
# ordenadas de mas especifica a mas generica. `ingresos` va primero porque
# "pago de nomina" es un ingreso, no un gasto de la categoria `finanzas`.

#
# ⚠️ Cada categoria incluye ADEMAS su propio nombre generico ("streaming",
# "supermercado", "combustible"). No es relleno: el ejemplo del enunciado --el
# que el jurado va a copiar y pegar-- usa exactamente esas palabras como
# descripcion, no nombres de comercio:
#
#     {"descripcion": "Supermercado", "valor": 420}
#     {"descripcion": "Combustible",  "valor": 300}
#     {"descripcion": "Streaming",    "valor": 40}
#
# Sin ellas, "Streaming" caia en `otros` y la salida no coincidia con la del
# enunciado (que espera `entretenimiento`). Detectado probando ese curl.

PALABRAS_CLAVE: dict[str, tuple[str, ...]] = {
    "ingresos": (
        "ingreso", "ingresos", "receita", "income",
        "salario", "nomina", "sueldo", "salario mensal", "pagamento", "deposito",
        "transferencia recibida", "pix recebido", "ted recebida", "reembolso",
        "payroll", "salary", "deposit", "refund", "freelance", "honorarios",
    ),
    "ahorro_inversion": (
        # ⚠️ "ahorro" A SECAS NO va aqui. "Farmacia del Ahorro" y "Farmacias
        # Guadalajara del Ahorro" son cadenas de farmacias reales en Mexico, y
        # como `ahorro_inversion` se evalua antes que `salud`, la palabra suelta
        # se llevaba esas transacciones a la categoria equivocada. Pasaba de
        # verdad: se detecto probando /transacciones/clasificar.
        "cuenta de ahorro", "ahorro automatico", "transferencia a ahorro",
        "aporte a ahorro", "ahorro programado",
        "inversion", "inversiones", "poupanca", "savings",
        "plazo fijo", "fondo", "investimento",
        "cdb", "tesouro", "investment", "broker", "cripto", "crypto",
        "binance", "coinbase", "etf", "acciones", "bolsa",
    ),
    "vivienda": (
        "vivienda", "moradia", "housing",
        "alquiler", "renta", "hipoteca", "expensas", "condominio", "aluguel",
        "financiamento imobiliario", "rent", "mortgage", "inmobiliaria",
        "ikea", "homedepot", "home depot", "muebles",
    ),
    "servicios": (
        # ⚠️ "gas" a secas NO va aqui: en ingles "gas station" es una
        # gasolinera, que es `transporte`. Se piden las formas del gas
        # domestico, que son las que de verdad identifican el servicio.
        "servicios", "servicio", "contas", "utilities", "utility bill",
        "gas natural", "gas lp", "conta de gas", "natural gas",
        "luz", "agua", "internet", "telefonia", "cable", "electricidad",
        "conta de luz", "enel", "cemig", "copel", "sabesp", "vivo", "claro", "tim",
        "telmex", "izzi", "totalplay", "megacable", "cfe", "naturgy", "iberdrola",
        "utility", "electric", "water bill", "at&t", "verizon", "movistar",
    ),
    "salud": (
        "salud", "saude", "health",
        # ⚠️ Los extractos abrevian. "FCIA GUADALAJARA SUC 112" es una farmacia
        # y caia en `otros`: ni el modelo ni el baseline conocian la
        # abreviatura. Detectado corriendo los ejemplos del CHECKLIST.
        "fcia", "farm", "drog",
        "farmacia", "farmacias", "drogaria", "droga raia", "drogasil", "pharmacy",
        "hospital", "clinica", "medico", "dentista", "consultorio", "laboratorio",
        "seguro medico", "optica", "similares", "benavides", "cvs", "walgreens",
    ),
    "educacion": (
        "educacion", "educacao", "education",
        "colegiatura", "universidad", "colegio", "escuela", "curso", "libreria",
        "mensalidade", "faculdade", "escola", "tuition", "university", "school",
        "udemy", "coursera", "platzi", "alura", "duolingo",
    ),
    "transporte": (
        "transporte", "transportes",
        "uber", "didi", "cabify", "lyft", "taxi", "bus", "autobus", "metro",
        "gasolinera", "gasolina", "combustible", "combustivel", "posto ipiranga",
        "shell", "pemex", "ypf", "petrobras", "peaje", "pedagio", "estacionamiento",
        "parking", "tag", "telepass", "sem parar", "onibus", "transport", "fuel",
        "gas station", "aeromexico", "latam", "gol linhas", "azul", "avianca",
    ),
    "alimentacion": (
        # ⚠️ Las marcas con guion se listan TAMBIEN separadas: `normalizar()`
        # convierte los guiones en espacios, asi que "WAL-MART #1234" llega
        # aqui como "wal mart" y no casaria con "walmart". Pasa igual con
        # "SEVEN-ELEVEN" o "PAO-DE-ACUCAR".
        "alimentacion", "alimentacao", "comida", "food",
        "wal mart", "seven eleven", "pao de acucar",
        "supermercado", "super", "walmart", "soriana", "chedraui", "costco",
        "comercial mexicana", "bodega aurrera", "oxxo", "seven eleven", "carrefour",
        "pao de acucar", "extra", "assai", "atacadao", "mercado", "restaurante",
        "restaurant", "cafe", "cafeteria", "starbucks", "mcdonalds", "burger king",
        "dominos", "pizza", "kfc", "subway", "rappi", "ifood", "uber eats",
        "didi food", "doordash", "grubhub", "panaderia", "padaria", "bakery",
        "grocery", "whole foods", "kroger", "safeway", "la comer",
    ),
    "entretenimiento": (
        "streaming", "suscripcion", "suscripciones", "assinatura", "subscription",
        "entretenimiento", "entretenimento", "entertainment", "ocio", "lazer",
        "netflix", "spotify", "disney", "hbo", "max", "prime video", "amazon prime",
        "paramount", "star plus", "globoplay", "deezer", "youtube premium",
        "cine", "cinema", "cinepolis", "cinemark", "teatro", "bar", "cerveceria",
        "gimnasio", "gym", "smartfit", "steam", "playstation", "xbox", "nintendo",
        "spotify premium", "twitch", "concierto", "show", "evento",
    ),
    "finanzas": (
        "finanzas", "financas", "finance",
        "pago tarjeta", "pago de deuda", "prestamo", "credito", "interes",
        "comision", "anualidad", "seguro", "impuesto", "sat", "hacienda",
        "emprestimo", "juros", "tarifa bancaria", "iof", "imposto", "receita federal",
        "loan", "interest", "bank fee", "insurance", "tax", "irs",
    ),
    "compras": (
        "compra", "compras", "shopping",
        "amazon", "mercado libre", "mercadolibre", "mercado livre", "shopee",
        "aliexpress", "shein", "temu", "liverpool", "palacio de hierro", "coppel",
        "elektra", "magazine luiza", "americanas", "casas bahia", "renner",
        "zara", "h&m", "nike", "adidas", "apple store", "best buy", "target",
        "ropa", "calzado", "electronica", "regalo", "shopping",
    ),
}

#: Se precompilan como regex con frontera de palabra para que "gas" no case
#: dentro de "gasolinera" ni "super" dentro de "supermercado" por accidente.
_PATRONES: dict[str, re.Pattern[str]] = {
    categoria: re.compile(
        r"\b(?:" + "|".join(re.escape(normalizar(p)) for p in palabras) + r")\b"
    )
    for categoria, palabras in PALABRAS_CLAVE.items()
}


def clasificar_por_palabras(descripcion: str) -> tuple[str, float]:
    """
    Baseline: primera categoria cuya palabra clave aparece en la descripcion.

    Devuelve ``(slug, confianza)``. La confianza es deliberadamente moderada
    (0.60) y no 1.0: una coincidencia de palabra clave es una senal buena, no
    una certeza, y el backend la muestra al usuario. Sin coincidencia devuelve
    ``("otros", 0.0)``, que es lo que manda RN6 -- nunca una categoria inventada.
    """
    texto = normalizar(descripcion)
    if not texto:
        return CATEGORIA_COMODIN, 0.0
    for categoria, patron in _PATRONES.items():
        if patron.search(texto):
            return categoria, 0.60
    return CATEGORIA_COMODIN, 0.0


def perfil_por_reglas(tasa_ahorro: float, ratio_endeudamiento: float) -> tuple[str, dict[str, float]]:
    """
    Baseline determinista del perfil, el que nombra el CONTRATO_MODELO:
    una regla sobre ``tasa_ahorro`` y ``ratio_endeudamiento``.

    Los umbrales salen de TAXONOMIA §4. Devuelve el slug y las tres
    probabilidades, que aqui son grados de certeza de la regla y no una
    distribucion aprendida: suman 1.0 porque el contrato lo exige.
    """
    if ratio_endeudamiento >= 0.40 or tasa_ahorro <= 0.0:
        return "en_riesgo", {"saludable": 0.05, "en_observacion": 0.25, "en_riesgo": 0.70}
    if tasa_ahorro >= 0.15 and ratio_endeudamiento < 0.25:
        return "saludable", {"saludable": 0.70, "en_observacion": 0.25, "en_riesgo": 0.05}
    return "en_observacion", {"saludable": 0.20, "en_observacion": 0.65, "en_riesgo": 0.15}
