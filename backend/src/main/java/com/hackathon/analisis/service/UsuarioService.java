package com.hackathon.analisis.service;

import com.hackathon.analisis.dto.PatchUsuarioRequest;
import com.hackathon.analisis.dto.UsuarioResponse;
import com.hackathon.analisis.error.ErrorNegocio;
import com.hackathon.analisis.model.Usuario;
import com.hackathon.analisis.repository.UsuarioRepository;
import com.hackathon.analisis.repository.UsuarioSeguridadRepository;
import com.hackathon.analisis.security.UsuarioActual;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Perfil del usuario autenticado. */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final UsuarioSeguridadRepository seguridad;

    public UsuarioService(UsuarioRepository usuarios, UsuarioSeguridadRepository seguridad) {
        this.usuarios = usuarios;
        this.seguridad = seguridad;
    }

    @Transactional(readOnly = true)
    public UsuarioResponse perfilActual() {
        return aRespuesta(cargarActual());
    }

    @Transactional
    public UsuarioResponse actualizarPerfil(PatchUsuarioRequest cambios) {
        Usuario usuario = cargarActual();

        // PATCH: null significa "no lo toques", no "ponlo a null". Por eso cada
        // campo se comprueba en vez de asignarse en bloque.
        if (cambios.ingresoMensual() != null)     usuario.setIngresoMensual(cambios.ingresoMensual());
        if (cambios.nivelEndeudamiento() != null) usuario.setNivelEndeudamiento(cambios.nivelEndeudamiento());
        if (cambios.frecuenciaAhorro() != null)   usuario.setFrecuenciaAhorro(cambios.frecuenciaAhorro());
        if (cambios.monedaPrincipal() != null)    usuario.setMonedaPrincipal(cambios.monedaPrincipal());
        if (cambios.idioma() != null)             usuario.setIdioma(cambios.idioma());

        return aRespuesta(usuarios.save(usuario));
    }

    private Usuario cargarActual() {
        UUID id = UsuarioActual.id();
        return usuarios.findById(id).orElseThrow(() ->
                // El token es valido pero el usuario ya no existe (cuenta borrada
                // con la sesion abierta). Es un 401, no un 404: la sesion ya no sirve.
                new ErrorNegocio(HttpStatus.UNAUTHORIZED, "SESION_INVALIDA",
                        "La sesion ya no es valida, vuelve a entrar"));
    }

    private UsuarioResponse aRespuesta(Usuario usuario) {
        boolean totp = seguridad.findByUsuarioId(usuario.getId())
                .map(s -> s.isTotpActivo())
                .orElse(false);
        return UsuarioResponse.de(usuario, totp);
    }
}
