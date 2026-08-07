package com.hackathon.analisis.config;

import com.hackathon.analisis.security.JwtFiltro;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Seguridad de la API.
 *
 * ⚠️ Criterio importante: se abre por defecto y se protege lo concreto, en vez
 * de cerrar todo de golpe. Anadir Spring Security bloquea TODOS los endpoints
 * salvo que se configure, y eso habria roto de un dia para otro los endpoints
 * publicos que ya funcionaban (el del enunciado, entre ellos).
 *
 * A medida que se implemente cada endpoint del contrato hay que ir moviendolo
 * de `permitAll` a `authenticated`. Lo que YA esta protegido son las rutas de
 * usuario, porque son las unicas que devuelven datos personales.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFiltro jwtFiltro;

    public SecurityConfig(JwtFiltro jwtFiltro) {
        this.jwtFiltro = jwtFiltro;
    }

    /**
     * BCrypt cost 12. El coste por defecto de Spring es 10; 12 multiplica por 4
     * el trabajo de quien intente romper el hash y sigue siendo imperceptible en
     * un login (~250 ms).
     *
     * Verifica sin problema los hashes `$2a$` que genera pgcrypto en la semilla.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // La API no usa cookies de sesion: el token va en la cabecera, asi
            // que CSRF no aplica y activarlo solo rompe las peticiones.
            .csrf(csrf -> csrf.disable())
            // El CORS lo define CorsConfig; aqui solo se le dice a Security que
            // lo respete (si no, el preflight muere antes de llegar).
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Preflight: siempre abierto, no lleva credenciales.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // --- Protegido: datos personales del usuario ---
                .requestMatchers("/api/v1/usuarios/**").authenticated()
                .requestMatchers("/api/v1/auth/logout").authenticated()
                // El 2FA cuelga de /auth pero exige token: para configurar el
                // SEGUNDO factor hay que haber pasado el primero. Va declarado
                // ANTES del permitAll de /api/v1/auth/** porque en Spring
                // Security gana la primera regla que casa, no la mas especifica.
                .requestMatchers("/api/v1/auth/2fa", "/api/v1/auth/2fa/**").authenticated()
                // Banca: todo sale filtrado por el usuario del token (RN9).
                .requestMatchers("/api/v1/cuentas/**", "/api/v1/tarjetas/**",
                                 "/api/v1/buro/**").authenticated()

                // --- Publico ---
                .requestMatchers("/api/v1/auth/**").permitAll()
                // Los dos del enunciado. Publicos a proposito: es lo que el
                // jurado va a probar con un curl, sin registrarse.
                .requestMatchers("/api/v1/analisis-financiero", "/analisis-financiero").permitAll()
                .requestMatchers("/api/v1/transacciones/clasificar").permitAll()
                .requestMatchers("/api/v1/salud", "/api/v1/categorias", "/api/v1/monedas").permitAll()
                // Documentacion: Swagger UI y la especificacion OpenAPI. Es un
                // requisito del enunciado, asi que tiene que verse sin token.
                .requestMatchers("/api/v1/docs", "/api/v1/docs/**",
                                 "/api/v1/openapi.json", "/api/v1/openapi.json/**",
                                 "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                // Rutas heredadas que el equipo ya tenia en marcha. Se mantienen
                // abiertas para no romper nada mientras se migran a /api/v1.
                .requestMatchers("/api/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .anyRequest().permitAll()
            )
            // Sin esto, un 401 devolveria la pagina de login HTML de Spring en vez
            // del JSON de error del contrato.
            .exceptionHandling(e -> e.authenticationEntryPoint(
                    (req, res, ex) -> {
                        res.setStatus(401);
                        res.setContentType("application/json;charset=UTF-8");
                        res.getWriter().write(
                            "{\"codigo\":\"NO_AUTENTICADO\","
                          + "\"mensaje\":\"Falta el token de acceso o no es valido\","
                          + "\"detalles\":[],\"traza_id\":\"\"}");
                    }))
            .addFilterBefore(jwtFiltro, UsernamePasswordAuthenticationFilter.class)
            // La consola de H2 se pinta en un frame; solo aplica en desarrollo.
            .headers(h -> h.frameOptions(f -> f.sameOrigin()));

        return http.build();
    }
}
