package com.fintechvital.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Entrada y salida de `/api/v1/transacciones` que no es el propio movimiento
 * ({@link TransaccionResponse}).
 *
 * Van juntos porque son cuatro records de tres lineas que siempre se abren a la
 * vez: el alta, la correccion, la pagina y el resultado del import.
 */
public final class TransaccionDtos {

    private TransaccionDtos() {}

    /**
     * Alta manual de un movimiento.
     *
     * `categoria` es OPCIONAL: si no viene, clasifica el modelo -- que es la
     * gracia del producto. Si viene, manda la persona y queda registrado como
     * tal (categoria_origen = 'usuario').
     */
    @Schema(description = "Alta manual de un movimiento.")
    public record Alta(

            @NotBlank(message = "es obligatoria")
            @Size(max = 200, message = "no puede pasar de 200 caracteres")
            String descripcion,

            /** El signo ES el dato (RN4). Cero esta prohibido: no significa nada. */
            @NotNull(message = "es obligatorio")
            BigDecimal valor,

            String moneda,
            LocalDate fecha,
            String categoria,
            String comercio,
            String medioOperacion,
            String idTarjeta
    ) {}

    /** Correccion de categoria a mano ("Corregir" en la fila de Movimientos). */
    @Schema(description = "Cambia la categoria de un movimiento.")
    public record Correccion(
            @NotBlank(message = "es obligatoria")
            String categoria
    ) {}

    /** Una pagina de movimientos (types.ts -> PaginaTransacciones). */
    public record Pagina(
            List<TransaccionResponse> items,
            long total,
            int pagina,
            int tam
    ) {}

    /** Resultado de importar un CSV (types.ts -> ResultadoImport). */
    public record ResultadoImport(
            int importadas,
            int rechazadas,
            List<ErrorFila> errores
    ) {
        public record ErrorFila(int fila, String error) {}
    }
}
