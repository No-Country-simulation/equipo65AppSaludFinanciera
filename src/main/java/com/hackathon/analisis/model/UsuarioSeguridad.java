package com.hackathon.analisis.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios_seguridad")
public class UsuarioSeguridad {

    @Id
    @Column(name = "id_usuario", length = 36)
    private String idUsuario;

    @MapsId
    @OneToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    public UsuarioSeguridad() {}

    public String getIdUsuario() { return idUsuario; }
    public void setIdUsuario(String idUsuario) { this.idUsuario = idUsuario; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}