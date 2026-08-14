package com.fintechvital.api.dto;

public class LoginRequestDTO {
    private String email;
    private String password;
    private String codigoTotp;

    public LoginRequestDTO() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getCodigoTotp() { return codigoTotp; }
    public void setCodigoTotp(String codigoTotp) { this.codigoTotp = codigoTotp; }
}
