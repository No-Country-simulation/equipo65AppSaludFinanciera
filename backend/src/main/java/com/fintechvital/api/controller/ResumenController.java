package com.fintechvital.api.controller;

import com.fintechvital.api.dto.ComparacionMensualResponse;
import com.fintechvital.api.service.ResumenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Agregados del Panel. Exige token; filtra por el usuario del token (RN9). */
@RestController
@RequestMapping("/api/v1/resumen")
@Tag(name = "Resumen")
public class ResumenController {

    private final ResumenService resumen;

    public ResumenController(ResumenService resumen) {
        this.resumen = resumen;
    }

    @GetMapping("/comparacion")
    @Operation(summary = "Mes en curso contra el mes anterior")
    public ResponseEntity<ComparacionMensualResponse> comparacion() {
        return ResponseEntity.ok(resumen.comparacion());
    }
}
