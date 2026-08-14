package com.fintechvital.api.dto;

import com.fintechvital.api.model.EventoCalendario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Entrada y salida de `/api/v1/eventos` (CONTRATO_API §6.1). */
public final class EventoDtos {

    private EventoDtos() {}

    /**
     * Alta y edicion.
     *
     * Los campos no van con @NotNull porque el mismo record sirve para el PATCH,
     * donde null significa "no lo toques"; lo obligatorio del alta lo comprueba
     * el servicio.
     */
    @Schema(description = "Alta o edicion de un evento del calendario.")
    public record Alta(
            LocalDate fecha,
            @Size(max = 120, message = "no puede pasar de 120 caracteres") String titulo,
            /** pago | cobro | recordatorio. */
            String tipo,
            BigDecimal monto,
            String moneda
    ) {}

    public record Respuesta(
            String id,
            LocalDate fecha,
            String titulo,
            String tipo,
            BigDecimal monto,
            String moneda
    ) {
        public static Respuesta de(EventoCalendario e) {
            return new Respuesta(
                    e.getId().toString(), e.getFecha(), e.getTitulo(),
                    e.getTipo(), e.getMonto(), e.getMoneda());
        }
    }
}
