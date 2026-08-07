package com.hackathon.analisis.dominio;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Los slugs del proyecto y sus agrupaciones (docs/datos/TAXONOMIA.md §1 y §2).
 *
 * Estan aqui, en una sola clase, porque los mismos 12 slugs viven en cuatro
 * capas a la vez (DS, este backend, la base y el frontend). Repartidos por el
 * codigo, cambiar uno obliga a buscarlo a mano y siempre queda alguno viejo.
 *
 * ⚠️ Los slugs NO se traducen NUNCA. Las etiquetas legibles salen del
 * MessageSource segun el Accept-Language.
 */
public final class Taxonomia {

    private Taxonomia() {}

    public static final String OTROS = "otros";

    public static final List<String> CATEGORIAS = List.of(
            "alimentacion", "transporte", "vivienda", "servicios", "salud", "educacion",
            "entretenimiento", "compras", "finanzas", "ahorro_inversion", "ingresos", OTROS);

    public static final String SALUDABLE = "saludable";
    public static final String EN_OBSERVACION = "en_observacion";
    public static final String EN_RIESGO = "en_riesgo";
    public static final List<String> PERFILES = List.of(SALUDABLE, EN_OBSERVACION, EN_RIESGO);

    // --- Agrupaciones (TAXONOMIA §1.2). Las usan los indicadores. ---

    public static final Set<String> ESENCIAL =
            Set.of("alimentacion", "vivienda", "servicios", "salud", "transporte");

    public static final Set<String> DISCRECIONAL = Set.of("entretenimiento", "compras");

    /**
     * Lo que NO cuenta como gasto: mover dinero a ahorro no es gastarlo, y un
     * ingreso obviamente tampoco. Meterlos en GASTO_TOTAL castigaria al usuario
     * justamente por ahorrar.
     */
    public static final Set<String> NO_GASTO = Set.of("ahorro_inversion", "ingresos");

    /** ¿Cuenta para GASTO_TOTAL? Todo menos ahorro e ingresos. */
    public static boolean esGasto(String categoria) {
        return !NO_GASTO.contains(categoria);
    }

    /**
     * Umbral de gasto por categoria, como fraccion del ingreso (TAXONOMIA §4).
     *
     * Son un punto de partida razonable (reglas de presupuesto tipo 50/30/20),
     * NO ciencia. Se ajustan con la distribucion real del dataset.
     *
     * `educacion` queda fuera de ESENCIAL y DISCRECIONAL a proposito: es
     * inversion en capital humano y meterla en cualquiera de los dos sesga el
     * diagnostico. Cuenta en GASTO_TOTAL pero no en esos dos ratios.
     */
    public static final Map<String, BigDecimal> UMBRALES = Map.of(
            "alimentacion", new BigDecimal("0.35"),
            "vivienda", new BigDecimal("0.35"),
            "transporte", new BigDecimal("0.20"),
            "servicios", new BigDecimal("0.15"),
            "salud", new BigDecimal("0.20"),
            "entretenimiento", new BigDecimal("0.15"),
            "compras", new BigDecimal("0.15"),
            "finanzas", new BigDecimal("0.20"),
            "educacion", new BigDecimal("0.25"),
            OTROS, new BigDecimal("0.10"));

    /** `frecuencia_ahorro` (texto de la API) -> el entero que consume el modelo. */
    public static int frecuenciaAhorroNumerica(String frecuencia) {
        if (frecuencia == null) return 0;
        return switch (frecuencia.trim().toLowerCase()) {
            case "alta" -> 3;
            case "media" -> 2;
            case "baja" -> 1;
            default -> 0;   // "nula" y cualquier otra cosa
        };
    }
}
