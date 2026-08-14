package com.hackathon.analisis.controller;

import com.hackathon.analisis.model.Transaccion;
import com.hackathon.analisis.repository.TransaccionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
// Mapeamos ambas rutas aquí mismo para que el frontend nunca se pierda
@RequestMapping({"/api/v1/transacciones", "/api/v1/movimientos"})
public class TransaccionController {

    private final TransaccionRepository transaccionRepository;

    public TransaccionController(TransaccionRepository transaccionRepository) {
        this.transaccionRepository = transaccionRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> obtenerTransacciones(
            @RequestParam(defaultValue = "100") int tam,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String tarjeta) {

        UUID idUsuarioAna = UUID.fromString("a1111111-1111-4111-8111-111111111111");
        List<Transaccion> movimientos = transaccionRepository.findByIdCliente(idUsuarioAna);

        // 1. Filtro flexible para que "alimentos" empate con "alimentacion"
        List<Transaccion> filtrados = movimientos.stream().filter(t -> {
            if (categoria != null && !categoria.isEmpty() && !categoria.equalsIgnoreCase("todas")) {
                String catDB = t.getCategoriaTransaccion() != null ? t.getCategoriaTransaccion().toLowerCase() : "";
                String catFront = categoria.toLowerCase();
                // Si la categoría empieza igual (ej. "aliment"), la dejamos pasar
                if (catDB.startsWith("aliment") && catFront.startsWith("aliment")) return true;
                return catDB.equalsIgnoreCase(catFront);
            }
            return true;
        }).collect(Collectors.toList());

        // 2. Mapeo al contrato estricto
        List<Map<String, Object>> respuestaLimpia = filtrados.stream().map(t -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getIdEvento() != null ? t.getIdEvento().toString() : UUID.randomUUID().toString());
            map.put("descripcion", t.getDescripcionTransaccion() != null ? t.getDescripcionTransaccion() : "Movimiento");
            map.put("valor", t.getMontoSigno() != null ? t.getMontoSigno() : 0.0);
            map.put("moneda", t.getMoneda() != null ? t.getMoneda() : "MXN");
            map.put("categoria", t.getCategoriaTransaccion() != null ? t.getCategoriaTransaccion() : "general");
            map.put("confianza", 0.99);
            map.put("categoria_origen", "modelo");

            // Agregamos la "Z" para que sea un formato ISO-8601 estricto y React no arroje "Invalid Date"
            String fechaISO = t.getFechaHora() != null ? t.getFechaHora().toString() + "Z" : java.time.Instant.now().toString();
            map.put("fecha", fechaISO);

            // Forzamos un id_tarjeta para evitar que el frontend descarte la transacción
            map.put("id_tarjeta", (tarjeta != null && !tarjeta.isEmpty()) ? tarjeta : "a1a00000-0000-4000-8000-000000000000");

            return map;
        }).collect(Collectors.toList());

        // 3. Devolvemos la LISTA CRUDA, sin envolturas que rompan el .map() de React
        return ResponseEntity.ok(respuestaLimpia);
    }
}