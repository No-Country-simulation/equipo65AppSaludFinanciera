package com.fintechvital.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Serie temporal del grafico de evolucion (CONTRATO_API §6, types.ts ->
 * Evolucion).
 *
 * Un punto por analisis guardado: la evolucion es la del diagnostico, no la del
 * saldo. Por eso no se recalcula nada aqui -- se leen las fotos que ya existen.
 */
public record EvolucionResponse(
        String moneda,
        List<Punto> puntos
) {
    public record Punto(
            LocalDate fecha,
            String perfilCodigo,
            BigDecimal probabilidad,
            BigDecimal tasaAhorro,
            BigDecimal ratioEndeudamiento
    ) {}
}
