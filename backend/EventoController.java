package com.hackathon.analisis.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;

@RestController
@RequestMapping("/api/v1/eventos")
public class EventoController {

    @GetMapping
    public ResponseEntity<?> obtenerEventos() {
        // Devuelve una lista vacía para que el frontend se quede tranquilo
        return ResponseEntity.ok(new ArrayList<>());
    }
}