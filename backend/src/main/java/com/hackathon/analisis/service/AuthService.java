package com.hackathon.analisis.service;

import com.hackathon.analisis.dto.*;
import com.hackathon.analisis.error.ErrorNegocio;
import com.hackathon.analisis.model.EventoAuditoria;
import com.hackathon.analisis.model.RefreshToken;
import com.hackathon.analisis.model.Usuario;
import com.hackathon.analisis.model.UsuarioSeguridad;
import com.hackathon.analisis.repository.RefreshTokenRepository;
import com.hackathon.analisis.repository.UsuarioRepository;
import com.hackathon.analisis.repository.UsuarioSeguridadRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Registro, login y rotacion de sesion, CONTRA LA BASE DE DATOS.
 *
 * Sustituye a la version simulada que comparaba contra "test@test.com" /
 * "123456" escritos en el codigo y no persistia nada.
 *
 * Lo que hace ahora:
 *  - Guarda el usuario en `usuario` y su hash BCrypt en `usuario_seguridad`.
 *  - Verifica la contrasena con BCrypt (cost 12).
 *  - Emite un access token JWT y un refresh opaco guardado hasheado.
 *  - Rota el refresh y detecta su reuso.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** Minimo legal para abrir una cuenta. La BD solo pone un piso de cordura. */
    private static final int EDAD_MINIMA = 18;

    private final UsuarioRepository usuarios;
    private final UsuarioSeguridadRepository seguridad;
    private final RefreshTokenRepository refrescos;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final TotpService totp;
    private final CifradoService cifrado;
    private final DosFactoresService dosFactores;
    private final LimitadorLoginService limitador;
    private final AuditoriaService auditoria;

    public AuthService(UsuarioRepository usuarios,
                       UsuarioSeguridadRepository seguridad,
                       RefreshTokenRepository refrescos,
                       PasswordEncoder encoder,
                       JwtService jwt,
                       TotpService totp,
                       CifradoService cifrado,
                       DosFactoresService dosFactores,
                       LimitadorLoginService limitador,
                       AuditoriaService auditoria) {
        this.usuarios = usuarios;
        this.seguridad = seguridad;
        this.refrescos = refrescos;
        this.encoder = encoder;
        this.jwt = jwt;
        this.totp = totp;
        this.cifrado = cifrado;
        this.dosFactores = dosFactores;
        this.limitador = limitador;
        this.auditoria = auditoria;
    }

    // ------------------------------------------------------------- registro ---

    @Transactional
    public UsuarioResponse registrar(RegistroRequest peticion) {
        // El email se normaliza a minusculas: la BD tiene un CHECK que lo exige
        // y asi el UNIQUE ya es insensible a mayusculas sin indices extra.
        String email = peticion.email().trim().toLowerCase();

        if (usuarios.existsByEmail(email)) {
            // 409 y no 422: el recurso ya existe, no es un dato mal formado.
            throw new ErrorNegocio(HttpStatus.CONFLICT, "EMAIL_YA_REGISTRADO",
                    "Ese correo ya tiene una cuenta");
        }

        if (Period.between(peticion.fechaNacimiento(), LocalDate.now()).getYears() < EDAD_MINIMA) {
            throw ErrorNegocio.validacion("fecha_nacimiento",
                    "debes tener al menos " + EDAD_MINIMA + " anos");
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(email);
        usuario.setNombre(peticion.nombre().trim());
        usuario.setApellido(peticion.apellido().trim());
        usuario.setFechaNacimiento(peticion.fechaNacimiento());
        usuario.setGenero(peticion.genero());
        usuario.setTelefono(peticion.telefono());
        if (peticion.monedaPrincipal() != null) usuario.setMonedaPrincipal(peticion.monedaPrincipal());
        if (peticion.idioma() != null) usuario.setIdioma(peticion.idioma());
        if (peticion.terminosVersion() != null) {
            usuario.setTerminosVersion(peticion.terminosVersion());
            usuario.setTerminosAceptadosEn(OffsetDateTime.now());
        }
        usuario = usuarios.saveAndFlush(usuario);

        UsuarioSeguridad credenciales = new UsuarioSeguridad();
        credenciales.setUsuario(usuario);
        credenciales.setPasswordHash(encoder.encode(peticion.password()));
        credenciales.setPasswordCambiadoEn(OffsetDateTime.now());
        seguridad.save(credenciales);

        log.info("Usuario registrado: {}", usuario.getId());
        return UsuarioResponse.de(usuario, false);
    }

    // ---------------------------------------------------------------- login ---

    @Transactional
    public SesionResponse login(LoginRequest peticion, HttpServletRequest http) {
        String email = peticion.email().trim().toLowerCase();
        String ip = AuditoriaService.ipDe(http);
        String agente = AuditoriaService.agenteDe(http);

        // Antes de tocar BCrypt: si la cuenta esta bloqueada por intentos, no
        // tiene sentido pagar el hash (que es caro a proposito) por cuenta de
        // quien esta atacando.
        limitador.comprobar(email);

        Optional<Usuario> encontrado = usuarios.findByEmail(email);

        // Se verifica el hash INCLUSO si el usuario no existe, contra uno
        // ficticio. Sin esto, un email inexistente responde mucho mas rapido que
        // uno real, y esa diferencia permite averiguar quien tiene cuenta
        // (enumeracion por tiempo). El coste es el BCrypt que ya se paga.
        String hashGuardado = encontrado
                .flatMap(u -> seguridad.findByUsuarioId(u.getId()))
                .map(UsuarioSeguridad::getPasswordHash)
                .orElse("$2a$12$ftGZmDp0YtEQOgIVOAgcuOaOBBGCiBk7Y5rwoOJIGrGRkGN6uFtIS");

        boolean coincide = encoder.matches(peticion.password(), hashGuardado);

        if (encontrado.isEmpty() || !coincide) {
            registrarFallo(email, ip, agente,
                    encontrado.map(Usuario::getId).orElse(null), "password");
            // Mismo mensaje en los dos casos: decir "ese usuario no existe"
            // regala informacion a quien esta probando correos.
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "CREDENCIALES_INVALIDAS",
                    "Correo o contrasena incorrectos");
        }

        Usuario usuario = encontrado.get();
        if (!"activo".equals(usuario.getEstado())) {
            throw new ErrorNegocio(HttpStatus.FORBIDDEN, "CUENTA_INACTIVA",
                    "La cuenta esta inactiva");
        }

        UsuarioSeguridad credenciales = seguridad.findByUsuarioId(usuario.getId()).orElseThrow();

        if (credenciales.isTotpActivo()) {
            String codigo = peticion.codigoTotp();

            // Sin codigo: 200 con requiere_2fa y SIN tokens. No es un 401, la
            // contrasena era correcta; el cliente pide el codigo y reintenta.
            if (codigo == null || codigo.isBlank()) {
                return SesionResponse.pendiente2fa();
            }
            if (!verificarSegundoFactor(usuario, credenciales, codigo)) {
                registrarFallo(email, ip, agente, usuario.getId(), "totp");
                throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "TOTP_INVALIDO",
                        "El codigo de verificacion no es correcto o ya expiro");
            }
        }

        usuario.setUltimaSesion(OffsetDateTime.now());
        limitador.registrar(email, ip, true);
        auditoria.registrar(EventoAuditoria.Tipo.LOGIN_OK, usuario.getId(), ip, agente,
                Map.of("con_2fa", credenciales.isTotpActivo()));

        return emitirSesion(usuario, credenciales, UUID.randomUUID());
    }

    /**
     * Segundo factor: primero el codigo de la app, y si no cuadra, un codigo de
     * respaldo.
     *
     * Se aceptan los dos en el mismo campo porque el frontend tiene un solo
     * input: el usuario que perdio el telefono escribe ahi su codigo de papel.
     * El TOTP se prueba primero por ser el caso normal.
     */
    private boolean verificarSegundoFactor(Usuario usuario, UsuarioSeguridad credenciales,
                                           String codigo) {
        Long paso = totp.verificar(cifrado.descifrar(credenciales.getTotpSecreto()),
                                   codigo, credenciales.getTotpUltimoPaso());
        if (paso != null) {
            // Se anota el paso consumido para que el MISMO codigo no valga dos
            // veces dentro de su ventana de 30 s.
            credenciales.setTotpUltimoPaso(paso);
            seguridad.save(credenciales);
            return true;
        }
        return dosFactores.consumirCodigoRespaldo(usuario.getId(), codigo);
    }

    /**
     * Anota el intento fallido y, si con este se alcanza el limite, deja
     * constancia del bloqueo.
     *
     * El registro va en transaccion propia (ver LimitadorLoginService): esta de
     * aqui termina en excepcion y su rollback se llevaria la fila por delante.
     */
    private void registrarFallo(String email, String ip, String agente, UUID usuarioId, String motivo) {
        limitador.registrar(email, ip, false);
        auditoria.registrar(EventoAuditoria.Tipo.LOGIN_FALLIDO, usuarioId, ip, agente,
                Map.of("email", email, "motivo", motivo));
    }

    // -------------------------------------------------------------- refresh ---

    @Transactional
    public SesionResponse refrescar(String refreshEnClaro) {
        String hash = jwt.hashear(refreshEnClaro);
        RefreshToken guardado = refrescos.findByTokenHash(hash)
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED,
                        "REFRESH_INVALIDO", "La sesion expiro, vuelve a entrar"));

        OffsetDateTime ahora = OffsetDateTime.now();

        // Reuso de un refresh ya consumido: alguien tiene una copia. Se revoca
        // la familia entera y se audita. El usuario legitimo vuelve a entrar con
        // su contrasena; quien robo el token, no.
        if (guardado.getUsadoEn() != null) {
            refrescos.revocarFamilia(guardado.getFamiliaId(), ahora);
            log.warn("Refresh token reusado (familia {}): se revoco la familia completa",
                    guardado.getFamiliaId());
            auditoria.registrar(EventoAuditoria.Tipo.REFRESH_REUSADO, guardado.getUsuarioId(),
                    null, null, Map.of("familia_id", guardado.getFamiliaId().toString()));
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "REFRESH_REUSADO",
                    "La sesion se cerro por seguridad, vuelve a entrar");
        }
        if (guardado.getRevocadoEn() != null || guardado.getExpiraEn().isBefore(ahora)) {
            throw new ErrorNegocio(HttpStatus.UNAUTHORIZED, "REFRESH_INVALIDO",
                    "La sesion expiro, vuelve a entrar");
        }

        guardado.setUsadoEn(ahora);

        Usuario usuario = usuarios.findById(guardado.getUsuarioId())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED,
                        "REFRESH_INVALIDO", "La sesion expiro, vuelve a entrar"));
        UsuarioSeguridad credenciales = seguridad.findByUsuarioId(usuario.getId()).orElseThrow();

        // Rotacion: el token nuevo conserva la familia del anterior.
        return emitirSesion(usuario, credenciales, guardado.getFamiliaId());
    }

    @Transactional
    public void logout(String refreshEnClaro) {
        if (refreshEnClaro == null || refreshEnClaro.isBlank()) return;
        refrescos.findByTokenHash(jwt.hashear(refreshEnClaro))
                .ifPresent(t -> t.setRevocadoEn(OffsetDateTime.now()));
    }

    // ---------------------------------------------------------------- comun ---

    private SesionResponse emitirSesion(Usuario usuario, UsuarioSeguridad credenciales, UUID familia) {
        String access = jwt.generarAccessToken(usuario.getId(), usuario.getEmail(), usuario.getRol());
        String refreshEnClaro = jwt.generarRefreshToken();

        RefreshToken registro = new RefreshToken();
        registro.setUsuarioId(usuario.getId());
        registro.setTokenHash(jwt.hashear(refreshEnClaro));   // en claro no se guarda nunca
        registro.setFamiliaId(familia);
        registro.setExpiraEn(OffsetDateTime.now().plusSeconds(jwt.getTtlRefreshSegundos()));
        refrescos.save(registro);

        return new SesionResponse(
                access,
                refreshEnClaro,          // el cliente lo ve UNA sola vez
                jwt.getTtlAccessSegundos(),
                false,
                UsuarioResponse.de(usuario, credenciales.isTotpActivo()));
    }
}
