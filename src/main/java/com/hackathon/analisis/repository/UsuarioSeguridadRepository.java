package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.UsuarioSeguridad;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioSeguridadRepository extends JpaRepository<UsuarioSeguridad, String> {
}