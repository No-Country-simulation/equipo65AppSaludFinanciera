package com.fintechvital.api.dto;

import com.fintechvital.api.model.PresupuestoUso;

import java.math.BigDecimal;

/**
 * Un presupuesto mensual como lo pinta la interfaz (types.ts -> Presupuesto).
 *
 * El campo se llama `categoria` y no `categoria_slug`: hacia fuera el slug ES
 * la categoria, y el frontend lo cruza con el catalogo para sacar la etiqueta.
 *
 * `gastado` es del mes en curso y lo calcula la vista `vw_presupuesto_uso`.
 */
public record PresupuestoResponse(
        String categoria,
        BigDecimal limite,
        BigDecimal gastado,
        String moneda
) {
    public static PresupuestoResponse de(PresupuestoUso p) {
        return new PresupuestoResponse(
                p.getCategoriaSlug(), p.getLimite(), p.getGastado(), p.getMoneda());
    }
}
