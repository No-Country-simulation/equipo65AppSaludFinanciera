package com.fintechvital.api.dto;

import java.util.List;

/**
 * Forma UNIFORME de error de la API (CONTRATO_API §2). Todo error - 400, 401,
 * 403, 404, 409, 422, 429, 500 - sale con esta estructura.
 *
 * Nunca un stacktrace, nunca un HTML de Spring, nunca un String suelto: el
 * frontend parsea este objeto y sin el no puede mostrar un mensaje util.
 *
 * `trazaId` siempre esta, y es el mismo que se escribe en el log: permite pasar
 * de "me sale un error" a la linea exacta del servidor.
 */
public record ErrorResponse(
        String codigo,
        String mensaje,
        List<Detalle> detalles,
        String trazaId
) {
    public record Detalle(String campo, String error) {}
}
