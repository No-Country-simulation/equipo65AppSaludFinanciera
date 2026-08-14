package com.fintechvital.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Entrada y salida de `POST /api/v1/transacciones/clasificar`.
 *
 * El enunciado lo pide como endpoint APARTE del analisis: clasificar sin
 * diagnosticar. Es util por si solo (importar un extracto y ver en que se va el
 * dinero, sin declarar ingreso ni endeudamiento) y por eso no exige nada mas
 * que las descripciones.
 *
 * Los dos records viven en el mismo archivo porque solo se usan juntos y son
 * cuatro lineas cada uno; separarlos serian dos archivos que siempre se abren a
 * la vez.
 */
public final class ClasificarDtos {

    private ClasificarDtos() {}

    @Schema(description = "Transacciones a clasificar (maximo 500).")
    public record Peticion(

            @NotNull(message = "es obligatoria")
            @Size(min = 1, max = 500, message = "se necesitan entre 1 y 500 transacciones")
            @Valid
            List<AnalisisFinancieroRequest.Movimiento> transacciones
    ) {}

    @Schema(description = "Cada transaccion con su categoria.")
    public record Respuesta(
            String modeloVersion,
            List<AnalisisFinancieroResponse.TransaccionClasificadaDto> transaccionesClasificadas
    ) {}
}
