package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Presupuesto;
import com.hackathon.analisis.model.PresupuestoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PresupuestoRepository extends JpaRepository<Presupuesto, PresupuestoId> {

    // Spring crea el "SELECT * FROM presupuesto WHERE usuario_id = ?" automáticamente
    List<Presupuesto> findByUsuarioId(UUID usuarioId);
}