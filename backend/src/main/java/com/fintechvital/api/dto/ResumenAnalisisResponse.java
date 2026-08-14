package com.fintechvital.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Una linea del historial de analisis (types.ts -> ResumenAnalisis). */
public record ResumenAnalisisResponse(
        String id,
        String perfilCodigo,
        BigDecimal probabilidad,
        OffsetDateTime analizadoEn
) {}
