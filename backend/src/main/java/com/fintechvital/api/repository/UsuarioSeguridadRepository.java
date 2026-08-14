package com.fintechvital.api.repository;

import com.fintechvital.api.model.UsuarioSeguridad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioSeguridadRepository extends JpaRepository<UsuarioSeguridad, UUID> {
    Optional<UsuarioSeguridad> findByUsuarioId(UUID usuarioId);
}
