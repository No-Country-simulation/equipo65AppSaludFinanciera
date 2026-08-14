package com.fintechvital.api.repository;

import com.fintechvital.api.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * La tabla `categoria`. Su clave primaria es el SLUG (TEXT), no un entero: el
 * slug es el identificador estable que comparten data science, la API, la base
 * y el frontend.
 *
 * Para lo que se pinta en la interfaz no se usa esta: se usa
 * {@link CategoriaEtiquetaRepository}, que va contra la vista con las
 * traducciones. Esta sirve para validar que un slug existe (PATCH de categoria).
 */
@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, String> {

    Optional<Categoria> findBySlug(String slug);

    /** ¿Se puede asignar esta categoria hoy? Una retirada existe pero no se ofrece. */
    boolean existsBySlugAndActivaTrue(String slug);
}
