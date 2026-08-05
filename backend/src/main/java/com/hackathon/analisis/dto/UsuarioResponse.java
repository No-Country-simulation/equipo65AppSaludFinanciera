package com.hackathon.analisis.dto;

import com.hackathon.analisis.model.Usuario;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * El usuario tal como lo consume el frontend (types.ts -> interface Usuario).
 *
 * Existe para que las ENTIDADES no salgan nunca por HTTP. Antes se devolvia la
 * entidad Usuario directamente y, como tenia un campo `password`, la API
 * respondia con la contrasena.
 */
public record UsuarioResponse(
        String id,
        String email,
        String nombre,
        String apellido,
        LocalDate fechaNacimiento,
        String genero,
        String telefono,
        String monedaPrincipal,
        String idioma,
        BigDecimal ingresoMensual,
        Short nivelEndeudamiento,
        String frecuenciaAhorro,
        boolean totpActivo,
        String terminosVersion,
        OffsetDateTime terminosAceptadosEn
) {
    public static UsuarioResponse de(Usuario u, boolean totpActivo) {
        return new UsuarioResponse(
                u.getId() == null ? null : u.getId().toString(),
                u.getEmail(), u.getNombre(), u.getApellido(),
                u.getFechaNacimiento(), u.getGenero(), u.getTelefono(),
                u.getMonedaPrincipal(), u.getIdioma(),
                u.getIngresoMensual(), u.getNivelEndeudamiento(), u.getFrecuenciaAhorro(),
                totpActivo, u.getTerminosVersion(), u.getTerminosAceptadosEn());
    }
}
