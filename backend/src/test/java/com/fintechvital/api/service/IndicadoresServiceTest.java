package com.fintechvital.api.service;

import com.fintechvital.api.dominio.Indicadores;
import com.fintechvital.api.dominio.TransaccionClasificada;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Los 8 indicadores de TAXONOMIA §3.
 *
 * Se prueban aparte del resto porque son la entrada del modelo M2: un indicador
 * mal calculado no da error, da un diagnostico equivocado -- y eso no se ve
 * mirando la respuesta.
 */
class IndicadoresServiceTest {

    private final IndicadoresService servicio = new IndicadoresService();

    private static TransaccionClasificada t(String descripcion, String valor, String categoria) {
        return new TransaccionClasificada(descripcion, new BigDecimal(valor), categoria,
                new BigDecimal("0.9"), "modelo");
    }

    @Test
    @DisplayName("caso normal: los 8 indicadores salen con la formula de TAXONOMIA §3")
    void casoNormal() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1000"), 25, "media",
                List.of(
                        t("Supermercado", "300", "alimentacion"),   // esencial
                        t("Alquiler", "200", "vivienda"),           // esencial
                        t("Netflix", "100", "entretenimiento"),     // discrecional
                        t("Curso", "100", "educacion")));           // ni uno ni otro

        // GASTO_TOTAL = 700 sobre un ingreso de 1000
        assertEquals(new BigDecimal("0.300"), ind.tasaAhorro());
        assertEquals(new BigDecimal("0.700"), ind.ratioGastoIngreso());
        // ESENCIAL = 500
        assertEquals(new BigDecimal("0.500"), ind.ratioGastoEsencial());
        // DISCRECIONAL = 100. `educacion` queda FUERA de los dos a proposito.
        assertEquals(new BigDecimal("0.100"), ind.ratioGastoDiscrecional());
        assertEquals(new BigDecimal("0.250"), ind.ratioEndeudamiento());
        // La categoria mas grande es alimentacion: 300/700
        assertEquals(new BigDecimal("0.429"), ind.concentracionGasto());
        assertEquals(2, ind.frecuenciaAhorroNum());
    }

    @Test
    @DisplayName("el ahorro y los ingresos NO cuentan como gasto")
    void ahorroEIngresosNoSonGasto() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1000"), 0, "alta",
                List.of(
                        t("Supermercado", "200", "alimentacion"),
                        t("Transferencia a plazo fijo", "300", "ahorro_inversion"),
                        t("Sueldo", "1000", "ingresos")));

        // Solo cuentan los 200 de alimentacion: contar el ahorro como gasto
        // castigaria al usuario justamente por ahorrar.
        assertEquals(new BigDecimal("0.200"), ind.ratioGastoIngreso());
        assertEquals(new BigDecimal("0.800"), ind.tasaAhorro());
    }

    @Test
    @DisplayName("sin gastos no se divide por cero")
    void sinGastos() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1000"), 0, "alta",
                List.of(t("Sueldo", "1000", "ingresos")));

        assertEquals(0, ind.concentracionGasto().signum());
        assertEquals(0, ind.ratioRecurrente().signum());
        assertEquals(new BigDecimal("1.000"), ind.tasaAhorro(), "le sobra el ingreso entero");
    }

    @Test
    @DisplayName("la tasa de ahorro se acota a -2 (un ingreso mal cargado no envenena al modelo)")
    void tasaAcotada() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1"), 0, "nula",
                List.of(t("Alquiler", "5000", "vivienda")));

        // Sin acotar seria -4999. El modelo nunca vio nada asi entrenando.
        assertEquals(new BigDecimal("-2.000"), ind.tasaAhorro());
    }

    @Test
    @DisplayName("recurrente: mismo comercio repetido con monto parecido")
    void gastoRecurrente() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1000"), 0, "alta",
                List.of(
                        // El banco repite el MISMO descriptor cada mes; solo cambia
                        // el monto por impuestos o tipo de cambio.
                        t("NETFLIX.COM", "100", "entretenimiento"),
                        t("netflix.com ", "105", "entretenimiento"),  // ±10%, misma descripcion normalizada
                        t("Supermercado", "300", "alimentacion")));   // suelto, no recurrente

        // 205 recurrentes sobre 505 de gasto total
        assertEquals(new BigDecimal("0.406"), ind.ratioRecurrente());
    }

    @Test
    @DisplayName("comercios PARECIDOS pero distintos no se agrupan")
    void noAgrupaComerciosDistintos() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1000"), 0, "alta",
                List.of(
                        t("Uber", "100", "transporte"),
                        t("Uber Eats", "105", "alimentacion")));

        // La normalizacion es por tokens exactos a proposito. Aflojarla para que
        // "NETFLIX.COM" y "Netflix" cayeran juntos tambien fusionaria estos dos,
        // que ni siquiera comparten categoria: el ratio contaria como suscripcion
        // recurrente lo que son dos gastos distintos.
        assertEquals(0, ind.ratioRecurrente().signum());
    }

    @Test
    @DisplayName("no es recurrente si el monto varia mas del 10%")
    void montoDemasiadoDistinto() {
        Indicadores ind = servicio.calcular(
                new BigDecimal("1000"), 0, "alta",
                List.of(
                        t("Supermercado", "100", "alimentacion"),
                        t("Supermercado", "400", "alimentacion")));

        // Misma descripcion, pero 400 no esta dentro del ±10% de 100: son dos
        // compras distintas, no una suscripcion.
        assertEquals(0, ind.ratioRecurrente().signum());
    }

    @Test
    @DisplayName("el signo del valor da igual: se usa el absoluto")
    void valorConSigno() {
        Indicadores conSigno = servicio.calcular(new BigDecimal("1000"), 0, "alta",
                List.of(t("Supermercado", "-300", "alimentacion")));
        Indicadores sinSigno = servicio.calcular(new BigDecimal("1000"), 0, "alta",
                List.of(t("Supermercado", "300", "alimentacion")));

        // El enunciado manda los gastos en positivo; la BD los guarda en
        // negativo (RN4). Los dos formatos tienen que dar lo mismo.
        assertEquals(sinSigno.ratioGastoIngreso(), conSigno.ratioGastoIngreso());
    }

    @Test
    @DisplayName("todos los ratios salen con 3 decimales")
    void tresDecimales() {
        Indicadores ind = servicio.calcular(new BigDecimal("3000"), 33, "baja",
                List.of(t("Supermercado", "777", "alimentacion")));

        // Si Spring mandara 15 decimales y el notebook entreno con 3, hay skew
        // de features: el modelo recibe numeros que nunca vio.
        for (Object valor : ind.comoMapa().values()) {
            if (valor instanceof BigDecimal ratio) {
                assertEquals(3, ratio.scale(), "escala de " + ratio);
            }
        }
    }
}
