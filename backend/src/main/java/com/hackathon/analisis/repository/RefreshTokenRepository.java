package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Revoca la familia entera. Se usa cuando se detecta el reuso de un refresh
     * ya consumido: el atacante y el usuario legitimo quedan ambos fuera; el
     * legitimo vuelve a entrar con su contrasena, el atacante no.
     */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revocadoEn = :ahora "
         + "WHERE r.familiaId = :familia AND r.revocadoEn IS NULL")
    int revocarFamilia(@Param("familia") UUID familia, @Param("ahora") OffsetDateTime ahora);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revocadoEn = :ahora "
         + "WHERE r.usuarioId = :usuario AND r.revocadoEn IS NULL")
    int revocarTodosDelUsuario(@Param("usuario") UUID usuario, @Param("ahora") OffsetDateTime ahora);
}
