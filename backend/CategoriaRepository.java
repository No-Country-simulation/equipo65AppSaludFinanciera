package com.hackathon.analisis.repository;

import com.hackathon.analisis.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Integer> {
    Optional<Categoria> findBySlug(String slug);
}