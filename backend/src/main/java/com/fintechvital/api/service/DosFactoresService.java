package com.fintechvital.api.service;

import com.fintechvital.api.dto.CodigosRespaldoResponse;
import com.fintechvital.api.dto.Iniciar2faResponse;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.CodigoRespaldo2fa;
import com.fintechvital.api.model.EventoAuditoria;
import com.fintechvital.api.model.Usuario;
import com.fintechvital.api.model.UsuarioSeguridad;
import com.fintechvital.api.repository.CodigoRespaldo2faRepository;
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

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Segundo factor TOTP (ADR-0013: obligatorio, se configura en el alta).
 *
 * El flujo tiene dos pasos a proposito:
 *
 *   iniciar  -> se genera el secreto y se GUARDA, pero `totp_activo` sigue false
 *   activar  -> el usuario manda un codigo; si cuadra, se enciende
 *
 * Si se encendiera en un solo paso, un usuario que escanea mal el QR se queda
 * fuera de su cuenta para siempre: el servidor exigiria codigos que su telefono
 * no sabe generar. Exigir un codigo correcto ANTES de encenderlo demuestra que
 * la app quedo bien configurada.
 */
@Service
public class DosFactoresService {

    private static final Logger log = LoggerFactory.getLogger(DosFactoresService.class);

    /** Cuantos codigos de respaldo se entregan por tanda. */
    private static final int CODIGOS_RESPALDO = 8;

    private final UsuarioRepository usuarios;
    private final UsuarioSeguridadRepository seguridad;
    private final CodigoRespaldo2faRepository respaldos;
    private final TotpService totp;
    private final CifradoService cifrado;
    private final PasswordEncoder encoder;
    private final AuditoriaService auditoria;
    private final SecureRandom aleatorio = new SecureRandom();

    public DosFactoresService(UsuarioRepository usuarios,
                              UsuarioSeguridadRepository seguridad,
                              CodigoRespaldo2faRepository respaldos,
                              TotpService totp,
                              CifradoService cifrado,
                              PasswordEncoder encoder,
                              AuditoriaService auditoria) {
        this.usuarios = usuarios;
        this.seguridad = seguridad;
        this.respaldos = respaldos;
        this.totp = totp;
        this.cifrado = cifrado;
        this.encoder = encoder;
        this.auditoria = auditoria;
    }

    // --------------------------------------------------------------- iniciar ---

    @Transactional
    public Iniciar2faResponse iniciar() {
        Usuario usuario = cargarUsuario();
        UsuarioSeguridad credenciales = cargarCredenciales(usuario.getId());

        if (credenciales.isTotpActivo()) {
            // Regenerar el secreto de quien ya lo tiene activo invalidaria su app
            // sin avisar. Para cambiarlo hay que desactivarlo primero.
            throw new ErrorNegocio(HttpStatus.CONFLICT, "TOTP_YA_ACTIVO",
                    "La verificacion en dos pasos ya esta activa");
        }

        String secreto = totp.generarSecreto();
        credenciales.setTotpSecreto(cifrado.cifrar(secreto));
        // Un secreto nuevo empieza sin historial de pasos usados: si quedara el
        // del secreto anterior, rechazaria codigos validos hasta alcanzarlo.
        credenciales.setTotpUltimoPaso(null);
        seguridad.save(credenciales);

        return new Iniciar2faResponse(secreto, totp.uriOtpauth(secreto, usuario.getEmail()));
    }

    // --------------------------------------------------------------- activar ---

