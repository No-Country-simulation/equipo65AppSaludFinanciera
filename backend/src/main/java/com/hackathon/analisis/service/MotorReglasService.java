package com.hackathon.analisis.service;

import com.hackathon.analisis.dominio.Indicadores;
import com.hackathon.analisis.dominio.Taxonomia;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Motor de reglas -> recomendaciones (TAXONOMIA §4).
 *
 * **Determinista y auditable, NO un LLM** (ADR-0007). Ante el jurado se puede
 * abrir esta clase y senalar la linea exacta que produjo cada consejo; con un
 * modelo generativo la respuesta seria "no sabemos por que dijo eso". Ademas no
 * puede alucinar un consejo financiero, que en este dominio importa.
 *
 * ⚠️ **Una regla NUNCA devuelve texto**: devuelve `codigo` + `parametros`. El
 * texto se arma al final, con el idioma de la peticion. Si se guardara la frase
 * en espanol, el historial quedaria congelado en espanol para siempre y un
 * usuario brasileno veria sus analisis viejos en un idioma que no eligio.
 */
@Service
public class MotorReglasService {

    /** RN8: se evaluan todas, se devuelven como mucho estas. */
    private static final int MAXIMO = 5;

    /** REC_CATEGORIA_EXCESO puede dispararse en varias categorias; se cortan aqui. */
    private static final int MAXIMO_POR_CATEGORIA = 2;

    private final MessageSource mensajes;

    public MotorReglasService(MessageSource mensajes) {
        this.mensajes = mensajes;
    }

    public List<Recomendacion> evaluar(Indicadores ind,
                                       Map<String, BigDecimal> gastoPorCategoria,
                                       BigDecimal ingresoMensual,
                                       Locale idioma) {
        List<Recomendacion> encontradas = new ArrayList<>();

        // --- Prioridad ALTA ---

        // Va primero porque cambia como se lee TODO lo demas: si el usuario solo
        // cargo tres transacciones, su "tasa de ahorro del 83%" no significa que
        // ahorre, significa que falta informacion. Sin este aviso, el analisis
        // felicitaria a alguien por gastar poco cuando en realidad no cargo sus
        // gastos. (Es exactamente el caso del ejemplo del enunciado.)
        if (ind.ratioGastoIngreso().compareTo(new BigDecimal("0.30")) < 0) {
            BigDecimal pct = ind.ratioGastoIngreso()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP);
            encontradas.add(regla("REC_DATOS_PARCIALES", Prioridad.ALTA, "ratio_gasto_ingreso",
                    Map.of("pct", pct.toPlainString())));
        }
        if (ind.tasaAhorro().signum() < 0) {
            encontradas.add(regla("REC_DEFICIT", Prioridad.ALTA, "tasa_ahorro", Map.of()));
        }
        if (ind.ratioEndeudamiento().compareTo(new BigDecimal("0.40")) > 0) {
            encontradas.add(regla("REC_DEUDA_ALTA", Prioridad.ALTA, "ratio_endeudamiento", Map.of()));
        }
        if (ind.tasaAhorro().signum() >= 0
                && ind.tasaAhorro().compareTo(new BigDecimal("0.10")) < 0) {
            encontradas.add(regla("REC_AHORRO_BAJO", Prioridad.ALTA, "tasa_ahorro", Map.of()));
        }
        if (ind.frecuenciaAhorroNum() == 0) {
            encontradas.add(regla("REC_SIN_AHORRO", Prioridad.ALTA, "frecuencia_ahorro_num", Map.of()));
        }

        // --- Prioridad MEDIA ---

        if (ind.ratioGastoEsencial().compareTo(new BigDecimal("0.60")) > 0) {
            encontradas.add(regla("REC_ESENCIAL_ALTO", Prioridad.MEDIA, "ratio_gasto_esencial", Map.of()));
        }
        if (ind.ratioGastoDiscrecional().compareTo(new BigDecimal("0.30")) > 0) {
            encontradas.add(regla("REC_DISCRECIONAL_ALTO", Prioridad.MEDIA, "ratio_gasto_discrecional", Map.of()));
        }
        if (ind.concentracionGasto().compareTo(new BigDecimal("0.50")) > 0) {
            categoriaDominante(gastoPorCategoria).ifPresent(categoria ->
                    encontradas.add(regla("REC_CONCENTRACION", Prioridad.MEDIA, "concentracion_gasto",
                            Map.of("categoria", categoria))));
        }
        if (ind.ratioRecurrente().compareTo(new BigDecimal("0.15")) > 0) {
            encontradas.add(regla("REC_RECURRENTE_ALTO", Prioridad.MEDIA, "ratio_recurrente", Map.of()));
        }
        encontradas.addAll(categoriasPasadasDeUmbral(gastoPorCategoria, ingresoMensual));

        // --- Prioridad BAJA ---

