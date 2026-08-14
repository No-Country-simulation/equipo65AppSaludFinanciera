package com.fintechvital.api.repository;

import com.fintechvital.api.model.CategoriaEtiqueta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaEtiquetaRepository
        extends JpaRepository<CategoriaEtiqueta, CategoriaEtiqueta.Clave> {

    /**
     * El catalogo que se ofrece en la interfaz, en un idioma.
     *
     * Solo las activas: una categoria retirada sigue existiendo para el
     * historico (hay FK desde transaccion) pero no se vuelve a ofrecer.
     * El orden es el de `categoria.orden`, que es el que decide data science,
     * no el alfabetico del idioma de turno.
     */
    @Query("""
            SELECT c FROM CategoriaEtiqueta c
             WHERE c.idioma = :idioma
               AND c.activa = TRUE
             ORDER BY c.orden
            """)
    List<CategoriaEtiqueta> catalogo(@Param("idioma") String idioma);
}
