package com.fintechvital.api.repository;

import com.fintechvital.api.model.PresupuestoId;
import com.fintechvital.api.model.PresupuestoUso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PresupuestoUsoRepository extends JpaRepository<PresupuestoUso, PresupuestoId> {

    List<PresupuestoUso> findByUsuarioIdOrderByCategoriaSlugAsc(UUID usuarioId);
}
