package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Transaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID; // <-- Importación necesaria

@Repository
// Ojo: El tipo de ID de la entidad principal también cambia a UUID aquí
public interface TransaccionRepository extends JpaRepository<Transaccion, UUID> {

    List<Transaccion> findByIdCliente(UUID idCliente);
}