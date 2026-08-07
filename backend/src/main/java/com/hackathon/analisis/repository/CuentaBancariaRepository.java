package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.CuentaBancaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CuentaBancariaRepository extends JpaRepository<CuentaBancaria, UUID> {

    /**
     * Las cuentas del usuario, via la N:M `cuenta_usuario` (soporta cuentas
     * mancomunadas).
     *
     * `desvinculado_en IS NULL` filtra las que la persona ya no tiene: la fila
     * no se borra para conservar el historico, pero la cuenta no debe seguir
     * apareciendo en su panel.
     */
    @Query(value = """
            SELECT c.* FROM cuenta_bancaria c
              JOIN cuenta_usuario cu ON cu.cuenta_id = c.id
             WHERE cu.usuario_id = :usuario
               AND cu.desvinculado_en IS NULL
             ORDER BY c.fecha_apertura
            """, nativeQuery = true)
    List<CuentaBancaria> deUsuario(@Param("usuario") UUID usuario);

    /**
     * Comprueba que la cuenta es de este usuario (RN9). Lo usa el alta de
     * tarjetas: sin esto, cualquiera podria colgar una tarjeta de la cuenta de
     * otra persona mandando su id.
     */
    @Query(value = """
            SELECT COUNT(*) > 0 FROM cuenta_usuario cu
             WHERE cu.cuenta_id = :cuenta
               AND cu.usuario_id = :usuario
               AND cu.desvinculado_en IS NULL
            """, nativeQuery = true)
    boolean esDelUsuario(@Param("cuenta") UUID cuenta, @Param("usuario") UUID usuario);
}
