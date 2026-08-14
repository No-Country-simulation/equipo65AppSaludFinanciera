package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.CategoriaResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categorias")
public class CategoriaController {

    // Temporalmente omitimos el service para inyectar datos de prueba directos
    @GetMapping
    public ResponseEntity<List<CategoriaResponse>> listar() {
        // Asegúrate de que los campos coincidan con los atributos de tu CategoriaResponse
        List<CategoriaResponse> categoriasFalsas = List.of(
                new CategoriaResponse("vivienda", "Vivienda", "GASTO"),
                new CategoriaResponse("alimentos", "Alimentos", "GASTO"),
                new CategoriaResponse("transporte", "Transporte", "GASTO")
        );

        return ResponseEntity.ok(categoriasFalsas);
    }
}