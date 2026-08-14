package com.fintechvital.api.service;

import com.fintechvital.api.dominio.Indicadores;
import com.fintechvital.api.dominio.Taxonomia;
import com.fintechvital.api.dominio.TransaccionClasificada;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calcula los 8 indicadores de TAXONOMIA §3 a partir de las transacciones ya
 * clasificadas.
 *
 * Todo en BigDecimal: con `double`, sumar 0.1 + 0.2 da 0.30000000000000004, y
 * en un producto que habla de dinero eso acaba apareciendo en pantalla.
 */
@Service
public class IndicadoresService {

    /** 3 decimales, como manda TAXONOMIA §3. */
    private static final int DECIMALES = 3;

    /**
     * `tasa_ahorro` se acota a este rango antes de mandarla al modelo.
     *
     * Sin el tope, un ingreso mal cargado (por ejemplo 1 en vez de 45000) da una
     * tasa de -47 y envenena la prediccion: el modelo nunca vio nada asi durante
     * el entrenamiento y responde cualquier cosa.
     */
    private static final BigDecimal TASA_MIN = new BigDecimal("-2");
    private static final BigDecimal TASA_MAX = BigDecimal.ONE;

    /** Un gasto es "recurrente" si se repite con un monto que no varia mas de esto. */
    private static final BigDecimal TOLERANCIA_RECURRENTE = new BigDecimal("0.10");

    /**
     * @param ingresoMensual  > 0, ya validado por el controlador (RN7)
     * @param clasificadas    transacciones con su categoria ya asignada
     */
    public Indicadores calcular(BigDecimal ingresoMensual,
                                int nivelEndeudamiento,
                                String frecuenciaAhorro,
                                List<TransaccionClasificada> clasificadas) {

        Map<String, BigDecimal> porCategoria = agruparPorCategoria(clasificadas);

        BigDecimal gastoTotal = sumar(porCategoria, Taxonomia::esGasto);
        BigDecimal esencial = sumar(porCategoria, Taxonomia.ESENCIAL::contains);
        BigDecimal discrecional = sumar(porCategoria, Taxonomia.DISCRECIONAL::contains);

        // Sin gastos: no hay nada que concentrar ni que sea recurrente, y le
        // sobra el ingreso entero. Es un caso real (usuario que aun no cargo
        // nada), no un error, y hay que devolver numeros validos igual.
        boolean sinGastos = gastoTotal.signum() == 0;

        BigDecimal maxCategoria = porCategoria.entrySet().stream()
                .filter(e -> Taxonomia.esGasto(e.getKey()))
                .map(Map.Entry::getValue)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        return new Indicadores(
                acotar(dividir(ingresoMensual.subtract(gastoTotal), ingresoMensual)),
                redondear(BigDecimal.valueOf(nivelEndeudamiento).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)),
                dividir(gastoTotal, ingresoMensual),
                dividir(esencial, ingresoMensual),
                dividir(discrecional, ingresoMensual),
                sinGastos ? BigDecimal.ZERO : dividir(maxCategoria, gastoTotal),
                Taxonomia.frecuenciaAhorroNumerica(frecuenciaAhorro),
                sinGastos ? BigDecimal.ZERO : dividir(gastoRecurrente(clasificadas), gastoTotal));
    }

    /**
     * Gasto por categoria (el `resumen_gastos` de la respuesta).
     *
     * Se usa el valor ABSOLUTO: el endpoint del enunciado manda los gastos en
     * positivo, pero la misma logica sirve para las transacciones guardadas, que
     * llevan signo (RN4: > 0 ingreso, < 0 gasto).
     */
    public Map<String, BigDecimal> agruparPorCategoria(List<TransaccionClasificada> clasificadas) {
        // LinkedHashMap: el orden de aparicion es estable entre llamadas, asi que
        // dos analisis iguales devuelven exactamente el mismo JSON.
        Map<String, BigDecimal> porCategoria = new LinkedHashMap<>();
        for (TransaccionClasificada t : clasificadas) {
            porCategoria.merge(t.categoria(), t.valor().abs(), BigDecimal::add);
        }
        return porCategoria;
    }

    /**
     * Suma de los gastos que se repiten en el periodo.
     *
     * Heuristica de v1.0 (TAXONOMIA §3): misma descripcion normalizada >= 2
     * veces con montos parecidos (±10%). No es un detector de suscripciones de
     * verdad -- eso es un problema aparte -- pero distingue bien un Netflix
     * mensual de una compra suelta, que es lo que la recomendacion necesita.
     */
    private BigDecimal gastoRecurrente(List<TransaccionClasificada> clasificadas) {
        Map<String, List<BigDecimal>> porDescripcion = new LinkedHashMap<>();
        for (TransaccionClasificada t : clasificadas) {
            if (!Taxonomia.esGasto(t.categoria())) continue;
            porDescripcion.computeIfAbsent(normalizar(t.descripcion()), k -> new ArrayList<>())
                          .add(t.valor().abs());
        }

        BigDecimal total = BigDecimal.ZERO;
        for (List<BigDecimal> montos : porDescripcion.values()) {
            if (montos.size() < 2) continue;

            BigDecimal referencia = montos.get(0);
            boolean parecidos = montos.stream().allMatch(m -> dentroDeTolerancia(m, referencia));
            if (parecidos) {
                for (BigDecimal m : montos) total = total.add(m);
            }
        }
        return total;
    }

    private static boolean dentroDeTolerancia(BigDecimal monto, BigDecimal referencia) {
        if (referencia.signum() == 0) return monto.signum() == 0;
        BigDecimal desvio = monto.subtract(referencia).abs()
                .divide(referencia, 4, RoundingMode.HALF_UP);
        return desvio.compareTo(TOLERANCIA_RECURRENTE) <= 0;
    }

    /** Minusculas y sin acentos: "Netflix" y "NETFLIX.COM " son el mismo gasto. */
    private static String normalizar(String texto) {
        String sinAcentos = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return sinAcentos.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static BigDecimal sumar(Map<String, BigDecimal> porCategoria,
                                    java.util.function.Predicate<String> filtro) {
        return porCategoria.entrySet().stream()
                .filter(e -> filtro.test(e.getKey()))
                .map(Map.Entry::getValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** El divisor nunca es 0: el ingreso ya se valido > 0 y el gasto total se comprueba antes. */
    private static BigDecimal dividir(BigDecimal numerador, BigDecimal divisor) {
        return redondear(numerador.divide(divisor, DECIMALES + 2, RoundingMode.HALF_UP));
    }

    private static BigDecimal redondear(BigDecimal valor) {
        return valor.setScale(DECIMALES, RoundingMode.HALF_UP);
    }

    private static BigDecimal acotar(BigDecimal tasa) {
        if (tasa.compareTo(TASA_MIN) < 0) return TASA_MIN.setScale(DECIMALES);
        if (tasa.compareTo(TASA_MAX) > 0) return TASA_MAX.setScale(DECIMALES);
        return tasa;
    }
}
