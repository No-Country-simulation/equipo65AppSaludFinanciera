package com.fintechvital.api.repository;

import com.fintechvital.api.model.Ciudad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CiudadRepository extends JpaRepository<Ciudad, UUID> {

    /** Catalogo completo, agrupado por pais para que el selector salga ordenado. */
    List<Ciudad> findAllByOrderByPaisAscNombreAsc();
}
