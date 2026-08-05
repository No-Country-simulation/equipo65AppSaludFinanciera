package com.hackathon.analisis.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

/**
 * Alta de usuario (CONTRATO_API §4.1).
 *
 * nombre, apellido y fecha_nacimiento son obligatorios porque la tabla
 * `usuario` los tiene NOT NULL. La edad NO se envia: se calcula desde la fecha
 * de nacimiento, porque una edad guardada es incorrecta al dia siguiente del
 * cumpleanos.
 */
public record RegistroRequest(

        @NotBlank(message = "es obligatorio")
        @Email(message = "no es un correo valido")
        @Size(max = 150, message = "maximo 150 caracteres")
        String email,

        // 10 caracteres es el minimo del contrato. Se valida aqui y no en la BD:
        // la base solo ve el hash, que siempre mide lo mismo.
        @NotBlank(message = "es obligatoria")
        @Size(min = 10, max = 128, message = "debe tener entre 10 y 128 caracteres")
        String password,

        @NotBlank(message = "es obligatorio")
        @Size(max = 50)
        String nombre,

        @NotBlank(message = "es obligatorio")
        @Size(max = 50)
        String apellido,

        @NotNull(message = "es obligatoria")
        @Past(message = "debe estar en el pasado")
        LocalDate fechaNacimiento,

        @Pattern(regexp = "USD|MXN|ARS|COP|CLP|PEN|BRL|EUR", message = "moneda no soportada")
        String monedaPrincipal,

        @Pattern(regexp = "es|pt|en", message = "idioma no soportado")
        String idioma,

        @Pattern(regexp = "M|F", message = "debe ser M o F")
        String genero,

        @Size(max = 15)
        String telefono,

        String terminosVersion
) {}
