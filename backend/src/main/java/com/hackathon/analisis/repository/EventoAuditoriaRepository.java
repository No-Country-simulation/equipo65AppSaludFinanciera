package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.EventoAuditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EventoAuditoriaRepository extends JpaRepository<EventoAuditoria, Long> {

    Page<EventoAuditoria> findByUsuarioIdOrderByCreadoEnDesc(UUID usuarioId, Pageable pagina);
}
