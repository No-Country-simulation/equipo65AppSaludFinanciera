package com.hackathon.analisis.service;

import com.hackathon.analisis.dto.PresupuestoResponse;
import com.hackathon.analisis.repository.PresupuestoRepository;
import com.hackathon.analisis.security.UsuarioActual;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PresupuestoService {

    private final PresupuestoRepository repository;

    public PresupuestoService(PresupuestoRepository repository) {
        this.repository = repository;
    }

    public List<PresupuestoResponse> obtenerMisPresupuestos() {
        // Sacamos el ID del usuario del token de seguridad actual
        return repository.findByUsuarioId(UsuarioActual.id()).stream()
                .map(p -> new PresupuestoResponse(p.getCategoriaSlug(), p.getLimite(), p.getMoneda()))
                .collect(Collectors.toList());
    }
}