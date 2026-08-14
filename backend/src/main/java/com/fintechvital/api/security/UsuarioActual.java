package com.fintechvital.api.security;

import com.fintechvital.api.error.ErrorNegocio;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Acceso al usuario autenticado.
 *
 * Toda consulta de datos personales tiene que filtrar por ESTE id (RN9), nunca
 * por uno que venga en la URL o en el cuerpo: eso permitiria pedir los datos de
 * otra persona con solo cambiar un numero.
 */
public final class UsuarioActual {

    private UsuarioActual() {}

    public static UUID id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                    "Falta el token de acceso o no es valido");
        }
        return id;
    }
}
