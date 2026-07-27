package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.LoginRequestDTO;
import com.hackathon.analisis.dto.RegisterRequestDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getEmail() == null || request.getPassword() == null) {
            response.put("error", "Email y contraseña son requeridos");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Simulación de sesión
        Map<String, Object> usuario = new HashMap<>();
        usuario.put("email", request.getEmail());

        Map<String, Object> sesion = new HashMap<>();
        sesion.put("requiero_2fa", false);
        sesion.put("access_token", "jwt-token-de-prueba");
        sesion.put("refresh_token", "refresh-token-de-prueba");
        sesion.put("usuario", usuario);

        return ResponseEntity.ok(sesion);
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody RegisterRequestDTO request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getEmail() == null || request.getPassword() == null) {
            response.put("error", "Email y contraseña son requeridos");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        response.put("mensaje", "Usuario registrado exitosamente");
        response.put("email", request.getEmail());
        response.put("moneda", request.getMoneda());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}