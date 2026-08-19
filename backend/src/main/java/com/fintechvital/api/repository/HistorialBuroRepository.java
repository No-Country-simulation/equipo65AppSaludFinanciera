package com.fintechvital.api.repository;

import com.fintechvital.api.model.HistorialBuro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HistorialBuroRepository extends JpaRepository<HistorialBuro, UUID> {

    /**
     * Toda la serie, en orden cronologico ASCENDENTE, que es como la espera el
     * grafico del frontend. El ultimo elemento es el registro vigente, asi que
     * no hace falta consultar ademas vw_buro_vigente.
     */
    List<HistorialBuro> findByUsuarioIdOrderByConsultadoEnAsc(UUID usuarioId);

    /**
     * La consulta de un dia concreto, si la hay.
     *
     * La tabla tiene UNIQUE (usuario_id, consultado_en): un usuario no puede
     * tener dos consultas el mismo dia. Sin mirar antes, el simulador reventaba
     * con un 500 la segunda vez que se pulsaba en la misma jornada.
     */
    Optional<HistorialBuro> findByUsuarioIdAndConsultadoEn(UUID usuarioId, LocalDate consultadoEn);
}