    @Transactional
    public CodigosRespaldoResponse activar(String codigo, HttpServletRequest peticion) {
        Usuario usuario = cargarUsuario();
        UsuarioSeguridad credenciales = cargarCredenciales(usuario.getId());

        if (credenciales.isTotpActivo()) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "TOTP_YA_ACTIVO",
                    "La verificacion en dos pasos ya esta activa");
        }
        if (credenciales.getTotpSecreto() == null) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "TOTP_NO_INICIADO",
                    "Primero hay que pedir el codigo QR en /auth/2fa/iniciar");
        }

        Long paso = totp.verificar(cifrado.descifrar(credenciales.getTotpSecreto()),
                                   codigo, credenciales.getTotpUltimoPaso());
        if (paso == null) {
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "TOTP_INVALIDO",
                    "El codigo no es correcto o ya expiro");
        }

        credenciales.setTotpActivo(true);
        credenciales.setTotpActivadoEn(OffsetDateTime.now());
        credenciales.setTotpUltimoPaso(paso);
        seguridad.save(credenciales);

        auditoria.registrar(EventoAuditoria.Tipo.DOS_FA_ACTIVADO, usuario.getId(),
                AuditoriaService.ipDe(peticion), AuditoriaService.agenteDe(peticion), Map.of());
        log.info("2FA activado para el usuario {}", usuario.getId());

        return regenerarCodigos(usuario.getId());
    }

    // ---------------------------------------------------- codigos de respaldo ---

    @Transactional
    public CodigosRespaldoResponse regenerarCodigosRespaldo() {
        Usuario usuario = cargarUsuario();
        UsuarioSeguridad credenciales = cargarCredenciales(usuario.getId());

        if (!credenciales.isTotpActivo()) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "TOTP_NO_ACTIVO",
                    "La verificacion en dos pasos no esta activa");
        }
        return regenerarCodigos(usuario.getId());
    }

    /** Borra los anteriores y entrega una tanda nueva. Los viejos dejan de valer. */
    private CodigosRespaldoResponse regenerarCodigos(UUID usuarioId) {
        respaldos.borrarDelUsuario(usuarioId);

        List<String> enClaro = new ArrayList<>(CODIGOS_RESPALDO);
        for (int i = 0; i < CODIGOS_RESPALDO; i++) {
            String codigo = codigoRespaldo();
            enClaro.add(codigo);

            CodigoRespaldo2fa fila = new CodigoRespaldo2fa();
            fila.setUsuarioId(usuarioId);
            // Hasheado con el mismo BCrypt que las contrasenas: si alguien lee la
            // tabla, no puede entrar con lo que ve.
            fila.setCodigoHash(encoder.encode(codigo));
            respaldos.save(fila);
        }
        return new CodigosRespaldoResponse(enClaro);
    }

    /**
     * Codigo de respaldo de 40 bits en Base32, partido en dos bloques de 4:
     * `ABCD-EFGH`.
     *
     * Base32 y no hexadecimal porque su alfabeto no tiene 0/O ni 1/I, que son
     * justo los caracteres que se confunden al copiar a mano un codigo apuntado
     * en un papel. 5 bytes dan exactamente 8 caracteres, sin relleno.
     */
    private String codigoRespaldo() {
        byte[] bytes = new byte[5];
        aleatorio.nextBytes(bytes);
        String base32 = TotpService.aBase32(bytes);
        return base32.substring(0, 4) + "-" + base32.substring(4);
    }

    /**
     * Gasta un codigo de respaldo. Lo usa el login cuando el usuario perdio el
     * telefono y manda un codigo de respaldo en vez del TOTP.
     *
     * Hay que comparar contra TODOS los hashes porque BCrypt lleva sal: dos
     * hashes del mismo codigo son distintos, asi que no se puede buscar por
     * igualdad en la base.
     */
    @Transactional
    public boolean consumirCodigoRespaldo(UUID usuarioId, String codigo) {
        if (codigo == null || codigo.isBlank()) return false;
        String normalizado = codigo.trim().toUpperCase();

        for (CodigoRespaldo2fa fila : respaldos.findByUsuarioIdAndUsadoEnIsNull(usuarioId)) {
            if (encoder.matches(normalizado, fila.getCodigoHash())) {
                // Se marca en vez de borrarse: queda traza de que se gasto uno.
                fila.setUsadoEn(OffsetDateTime.now());
                respaldos.save(fila);
                log.info("Codigo de respaldo consumido por el usuario {}", usuarioId);
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------ desactivar ---

    /**
     * Apaga el 2FA. Se conserva por contrato aunque la interfaz ya no lo ofrezca
     * (ADR-0013 lo hace obligatorio): quitarlo del servidor dejaria sin salida a
     * una cuenta que quedara en un estado raro.
     */
    @Transactional
    public void desactivar(String password, HttpServletRequest peticion) {
        Usuario usuario = cargarUsuario();
        UsuarioSeguridad credenciales = cargarCredenciales(usuario.getId());

        if (!encoder.matches(password, credenciales.getPasswordHash())) {
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "CREDENCIALES_INVALIDAS",
                    "La contrasena no es correcta");
        }
        if (!credenciales.isTotpActivo()) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "TOTP_NO_ACTIVO",
                    "La verificacion en dos pasos no esta activa");
        }

        credenciales.setTotpActivo(false);
        // El secreto se borra: dejarlo permitiria que un codigo viejo siguiera
        // sirviendo si el 2FA se vuelve a encender sin pasar por /iniciar.
        credenciales.setTotpSecreto(null);
        credenciales.setTotpActivadoEn(null);
        credenciales.setTotpUltimoPaso(null);
        seguridad.save(credenciales);
        respaldos.borrarDelUsuario(usuario.getId());

        auditoria.registrar(EventoAuditoria.Tipo.DOS_FA_DESACTIVADO, usuario.getId(),
                AuditoriaService.ipDe(peticion), AuditoriaService.agenteDe(peticion), Map.of());
        log.info("2FA desactivado para el usuario {}", usuario.getId());
    }

    // ----------------------------------------------------------------- comun ---

    private Usuario cargarUsuario() {
        return usuarios.findById(UsuarioActual.id()).orElseThrow(() ->
                new ErrorNegocio(HttpStatus.UNAUTHORIZED, "SESION_INVALIDA",
                        "La sesion ya no es valida, vuelve a entrar"));
    }

    private UsuarioSeguridad cargarCredenciales(UUID usuarioId) {
        return seguridad.findByUsuarioId(usuarioId).orElseThrow(() ->
                new ErrorNegocio(HttpStatus.UNAUTHORIZED, "SESION_INVALIDA",
                        "La sesion ya no es valida, vuelve a entrar"));
    }
}
