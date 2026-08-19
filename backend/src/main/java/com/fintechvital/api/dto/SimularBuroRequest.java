package com.fintechvital.api.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Alta simulada de una consulta de buro (`POST /api/v1/buro/simular`).
 *
 * ⚠️ NO lleva `usuario_id` a proposito. La version anterior lo recibia en el
 * cuerpo y lo usaba tal cual, asi que cualquier persona con sesion podia
 * escribir el historial crediticio de OTRA (RN9). El id sale del token.
 *
 * Los rangos son los de la tabla `historial_buro`: el score de buro en Mexico
 * va de 300 a 850.
 */
public record SimularBuroRequest(

        @NotNull(message = "es obligatorio")
        @Min(value = 300, message = "minimo 300")
        @Max(value = 850, message = "maximo 850")
        Short score,

        @NotNull(message = "es obligatorio")
        @Min(value = 0, message = "no puede ser negativo")
        @Max(value = 3650, message = "maximo 3650 dias")
        Integer atraso,

        @NotNull(message = "es obligatorio")
        @DecimalMin(value = "0", message = "no puede ser negativo")
        BigDecimal deuda,

        @Pattern(regexp = "USD|MXN|ARS|COP|CLP|PEN|BRL|EUR", message = "moneda no soportada")
        String moneda
) {}
