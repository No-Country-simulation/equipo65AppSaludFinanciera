package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.CodigoRespaldo2fa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CodigoRespaldo2faRepository extends JpaRepository<CodigoRespaldo2fa, UUID> {

    /** Solo los que quedan sin gastar: son de un unico uso. */
    List<CodigoRespaldo2fa> findByUsuarioIdAndUsadoEnIsNull(UUID usuarioId);

    @Modifying
    @Query("DELETE FROM CodigoRespaldo2fa c WHERE c.usuarioId = :usuario")
    int borrarDelUsuario(@Param("usuario") UUID usuario);
}
