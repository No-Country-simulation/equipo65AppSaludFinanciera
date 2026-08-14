package com.hackathon.analisis.dto;

import java.math.BigDecimal;

public record PresupuestoResponse(
        String categoriaSlug,
        BigDecimal limite,
        String moneda
) {}