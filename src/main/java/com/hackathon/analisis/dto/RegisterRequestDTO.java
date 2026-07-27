package com.hackathon.analisis.dto;

public class RegisterRequestDTO {
    private String email;
    private String password;
    private String moneda;

    public RegisterRequestDTO() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
}