package com.hackathon.analisis.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Estado del servicio (CONTRATO_API §7). Publico.
 *
 * Lo consumen el healthcheck del contenedor, el tunel y las pruebas de humo.
 * Comprueba de verdad la base de datos: un "estoy vivo" que no toca sus
 * dependencias miente justo cuando mas importa - el proceso responde pero la
 * aplicacion no puede hacer nada.
 */
@RestController
@RequestMapping("/api/v1")
public class SaludController {

    private final JdbcTemplate jdbc;
    private final String version;

    public SaludController(JdbcTemplate jdbc,
                           @Value("${fv.version:0.4.0}") String version) {
        this.jdbc = jdbc;
        this.version = version;
    }

    @GetMapping("/salud")
    public Map<String, Object> salud() {
        Map<String, Object> bd = new LinkedHashMap<>();
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            bd.put("estado", "ok");
        } catch (Exception e) {
            bd.put("estado", "caido");
            bd.put("detalle", e.getClass().getSimpleName());
        }

        Map<String, Object> ml = new LinkedHashMap<>();
        // El servicio de inferencia todavia no existe. Se declara asi en vez de
        // omitirlo: quien lea /salud tiene que ver que falta una pieza.
        ml.put("estado", "no_configurado");
        ml.put("modelo_version", null);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", "ok".equals(bd.get("estado")) ? "ok" : "degradado");
        respuesta.put("version", version);
        respuesta.put("bd", bd);
        respuesta.put("ml", ml);
        return respuesta;
    }
}
