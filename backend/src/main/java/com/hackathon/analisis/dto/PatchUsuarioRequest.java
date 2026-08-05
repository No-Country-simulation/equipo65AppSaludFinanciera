package com.hackathon.analisis.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/**
 * Actualizacion parcial del perfil (PATCH /usuarios/me). Todos los campos son
 * opcionales: null significa "no lo toques", no "ponlo a null".
 */
public record PatchUsuarioRequest(

        @DecimalMin(value = "0", message = "no puede ser negativo")
        BigDecimal ingresoMensual,

        @Min(value = 0, message = "minimo 0")
        @Max(value = 100, message = "maximo 100")
        Short nivelEndeudamiento,

        @Pattern(regexp = "nula|baja|media|alta", message = "valor no valido")
        String frecuenciaAhorro,

        @Pattern(regexp = "USD|MXN|ARS|COP|CLP|PEN|BRL|EUR", message = "moneda no soportada")
        String monedaPrincipal,

        @Pattern(regexp = "es|pt|en", message = "idioma no soportado")
        String idioma
) {}
