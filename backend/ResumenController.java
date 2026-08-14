package com.hackathon.analisis.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/v1/resumen")
public class ResumenController {

    // Responde a: GET /api/v1/resumen/comparacion
    @GetMapping("/comparacion")
    public ResponseEntity<?> obtenerComparacion() {

        // TODO: Implementar lógica de comparación
        return ResponseEntity.ok(Map.of(
                "ingresos", 0,
                "gastos", 0
        ));
    }
}