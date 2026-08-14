package com.fintechvital.api.dto;

import com.fintechvital.api.model.Transaccion;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Un movimiento tal como lo pinta la interfaz (types.ts -> Transaccion).
 *
 * Es un DTO y no la entidad: lo que sale por HTTP es un contrato publico, y
 * exponer la entidad ata la forma de la respuesta a la forma de la tabla --
 * renombrar una columna se convierte en un cambio incompatible para web y
 * movil, y de paso se escapan columnas internas (valor_base, modelo_version).
 */
public record TransaccionResponse(
        String id,
        String descripcion,
        /** El signo ES el dato (RN4): > 0 ingreso, < 0 gasto. */
        BigDecimal valor,
        String moneda,
        LocalDate fecha,
        String categoria,
        BigDecimal confianza,
        String categoriaOrigen,
        // Opcionales: no todos los movimientos los traen. Con
        // default-property-inclusion=non_null, los null no llegan a viajar.
        String comercio,
        String medioOperacion,
        String idTarjeta
) {
    /**
     * Confianza que se reporta cuando la categoria la puso una persona.
     *
     * En la base se guarda NULL, porque una vez corregida a mano la confianza
     * del modelo ya no describe nada (RN3, ck_transaccion_confianza_origen).
     * Hacia fuera eso no puede ser un hueco: la interfaz pinta la confianza en
     * cada fila, y un campo ausente la dejaria en blanco. Una correccion humana
     * es certeza, asi que se reporta como 1.
     */
    private static final BigDecimal CERTEZA = BigDecimal.ONE;

    public static TransaccionResponse de(Transaccion t) {
        return new TransaccionResponse(
                t.getId().toString(),
                t.getDescripcion(),
                t.getValor(),
                t.getMoneda(),
                t.getFecha(),
                t.getCategoriaSlug(),
                t.getConfianza() != null ? t.getConfianza() : CERTEZA,
                t.getCategoriaOrigen(),
                t.getComercio(),
                t.getMedioOperacion(),
                t.getTarjetaId() != null ? t.getTarjetaId().toString() : null);
    }
}
