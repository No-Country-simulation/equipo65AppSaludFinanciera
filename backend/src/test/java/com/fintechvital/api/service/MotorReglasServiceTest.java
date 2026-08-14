package com.fintechvital.api.service;

import com.fintechvital.api.config.I18nConfig;
import com.fintechvital.api.dominio.Indicadores;
import com.fintechvital.api.service.MotorReglasService.Recomendacion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Motor de reglas (TAXONOMIA §4).
 *
 * Lo importante que se verifica aqui, ademas de que cada regla dispare cuando
 * toca: que el motor devuelva **codigos**, que el texto se arme en el idioma
 * pedido, y que `{categoria}` se interpole con la ETIQUETA traducida y no con el
 * slug.
 */
class MotorReglasServiceTest {

    private final MotorReglasService motor = new MotorReglasService(new I18nConfig().messageSource());

    private static final Locale ES = Locale.forLanguageTag("es");
    private static final Locale PT = Locale.forLanguageTag("pt");
    private static final Locale EN = Locale.forLanguageTag("en");

    /** Indicadores de alguien sano: no dispara ninguna regla de alarma. */
    private static Indicadores sanos() {
        return new Indicadores(
                new BigDecimal("0.250"),  // tasa_ahorro
                new BigDecimal("0.100"),  // ratio_endeudamiento
                new BigDecimal("0.750"),  // ratio_gasto_ingreso
                new BigDecimal("0.400"),  // ratio_gasto_esencial
                new BigDecimal("0.200"),  // ratio_gasto_discrecional
                new BigDecimal("0.300"),  // concentracion_gasto
                3,                        // frecuencia_ahorro_num
                new BigDecimal("0.050")); // ratio_recurrente
    }

    private static Indicadores con(Indicadores base, String campo, String valor) {
        BigDecimal v = new BigDecimal(valor);
        return switch (campo) {
            case "tasa_ahorro" -> new Indicadores(v, base.ratioEndeudamiento(), base.ratioGastoIngreso(),
                    base.ratioGastoEsencial(), base.ratioGastoDiscrecional(), base.concentracionGasto(),
                    base.frecuenciaAhorroNum(), base.ratioRecurrente());
            case "ratio_endeudamiento" -> new Indicadores(base.tasaAhorro(), v, base.ratioGastoIngreso(),
                    base.ratioGastoEsencial(), base.ratioGastoDiscrecional(), base.concentracionGasto(),
                    base.frecuenciaAhorroNum(), base.ratioRecurrente());
            case "ratio_gasto_esencial" -> new Indicadores(base.tasaAhorro(), base.ratioEndeudamiento(),
                    base.ratioGastoIngreso(), v, base.ratioGastoDiscrecional(), base.concentracionGasto(),
                    base.frecuenciaAhorroNum(), base.ratioRecurrente());
            case "concentracion_gasto" -> new Indicadores(base.tasaAhorro(), base.ratioEndeudamiento(),
                    base.ratioGastoIngreso(), base.ratioGastoEsencial(), base.ratioGastoDiscrecional(), v,
                    base.frecuenciaAhorroNum(), base.ratioRecurrente());
            default -> throw new IllegalArgumentException(campo);
        };
    }

    private List<String> codigos(Indicadores ind, Map<String, BigDecimal> gastos) {
        return motor.evaluar(ind, gastos, new BigDecimal("1000"), ES)
                .stream().map(Recomendacion::codigo).toList();
    }

    @Test
    @DisplayName("deficit: gasta mas de lo que gana")
    void deficit() {
        var ind = con(sanos(), "tasa_ahorro", "-0.150");
        assertTrue(codigos(ind, Map.of("alimentacion", new BigDecimal("300"))).contains("REC_DEFICIT"));
    }

    @Test
    @DisplayName("deuda alta por encima del 40%")
    void deudaAlta() {
        var ind = con(sanos(), "ratio_endeudamiento", "0.550");
        assertTrue(codigos(ind, Map.of("alimentacion", new BigDecimal("300"))).contains("REC_DEUDA_ALTA"));
    }

    @Test
    @DisplayName("gastos esenciales por encima del 60%")
    void esencialAlto() {
        var ind = con(sanos(), "ratio_gasto_esencial", "0.700");
        assertTrue(codigos(ind, Map.of("alimentacion", new BigDecimal("300"))).contains("REC_ESENCIAL_ALTO"));
    }

