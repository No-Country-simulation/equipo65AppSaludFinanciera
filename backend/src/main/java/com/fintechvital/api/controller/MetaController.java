package com.fintechvital.api.controller;

import com.fintechvital.api.dto.MetaDtos;
import com.fintechvital.api.service.MetaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Metas de ahorro. Feature de producto (extiende el contrato); exige token y
 * filtra por el usuario que va en el (RN9).
 */
@RestController
@RequestMapping("/api/v1/metas")
@Tag(name = "Metas")
public class MetaController {

    private final MetaService metas;

    public MetaController(MetaService metas) {
        this.metas = metas;
    }

    @GetMapping
    @Operation(summary = "Metas de ahorro del usuario, con lo ahorrado hasta hoy")
    public ResponseEntity<List<MetaDtos.Respuesta>> listar() {
        return ResponseEntity.ok(metas.listar());
    }

    @PostMapping
    @Operation(summary = "Crea una meta")
    public ResponseEntity<MetaDtos.Respuesta> crear(@Valid @RequestBody MetaDtos.Alta alta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(metas.crear(alta));
    }

    @PostMapping("/{id}/aportes")
    @Operation(summary = "Registra un aporte a la meta")
    public ResponseEntity<MetaDtos.Respuesta> aportar(
            @PathVariable UUID id, @Valid @RequestBody MetaDtos.Aporte aporte) {
        return ResponseEntity.ok(metas.aportar(id, aporte.monto()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Borra una meta y sus aportes")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        metas.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
