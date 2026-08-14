package com.fintechvital.api.controller;

import com.fintechvital.api.dto.AnalisisFinancieroResponse;
import com.fintechvital.api.dto.EvolucionResponse;
import com.fintechvital.api.dto.ResumenAnalisisResponse;
import com.fintechvital.api.service.AnalisisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Analisis persistido del usuario (CONTRATO_API §6). Exige token; RN9.
 *
 * ⚠️ No confundir con `POST /api/v1/analisis-financiero`
 * ({@link AnalisisFinancieroController}), que es el del enunciado: publico, sin
 * usuario y sin guardar nada. Este trabaja con los movimientos que la persona
 * ya tiene cargados y deja una foto en la base.
 */
@RestController
@RequestMapping("/api/v1/analisis")
@Tag(name = "Analisis")
public class AnalisisController {

    private final AnalisisService analisis;

    public AnalisisController(AnalisisService analisis) {
        this.analisis = analisis;
    }

    @PostMapping
    @Operation(summary = "Analiza los movimientos del usuario y guarda el resultado")
    public ResponseEntity<AnalisisFinancieroResponse> ejecutar(@RequestBody(required = false) Rango rango) {
        LocalDate desde = rango == null ? null : rango.desde();
        LocalDate hasta = rango == null ? null : rango.hasta();
        return ResponseEntity.status(HttpStatus.CREATED).body(analisis.ejecutar(desde, hasta));
    }

    @GetMapping
    @Operation(summary = "Historial de analisis (resumen)")
    public ResponseEntity<List<ResumenAnalisisResponse>> historial(
            @RequestParam(required = false) Integer pagina,
            @RequestParam(required = false) Integer tam) {
        return ResponseEntity.ok(analisis.historial(pagina, tam));
    }

    /**
     * ⚠️ Va declarado ANTES que `/{id}`: si no, Spring intentaria interpretar
     * "evolucion" como un UUID y responderia 400 en vez de la serie temporal.
     */
    @GetMapping("/evolucion")
    @Operation(summary = "Serie temporal para el grafico de evolucion")
    public ResponseEntity<EvolucionResponse> evolucion(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(analisis.evolucion(desde, hasta));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Un analisis completo (foto inmutable, RN1)")
    public ResponseEntity<AnalisisFinancieroResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(analisis.obtener(id));
    }

    public record Rango(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {}
}
