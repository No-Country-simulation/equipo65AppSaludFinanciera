package com.hackathon.analisis.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.hackathon.analisis.error.ErrorNegocio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Cliente del servicio de inferencia (CONTRATO_MODELO §3 y §4).
 *
 * Tres reglas que NO son negociables:
 *
 *  1. **Timeout corto (5 s).** Sin timeout, un ML colgado deja peticiones
 *     esperando hasta agotar el pool de hilos de Tomcat y se cae la API entera,
 *     no solo el analisis.
 *  2. **Un reintento**, solo para errores de red o 5xx. Un 422 no se reintenta:
 *     si la entrada estaba mal, va a seguir mal.
 *  3. **503 si no responde. NUNCA una prediccion inventada** ni un valor por
 *     defecto. Es preferible decir "ahora no puedo analizar" a decirle a alguien
 *     que su salud financiera es buena porque el modelo no contesto.
 */
@Service
public class ClienteMlService {

    private static final Logger log = LoggerFactory.getLogger(ClienteMlService.class);

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final Duration ESPERA_REINTENTO = Duration.ofMillis(200);

    private final RestClient http;
    private final String claveInterna;

    public ClienteMlService(@Value("${fv.ml.url:http://ml:8000}") String urlBase,
                            @Value("${fv.clave-interna:}") String claveInterna) {
        this.claveInterna = claveInterna;

        var fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout((int) TIMEOUT.toMillis());
        fabrica.setReadTimeout((int) TIMEOUT.toMillis());

        this.http = RestClient.builder().baseUrl(urlBase).requestFactory(fabrica).build();
    }

    /** Categoria de cada descripcion. El indice de la respuesta reasocia con la entrada. */
    public RespuestaClasificar clasificar(List<EntradaTransaccion> transacciones) {
        Map<String, Object> cuerpo = Map.of("transacciones", transacciones);
        return llamar("/interno/v1/clasificar", cuerpo, RespuestaClasificar.class);
    }

    /**
     * Perfil financiero a partir de los indicadores que ya calculo Spring.
     *
     * No se manda `contexto` (ingreso, ahorro y score de buro en montos): este
     * endpoint es publico y no hay usuario, asi que esos datos no existen. El
     * servicio de ML lo sabe y aplica su regla determinista. Ver ml/README.md.
     */
    public RespuestaPerfil perfil(Map<String, Object> indicadores) {
        return llamar("/interno/v1/perfil", Map.of("indicadores", indicadores), RespuestaPerfil.class);
    }

    private <T> T llamar(String ruta, Object cuerpo, Class<T> tipo) {
        try {
            return intentar(ruta, cuerpo, tipo);
        } catch (Exception primera) {
            log.warn("Fallo la llamada al ML en {}: {}. Se reintenta una vez.", ruta, primera.toString());
            try {
                Thread.sleep(ESPERA_REINTENTO.toMillis());
                return intentar(ruta, cuerpo, tipo);
            } catch (InterruptedException e) {
                // Restaurar el flag: tragarselo deja el hilo sin saber que lo
                // interrumpieron y rompe el apagado ordenado del servidor.
                Thread.currentThread().interrupt();
                throw noDisponible(e);
            } catch (Exception segunda) {
                log.error("El servicio de ML no responde en {}", ruta, segunda);
                throw noDisponible(segunda);
            }
        }
    }

    private <T> T intentar(String ruta, Object cuerpo, Class<T> tipo) {
        return http.post()
                .uri(ruta)
                .contentType(MediaType.APPLICATION_JSON)
                .headers(h -> {
                    if (!claveInterna.isBlank()) h.set("X-Clave-Interna", claveInterna);
                })
                .body(cuerpo)
                .retrieve()
                .body(tipo);
    }

    private static ErrorNegocio noDisponible(Exception causa) {
        return new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "ML_NO_DISPONIBLE",
                "El servicio de analisis no esta disponible en este momento");
    }

    // ------------------------------------------------------------ contratos ---

    public record EntradaTransaccion(
            @JsonProperty("id") String id,
            @JsonProperty("descripcion") String descripcion,
            @JsonProperty("valor") BigDecimal valor) {}

    /**
     * ⚠️ Los nombres van con @JsonProperty EXPLICITO y no confiando en la
     * estrategia snake_case global.
     *
     * Es una frontera entre servicios: si el nombre no casa, Jackson no falla,
     * deja el campo en `null` y la respuesta sale sin `modelo_version` -- que es
     * exactamente lo que pasaba. Un fallo silencioso en la costura DS/backend es
     * el peor sitio donde tener uno, asi que aqui se escribe el nombre del
     * contrato tal cual, y se acabo la dependencia de una config global que
     * alguien puede cambiar sin saber que rompe esto.
     */
    public record RespuestaClasificar(
            @JsonProperty("modelo_version") String modeloVersion,
            @JsonProperty("resultados") List<ResultadoClasificacion> resultados) {}

    public record ResultadoClasificacion(
            @JsonProperty("id") String id,
            @JsonProperty("categoria") String categoria,
            @JsonProperty("confianza") BigDecimal confianza,
            @JsonProperty("origen") String origen) {}

    public record RespuestaPerfil(
            @JsonProperty("modelo_version") String modeloVersion,
            @JsonProperty("perfil") String perfil,
            @JsonProperty("probabilidad") BigDecimal probabilidad,
            @JsonProperty("probabilidades") Map<String, BigDecimal> probabilidades,
            @JsonProperty("explicacion") List<Map<String, Object>> explicacion,
            @JsonProperty("origen") String origen
    ) {}
}
