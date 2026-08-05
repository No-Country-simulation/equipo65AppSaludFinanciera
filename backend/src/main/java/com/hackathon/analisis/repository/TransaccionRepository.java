package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Transaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransaccionRepository extends JpaRepository<Transaccion, String> { // Nota: El ID de Transaccion es String

    // Cambiamos UsuarioId por IdCliente
    List<Transaccion> findByIdCliente(String idCliente);

}