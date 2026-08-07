package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Un intento de inicio de sesion. Mapea `intento_login` (db/migraciones/V2).
 *
 * NO tiene FK a usuario a proposito: hay que poder registrar intentos contra
 * correos que no existen, que es justo el patron de un ataque de enumeracion.
 * Es la tabla sobre la que cuenta el bloqueo por fuerza bruta.
 *
 * ⚠️ `ip` es INET y va de solo lectura; ver la nota de EventoAuditoria.
 */
@Entity
@Table(name = "intento_login")
@Getter
@Setter
public class IntentoLogin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(insertable = false, updatable = false)
    private String ip;

    @Column(nullable = false)
    private boolean exito;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;
}
