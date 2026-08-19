package com.fintechvital.api.controller;

import com.fintechvital.api.dto.CiudadResponse;
import com.fintechvital.api.service.CiudadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Catalogo de ciudades (CONTRATO_API §7). Publico como el de monedas: el
 * formulario de REGISTRO lo necesita y ahi todavia no hay token.
 *
 * Va envuelto en `{ "ciudades": [...] }` por coherencia con `/monedas` y
 * `/categorias`.
 */
@RestController
@RequestMapping("/api/v1/ciudades")
@Tag(name = "Catalogos")
public class CiudadController {

    private final CiudadService ciudades;

    public CiudadController(CiudadService ciudades) {
        this.ciudades = ciudades;
    }

    @GetMapping
    @Operation(summary = "Ciudades del catalogo (para el alta de usuario)")
    public ResponseEntity<Map<String, List<CiudadResponse>>> listar() {
        List<CiudadResponse> catalogo = ciudades.catalogo().stream()
                .map(CiudadResponse::de)
                .toList();
        return ResponseEntity.ok(Map.of("ciudades", catalogo));
    }
}
