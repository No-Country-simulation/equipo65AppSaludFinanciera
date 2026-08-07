package com.hackathon.analisis.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Cifrado simetrico para los secretos que hay que poder RECUPERAR en claro.
 *
 * Hoy lo usa una sola cosa: el secreto TOTP. Una contrasena se hashea (nunca se
 * recupera), pero el secreto TOTP hay que leerlo entero en cada login para
 * recalcular el codigo de 6 digitos, asi que hashearlo no sirve. Guardarlo en
 * claro tampoco: quien lea la tabla `usuario_seguridad` podria generar los
 * codigos de cualquier usuario y el segundo factor dejaria de ser un factor.
 *
 * AES-256-GCM. GCM y no CBC porque ademas de cifrar AUTENTICA: si alguien toca
 * un byte del texto cifrado, el descifrado falla en vez de devolver basura.
 *
 * Formato guardado: Base64( IV[12] || cifrado || tag[16] ). El IV va delante
 * porque hace falta para descifrar y no es secreto; lo que no puede repetirse
 * nunca con la misma clave, y por eso se sortea uno por operacion.
 */
@Service
public class CifradoService {

    private static final int BYTES_IV = 12;
    private static final int BITS_TAG = 128;

    private final SecretKeySpec clave;
    private final SecureRandom aleatorio = new SecureRandom();

    /**
     * Reutiliza el secreto del JWT por defecto para no multiplicar los secretos
     * que hay que configurar en el despliegue, pero admite uno propio: si algun
     * dia hay que rotar la firma de los tokens, rotarla no puede dejar ilegibles
     * los secretos TOTP ya guardados (seria echar a todos los usuarios de sus
     * cuentas de golpe).
     */
    public CifradoService(@Value("${fv.cifrado.secreto:${fv.jwt.secreto}}") String secreto) {
        // SHA-256 del secreto para tener exactamente los 32 bytes que pide
        // AES-256, venga el secreto de la longitud que venga.
        this.clave = new SecretKeySpec(sha256(secreto), "AES");
    }

    public String cifrar(String claro) {
        if (claro == null) return null;
        try {
            byte[] iv = new byte[BYTES_IV];
            aleatorio.nextBytes(iv);
            Cipher cifra = Cipher.getInstance("AES/GCM/NoPadding");
            cifra.init(Cipher.ENCRYPT_MODE, clave, new GCMParameterSpec(BITS_TAG, iv));
            byte[] cifrado = cifra.doFinal(claro.getBytes(StandardCharsets.UTF_8));

            byte[] salida = new byte[iv.length + cifrado.length];
            System.arraycopy(iv, 0, salida, 0, iv.length);
            System.arraycopy(cifrado, 0, salida, iv.length, cifrado.length);
            return Base64.getEncoder().encodeToString(salida);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo cifrar el secreto", e);
        }
    }

    public String descifrar(String guardado) {
        if (guardado == null) return null;
        try {
            byte[] todo = Base64.getDecoder().decode(guardado);
            byte[] iv = Arrays.copyOfRange(todo, 0, BYTES_IV);
            byte[] cifrado = Arrays.copyOfRange(todo, BYTES_IV, todo.length);

            Cipher cifra = Cipher.getInstance("AES/GCM/NoPadding");
            cifra.init(Cipher.DECRYPT_MODE, clave, new GCMParameterSpec(BITS_TAG, iv));
            return new String(cifra.doFinal(cifrado), StandardCharsets.UTF_8);
        } catch (Exception e) {
            // Pasa si cambio el secreto de cifrado o si la fila esta corrupta.
            // Se distingue del resto para que el log diga que hacer.
            throw new IllegalStateException(
                    "No se pudo descifrar el secreto TOTP. Suele significar que cambio "
                  + "fv.cifrado.secreto (o fv.jwt.secreto, del que deriva) despues de haberlo guardado.", e);
        }
    }

    private static byte[] sha256(String valor) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 no disponible en esta JVM", e);
        }
    }
}
