package com.fintechvital.api.repository;

import com.fintechvital.api.model.IntentoLogin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

@Repository
public interface IntentoLoginRepository extends JpaRepository<IntentoLogin, Long> {

    /**
     * Fallos consecutivos recientes contra un correo.
     *
     * Cuenta solo los posteriores al ultimo login CORRECTO: si el usuario acerto
     * la contrasena, el contador se reinicia solo, sin borrar nada ni guardar un
     * contador aparte que se pueda desincronizar.
     */
    @Query("""
           SELECT COUNT(i) FROM IntentoLogin i
            WHERE i.email = :email
              AND i.exito = false
              AND i.creadoEn > :desde
              AND i.creadoEn > COALESCE((SELECT MAX(e.creadoEn) FROM IntentoLogin e
                                          WHERE e.email = :email AND e.exito = true),
                                        i.creadoEn)
           """)
    long contarFallosRecientes(@Param("email") String email,
                               @Param("desde") OffsetDateTime desde);
}
