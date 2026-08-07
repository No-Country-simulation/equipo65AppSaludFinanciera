package com.hackathon.analisis.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Cuerpo de las operaciones destructivas que piden reconfirmar la identidad:
 * desactivar 2FA y dar de baja la cuenta.
 *
 * Se vuelve a pedir la contrasena aunque el token sea valido: un access token
 * robado no puede, ademas, apagar el segundo factor o borrar la cuenta.
 */
public record PasswordRequest(

        @NotBlank(message = "es obligatoria")
        String password
) {}
