package com.hackathon.analisis.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Login (CONTRATO_API §4). `codigoTotp` es opcional: si el usuario tiene 2FA
 * activo y no lo manda, la respuesta es 200 con requiere_2fa=true y SIN tokens.
 * No 401, porque la contrasena era correcta.
 */
public record LoginRequest(

        @NotBlank(message = "es obligatorio")
        @Email(message = "no es un correo valido")
        String email,

        @NotBlank(message = "es obligatoria")
        String password,

        String codigoTotp
) {}
