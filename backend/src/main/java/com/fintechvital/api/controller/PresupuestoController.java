package com.fintechvital.api.controller;

import com.fintechvital.api.dto.PresupuestoResponse;
import com.fintechvital.api.service.PresupuestoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Presupuestos mensuales por categoria. Feature de producto (extiende el
 * contrato); exige token y filtra por el usuario que va en el (RN9).
 *
 * La categoria es la clave del recurso, por eso el borrado va por slug y no por
 * un id: para el usuario no hay un "presupuesto 7", hay "lo que me dejo gastar
 * en transporte".
 */
@RestController
@RequestMapping("/api/v1/presupuestos")
@Tag(name = "Presupuestos")
public class PresupuestoController {

    private final PresupuestoService presupuestos;

    public PresupuestoController(PresupuestoService presupuestos) {
        this.presupuestos = presupuestos;
    }

    @GetMapping
    @Operation(summary = "Presupuestos del usuario con lo gastado del mes en curso")
    public ResponseEntity<List<PresupuestoResponse>> listar() {
        return ResponseEntity.ok(presupuestos.listar());
    }

    @PostMapping
    @Operation(summary = "Fija o cambia el limite de una categoria")
    public ResponseEntity<PresupuestoResponse> guardar(@RequestBody Alta alta) {
        return ResponseEntity.ok(presupuestos.guardar(alta.categoria(), alta.limite()));
    }

    @DeleteMapping("/{categoria}")
    @Operation(summary = "Quita el presupuesto de una categoria")
    public ResponseEntity<Void> eliminar(@PathVariable String categoria) {
        presupuestos.eliminar(categoria);
        return ResponseEntity.noContent().build();
    }

    public record Alta(String categoria, BigDecimal limite) {}
}
