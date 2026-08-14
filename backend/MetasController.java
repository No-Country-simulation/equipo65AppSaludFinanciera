package com.hackathon.analisis.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;


@RestController
@RequestMapping("/api/v1/metas")
public class MetasController {

    // Responde a: GET /api/v1/metas
    @GetMapping
    public ResponseEntity<?> obtenerMetas() {

        // Devuelve una lista vacía para que el frontend no falle
        return ResponseEntity.ok(new ArrayList<>());
    }
}