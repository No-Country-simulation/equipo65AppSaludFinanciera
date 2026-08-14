package com.fintechvital.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TOTP contrastado con los VECTORES DE PRUEBA de la RFC 6238 (apendice B).
 *
 * Es la prueba que de verdad importa de este servicio: el algoritmo esta escrito
 * a mano, y si generara codigos que no coinciden con los de Google Authenticator
 * o Authy, el 2FA quedaria roto para todos los usuarios y solo se descubriria
 * cuando alguien no pudiera entrar. Un test propio ("genera 6 digitos") no
 * detectaria eso; estos vectores, si.
 */
class TotpServiceTest {

    /** El secreto de la RFC para SHA-1: "12345678901234567890" en ASCII. */
    private static final byte[] SECRETO_RFC =
            "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    private final TotpService totp = new TotpService("Fintech Vital");

    /**
     * La RFC publica los codigos a 8 digitos; aqui se usan 6, que es lo que
     * esperan las apps autenticadoras, asi que se comparan los 6 ultimos.
     *
     * `paso` es el contador: segundos desde epoch / 30.
     */
    @ParameterizedTest(name = "paso {0} -> {1}")
    @CsvSource({
            "1,          287082",   // T = 59
            "37037036,   081804",   // T = 1111111109
            "37037037,   050471",   // T = 1111111111
            "41152263,   005924",   // T = 1234567890
            "66666666,   279037",   // T = 2000000000
            "666666666,  353130",   // T = 20000000000
    })
    @DisplayName("genera los mismos codigos que los vectores de la RFC 6238")
    void codigosDeLaRfc(long paso, String esperado) {
        assertEquals(esperado, totp.codigoDe(SECRETO_RFC, paso));
    }

    @Test
    @DisplayName("Base32 va y vuelve sin perder bytes")
    void base32IdaYVuelta() {
        byte[] original = totp.generarSecreto().getBytes(StandardCharsets.US_ASCII);
        String base32 = TotpService.aBase32(original);
        assertArrayEquals(original, TotpService.deBase32(base32));
    }

    @Test
    @DisplayName("el secreto generado es Base32 valido de 160 bits")
    void secretoGenerado() {
        String secreto = totp.generarSecreto();
        // 20 bytes -> 32 caracteres Base32.
        assertEquals(32, secreto.length());
        assertTrue(secreto.matches("[A-Z2-7]+"), "solo alfabeto Base32: " + secreto);
        assertEquals(20, TotpService.deBase32(secreto).length);
    }

    @Test
    @DisplayName("un codigo ya gastado no vale una segunda vez")
    void noReutilizaCodigo() {
        String secreto = totp.generarSecreto();
        long pasoActual = java.time.Instant.now().getEpochSecond() / 30;
        String codigo = totp.codigoDe(TotpService.deBase32(secreto), pasoActual);

        assertEquals(pasoActual, totp.verificar(secreto, codigo, null),
                "la primera vez tiene que aceptarlo");
        assertNull(totp.verificar(secreto, codigo, pasoActual),
                "con el paso ya registrado tiene que rechazarlo");
    }

    @Test
    @DisplayName("rechaza lo que no sea un codigo de 6 digitos")
    void rechazaEntradasMalas() {
        String secreto = totp.generarSecreto();
        assertNull(totp.verificar(secreto, "12345", null));
        assertNull(totp.verificar(secreto, "abcdef", null));
        assertNull(totp.verificar(secreto, "", null));
        assertNull(totp.verificar(secreto, null, null));
    }

    @Test
    @DisplayName("el otpauth_uri lleva lo que necesitan las apps para leer el QR")
    void uriOtpauth() {
        String uri = totp.uriOtpauth("JBSWY3DPEHPK3PXP", "ana@ejemplo.com");
        assertTrue(uri.startsWith("otpauth://totp/"), uri);
        assertTrue(uri.contains("secret=JBSWY3DPEHPK3PXP"), uri);
        // El emisor va dos veces a proposito: en la etiqueta para las apps
        // viejas y como parametro para las nuevas.
        assertTrue(uri.contains("Fintech%20Vital%3Aana%40ejemplo.com"), uri);
        assertTrue(uri.contains("issuer=Fintech%20Vital"), uri);
        assertTrue(uri.contains("digits=6"), uri);
        assertTrue(uri.contains("period=30"), uri);
    }
}
