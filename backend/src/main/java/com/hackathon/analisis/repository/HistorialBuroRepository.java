package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.HistorialBuro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HistorialBuroRepository extends JpaRepository<HistorialBuro, UUID> {

    /**
     * Toda la serie, en orden cronologico ASCENDENTE, que es como la espera el
     * grafico del frontend. El ultimo elemento es el registro vigente, asi que
     * no hace falta consultar ademas vw_buro_vigente.
     */
    List<HistorialBuro> findByUsuarioIdOrderByConsultadoEnAsc(UUID usuarioId);
}
