package com.fintechvital.api.dto;

import com.fintechvital.api.model.Tarjeta;

import java.time.format.DateTimeFormatter;

/**
 * Tarjeta tal como la consume el frontend (types.ts -> Tarjeta).
 *
 * `fechaVencimiento` sale como 'YYYY-MM' y no como fecha completa: es lo que
 * lleva impreso el plastico y lo que espera la interfaz. El dia que se guarda
 * en la base es siempre el 1 y no significa nada.
 *
 * `credito` solo viene si la tarjeta es de credito; en una de debito es null y
 * Jackson lo omite (la configuracion global no serializa nulos).
 */
public record TarjetaResponse(
        String id,
        String idCuenta,
        String ultimos4,
        String tipo,
        String redPago,
        String fechaVencimiento,
        String estado,
        String etiqueta,
        CreditoResponse credito
) {
    private static final DateTimeFormatter ANIO_MES = DateTimeFormatter.ofPattern("yyyy-MM");

    public static TarjetaResponse de(Tarjeta tarjeta, CreditoResponse credito) {
        return new TarjetaResponse(
                tarjeta.getId().toString(),
                tarjeta.getCuentaId().toString(),
                tarjeta.getUltimos4(),
                tarjeta.getTipoTarjeta(),
                tarjeta.getRedPago(),
                tarjeta.getFechaVencimiento().format(ANIO_MES),
                tarjeta.getEstado(),
                tarjeta.getEtiqueta(),
                credito);
    }
}
