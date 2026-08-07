package com.hackathon.analisis.dto;

import java.math.BigDecimal;

/**
 * Datos de credito de una tarjeta (types.ts -> CreditoTarjeta).
 *
 * `saldoUtilizado` NO sale de una columna: lo calcula `vw_tarjeta_credito`
 * sumando los cargos. Por eso este record no se construye desde la entidad
 * TarjetaCredito, sino desde la fila de la vista.
 */
public record CreditoResponse(
        BigDecimal limiteCredito,
        Short diaCorte,
        Short diaPago,
        BigDecimal saldoUtilizado
) {}
