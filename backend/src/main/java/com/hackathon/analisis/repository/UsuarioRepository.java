package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Spring Boot crea automáticamente el "SELECT * FROM usuarios WHERE email = ?"
    Optional<Usuario> findByEmail(String email);

}