package com.fintechvital.api.repository;

import com.fintechvital.api.model.Moneda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonedaRepository extends JpaRepository<Moneda, String> {

    List<Moneda> findAllByOrderByCodigoAsc();
}
