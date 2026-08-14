package com.fintechvital.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Confirmacion del alta de 2FA: el codigo que muestra la app del usuario. */
public record Activar2faRequest(

        @NotBlank(message = "es obligatorio")
        @Pattern(regexp = "\\d{6}", message = "debe tener 6 digitos")
        String codigoTotp
) {}
