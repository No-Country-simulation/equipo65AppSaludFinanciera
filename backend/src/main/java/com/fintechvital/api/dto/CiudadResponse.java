package com.fintechvital.api.dto;

import com.fintechvital.api.model.Ciudad;

/** Una ciudad del catalogo (CONTRATO_API §7). */
public record CiudadResponse(
        String id,
        String nombre,
        String estadoRegion,
        String pais
) {
    public static CiudadResponse de(Ciudad c) {
        return new CiudadResponse(c.getId().toString(), c.getNombre(), c.getRegion(), c.getPais());
    }
}
