package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Transaccion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransaccionRepository extends JpaRepository<Transaccion, String> {
}