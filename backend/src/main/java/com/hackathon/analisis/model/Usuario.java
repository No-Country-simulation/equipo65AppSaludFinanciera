package com.hackathon.analisis.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 100)
    private String apellido;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    // @JsonProperty hace que Spring entienda el nombre que manda React Native
    @JsonProperty("moneda_principal")
    @Column(name = "moneda_principal", length = 10)
    private String monedaPrincipal;

    @JsonProperty("fecha_nacimiento")
    @JsonFormat(pattern = "yyyy/MM/dd")
    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(length = 20)
    private String genero;

    @Column(length = 20)
    private String telefono;

    @Column(length = 100)
    private String ciudad;

    @JsonProperty("terminos_version")
    @Column(name = "terminos_version", length = 20)
    private String terminosVersion;

    // Aquí está el campo para tu Foto de Perfil
    @Column(name = "foto_url")
    private String fotoUrl;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(length = 10)
    private String idioma = "es";
}