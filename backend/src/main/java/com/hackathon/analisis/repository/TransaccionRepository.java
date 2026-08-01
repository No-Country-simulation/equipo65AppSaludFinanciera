package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Transaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {
    // Aquí puedes agregar métodos personalizados para transacciones si los necesitas
}