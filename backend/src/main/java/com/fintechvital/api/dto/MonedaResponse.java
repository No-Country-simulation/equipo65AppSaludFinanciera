package com.fintechvital.api.dto;

import com.fintechvital.api.model.Moneda;

/** Una moneda del catalogo (CONTRATO_API §7). */
public record MonedaResponse(
        String codigo,
        String nombre,
        String simbolo,
        Short decimales
) {
    public static MonedaResponse de(Moneda m) {
        return new MonedaResponse(m.getCodigo(), m.getNombre(), m.getSimbolo(), m.getDecimales());
    }
}
