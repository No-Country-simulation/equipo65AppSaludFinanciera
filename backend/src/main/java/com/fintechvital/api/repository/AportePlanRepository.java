package com.fintechvital.api.repository;

import com.fintechvital.api.model.AportePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface AportePlanRepository extends JpaRepository<AportePlan, Long> {

    /**
     * Lo ahorrado de cada meta del usuario, en UNA consulta.
     *
     * Se hace agrupado y no meta por meta para no repetir un SELECT por fila de
     * la lista (el N+1 clasico): con 10 metas serian 11 viajes a la base para
     * pintar una pantalla.
     */
    @Query("""
            SELECT a.planId, COALESCE(SUM(a.monto), 0)
              FROM AportePlan a
             WHERE a.planId IN :planes
             GROUP BY a.planId
            """)
    List<Object[]> ahorradoPorPlan(@Param("planes") List<UUID> planes);

    @Query("SELECT COALESCE(SUM(a.monto), 0) FROM AportePlan a WHERE a.planId = :plan")
    BigDecimal ahorradoDe(@Param("plan") UUID plan);
}