    @Test
    @DisplayName("concentracion: nombra la categoria dominante")
    void concentracion() {
        var ind = con(sanos(), "concentracion_gasto", "0.800");
        var recs = motor.evaluar(ind,
                Map.of("vivienda", new BigDecimal("800"), "alimentacion", new BigDecimal("100")),
                new BigDecimal("1000"), ES);

        var concentracion = recs.stream()
                .filter(r -> "REC_CONCENTRACION".equals(r.codigo())).findFirst().orElseThrow();
        assertEquals("vivienda", concentracion.parametros().get("categoria"));
        // El parametro guarda el SLUG, pero el texto muestra la ETIQUETA.
        assertTrue(concentracion.texto().contains("Vivienda"), concentracion.texto());
        assertFalse(concentracion.texto().contains("{categoria}"), "quedo el marcador sin sustituir");
    }

    @Test
    @DisplayName("un usuario sano recibe la recomendacion de baja prioridad, no una alarma")
    void usuarioSano() {
        var recs = codigos(sanos(), Map.of("alimentacion", new BigDecimal("300")));
        assertTrue(recs.contains("REC_CONSOLIDA"));
        assertFalse(recs.contains("REC_DEFICIT"));
        assertFalse(recs.contains("REC_DEUDA_ALTA"));
    }

    @Test
    @DisplayName("nunca mas de 5 recomendaciones, y las de prioridad alta van primero (RN8)")
    void maximoCincoYOrdenadas() {
        // Alguien en mala situacion dispara muchas reglas a la vez.
        var ind = new Indicadores(
                new BigDecimal("-0.400"), new BigDecimal("0.700"), new BigDecimal("1.400"),
                new BigDecimal("0.900"), new BigDecimal("0.500"), new BigDecimal("0.700"),
                0, new BigDecimal("0.400"));

        var recs = motor.evaluar(ind,
                Map.of("vivienda", new BigDecimal("900"), "entretenimiento", new BigDecimal("500")),
                new BigDecimal("1000"), ES);

        assertEquals(5, recs.size());
        assertEquals("alta", recs.get(0).prioridad());
        // Ordenadas: ninguna de menor prioridad puede ir antes que una de mayor.
        var ordenes = recs.stream().map(Recomendacion::prioridad)
                .map(p -> switch (p) { case "alta" -> 0; case "media" -> 1; default -> 2; }).toList();
        assertEquals(ordenes.stream().sorted().toList(), ordenes, "no estan ordenadas por prioridad");
    }

    @Test
    @DisplayName("datos parciales: avisa en vez de felicitar por gastar poco")
    void datosParciales() {
        // Es el caso del EJEMPLO DEL ENUNCIADO: 760 de gasto sobre 4500 de
        // ingreso da una tasa de ahorro del 83%. Sin esta regla, el analisis
        // felicitaria a alguien que en realidad no cargo sus gastos.
        var ind = new Indicadores(
                new BigDecimal("0.831"), new BigDecimal("0.250"), new BigDecimal("0.169"),
                new BigDecimal("0.160"), new BigDecimal("0.009"), new BigDecimal("0.553"),
                2, new BigDecimal("0.000"));

        var recs = motor.evaluar(ind, Map.of("alimentacion", new BigDecimal("420")),
                new BigDecimal("4500"), ES);
        var parcial = recs.stream()
                .filter(r -> "REC_DATOS_PARCIALES".equals(r.codigo())).findFirst().orElseThrow();

        assertEquals("alta", parcial.prioridad());
        assertTrue(parcial.texto().contains("17%"), parcial.texto());
    }

    @Test
    @DisplayName("el texto sale en el idioma pedido y el codigo no cambia")
    void trilingue() {
        var ind = con(sanos(), "tasa_ahorro", "-0.150");
        var gastos = Map.of("alimentacion", new BigDecimal("300"));

        for (var caso : List.of(
                Map.entry(ES, "superan"), Map.entry(PT, "superam"), Map.entry(EN, "exceed"))) {
            var rec = motor.evaluar(ind, gastos, new BigDecimal("1000"), caso.getKey()).stream()
                    .filter(r -> "REC_DEFICIT".equals(r.codigo())).findFirst().orElseThrow();
            assertTrue(rec.texto().toLowerCase().contains(caso.getValue()),
                    caso.getKey() + " -> " + rec.texto());
        }
    }

    @Test
    @DisplayName("los acentos del bundle no salen rotos (encoding UTF-8)")
    void acentosCorrectos() {
        var ind = con(sanos(), "concentracion_gasto", "0.800");
        var rec = motor.evaluar(ind, Map.of("educacion", new BigDecimal("800")),
                        new BigDecimal("1000"), ES).stream()
                .filter(r -> "REC_CONCENTRACION".equals(r.codigo())).findFirst().orElseThrow();

        // Con el bundle leido en ISO-8859-1 saldria "EducaciÃ³n".
        assertTrue(rec.texto().contains("Educación"), rec.texto());
    }
}
