package com.hackathon.analisis.service;

import com.hackathon.analisis.model.Usuario;
import com.hackathon.analisis.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class AuthService {

    // Inyectamos el repositorio para hablar con PostgreSQL
    @Autowired
    private UsuarioRepository usuarioRepository;

    public Usuario login(String email, String password) {
        // 1. Buscamos al usuario real en la base de datos
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);

        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            // 2. Verificamos si la contraseña coincide
            if (usuario.getPassword().equals(password)) {
                return usuario; // Login exitoso
            }
        }
        throw new RuntimeException("Credenciales inválidas");
    }

    public Usuario registrarUsuario(Usuario usuario) {
        // 1. Validación: checamos que el correo no esté duplicado
        Optional<Usuario> existente = usuarioRepository.findByEmail(usuario.getEmail());
        if (existente.isPresent()) {
            throw new RuntimeException("El correo ya está registrado");
        }

        // 2. ¡Esta es la línea mágica que guarda en PostgreSQL y genera el ID!
        return usuarioRepository.save(usuario);
    }
}