package com.fintechvital.api.dto;

import com.fintechvital.api.model.Ciudad;
import com.fintechvital.api.model.Usuario;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * El usuario tal como lo consume el frontend (types.ts -> interface Usuario).
 *
 * Existe para que las ENTIDADES no salgan nunca por HTTP. Antes se devolvia la
 * entidad Usuario directamente y, como tenia un campo `password`, la API
 * respondia con la contrasena.
 *
 * `ciudad`, `estado_region` y `pais` se aplanan desde el catalogo: en la base
 * son una FK (`usuario.ciudad_id`), pero el perfil los muestra como tres textos
 * y no tiene por que saber que existe una tabla `ciudad`.
 */
public record UsuarioResponse(
        String id,
        String email,
        String nombre,
        String apellido,
        LocalDate fechaNacimiento,
        String genero,
        String telefono,
        String ciudad,
        String estadoRegion,
        String pais,
        String monedaPrincipal,
        String idioma,
        BigDecimal ingresoMensual,
        Short nivelEndeudamiento,
        String frecuenciaAhorro,
        boolean totpActivo,
        String terminosVersion,
        OffsetDateTime terminosAceptadosEn
) {
    /**
     * `ciudad` puede ser null (el usuario no puso ninguna), pero es un parametro
     * OBLIGATORIO a proposito: no hay sobrecarga que lo omita. La version corta
     * de este metodo es justo lo que hacia que la ciudad se perdiera al montar
     * la respuesta sin que nadie se diera cuenta.
     */
    public static UsuarioResponse de(Usuario u, boolean totpActivo, Ciudad ciudad) {
        return new UsuarioResponse(
                u.getId() == null ? null : u.getId().toString(),
                u.getEmail(), u.getNombre(), u.getApellido(),
                u.getFechaNacimiento(), u.getGenero(), u.getTelefono(),
                ciudad == null ? null : ciudad.getNombre(),
                ciudad == null ? null : ciudad.getRegion(),
                ciudad == null ? null : ciudad.getPais(),
                u.getMonedaPrincipal(), u.getIdioma(),
                u.getIngresoMensual(), u.getNivelEndeudamiento(), u.getFrecuenciaAhorro(),
                totpActivo, u.getTerminosVersion(), u.getTerminosAceptadosEn());
    }
}
