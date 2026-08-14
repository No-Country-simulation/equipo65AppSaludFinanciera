package com.fintechvital.api.controller;

import com.fintechvital.api.dto.AltaTarjetaRequest;
import com.fintechvital.api.dto.CuentaResponse;
import com.fintechvital.api.dto.SaludCrediticiaResponse;
import com.fintechvital.api.dto.TarjetaResponse;
import com.fintechvital.api.service.BancaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Productos bancarios (ENDPOINTS.md prioridad 2 - Banca).
 *
 * Tres recursos que la interfaz ya consume: `/cuentas`, `/tarjetas` y
 * `/buro/salud`. Todos exigen token y filtran por el usuario que va en el (RN9);
 * ninguno recibe un usuario por parametro.
 *
 * Cuentas y buro son de solo lectura -- esos datos los pone el banco. Solo las
 * tarjetas se administran desde la app.
 */
@RestController
@RequestMapping("/api/v1")
public class BancaController {

    private final BancaService banca;

    public BancaController(BancaService banca) {
        this.banca = banca;
    }

    @GetMapping("/cuentas")
    public ResponseEntity<List<CuentaResponse>> cuentas() {
        return ResponseEntity.ok(banca.cuentas());
    }

    @GetMapping("/tarjetas")
    public ResponseEntity<List<TarjetaResponse>> tarjetas() {
        return ResponseEntity.ok(banca.tarjetas());
    }

    @PostMapping("/tarjetas")
    public ResponseEntity<TarjetaResponse> crearTarjeta(@Valid @RequestBody AltaTarjetaRequest alta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(banca.crear(alta));
    }

    @PatchMapping("/tarjetas/{id}")
    public ResponseEntity<TarjetaResponse> actualizarTarjeta(
            @PathVariable UUID id,
            @Valid @RequestBody AltaTarjetaRequest cambios) {
        return ResponseEntity.ok(banca.actualizar(id, cambios));
    }

    @DeleteMapping("/tarjetas/{id}")
    public ResponseEntity<Void> eliminarTarjeta(@PathVariable UUID id) {
        banca.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/buro/salud")
    public ResponseEntity<SaludCrediticiaResponse> saludCrediticia() {
        return ResponseEntity.ok(banca.saludCrediticia());
    }
}
