package com.fintechvital.api.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Emision y verificacion de tokens.
 *
 *  - Access token: JWT HS256, TTL 15 min, claims `sub` (id de usuario), `email`
 *    y `rol`. Va en la cabecera Authorization.
 *  - Refresh token: NO es un JWT. Es un valor opaco de 256 bits aleatorios que
 *    se guarda hasheado en la tabla `refresh_token`. Asi se puede revocar; un
 *    JWT autocontenido no se puede invalidar antes de que expire.
 */
@Service
public class JwtService {

    private final SecretKey clave;
    private final long ttlAccessSegundos;
    private final long ttlRefreshSegundos;
    private final SecureRandom aleatorio = new SecureRandom();

    public JwtService(
            @Value("${fv.jwt.secreto}") String secreto,
            @Value("${fv.jwt.ttl-access-segundos:900}") long ttlAccessSegundos,
            @Value("${fv.jwt.ttl-refresh-segundos:604800}") long ttlRefreshSegundos) {

        // HS256 exige al menos 256 bits de clave. Se avisa fuerte en vez de
        // dejar que arranque con una clave debil: un secreto corto hace que los
        // tokens se puedan falsificar.
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "fv.jwt.secreto es demasiado corto (" + bytes.length + " bytes). "
                  + "Se necesitan al menos 32. Define FV_JWT_SECRETO con un valor generado, "
                  + "por ejemplo: openssl rand -base64 48");
        }
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.ttlAccessSegundos = ttlAccessSegundos;
        this.ttlRefreshSegundos = ttlRefreshSegundos;
    }

    public long getTtlAccessSegundos() {
        return ttlAccessSegundos;
    }

    public long getTtlRefreshSegundos() {
        return ttlRefreshSegundos;
    }

    public String generarAccessToken(UUID usuarioId, String email, String rol) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .subject(usuarioId.toString())
                .claim("email", email)
                .claim("rol", rol)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plusSeconds(ttlAccessSegundos)))
                .signWith(clave)
                .compact();
    }

    /** Devuelve los claims, o null si el token es invalido o expiro. */
    public Claims verificar(String token) {
        try {
            return Jwts.parser().verifyWith(clave).build()
                    .parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /** Valor opaco para el refresh token. Se devuelve al cliente EN CLARO una sola vez. */
    public String generarRefreshToken() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 en hexadecimal. Es lo unico que se guarda del refresh token. */
    public String hashear(String valor) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] resumen = md.digest(valor.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(resumen.length * 2);
            for (byte b : resumen) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible en esta JVM", e);
        }
    }
}
