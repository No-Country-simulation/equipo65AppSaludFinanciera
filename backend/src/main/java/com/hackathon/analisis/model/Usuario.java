package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Data; // <-- Asegúrate de tener Lombok importado

@Entity
@Table(name = "usuarios")
@Data // <-- Esto genera automáticamente los getPassword(), getEmail(), etc.
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    private String password; // Si se llama 'password', el getter será getPassword()
}