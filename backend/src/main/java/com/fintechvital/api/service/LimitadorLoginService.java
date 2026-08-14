package com.fintechvital.api.service;

import com.fintechvital.api.error.ErrorNegocio;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import com.fintechvital.api.repository.IntentoLoginRepository;

/**
 * Freno a la fuerza bruta sobre el login (CONTRATO_API §9).
 *
 * Regla: tras 5 fallos sobre el MISMO correo en 15 minutos, se bloquea 15
 * minutos y se responde 429 con `Retry-After`.
 *
 * Por que contra la tabla `intento_login` y no con un contador en memoria:
 *
 *  - La API corre en contenedor y puede reiniciarse; un contador en memoria se
 *    reinicia con ella y regala al atacante un borron y cuenta nueva.
 *  - Con mas de una replica, cada una tendria su propio contador y el limite
 *    real seria 5 x replicas.
 *  - La tabla ya existe en el esquema y ademas deja traza para auditoria.
 *
 * El contador se reinicia solo: la consulta solo cuenta los fallos POSTERIORES
 * al ultimo acierto, asi que entrar bien limpia el historial sin borrar filas.
 *
 * ⚠️ Se cuenta por correo, no por IP. El limite por IP que tambien pide el
 * contrato (5 req/min/IP) es un filtro de borde, no de aplicacion: detras del
 * tunel de Cloudflare hay que aplicarlo alli, donde la IP es fiable.
 */
@Service
public class LimitadorLoginService {

    private static final Logger log = LoggerFactory.getLogger(LimitadorLoginService.class);

    private static final int FALLOS_PERMITIDOS = 5;
    private static final int MINUTOS_VENTANA = 15;

    private static final String INSERTAR = """
            INSERT INTO intento_login (email, ip, exito)
            VALUES (?, CAST(? AS inet), ?)
            """;

    @PersistenceContext
    private EntityManager em;

    private final IntentoLoginRepository intentos;

    public LimitadorLoginService(IntentoLoginRepository intentos) {
        this.intentos = intentos;
    }

    /**
     * Corta la peticion con 429 si el correo esta bloqueado.
     *
     * Se comprueba ANTES de verificar la contrasena para no seguir gastando
     * BCrypt (que es caro a proposito) por cuenta de quien esta atacando.
     */
    public void comprobar(String email) {
        long fallos = intentos.contarFallosRecientes(email, desde());
        if (fallos >= FALLOS_PERMITIDOS) {
            log.warn("Login bloqueado por exceso de intentos: {} fallos sobre {}", fallos, email);
            throw new ErrorNegocio(HttpStatus.TOO_MANY_REQUESTS, "DEMASIADOS_INTENTOS",
                    "Demasiados intentos fallidos. Prueba de nuevo en " + MINUTOS_VENTANA + " minutos");
        }
    }

    /**
     * Deja constancia del intento.
     *
     * En transaccion propia porque el login FALLIDO lanza excepcion, y con la
     * transaccion compartida el rollback se llevaria por delante justo la fila
     * que documenta el fallo: el contador nunca subiria y el bloqueo no
     * llegaria a dispararse jamas.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String email, String ip, boolean exito) {
        try {
            em.createNativeQuery(INSERTAR)
              .setParameter(1, email)
              .setParameter(2, ip)
              .setParameter(3, exito)
              .executeUpdate();
        } catch (Exception e) {
            // Igual que la auditoria: no poder anotar el intento no puede
            // impedir el login. Se avisa y se sigue.
            log.warn("No se pudo registrar el intento de login de {}", email, e);
        }
    }

    /** Segundos que faltan para poder reintentar, para la cabecera Retry-After. */
    public static int segundosDeEspera() {
        return MINUTOS_VENTANA * 60;
    }

    private static OffsetDateTime desde() {
        return OffsetDateTime.now().minusMinutes(MINUTOS_VENTANA);
    }
}
