package com.fintechvital.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuracion CORS unica para toda la API.
 *
 * Sustituye a las anotaciones @CrossOrigin(origins = "*") que habia sueltas en
 * tres controladores. Tenian dos problemas:
 *
 *   1. AuthController NO la llevaba, asi que el login fallaba desde el navegador
 *      en cuanto la web y la API viven en dominios distintos - que es
 *      exactamente el caso de staging (staging.fintechvital.com llamando a
 *      api-staging.fintechvital.com).
 *   2. "*" es incompatible con allowCredentials(true): el navegador rechaza esa
 *      combinacion. Y ademas el contrato pide restringir a los origenes reales,
 *      no abrir la API a cualquier sitio web.
 *
 * Los origenes se configuran por entorno (FV_CORS_ORIGINS, separados por comas),
 * asi que la misma imagen sirve para local, staging y produccion.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    /**
     * Origenes permitidos. Por defecto, los del proyecto. Se sobreescribe con la
     * variable de entorno FV_CORS_ORIGINS.
     *
     * Ojo: es el ORIGEN (esquema + host + puerto), sin ruta y sin barra final.
     */
    @Value("${fv.cors.origins:http://localhost:3000,https://staging.fintechvital.com,https://fintechvital.com,https://www.fintechvital.com}")
    private String[] origenes;

    @Override
    public void addCorsMappings(CorsRegistry registro) {
        registro.addMapping("/api/**")
                // allowedOriginPatterns y no allowedOrigins: permite comodines
                // (util para previsualizaciones tipo *.fintechvital.com) y es
                // compatible con allowCredentials.
                .allowedOriginPatterns(origenes)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                // El frontend anuncia el idioma con Accept-Language y la API
                // responde con Content-Language: sin exponerla, el navegador la
                // oculta al JavaScript.
                .exposedHeaders("Content-Language", "Retry-After")
                // La app usa Bearer en cabecera, no cookies, pero dejarlo
                // habilitado evita tener que volver aqui si algun dia el
                // refresh token viaja en cookie httpOnly.
                .allowCredentials(true)
                // Cachea el preflight 1 h: sin esto el navegador manda un
                // OPTIONS extra antes de CADA peticion.
                .maxAge(3600);
    }
}
