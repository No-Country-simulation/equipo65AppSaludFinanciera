package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.UserProfileDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuario")
@CrossOrigin(origins = "*")
public class UserController {

    @GetMapping("/perfil")
    public ResponseEntity<UserProfileDTO> obtenerPerfil() {
        UserProfileDTO perfil = new UserProfileDTO(
                "usuario@ejemplo.com",
                1500.00,
                200.00,
                "media",
                "USD"
        );
        return ResponseEntity.ok(perfil);
    }

    @PutMapping("/perfil")
    public ResponseEntity<UserProfileDTO> actualizarPerfil(@RequestBody UserProfileDTO perfilDTO) {
        return ResponseEntity.ok(perfilDTO);
    }
}