package com.fintechvital.api.controller;

import com.fintechvital.api.dto.EventoDtos;
import com.fintechvital.api.service.EventoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Calendario de Movimientos (CONTRATO_API §6.1). Exige token; filtra por RN9.
 */
@RestController
@RequestMapping("/api/v1/eventos")
@Tag(name = "Eventos")
public class EventoController {

    private final EventoService eventos;

    public EventoController(EventoService eventos) {
        this.eventos = eventos;
    }

    @GetMapping
    @Operation(summary = "Eventos del calendario del usuario")
    public ResponseEntity<List<EventoDtos.Respuesta>> listar() {
        return ResponseEntity.ok(eventos.listar());
    }

    @PostMapping
    @Operation(summary = "Crea un evento")
    public ResponseEntity<EventoDtos.Respuesta> crear(@Valid @RequestBody EventoDtos.Alta alta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventos.crear(alta));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Edita un evento")
    public ResponseEntity<EventoDtos.Respuesta> actualizar(
            @PathVariable UUID id, @Valid @RequestBody EventoDtos.Alta cambios) {
        return ResponseEntity.ok(eventos.actualizar(id, cambios));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Borra un evento")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        eventos.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
