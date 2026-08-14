package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    /** El email se guarda SIEMPRE en minusculas (lo garantiza un CHECK en la BD). */
    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Baja definitiva de la cuenta. Devuelve las filas borradas (0 o 1).
     *
     * ⚠️ NO se usa el `delete(entidad)` que trae JpaRepository, y no es un
     * capricho: en este caso concreto **no borraba nada y no avisaba**. El
     * DELETE nunca llegaba a la base -- comprobado con el log de Hibernate: la
     * transaccion hacia commit sin una sola sentencia de borrado -- y el
     * endpoint respondia 204 sobre una cuenta que seguia viva. Un borrado que
     * miente es peor que un borrado que falla.
     *
     * La consulta explicita quita de en medio toda la logica de Spring Data
     * sobre si la entidad esta gestionada o no: se emite el DELETE y se
     * devuelve el numero de filas, que el servicio comprueba.
     *
     * Las tablas hijas (transacciones, metas, presupuestos, analisis,
     * credenciales, tarjetas) se van por el ON DELETE CASCADE del esquema, no
     * por JPA. `evento_auditoria` es la excepcion deliberada: va con ON DELETE
     * SET NULL para conservar la evidencia.
     *
     * `clearAutomatically` vacia el contexto de persistencia: despues de un
     * borrado masivo, las entidades que quedaran cargadas apuntarian a filas que
     * ya no existen.
     */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Usuario u WHERE u.id = :id")
    int borrarPorId(@Param("id") UUID id);
}
