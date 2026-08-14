package com.fintechvital.api.repository;

import com.fintechvital.api.model.Tarjeta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TarjetaRepository extends JpaRepository<Tarjeta, UUID> {

    /** Las tarjetas del usuario: cuelgan de sus cuentas, no de el directamente. */
    @Query(value = """
            SELECT t.* FROM tarjeta t
              JOIN cuenta_usuario cu ON cu.cuenta_id = t.cuenta_id
             WHERE cu.usuario_id = :usuario
               AND cu.desvinculado_en IS NULL
             ORDER BY t.creado_en
            """, nativeQuery = true)
    List<Tarjeta> deUsuario(@Param("usuario") UUID usuario);

    /**
     * Una tarjeta concreta, SIEMPRE comprobando que es de quien la pide.
     *
     * Se busca por (id, usuario) en la misma consulta y no con un findById
     * seguido de un if: asi es imposible olvidarse la comprobacion en algun
     * camino. Si no es suya devuelve vacio y el servicio responde 404 (no 403,
     * que confirmaria que el recurso existe).
     */
    @Query(value = """
            SELECT t.* FROM tarjeta t
              JOIN cuenta_usuario cu ON cu.cuenta_id = t.cuenta_id
             WHERE t.id = :id
               AND cu.usuario_id = :usuario
               AND cu.desvinculado_en IS NULL
            """, nativeQuery = true)
    Optional<Tarjeta> delUsuario(@Param("id") UUID id, @Param("usuario") UUID usuario);
}
