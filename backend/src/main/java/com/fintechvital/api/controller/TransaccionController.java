package com.fintechvital.api.controller;

import com.fintechvital.api.dto.TransaccionDtos;
import com.fintechvital.api.dto.TransaccionResponse;
import com.fintechvital.api.service.TransaccionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Movimientos del usuario (CONTRATO_API §5). Todo exige token y filtra por el
 * usuario que va en el (RN9).
 *
 * Responde tambien en `/movimientos` porque es como se llama la pantalla y
 * varias partes de la interfaz enlazan ahi; es el mismo recurso.
 */
@RestController
@RequestMapping({"/api/v1/transacciones", "/api/v1/movimientos"})
@Tag(name = "Transacciones")
public class TransaccionController {

    private final TransaccionService transacciones;

    public TransaccionController(TransaccionService transacciones) {
        this.transacciones = transacciones;
    }

    @GetMapping
    @Operation(summary = "Lista paginada de movimientos, con filtros")
    public ResponseEntity<TransaccionDtos.Pagina> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String tarjeta,
            @RequestParam(required = false) Integer pagina,
            @RequestParam(required = false) Integer tam) {
        return ResponseEntity.ok(
                transacciones.listar(desde, hasta, categoria, tarjeta, pagina, tam));
    }

    @PostMapping
    @Operation(summary = "Alta manual",
               description = "Si no se manda `categoria`, clasifica el modelo. Si se manda, "
                           + "queda como correccion de la persona (categoria_origen = usuario).")
    public ResponseEntity<TransaccionResponse> crear(@Valid @RequestBody TransaccionDtos.Alta alta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transacciones.crear(alta));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Corrige la categoria de un movimiento (RN3)")
    public ResponseEntity<TransaccionResponse> corregir(
            @PathVariable UUID id,
            @Valid @RequestBody TransaccionDtos.Correccion correccion) {
        return ResponseEntity.ok(transacciones.corregirCategoria(id, correccion.categoria()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Borra un movimiento")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        transacciones.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/importar", consumes = "multipart/form-data")
    @Operation(summary = "Importa un extracto en CSV",
               description = "Cabecera obligatoria `fecha,descripcion,valor[,moneda]`. "
                           + "Import parcial: las filas validas entran y las rotas se reportan.")
    public ResponseEntity<TransaccionDtos.ResultadoImport> importar(
            @RequestParam("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(transacciones.importar(archivo));
    }
}
