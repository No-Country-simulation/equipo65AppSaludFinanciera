package com.fintechvital.api.dto;

import java.util.List;

/**
 * Salud crediticia (types.ts -> SaludCrediticia): el registro vigente mas su
 * evolucion.
 *
 * `actual` es el ULTIMO elemento de `historial`, no una consulta aparte a
 * vw_buro_vigente: se trae la serie una sola vez y se toma el ultimo. Dos
 * consultas podrian ademas devolver cosas distintas si entra un registro nuevo
 * entre una y otra.
 */
public record SaludCrediticiaResponse(
        String moneda,
        RegistroBuroResponse actual,
        List<RegistroBuroResponse> historial
) {}
