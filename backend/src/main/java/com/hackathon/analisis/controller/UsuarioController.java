package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.PatchUsuarioRequest;
import com.hackathon.analisis.dto.UsuarioResponse;
import com.hackathon.analisis.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Perfil del usuario autenticado (CONTRATO_API §4).
 *
 * Sustituye al antiguo UserController, que devolvia un usuario ESCRITO A MANO
 * en el propio controlador ("usuario@ejemplo.com", 1500.00, ...) y cuyo PUT
 * devolvia lo que le mandaran sin guardarlo.
 *
 * Nunca recibe un id por parametro: siempre sale del token (RN9).
 */
@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioController {

    private final UsuarioService usuarios;

    public UsuarioController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioResponse> me() {
        return ResponseEntity.ok(usuarios.perfilActual());
    }

    @PatchMapping("/me")
    public ResponseEntity<UsuarioResponse> actualizar(@Valid @RequestBody PatchUsuarioRequest cambios) {
        return ResponseEntity.ok(usuarios.actualizarPerfil(cambios));
    }
}
