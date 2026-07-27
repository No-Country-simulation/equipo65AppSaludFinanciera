package com.hackathon.analisis.service;

import com.hackathon.analisis.dto.LoginRequestDTO;
import com.hackathon.analisis.dto.RegisterRequestDTO;
import com.hackathon.analisis.model.Usuario;
import com.hackathon.analisis.model.UsuarioSeguridad;
import com.hackathon.analisis.repository.UsuarioRepository;
import com.hackathon.analisis.repository.UsuarioSeguridadRepository;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioSeguridadRepository usuarioSeguridadRepository;

    public AuthService(UsuarioRepository usuarioRepository, UsuarioSeguridadRepository usuarioSeguridadRepository) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioSeguridadRepository = usuarioSeguridadRepository;
    }

    @Transactional
    public Map<String, Object> registrarUsuario(RegisterRequestDTO request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(request.getEmail());
        usuario.setNombre("Usuario");
        usuario.setApellido("Nuevo");
        if (request.getMoneda() != null) {
            usuario.setMonedaPrincipal(request.getMoneda());
        }

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        UsuarioSeguridad seguridad = new UsuarioSeguridad();
        seguridad.setUsuario(usuarioGuardado);
        seguridad.setPasswordHash(request.getPassword()); // En producción usar BCrypt
        usuarioSeguridadRepository.save(seguridad);

        Map<String, Object> response = new HashMap<>();
        response.put("mensaje", "Usuario registrado correctamente");
        response.put("idUsuario", usuarioGuardado.getIdUsuario());
        return response;
    }

    public Map<String, Object> loginUsuario(LoginRequestDTO request) {
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Credenciales inválidas"));

        UsuarioSeguridad seguridad = usuarioSeguridadRepository.findById(usuario.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Credenciales inválidas"));

        if (!seguridad.getPasswordHash().equals(request.getPassword())) {
            throw new RuntimeException("Credenciales inválidas");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("mensaje", "Inicio de sesión exitoso");
        response.put("idUsuario", usuario.getIdUsuario());
        response.put("email", usuario.getEmail());
        return response;
    }
}