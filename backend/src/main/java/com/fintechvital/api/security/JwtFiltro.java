package com.fintechvital.api.security;

import com.fintechvital.api.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Lee `Authorization: Bearer <token>`, lo verifica y deja el usuario en el
 * contexto de seguridad.
 *
 * A partir de aqui, cualquier endpoint puede saber QUIEN pregunta con
 * UsuarioActual.id(). Eso es lo que hace posible la RN9 (aislamiento por
 * usuario): las consultas filtran por el id del TOKEN, nunca por un parametro
 * de la peticion, que el cliente podria cambiar a su antojo.
 *
 * Si no hay token o es invalido, el filtro NO rechaza: simplemente deja la
 * peticion sin autenticar y que decida SecurityConfig. Asi los endpoints
 * publicos siguen funcionando sin cabecera.
 */
@Component
public class JwtFiltro extends OncePerRequestFilter {

    private final JwtService jwt;

    public JwtFiltro(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion,
                                    HttpServletResponse respuesta,
                                    FilterChain cadena) throws ServletException, IOException {

        String cabecera = peticion.getHeader("Authorization");
        if (cabecera != null && cabecera.startsWith("Bearer ")) {
            Claims claims = jwt.verificar(cabecera.substring(7).trim());
            if (claims != null) {
                try {
                    UUID usuarioId = UUID.fromString(claims.getSubject());
                    String rol = claims.get("rol", String.class);
                    if (rol == null) rol = "usuario";

                    var autenticacion = new UsernamePasswordAuthenticationToken(
                            usuarioId, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + rol.toUpperCase())));
                    SecurityContextHolder.getContext().setAuthentication(autenticacion);
                } catch (IllegalArgumentException e) {
                    // `sub` no es un UUID: token manipulado. Se ignora y la
                    // peticion sigue como anonima.
                    SecurityContextHolder.clearContext();
                }
            }
        }
        cadena.doFilter(peticion, respuesta);
    }
}
