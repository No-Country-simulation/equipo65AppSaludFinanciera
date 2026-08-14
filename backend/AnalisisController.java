package com.hackathon.analisis.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analisis")
public class AnalisisController {

    // El frontend espera una LISTA PLANA para el historial, no un objeto
    @GetMapping
    public ResponseEntity<?> obtenerAnalisisPaginado(
            @RequestParam(defaultValue = "1") int pagina,
            @RequestParam(defaultValue = "10") int tam) {
        return ResponseEntity.ok(new ArrayList<>());
    }

    @GetMapping("/evolucion")
    public ResponseEntity<?> obtenerEvolucion() {
        return ResponseEntity.ok(Map.of("puntos", new ArrayList<>()));
    }

    @GetMapping("/comparacion")
    public ResponseEntity<?> obtenerComparacion() {
        return ResponseEntity.ok(Map.of("datos", new ArrayList<>()));
    }
}