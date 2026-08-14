package com.fintechvital.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;

/**
 * TOTP (RFC 6238), el segundo factor que piden Google Authenticator, Authy,
 * 1Password y cualquier otra app de codigos.
 *
 * Se implementa a mano en vez de traer una libreria: son unas 60 lineas de
 * norma muy estable y evita anadir una dependencia al pom (que es archivo
 * compartido y hay que avisar antes de tocarlo).
 *
 * Parametros: HMAC-SHA1, 6 digitos, paso de 30 s. No son un gusto personal, son
 * los que asumen por defecto TODAS las apps autenticadoras; cambiarlos hace que
 * el codigo que muestra el telefono no coincida con el que espera el servidor.
 */
@Service
public class TotpService {

    /** RFC 4648 §6. Es el alfabeto que entienden las apps al leer el QR. */
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int DIGITOS = 6;
    private static final long PASO_SEGUNDOS = 30;
    private static final int MODULO = 1_000_000; // 10^DIGITOS

    /**
     * Ventana de tolerancia, en pasos hacia atras y hacia delante.
     *
     * 1 = se aceptan el codigo anterior, el actual y el siguiente (±30 s). Cubre
     * el reloj desfasado del telefono y al usuario que teclea justo cuando el
     * codigo cambia. Subirlo agranda la ventana de un atacante que capture un
     * codigo; bajarlo a 0 genera fallos legitimos constantes.
     */
    private static final int VENTANA = 1;

    private final SecureRandom aleatorio = new SecureRandom();
    private final String emisor;

    public TotpService(@Value("${fv.totp.emisor:Fintech Vital}") String emisor) {
        this.emisor = emisor;
    }

    /** Secreto nuevo en Base32: 160 bits, que es lo que recomienda la RFC para SHA-1. */
    public String generarSecreto() {
        byte[] bytes = new byte[20];
        aleatorio.nextBytes(bytes);
        return aBase32(bytes);
    }

    /**
     * URI `otpauth://` que se codifica en el QR.
     *
     * La etiqueta lleva `Emisor:cuenta` y ademas se repite el emisor como
     * parametro: la primera forma es la que muestran las apps viejas y la
     * segunda la que leen las nuevas. Poner solo una hace que en algunos
     * telefonos la cuenta aparezca sin nombre.
     */
    public String uriOtpauth(String secreto, String email) {
        String etiqueta = codificar(emisor + ":" + email);
        return "otpauth://totp/" + etiqueta
             + "?secret=" + secreto
             + "&issuer=" + codificar(emisor)
             + "&algorithm=SHA1&digits=" + DIGITOS + "&period=" + PASO_SEGUNDOS;
    }

    /**
     * Comprueba un codigo y devuelve el paso temporal con el que coincidio, o
     * `null` si no coincide con ninguno de la ventana.
     *
     * Se devuelve el paso y no un booleano para que el llamador pueda guardarlo
     * en `usuario_seguridad.totp_ultimo_paso` y RECHAZAR el mismo codigo si se
     * reenvia: sin eso, quien vea el codigo por encima del hombro tiene 30
     * segundos para reusarlo.
     */
    public Long verificar(String secreto, String codigo, Long ultimoPasoUsado) {
        if (secreto == null || codigo == null) return null;
        String limpio = codigo.replaceAll("\\s", "");
        if (!limpio.matches("\\d{" + DIGITOS + "}")) return null;

        long pasoActual = Instant.now().getEpochSecond() / PASO_SEGUNDOS;
        byte[] clave = deBase32(secreto);

        for (long paso = pasoActual - VENTANA; paso <= pasoActual + VENTANA; paso++) {
            // Un codigo ya gastado no vale, aunque siga dentro de su ventana.
            if (ultimoPasoUsado != null && paso <= ultimoPasoUsado) continue;
            if (iguales(limpio, codigoDe(clave, paso))) return paso;
        }
        return null;
    }

    /**
     * El codigo de 6 digitos de un paso concreto.
     *
     * Visible en el paquete (y no privado) para que el test lo pueda contrastar
     * con los vectores de prueba de la RFC 6238: es la unica forma de demostrar
     * que esta implementacion a mano genera los MISMOS codigos que Google
     * Authenticator, y no unos parecidos.
     */
    String codigoDe(byte[] clave, long paso) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(clave, "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(paso).array());

            // Truncamiento dinamico (RFC 4226 §5.3): los 4 bits bajos del ultimo
            // byte dicen desde donde leer los 4 bytes que forman el numero.
            int desplazamiento = hash[hash.length - 1] & 0x0F;
            int binario = ((hash[desplazamiento] & 0x7F) << 24)
                        | ((hash[desplazamiento + 1] & 0xFF) << 16)
                        | ((hash[desplazamiento + 2] & 0xFF) << 8)
                        | (hash[desplazamiento + 3] & 0xFF);

            return String.format("%0" + DIGITOS + "d", binario % MODULO);
        } catch (Exception e) {
            throw new IllegalStateException("HmacSHA1 no disponible en esta JVM", e);
        }
    }

    /**
     * Comparacion en tiempo constante.
     *
     * Un `equals` normal corta en cuanto encuentra el primer caracter distinto,
     * y esa diferencia de tiempo permite adivinar el codigo digito a digito.
     * Con 6 digitos el ataque es teorico, pero cuesta dos lineas evitarlo.
     */
    private static boolean iguales(String a, String b) {
        if (a.length() != b.length()) return false;
        int diferencia = 0;
        for (int i = 0; i < a.length(); i++) diferencia |= a.charAt(i) ^ b.charAt(i);
        return diferencia == 0;
    }

    private static String codificar(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8).replace("+", "%20");
    }

    static String aBase32(byte[] datos) {
        StringBuilder salida = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte b : datos) {
            buffer = (buffer << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                salida.append(BASE32.charAt((buffer >> (bits - 5)) & 0x1F));
                bits -= 5;
            }
        }
        if (bits > 0) salida.append(BASE32.charAt((buffer << (5 - bits)) & 0x1F));
        return salida.toString();
    }

    static byte[] deBase32(String texto) {
        String limpio = texto.trim().replace("=", "").toUpperCase();
        int buffer = 0;
        int bits = 0;
        byte[] salida = new byte[limpio.length() * 5 / 8];
        int i = 0;
        for (char c : limpio.toCharArray()) {
            int valor = BASE32.indexOf(c);
            if (valor < 0) throw new IllegalArgumentException("Secreto TOTP con un caracter no Base32: " + c);
            buffer = (buffer << 5) | valor;
            bits += 5;
            if (bits >= 8) {
                salida[i++] = (byte) ((buffer >> (bits - 8)) & 0xFF);
                bits -= 8;
            }
        }
        return salida;
    }
}
