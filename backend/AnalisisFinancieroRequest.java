package com.hackathon.analisis.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Entrada de `POST /api/v1/analisis-financiero`.
 *
 * ⚠️ **Esta forma es LITERAL del enunciado y no se toca.** Es el JSON que el
 * jurado va a copiar y pegar en un curl. Cualquier campo que se renombre o se
 * vuelva obligatorio de mas hace que su prueba falle.
 */
@Schema(description = "Datos financieros a analizar (forma literal del enunciado)")
public record AnalisisFinancieroRequest(

        @Schema(example = "4500", description = "Ingreso mensual. Debe ser mayor que 0.")
        @NotNull(message = "es obligatorio")
        @DecimalMin(value = "0", inclusive = false, message = "debe ser mayor que 0")
        BigDecimal ingresoMensual,

        @Schema(example = "25", description = "Porcentaje de endeudamiento declarado, 0 a 100.")
        @NotNull(message = "es obligatorio")
        @Min(value = 0, message = "minimo 0")
        @Max(value = 100, message = "maximo 100")
        Integer nivelEndeudamiento,

        @Schema(example = "Media", description = "Nula | Baja | Media | Alta (no distingue mayusculas).")
        @NotBlank(message = "es obligatoria")
        @Pattern(regexp = "(?i)nula|baja|media|alta", message = "debe ser Nula, Baja, Media o Alta")
        String frecuenciaAhorro,

        @Schema(description = "Entre 3 y 500 transacciones.")
        @NotNull(message = "es obligatoria")
        @Size(min = 3, max = 500, message = "se necesitan entre 3 y 500 transacciones")
        @Valid
        List<Movimiento> transacciones,

        @Schema(example = "USD", description = "Opcional. Por defecto USD.")
        @Pattern(regexp = "[A-Z]{3}", message = "codigo ISO de 3 letras en mayusculas")
        String moneda
) {
    /** Moneda por defecto: el enunciado no la manda en su ejemplo. */
    public String monedaODefecto() {
        return moneda == null || moneda.isBlank() ? "USD" : moneda;
    }

    @Schema(description = "Una transaccion. Solo descripcion y valor, como en el enunciado.")
    public record Movimiento(

            @Schema(example = "Supermercado")
            @NotBlank(message = "es obligatoria")
            @Size(max = 200, message = "maximo 200 caracteres")
            String descripcion,

            /**
             * En el enunciado los gastos van en POSITIVO ("Supermercado": 420).
             * Se acepta tambien el negativo (que es como estan guardadas las
             * transacciones del usuario, RN4) y se usa el valor absoluto para
             * los totales: asi el mismo endpoint sirve para los dos formatos sin
             * que el jurado tenga que saberlo.
             */
            @Schema(example = "420")
            @NotNull(message = "es obligatorio")
            BigDecimal valor
    ) {}
}
