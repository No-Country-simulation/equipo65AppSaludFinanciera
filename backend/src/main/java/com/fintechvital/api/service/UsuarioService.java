package com.fintechvital.api.service;

import com.fintechvital.api.dto.PatchUsuarioRequest;
import com.fintechvital.api.dto.UsuarioResponse;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.EventoAuditoria;
import com.fintechvital.api.model.Usuario;
import com.fintechvital.api.model.UsuarioSeguridad;
import com.fintechvital.api.repository.RefreshTokenRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.repository.UsuarioSeguridadRepository;
import com.fintechvital.api.security.UsuarioActual;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** Perfil del usuario autenticado. */
@Service
public class UsuarioService {

    private static final Logger log = LoggerFactory.getLogger(UsuarioService.class);

    private final UsuarioRepository usuarios;
    private final UsuarioSeguridadRepository seguridad;
    private final RefreshTokenRepository refrescos;
    private final ExportacionService exportacion;
    private final AuditoriaService auditoria;
    private final PasswordEncoder encoder;

    public UsuarioService(UsuarioRepository usuarios,
                          UsuarioSeguridadRepository seguridad,
                          RefreshTokenRepository refrescos,
                          ExportacionService exportacion,
                          AuditoriaService auditoria,
                          PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.seguridad = seguridad;
        this.refrescos = refrescos;
        this.exportacion = exportacion;
        this.auditoria = auditoria;
        this.encoder = encoder;
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

    /**
     * Portabilidad: todo lo que se guarda de esta persona, en un JSON.
     *
     * Se audita porque una exportacion completa es exactamente lo que se llevaria
     * alguien que robara una sesion: si pasa, tiene que quedar la traza.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exportarDatos(HttpServletRequest peticion) {
        Usuario usuario = cargarActual();
        auditoria.registrar(EventoAuditoria.Tipo.DATOS_EXPORTADOS, usuario.getId(),
                AuditoriaService.ipDe(peticion), AuditoriaService.agenteDe(peticion), Map.of());
        return exportacion.exportar(usuario.getId(), aRespuesta(usuario));
    }

    /**
     * Baja definitiva de la cuenta.
     *
     * Es un borrado REAL, no un `estado = 'inactivo'`: si alguien pide que se
     * borren sus datos, dejarlos en la base marcados como inactivos no es
     * borrarlos. Todas las FK del esquema cuelgan con ON DELETE CASCADE, asi que
     * transacciones, metas, presupuestos, analisis y tarjetas se van con el
     * usuario. La unica excepcion deliberada es `evento_auditoria`, que va con
     * ON DELETE SET NULL: borrar una cuenta no puede borrar la evidencia de lo
     * que paso con ella.
     *
     * Se vuelve a pedir la contrasena aunque el token sea valido: un access
     * token robado no puede, ademas, borrar la cuenta.
     */
    @Transactional
    public void eliminarCuenta(String password, HttpServletRequest peticion) {
        Usuario usuario = cargarActual();
        UsuarioSeguridad credenciales = seguridad.findByUsuarioId(usuario.getId())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED, "SESION_INVALIDA",
                        "La sesion ya no es valida, vuelve a entrar"));

        if (!encoder.matches(password, credenciales.getPasswordHash())) {
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "CREDENCIALES_INVALIDAS",
                    "La contrasena no es correcta");
        }

        // La auditoria va ANTES del borrado: despues, el usuario_id ya no existe
        // y la fila quedaria con la referencia a null sin decir de quien era.
        auditoria.registrar(EventoAuditoria.Tipo.CUENTA_BORRADA, usuario.getId(),
                AuditoriaService.ipDe(peticion), AuditoriaService.agenteDe(peticion),
                Map.of("email", usuario.getEmail()));

        // Las sesiones abiertas en otros dispositivos mueren con la cuenta.
        refrescos.revocarTodosDelUsuario(usuario.getId(), OffsetDateTime.now());

        // Se comprueba que de verdad se borro una fila. Es lo que destapo el
        // fallo original: el `delete(entidad)` de JpaRepository no emitia el
        // DELETE y el endpoint respondia 204 sobre una cuenta intacta.
        int borradas = usuarios.borrarPorId(usuario.getId());
        if (borradas != 1) {
            throw new ErrorNegocio(HttpStatus.INTERNAL_SERVER_ERROR, "BAJA_NO_COMPLETADA",
                    "No se pudo dar de baja la cuenta");
        }
        log.info("Cuenta borrada: {}", usuario.getId());
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
