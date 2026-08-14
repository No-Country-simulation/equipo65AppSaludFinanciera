package com.fintechvital.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Respuesta del login (CONTRATO_API §4 -> types.ts interface Sesion).
 *
 * Cuando el usuario tiene 2FA activo y no mando el codigo, se devuelve
 * `requiere_2fa = true` con los tokens a null: el cliente pide el codigo y
 * reintenta.
 */
public record SesionResponse(
        String accessToken,
        String refreshToken,
        long expiraEn,

        // Explicito a proposito: la estrategia snake_case de Jackson no ve
        // frontera de palabra antes de un digito y dejaria "requiere2fa", que no
        // es lo que consume el frontend.
        @JsonProperty("requiere_2fa")
        boolean requiere2fa,

        UsuarioResponse usuario
) {
    public static SesionResponse pendiente2fa() {
        return new SesionResponse(null, null, 0, true, null);
    }
}
