package com.hackathon.analisis.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Portada de la documentacion (Swagger UI en `/api/v1/docs`).
 *
 * "API documentada" es uno de los 8 requisitos minimos del enunciado, asi que
 * esta pagina es entregable: sin esto springdoc la titula "OpenAPI definition
 * v0", que no le dice nada a quien la abre.
 *
 * El esquema de seguridad se declara para que Swagger UI muestre el boton
 * "Authorize" y se puedan probar los endpoints protegidos pegando un token.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI api() {
        return new OpenAPI()
                .info(new Info()
                        .title("Fintech Vital - API")
                        .version("1.0.0")
                        .description("""
                                Analiza el comportamiento financiero de una persona a partir de sus
                                transacciones: clasifica los gastos, calcula indicadores, asigna un
                                perfil financiero y devuelve recomendaciones accionables.

                                **Los dos endpoints del enunciado son publicos** (sin token):
                                `POST /api/v1/analisis-financiero` (tambien en `/analisis-financiero`)
                                y `POST /api/v1/transacciones/clasificar`.

                                El resto exige `Authorization: Bearer <access_token>` y devuelve
                                unicamente los datos del usuario del token.

                                **Idioma**: cabecera `Accept-Language: es | pt | en` (por defecto `es`).
                                Los slugs (`alimentacion`, `en_riesgo`) nunca se traducen; las
                                etiquetas y los textos, siempre.

                                **Errores**: todos con la forma
                                `{codigo, mensaje, detalles[], traza_id}`. El `traza_id` es el mismo
                                que queda en el log del servidor.
                                """)
                        .license(new License().name("MIT")))
                .schemaRequirement("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Access token devuelto por POST /api/v1/auth/login"));
    }
}
