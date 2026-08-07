package com.hackathon.analisis.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

/**
 * Idioma de la respuesta (ADR-0009: el proyecto es TRILINGUE es · pt · en).
 *
 * El idioma sale de la cabecera `Accept-Language`, con `es` por defecto. Un
 * idioma desconocido **cae al default en silencio**, nunca un 4xx: pedir la API
 * en aleman no es un error del cliente, es simplemente algo que no traducimos.
 */
@Configuration
public class I18nConfig {

    public static final Locale ES = Locale.forLanguageTag("es");
    public static final List<Locale> SOPORTADOS = List.of(
            ES, Locale.forLanguageTag("pt"), Locale.forLanguageTag("en"));

    @Bean
    public MessageSource messageSource() {
        var fuente = new ReloadableResourceBundleMessageSource();
        fuente.setBasename("classpath:mensajes");
        // ⚠️ Sin esto los bundles se leen en ISO-8859-1 (el default historico de
        // java.util.Properties) y "Alimentación" o "Saúde" salen con la tilde
        // rota. Es el bug clasico de i18n en Java y no se ve hasta que alguien
        // mira la respuesta en pt.
        fuente.setDefaultEncoding("UTF-8");
        fuente.setDefaultLocale(ES);
        // Si falta una clave se devuelve la clave misma en vez de reventar: un
        // texto sin traducir es feo, pero tumbar el analisis del jurado por una
        // linea que falta en un .properties es peor.
        fuente.setUseCodeAsDefaultMessage(true);
        return fuente;
    }

    @Bean
    public LocaleResolver localeResolver() {
        var resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(SOPORTADOS);
        resolver.setDefaultLocale(ES);
        return resolver;
    }
}
