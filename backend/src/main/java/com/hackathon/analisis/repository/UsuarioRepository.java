package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    /** El email se guarda SIEMPRE en minusculas (lo garantiza un CHECK en la BD). */
    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);
}
