package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Codigo de respaldo de 2FA. Mapea `codigo_respaldo_2fa` (db/migraciones/V2).
 *
 * Con 2FA obligatorio (ADR-0013), perder el telefono sin codigos de respaldo
 * significa perder la cuenta. Se guardan HASHEADOS igual que una contrasena: si
 * alguien lee la tabla, no puede entrar con lo que ve.
 *
 * Son de un solo uso: al gastarse se marca `usadoEn` en vez de borrarse, para
 * que quede traza de que se uso uno.
 */
@Entity
@Table(name = "codigo_respaldo_2fa")
@Getter
@Setter
public class CodigoRespaldo2fa {

    @Id
    @GeneratedValue
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "codigo_hash", nullable = false)
    private String codigoHash;

    @Column(name = "usado_en")
    private OffsetDateTime usadoEn;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;
}
