package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.PlanAhorro;
import com.hackathon.analisis.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlanAhorroRepository extends JpaRepository<PlanAhorro, String> {
    List<PlanAhorro> findByUsuario(Usuario usuario);
}