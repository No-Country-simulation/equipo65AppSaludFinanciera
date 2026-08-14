package com.fintechvital.api.controller;

import com.fintechvital.api.service.ClienteMlService;
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
 * Comprueba de verdad sus dos dependencias -- la base y el servicio de
 * inferencia -- porque un "estoy vivo" que no las toca miente justo cuando mas
 * importa: el proceso responde y la aplicacion no puede hacer nada.
 *
 * El estado global es `ok` solo si las dos responden. Con el ML caido la API
 * sigue sirviendo lo que ya esta guardado, pero no puede clasificar ni
 * diagnosticar, asi que se reporta `degradado` y no `ok`.
 */
@RestController
@RequestMapping("/api/v1")
public class SaludController {

    private final JdbcTemplate jdbc;
    private final ClienteMlService ml;
    private final String version;

    public SaludController(JdbcTemplate jdbc,
                           ClienteMlService ml,
                           @Value("${fv.version:0.4.0}") String version) {
        this.jdbc = jdbc;
        this.ml = ml;
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

        ClienteMlService.SaludMl inferencia = ml.salud();
        Map<String, Object> mlEstado = new LinkedHashMap<>();
        mlEstado.put("estado", inferencia.estado());
        mlEstado.put("modelo_version", inferencia.modeloVersion());
        if (inferencia.detalle() != null) mlEstado.put("detalle", inferencia.detalle());

        boolean todoOk = "ok".equals(bd.get("estado")) && "ok".equals(inferencia.estado());

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("estado", todoOk ? "ok" : "degradado");
        respuesta.put("version", version);
        respuesta.put("bd", bd);
        respuesta.put("ml", mlEstado);
        return respuesta;
    }
}
