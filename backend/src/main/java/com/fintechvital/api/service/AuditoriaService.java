package com.fintechvital.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Map;
import java.util.UUID;

/**
 * Escribe la traza de seguridad (`evento_auditoria`).
 *
 * Tres decisiones que no son obvias:
 *
 *  1. **INSERT nativo con casts.** `ip` es INET y `detalle` es JSONB. Hibernate
 *     mandaria `varchar` en los dos y PostgreSQL rechazaria la fila. Con
 *     `CAST(? AS inet)` / `CAST(? AS jsonb)` entra bien y no hace falta ni una
 *     dependencia extra ni degradar las columnas de la base a texto.
 *
 *  2. **Transaccion propia (REQUIRES_NEW).** Si el INSERT falla dentro de la
 *     transaccion del login, PostgreSQL aborta la transaccion ENTERA y el login
 *     se cae por culpa de la auditoria. Aislarla evita que la traza pueda tumbar
 *     la operacion que esta trazando.
 *
 *  3. **A prueba de fallos.** Cualquier excepcion se registra y se traga. Perder
 *     una linea de auditoria es malo; que un usuario no pueda entrar porque no
 *     se pudo escribir esa linea, es peor.
 *
 * ⚠️ Con H2 (el arranque de conveniencia, sin nada montado) los tipos INET y
 * JSONB no existen y la auditoria queda desactivada: se avisa una vez al
 * arrancar en vez de repetir el error en cada peticion. Contra PostgreSQL, que
 * es donde corre de verdad, funciona completa.
 */
@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    private static final String INSERTAR = """
            INSERT INTO evento_auditoria (usuario_id, tipo, ip, user_agent, detalle)
            VALUES (?, ?, CAST(? AS inet), ?, CAST(? AS jsonb))
            """;

    @PersistenceContext
    private EntityManager em;

    private final DataSource dataSource;
    private final ObjectMapper json;
    private boolean soportado = true;

    public AuditoriaService(DataSource dataSource, ObjectMapper json) {
        this.dataSource = dataSource;
        this.json = json;
    }

    /**
     * INET y JSONB son de PostgreSQL. Se comprueba una sola vez al arrancar para
     * no intentar (y fallar) en cada peticion cuando la base es H2.
     */
    @PostConstruct
    void detectarMotor() {
        try (Connection c = dataSource.getConnection()) {
            String motor = c.getMetaData().getDatabaseProductName();
            soportado = motor != null && motor.toLowerCase().contains("postgres");
            if (!soportado) {
                log.warn("Auditoria DESACTIVADA: el motor es {} y evento_auditoria usa INET/JSONB, "
                       + "que son de PostgreSQL. Es lo esperado en el arranque con H2.", motor);
            }
        } catch (Exception e) {
            soportado = false;
            log.warn("No se pudo determinar el motor de base de datos; auditoria desactivada", e);
        }
    }

    /**
     * ⚠️ Un unico metodo de entrada, y la extraccion de IP/agente se hace en el
     * llamador con los estaticos de abajo. La tentacion es anadir un overload
     * comodo que reciba el HttpServletRequest y delegue aqui, pero seria una
     * llamada interna: Spring no pasaria por el proxy y el REQUIRES_NEW no se
     * aplicaria, que es justo lo que evita que la auditoria tumbe al login.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String tipo, UUID usuarioId, String ip, String userAgent,
                          Map<String, Object> detalle) {
        if (!soportado) return;
        try {
            em.createNativeQuery(INSERTAR)
              .setParameter(1, usuarioId)
              .setParameter(2, tipo)
              .setParameter(3, ip)
              // El user agent puede venir enorme; se recorta para no guardar
              // basura en una columna que solo sirve para reconocer el cliente.
              .setParameter(4, userAgent == null ? null
                      : userAgent.substring(0, Math.min(userAgent.length(), 400)))
              .setParameter(5, json.writeValueAsString(detalle == null ? Map.of() : detalle))
              .executeUpdate();
        } catch (Exception e) {
            log.warn("No se pudo auditar el evento {} del usuario {}", tipo, usuarioId, e);
        }
    }

    /**
     * IP real del cliente.
     *
     * Detras del tunel de Cloudflare y del contenedor, `getRemoteAddr()` es
     * siempre la IP del proxy, que no sirve para nada. La cabecera estandar es
     * X-Forwarded-For, cuyo PRIMER valor es el cliente original.
     */
    public static String ipDe(HttpServletRequest peticion) {
        if (peticion == null) return null;
        String reenviada = peticion.getHeader("X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank()) {
            String primera = reenviada.split(",")[0].trim();
            if (!primera.isEmpty()) return primera;
        }
        return peticion.getRemoteAddr();
    }

    public static String agenteDe(HttpServletRequest peticion) {
        return peticion == null ? null : peticion.getHeader("User-Agent");
    }
}
