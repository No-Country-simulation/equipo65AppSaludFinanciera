package com.fintechvital.api.dto;

import com.fintechvital.api.model.CategoriaEtiqueta;

/**
 * Una categoria del catalogo tal como la consume el frontend
 * (types.ts -> Categoria) y como la fija CONTRATO_API §7.
 *
 * ⚠️ `etiqueta` es obligatoria y es lo unico que se pinta: sin ella cada
 * <option> del desplegable de categoria queda en blanco -- esta en el DOM, se
 * abre, y no se ve nada. `slug` es el valor que viaja; NUNCA se traduce.
 *
 * `tipo` va en minusculas (gasto | movimiento | ingreso), como en la base.
 * `grupo` no sale: es de uso interno del motor de reglas.
 */
public record CategoriaResponse(
        String slug,
        String etiqueta,
        String tipo
) {
    public static CategoriaResponse de(CategoriaEtiqueta categoria) {
        return new CategoriaResponse(
                categoria.getSlug(),
                categoria.getEtiqueta(),
                categoria.getTipo());
    }
}
