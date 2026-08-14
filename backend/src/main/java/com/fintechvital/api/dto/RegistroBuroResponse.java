package com.fintechvital.api.dto;

import com.fintechvital.api.model.HistorialBuro;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Un punto del historial de buro (types.ts -> RegistroBuro). */
public record RegistroBuroResponse(
        LocalDate fecha,
        Short scoreCrediticio,
        Integer diasAtraso,
        BigDecimal montoAdeudado
) {
    public static RegistroBuroResponse de(HistorialBuro fila) {
        return new RegistroBuroResponse(
                fila.getConsultadoEn(),
                fila.getScoreCrediticio(),
                fila.getDiasAtraso(),
                fila.getMontoAdeudado());
    }
}
