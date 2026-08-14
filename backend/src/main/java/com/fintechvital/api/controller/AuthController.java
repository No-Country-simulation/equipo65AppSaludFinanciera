package com.fintechvital.api.controller;

import com.fintechvital.api.dto.*;
import com.fintechvital.api.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Autenticacion (CONTRATO_API §4).
 *
 * Cambios respecto a la version anterior:
 *  - Cuelga de /api/v1, como el contrato y como lo llama el frontend.
 *  - Recibe DTOs validados, no la entidad Usuario.
 *  - Devuelve DTOs. Antes devolvia la entidad, que tenia un campo `password`:
 *    la API respondia con la contrasena del usuario.
 *  - Los errores los traduce ManejadorErrores a la forma del contrato, en vez
 *    de un `badRequest().body(e.getMessage())` con un String suelto.
 *
 * Se mantiene un alias en /api/auth para no romper lo que ya apuntaba ahi
 * mientras se termina de migrar.
 */
@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping({"/registro", "/register"})
    public ResponseEntity<UsuarioResponse> registro(@Valid @RequestBody RegistroRequest peticion) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registrar(peticion));
    }

    /**
     * Recibe el HttpServletRequest para poder registrar la IP y el agente en
     * `intento_login` y en la auditoria: sin eso no hay forma de aplicar el
     * bloqueo por fuerza bruta ni de investigar un acceso raro despues.
     */
    @PostMapping("/login")
    public ResponseEntity<SesionResponse> login(@Valid @RequestBody LoginRequest peticion,
                                                HttpServletRequest http) {
        return ResponseEntity.ok(auth.login(peticion, http));
    }

    @PostMapping("/refresh")
    public ResponseEntity<SesionResponse> refresh(@Valid @RequestBody RefreshRequest peticion) {
        return ResponseEntity.ok(auth.refrescar(peticion.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshRequest peticion) {
        auth.logout(peticion == null ? null : peticion.refreshToken());
        return ResponseEntity.noContent().build();
    }
}
