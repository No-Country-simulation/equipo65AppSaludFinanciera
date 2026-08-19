package com.fintechvital.api.controller;

import com.fintechvital.api.model.HistorialBuro;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/buro")
public class BuroController {

    @PersistenceContext
    private EntityManager entityManager;

    @PostMapping("/simular")
    @Transactional
    public ResponseEntity<?> simularBuro(@RequestBody Map<String, Object> payload) {
        try {
            HistorialBuro buro = new HistorialBuro();

            // El frontend (React) nos va a mandar estos datos desde el formulario
            buro.setUsuarioId(UUID.fromString(payload.get("usuarioId").toString()));
            buro.setScoreCrediticio(Short.parseShort(payload.get("score").toString()));
            buro.setDiasAtraso(Integer.parseInt(payload.get("atraso").toString()));
            buro.setMontoAdeudado(new BigDecimal(payload.get("deuda").toString()));
            buro.setMoneda(payload.getOrDefault("moneda", "MXN").toString());
            buro.setConsultadoEn(LocalDate.now());

            // Guardamos en la base de datos
            entityManager.persist(buro);

            return ResponseEntity.ok(Map.of("mensaje", "Historial simulado correctamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Faltan datos o son inválidos: " + e.getMessage()));
        }
    }
}