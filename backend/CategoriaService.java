package com.hackathon.analisis.service;

import com.hackathon.analisis.dto.CategoriaResponse;
import com.hackathon.analisis.repository.CategoriaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoriaService {

    private final CategoriaRepository repository;

    // Inyección de dependencias por constructor (buena práctica en Spring)
    public CategoriaService(CategoriaRepository repository) {
        this.repository = repository;
    }

    public List<CategoriaResponse> obtenerTodas() {
        return repository.findAll().stream()
                .map(c -> new CategoriaResponse(c.getSlug(), c.getTipo(), c.getGrupo()))
                .collect(Collectors.toList());
    }
}