package com.hackathon.analisis.service;

import com.hackathon.analisis.model.Usuario;
import com.hackathon.analisis.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    // Método para crear una cuenta (Registro)
    public Usuario registrarUsuario(Usuario usuario) {
        // Validación básica: checar si el correo ya existe
        Optional<Usuario> existente = usuarioRepository.findByEmail(usuario.getEmail());
        if (existente.isPresent()) {
            throw new RuntimeException("El correo ya está registrado");
        }

        // ¡Aquí en el futuro agregaremos la encriptación de la contraseña!

        return usuarioRepository.save(usuario);
    }

    // Método para buscar el usuario por correo (Login)
    public Optional<Usuario> buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email);
    }
}