package com.fintechvital.api.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Credenciales del usuario. Mapea `usuario_seguridad` (db/migraciones/V2).
 *
 * Esta separada de Usuario a proposito: el 90% de las consultas leen el perfil
 * y no tienen ninguna razon para arrastrar el hash de la contrasena ni el
 * secreto TOTP en el mismo SELECT.
 *
 * La version anterior no llegaba a mapear: declaraba `@Id String idUsuario`
 * junto a un `@MapsId` sobre un @OneToOne a Usuario, cuyo id era Long. String
 * contra Long no encaja y habria fallado al arrancar en cuanto se usara.
 */
@Entity
@Table(name = "usuario_seguridad")
@Getter
@Setter
public class UsuarioSeguridad {

    @Id
    @Column(name = "usuario_id")
    private UUID usuarioId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    /** BCrypt cost 12. Nunca la contrasena en claro. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "password_cambiado_en")
    private OffsetDateTime passwordCambiadoEn;

    @Column(name = "requiere_cambio_password", nullable = false)
    private boolean requiereCambioPassword = false;

    /** Cifrado con la clave de aplicacion, no en claro. */
    @Column(name = "totp_secreto")
    private String totpSecreto;

    @Column(name = "totp_activo", nullable = false)
    private boolean totpActivo = false;

    @Column(name = "totp_activado_en")
    private OffsetDateTime totpActivadoEn;

    @Column(name = "totp_ultimo_paso")
    private Long totpUltimoPaso;

    @Column(name = "intentos_fallidos", nullable = false)
    private short intentosFallidos = 0;

    @Column(name = "ultimo_intento_fallido")
    private OffsetDateTime ultimoIntentoFallido;

    @Column(name = "bloqueado_hasta")
    private OffsetDateTime bloqueadoHasta;
}
