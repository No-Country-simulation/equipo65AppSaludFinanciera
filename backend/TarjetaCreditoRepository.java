package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.TarjetaCredito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TarjetaCreditoRepository extends JpaRepository<TarjetaCredito, UUID> {

    /**
     * Datos de credito CON el saldo utilizado, que es derivado y solo existe en
     * la vista.
     *
     * Devuelve Object[] por fila -- {tarjeta_id, limite, dia_corte, dia_pago,
     * saldo_utilizado} -- porque la vista no encaja con ninguna entidad: mezcla
     * columnas de `tarjeta_credito` con una suma de `transaccion`. Mapear una
     * entidad de solo lectura para esto haria creer que se puede escribir.
     *
     * Se piden todas las del usuario de una vez para no lanzar una consulta por
     * tarjeta al pintar la lista.
     */
    @Query(value = """
            SELECT v.tarjeta_id, v.limite_credito, v.dia_corte, v.dia_pago, v.saldo_utilizado
              FROM vw_tarjeta_credito v
              JOIN tarjeta t         ON t.id = v.tarjeta_id
              JOIN cuenta_usuario cu ON cu.cuenta_id = t.cuenta_id
             WHERE cu.usuario_id = :usuario
               AND cu.desvinculado_en IS NULL
            """, nativeQuery = true)
    List<Object[]> creditoDeUsuario(@Param("usuario") UUID usuario);
}
