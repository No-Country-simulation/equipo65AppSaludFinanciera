package com.fintechvital.api.dominio;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Los 8 indicadores de TAXONOMIA §3, en el orden en que los espera el modelo M2.
 *
 * **Los calcula Spring, no el ML** (CONTRATO_MODELO §1): si el ML calculara
 * indicadores, la misma formula viviria en Java y en Python y algun dia
 * divergirian. El ML recibe estos numeros y devuelve una prediccion, nada mas.
 *
 * Son ratios adimensionales a proposito: la moneda se cancela en la division, y
 * por eso el mismo modelo sirve para pesos, dolares o reales.
 */
public record Indicadores(
        BigDecimal tasaAhorro,
        BigDecimal ratioEndeudamiento,
        BigDecimal ratioGastoIngreso,
        BigDecimal ratioGastoEsencial,
        BigDecimal ratioGastoDiscrecional,
        BigDecimal concentracionGasto,
        int frecuenciaAhorroNum,
        BigDecimal ratioRecurrente
) {
    /**
     * Mapa con las CLAVES EXACTAS del contrato.
     *
     * Se arma a mano en vez de dejar que Jackson serialice el record: las claves
     * viajan al servicio de ML, que las usa como nombres de feature. Un
     * `tasa_ahorro` que llegara como `tasaAhorro` no daria error -- daria una
     * prediccion distinta, en silencio.
     *
     * LinkedHashMap para conservar el orden del contrato; un HashMap lo
     * barajaria y la respuesta cambiaria de forma entre llamadas.
     */
    public Map<String, Object> comoMapa() {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("tasa_ahorro", tasaAhorro);
        mapa.put("ratio_endeudamiento", ratioEndeudamiento);
        mapa.put("ratio_gasto_ingreso", ratioGastoIngreso);
        mapa.put("ratio_gasto_esencial", ratioGastoEsencial);
        mapa.put("ratio_gasto_discrecional", ratioGastoDiscrecional);
        mapa.put("concentracion_gasto", concentracionGasto);
        mapa.put("frecuencia_ahorro_num", frecuenciaAhorroNum);
        mapa.put("ratio_recurrente", ratioRecurrente);
        return mapa;
    }
}
