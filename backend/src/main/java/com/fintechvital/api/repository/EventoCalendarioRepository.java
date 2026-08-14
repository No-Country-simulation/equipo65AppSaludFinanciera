package com.fintechvital.api.repository;

import com.fintechvital.api.model.EventoCalendario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventoCalendarioRepository extends JpaRepository<EventoCalendario, UUID> {

    List<EventoCalendario> findByUsuarioIdOrderByFechaAsc(UUID usuarioId);

    /** Por (id, usuario) en la misma consulta: asi no queda ningun camino sin comprobar (RN9). */
    Optional<EventoCalendario> findByIdAndUsuarioId(UUID id, UUID usuarioId);
}
