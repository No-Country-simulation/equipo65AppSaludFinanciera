package com.fintechvital.api.controller;

import com.fintechvital.api.dto.MonedaResponse;
import com.fintechvital.api.repository.MonedaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Catalogo de monedas (CONTRATO_API §7). Publico, como el de categorias.
 *
 * Va envuelto en `{ "monedas": [...] }` y no como lista suelta porque asi lo
 * consume el frontend y porque deja sitio a las tasas de cambio sin romper a
 * nadie el dia que se sirvan desde aqui.
 */
@RestController
@RequestMapping("/api/v1/monedas")
@Tag(name = "Catalogos")
public class MonedaController {

    private final MonedaRepository monedas;

    public MonedaController(MonedaRepository monedas) {
        this.monedas = monedas;
    }

    @GetMapping
    @Operation(summary = "Monedas soportadas")
    public ResponseEntity<Map<String, List<MonedaResponse>>> listar() {
        List<MonedaResponse> catalogo = monedas.findAllByOrderByCodigoAsc().stream()
                .map(MonedaResponse::de)
                .toList();
        return ResponseEntity.ok(Map.of("monedas", catalogo));
    }
}
