package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Traza de seguridad. Mapea `evento_auditoria` (db/migraciones/V2).
 *
 * `usuarioId` es nullable y en la BD va con ON DELETE SET NULL a proposito:
 * borrar una cuenta no puede borrar la evidencia de lo que paso con ella.
 *
 * ⚠️ `ip` (INET) y `detalle` (JSONB) son de SOLO LECTURA para Hibernate.
 * Leerlos como texto funciona -- el driver los devuelve serializados -- pero
 * ESCRIBIRLOS no: el driver mandaria `varchar` y PostgreSQL rechaza la fila con
 * "column ip is of type inet but expression is of type character varying".
 * Por eso las altas las hace AuditoriaService con un INSERT nativo que castea.
 * Mapearlos aqui como escribibles obligaria a meter una dependencia (o a
 * degradar las columnas a texto en la base), y ninguna de las dos vale la pena.
 */
@Entity
@Table(name = "evento_auditoria")
@Getter
@Setter
public class EventoAuditoria {

    /** Los unicos valores que acepta el CHECK de la tabla. */
    public static final class Tipo {
        private Tipo() {}
        public static final String LOGIN_OK = "LOGIN_OK";
        public static final String LOGIN_FALLIDO = "LOGIN_FALLIDO";
        public static final String BLOQUEO = "BLOQUEO";
        public static final String PASSWORD_CAMBIADO = "PASSWORD_CAMBIADO";
        public static final String DOS_FA_ACTIVADO = "2FA_ACTIVADO";
        public static final String DOS_FA_DESACTIVADO = "2FA_DESACTIVADO";
        public static final String REFRESH_REUSADO = "REFRESH_REUSADO";
        public static final String ANALISIS_EJECUTADO = "ANALISIS_EJECUTADO";
        public static final String DATOS_EXPORTADOS = "DATOS_EXPORTADOS";
        public static final String CUENTA_BORRADA = "CUENTA_BORRADA";
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id")
    private UUID usuarioId;

    @Column(nullable = false)
    private String tipo;

    @Column(insertable = false, updatable = false)
    private String ip;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(insertable = false, updatable = false)
    private String detalle;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;
}
