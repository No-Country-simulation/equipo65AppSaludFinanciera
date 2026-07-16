package com.hackathon.analisis.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Un "Controller" (Controlador) es la puerta de entrada a tu backend.
 * Se encarga de escuchar las peticiones que vienen de internet (como de Postman o React)
 * y decidir qué responder.
 */


@RestController // Le dice a Spring que esta clase manejará rutas web (endpoints) y responderá en formato JSON.
@RequestMapping("/api") // Define la ruta base. Todos los caminos de esta clase empezarán con "/api".
@CrossOrigin(origins = "*")// Permite que tu frontend (React, Angular, etc.) se conecte aquí sin bloqueos de seguridad de navegador (CORS).
public class AnalisisController {

    /**
     * @PostMapping define que este endpoint solo acepta peticiones de tipo POST.
     * La ruta completa para acceder a este método será: http://localhost:8080/api/analisis-financiero
     *
     * @RequestBody le dice a Spring que tome el JSON que enviamos en el cuerpo (Body) de Postman
     * y lo convierta automáticamente en un Mapa de Java (clave-valor) para poder leerlo.
     */

    @PostMapping("/analisis-financiero")
    public ResponseEntity<Map<String,Object>> probarAnalisis(@RequestBody Map<String,Object> request){
        // Creamos un diccionario (Map) vacío para estructurar la respuesta JSON que le daremos al cliente.
        Map<String,Object> response = new HashMap<>();

        // Agregamos datos de prueba simulando un análisis financiero exitoso
        response.put("status", "success");
        response.put("mensaje" , "¡Backend conectado con éxito en el Hackathon!");
        response.put("id_analisis", "an_550e8400"); // Permite que tu frontend (React, Angular, etc.) se conecte aquí sin bloqueos de seguridad de navegador (CORS).
        response.put("perfill_financiero", "en_observacion");
        response.put("probabilidad",0.82);

        // ResponseEntity.ok() envuelve nuestra respuesta en un protocolo HTTP estándar
        // devolviendo un código de estado "200 OK" (que significa "todo salió perfecto").

        return ResponseEntity.ok(response);
    }
}

