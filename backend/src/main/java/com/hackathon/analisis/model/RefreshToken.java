package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Refresh token rotativo. Mapea `refresh_token` (db/migraciones/V2).
 *
 * Del token solo se guarda su SHA-256: en claro no se almacena nunca. Rotar
 * conserva la `familiaId`, y si llega un refresh cuyo `usadoEn` ya no es null
 * significa que alguien lo reuso -> se revoca la familia entera. Es deteccion
 * de robo de token, y sale casi gratis.
 */
@Entity
@Table(name = "refresh_token")
@Getter
@Setter
public class RefreshToken {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "familia_id", nullable = false)
    private UUID familiaId;

    @Column(name = "expira_en", nullable = false)
    private OffsetDateTime expiraEn;

    @Column(name = "usado_en")
    private OffsetDateTime usadoEn;

    @Column(name = "revocado_en")
    private OffsetDateTime revocadoEn;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;
}
