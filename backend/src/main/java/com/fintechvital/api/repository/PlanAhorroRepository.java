package com.fintechvital.api.repository;

import com.fintechvital.api.model.PlanAhorro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlanAhorroRepository extends JpaRepository<PlanAhorro, UUID> {

    List<PlanAhorro> findByUsuarioIdOrderByCreadoEnAsc(UUID usuarioId);

    /** Por (id, usuario) en la misma consulta: RN9 sin caminos sin comprobar. */
    Optional<PlanAhorro> findByIdAndUsuarioId(UUID id, UUID usuarioId);
}