        if (ind.tasaAhorro().compareTo(new BigDecimal("0.20")) >= 0
                && ind.ratioEndeudamiento().compareTo(new BigDecimal("0.20")) <= 0) {
            encontradas.add(regla("REC_CONSOLIDA", Prioridad.BAJA, "tasa_ahorro", Map.of()));
        }

        // Orden estable: primero por prioridad y, dentro de una prioridad, por el
        // orden en que se evaluaron. `sorted` de Java es estable, asi que dos
        // analisis identicos devuelven siempre la misma lista.
        return encontradas.stream()
                .sorted(Comparator.comparingInt(r -> Prioridad.orden(r.prioridad())))
                .limit(MAXIMO)
                .map(r -> r.conTexto(renderizar(r, idioma)))
                .toList();
    }

    /**
     * Categorias que se pasan de su umbral (TAXONOMIA §4).
     *
     * Se ordenan por cuanto se pasan, no por monto: gastar el triple del umbral
     * en `otros` es mas informativo que pasarse un 5% en vivienda, aunque
     * vivienda sea mas plata.
     */
    private List<Recomendacion> categoriasPasadasDeUmbral(Map<String, BigDecimal> gastoPorCategoria,
                                                          BigDecimal ingresoMensual) {
        record Exceso(String categoria, BigDecimal veces) {}

        return gastoPorCategoria.entrySet().stream()
                .filter(e -> Taxonomia.UMBRALES.containsKey(e.getKey()))
                .map(e -> {
                    BigDecimal umbral = Taxonomia.UMBRALES.get(e.getKey());
                    BigDecimal fraccion = e.getValue().divide(ingresoMensual, 4, RoundingMode.HALF_UP);
                    return new Exceso(e.getKey(), fraccion.divide(umbral, 4, RoundingMode.HALF_UP));
                })
                .filter(x -> x.veces().compareTo(BigDecimal.ONE) > 0)
                .sorted(Comparator.comparing(Exceso::veces).reversed())
                .limit(MAXIMO_POR_CATEGORIA)
                .map(x -> regla("REC_CATEGORIA_EXCESO", Prioridad.MEDIA, "ratio_gasto_ingreso",
                        Map.of("categoria", x.categoria())))
                .toList();
    }

    private static java.util.Optional<String> categoriaDominante(Map<String, BigDecimal> gastoPorCategoria) {
        return gastoPorCategoria.entrySet().stream()
                .filter(e -> Taxonomia.esGasto(e.getKey()))
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey);
    }

    private static Recomendacion regla(String codigo, Prioridad prioridad, String indicador,
                                       Map<String, String> parametros) {
        return new Recomendacion(codigo, null, parametros, prioridad.slug, indicador);
    }

    /**
     * Arma el texto final.
     *
     * La sustitucion de `{categoria}` / `{pct}` se hace a mano y no con
     * MessageFormat: MessageFormat trata la comilla simple como escape, asi que
     * en cuanto un idioma tuviera un apostrofo ("l'analyse") el texto se
     * romperia en silencio. Con dos marcadores, un replace es mas simple y no
     * tiene esa trampa.
     *
     * `{categoria}` se interpola con la ETIQUETA TRADUCIDA, no con el slug: al
     * usuario se le dice "Alimentación", no "alimentacion".
     */
    private String renderizar(Recomendacion rec, Locale idioma) {
        String texto = mensajes.getMessage("rec." + rec.codigo(), null, idioma);
        for (Map.Entry<String, String> parametro : rec.parametros().entrySet()) {
            String valor = "categoria".equals(parametro.getKey())
                    ? mensajes.getMessage("categoria." + parametro.getValue(), null, idioma)
                    : parametro.getValue();
            texto = texto.replace("{" + parametro.getKey() + "}", valor);
        }
        return texto;
    }

    private enum Prioridad {
        ALTA(0, "alta"), MEDIA(1, "media"), BAJA(2, "baja");

        final int orden;
        final String slug;

        Prioridad(int orden, String slug) {
            this.orden = orden;
            this.slug = slug;
        }

        /**
         * El orden de un slug de prioridad.
         *
         * En la recomendacion se guarda el SLUG (es lo que sale por la API y lo
         * que se persiste), no el enum, asi que para ordenar hay que volver del
         * slug al enum. Un slug desconocido va al final en vez de reventar.
         */
        static int orden(String slug) {
            for (Prioridad p : values()) {
                if (p.slug.equals(slug)) return p.orden;
            }
            return Integer.MAX_VALUE;
        }
    }

    /**
     * Una recomendacion.
     *
     * `codigo` y `parametros` son lo unico que se PERSISTE; `texto` se calcula al
     * leer, en el idioma que toque.
     */
    public record Recomendacion(
            String codigo,
            String texto,
            Map<String, String> parametros,
            String prioridad,
            String indicador
    ) {
        Recomendacion conTexto(String textoRenderizado) {
            return new Recomendacion(codigo, textoRenderizado,
                    new LinkedHashMap<>(parametros), prioridad, indicador);
        }
    }
}
