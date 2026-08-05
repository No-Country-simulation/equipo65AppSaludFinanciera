package com.hackathon.analisis.controller;

import com.hackathon.analisis.model.Usuario;
import com.hackathon.analisis.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Usuario request) {
        try {
            Usuario usuario = authService.login(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(usuario);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/registro") // <--- Solo cambiamos esta palabra al español
    public ResponseEntity<?> registrar(@RequestBody Usuario request) {
        try {
            Usuario usuario = authService.registrarUsuario(request);
            return ResponseEntity.ok(usuario);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}