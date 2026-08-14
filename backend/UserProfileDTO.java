package com.hackathon.analisis.dto;

public class UserProfileDTO {
    private String email;
    private Double ingreso;
    private Double deuda;
    private String frecuencia;
    private String moneda;

    public UserProfileDTO() {}

    public UserProfileDTO(String email, Double ingreso, Double deuda, String frecuencia, String moneda) {
        this.email = email;
        this.ingreso = ingreso;
        this.deuda = deuda;
        this.frecuencia = frecuencia;
        this.moneda = moneda;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Double getIngreso() { return ingreso; }
    public void setIngreso(Double ingreso) { this.ingreso = ingreso; }

    public Double getDeuda() { return deuda; }
    public void setDeuda(Double deuda) { this.deuda = deuda; }

    public String getFrecuencia() { return frecuencia; }
    public void setFrecuencia(String frecuencia) { this.frecuencia = frecuencia; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
}