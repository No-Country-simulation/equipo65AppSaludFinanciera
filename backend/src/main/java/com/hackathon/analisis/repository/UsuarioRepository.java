package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository; // <-- Importante

import java.util.Optional;

@Repository // <-- Esta anotación es la que le avisa a Spring que este repositorio existe
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
}