package com.fintechvital.api.repository;

import com.fintechvital.api.model.Transaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransaccionRepository extends JpaRepository<Transaccion, UUID> {

    /**
     * La lista de Movimientos, con sus filtros y paginada.
     *
     * Los filtros son opcionales y se anulan con `:campo IS NULL`, en una sola
     * consulta: montar el WHERE concatenando cadenas segun lo que venga es como
     * se cuelan las inyecciones y como se olvida el filtro por usuario.
     *
     * El filtro por usuario NO es opcional (RN9): va siempre, y el id sale del
     * token, nunca de la URL.
     */
    @Query("""
            SELECT t FROM Transaccion t
             WHERE t.usuarioId = :usuario
               AND (:desde     IS NULL OR t.fecha >= :desde)
               AND (:hasta     IS NULL OR t.fecha <= :hasta)
               AND (:categoria IS NULL OR t.categoriaSlug = :categoria)
               AND (:tarjeta   IS NULL OR t.tarjetaId = :tarjeta)
             ORDER BY t.fecha DESC, t.creadoEn DESC
            """)
    Page<Transaccion> filtrar(@Param("usuario") UUID usuario,
                              @Param("desde") LocalDate desde,
                              @Param("hasta") LocalDate hasta,
                              @Param("categoria") String categoria,
                              @Param("tarjeta") UUID tarjeta,
                              Pageable pagina);

    /**
     * Una transaccion concreta, comprobando en la MISMA consulta que es de quien
     * la pide. Con un findById seguido de un if, tarde o temprano queda un
     * camino sin comprobar. Si no es suya devuelve vacio y el servicio responde
     * 404, nunca 403: un 403 confirmaria que ese id existe.
     */
    Optional<Transaccion> findByIdAndUsuarioId(UUID id, UUID usuarioId);

    List<Transaccion> findByUsuarioIdOrderByFechaDesc(UUID usuarioId);
}
