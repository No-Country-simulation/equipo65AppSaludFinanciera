package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.PresupuestoResponse;
import com.hackathon.analisis.service.PresupuestoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
@RequestMapping("/api/v1/presupuestos")
public class PresupuestoController {

    private final PresupuestoService service;

    public PresupuestoController(PresupuestoService service) {
        this.service = service;
    }

    @GetMapping
    public List<PresupuestoResponse> listar() {
        return service.obtenerMisPresupuestos();
    }
}