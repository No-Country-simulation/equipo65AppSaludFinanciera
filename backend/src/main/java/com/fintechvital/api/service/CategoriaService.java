package com.fintechvital.api.service;

import com.fintechvital.api.dto.CategoriaResponse;
import com.fintechvital.api.repository.CategoriaEtiquetaRepository;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * El catalogo de categorias que llena los desplegables de la interfaz.
 *
 * Lee `vw_categoria_etiqueta` (migracion V10) y no una lista en codigo: el
 * catalogo lo manda data science por INSERT y la API se adapta sola. Anadir una
 * categoria no toca ni una linea de Java.
 *
 * El idioma sale de `Accept-Language` via LocaleContextHolder (ADR-0009). Los
 * slugs NUNCA se traducen; las etiquetas SIEMPRE.
 */
@Service
public class CategoriaService {

    /** Los tres que existen en la base (idioma.codigo). Ver ADR-0009. */
    private static final Set<String> IDIOMAS = Set.of("es", "pt", "en");
    private static final String IDIOMA_POR_DEFECTO = "es";

    private final CategoriaEtiquetaRepository etiquetas;

    public CategoriaService(CategoriaEtiquetaRepository etiquetas) {
        this.etiquetas = etiquetas;
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> catalogo() {
        return etiquetas.catalogo(idiomaActual()).stream()
                .map(CategoriaResponse::de)
                .toList();
    }

    /**
     * Un idioma que no tenemos cae a español en silencio, nunca en un 4xx:
     * pedir el catalogo en aleman no es un error del cliente. La vista tiene su
     * propia cadena de respaldo, pero solo entre idiomas que existen en la
     * tabla `idioma`; uno que no existe devolveria CERO filas y dejaria el
     * desplegable vacio, que es exactamente el fallo que estamos arreglando.
     */
    private String idiomaActual() {
        String idioma = LocaleContextHolder.getLocale().getLanguage();
        return IDIOMAS.contains(idioma) ? idioma : IDIOMA_POR_DEFECTO;
    }
}
