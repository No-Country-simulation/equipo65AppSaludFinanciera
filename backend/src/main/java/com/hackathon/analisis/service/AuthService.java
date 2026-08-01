package com.hackathon.analisis.service;

import com.hackathon.analisis.model.Usuario;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public Usuario login(String email, String password) {
        // Validación simulada temporal para que la hackathon avance
        if ("test@test.com".equals(email) && "123456".equals(password)) {
            Usuario u = new Usuario();
            u.setEmail(email);
            return u;
        }
        throw new RuntimeException("Credenciales inválidas");
    }

    public Usuario registrarUsuario(Usuario usuario) {
        // Simula el registro exitoso devolviendo el mismo usuario
        return usuario;
    }
}