package com.fintechvital.api.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * "Este mes contra el anterior" del Panel (types.ts -> ComparacionMensual).
 *
 * `gasto_total` va en POSITIVO aunque en la base los gastos sean negativos: es
 * como se pinta la cifra en pantalla.
 */
public record ComparacionMensualResponse(
        ResumenMensual actual,
        ResumenMensual anterior
) {
    public record ResumenMensual(
            /** 'YYYY-MM'. */
            String mes,
            BigDecimal gastoTotal,
            BigDecimal ingresoTotal,
            BigDecimal balance,
            /** Gasto por categoria. Las claves son SLUGS, nunca etiquetas. */
            Map<String, BigDecimal> porCategoria
    ) {}
}
