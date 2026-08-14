package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.Activar2faRequest;
import com.hackathon.analisis.dto.CodigosRespaldoResponse;
import com.hackathon.analisis.dto.Iniciar2faResponse;
import com.hackathon.analisis.dto.PasswordRequest;
import com.hackathon.analisis.service.DosFactoresService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Verificacion en dos pasos (CONTRATO_API - ENDPOINTS.md prioridad 4).
 *
 * Las cuatro rutas van bajo /auth pero TODAS exigen token: para configurar el
 * segundo factor ya hay que haber pasado el primero. Estan declaradas como
 * autenticadas en SecurityConfig, antes del `permitAll` de /auth/**.
 *
 * El QR lo pinta el frontend, que ya tiene su propio codificador; aqui solo se
 * entrega el `otpauth_uri`.
 */
@RestController
@RequestMapping("/api/v1/auth/2fa")
public class DosFactoresController {

    private final DosFactoresService dosFactores;

    public DosFactoresController(DosFactoresService dosFactores) {
        this.dosFactores = dosFactores;
    }

    @PostMapping("/iniciar")
    public ResponseEntity<Iniciar2faResponse> iniciar() {
        return ResponseEntity.ok(dosFactores.iniciar());
    }

    @PostMapping("/activar")
    public ResponseEntity<CodigosRespaldoResponse> activar(
            @Valid @RequestBody Activar2faRequest peticion,
            HttpServletRequest http) {
        return ResponseEntity.ok(dosFactores.activar(peticion.codigoTotp(), http));
    }

    @PostMapping("/codigos-respaldo")
    public ResponseEntity<CodigosRespaldoResponse> regenerarCodigos() {
        return ResponseEntity.ok(dosFactores.regenerarCodigosRespaldo());
    }

    /**
     * Se conserva por contrato aunque la interfaz ya no lo ofrezca: ADR-0013
     * hace el 2FA obligatorio, pero quitar el endpoint dejaria sin salida a una
     * cuenta que quedara en un estado raro.
     */
    @DeleteMapping
    public ResponseEntity<Void> desactivar(@Valid @RequestBody PasswordRequest peticion,
                                           HttpServletRequest http) {
        dosFactores.desactivar(peticion.password(), http);
        return ResponseEntity.noContent().build();
    }
}
