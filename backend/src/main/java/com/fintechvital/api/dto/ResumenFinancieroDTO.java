package com.fintechvital.api.dto;

import lombok.Data;

@Data
public class ResumenFinancieroDTO {
    private Double totalIngresos;
    private Double totalNecesidadesBasicas;
    private Double totalEstiloDeVida;
    private Double totalGastosPrescindibles;
    private Double saldoFinal;
}
