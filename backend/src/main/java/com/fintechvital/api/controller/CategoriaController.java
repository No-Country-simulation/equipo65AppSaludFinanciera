package com.fintechvital.api.controller;

import com.fintechvital.api.dto.CategoriaResponse;
import com.fintechvital.api.service.CategoriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Catalogo de categorias (CONTRATO_API §7).
 *
 * Publico, sin token: es catalogo, no dato personal, y la pantalla de alta lo
 * necesita antes de que nadie inicie sesion.
 */
@RestController
@RequestMapping("/api/v1/categorias")
@Tag(name = "Catalogos")
public class CategoriaController {

    private final CategoriaService categorias;

    public CategoriaController(CategoriaService categorias) {
        this.categorias = categorias;
    }

    @GetMapping
    @Operation(summary = "Las categorias activas con su etiqueta traducida",
               description = "El idioma sale de Accept-Language (es | pt | en; es por defecto). "
                           + "Los slugs no se traducen; las etiquetas si.")
    public ResponseEntity<List<CategoriaResponse>> listar() {
        return ResponseEntity.ok(categorias.catalogo());
    }
}
