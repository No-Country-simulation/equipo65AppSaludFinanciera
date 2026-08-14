package com.fintechvital.api.dto;

import com.fintechvital.api.model.CuentaBancaria;

import java.time.LocalDate;

/**
 * Cuenta bancaria tal como la consume el frontend (types.ts -> CuentaBancaria).
 *
 * ⚠️ `numero` va SIEMPRE enmascarado. El numero completo existe en la base
 * porque es el identificador real de la cuenta, pero no tiene ninguna razon
 * para viajar por HTTP: la interfaz solo lo usa para que el usuario distinga
 * una cuenta de otra, y para eso bastan los 4 ultimos digitos.
 */
public record CuentaResponse(
        String id,
        String numero,
        String estado,
        LocalDate fechaApertura,
        String moneda,
        String tipoCuenta
) {
    public static CuentaResponse de(CuentaBancaria cuenta) {
        return new CuentaResponse(
                cuenta.getId().toString(),
                enmascarar(cuenta.getNumeroCuenta()),
                cuenta.getEstado(),
                cuenta.getFechaApertura(),
                cuenta.getMoneda(),
                cuenta.getTipoCuenta());
    }

    /** "**** 4821". Si el numero fuera mas corto de lo previsto, no se expone nada. */
    private static String enmascarar(String numero) {
        if (numero == null || numero.length() < 4) return "****";
        return "**** " + numero.substring(numero.length() - 4);
    }
}
