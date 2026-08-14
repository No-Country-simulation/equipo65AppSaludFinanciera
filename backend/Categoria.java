package com.hackathon.analisis.model;

import jakarta.persistence.*;

@Entity
@Table(name = "categoria")
public class Categoria {

    @Id
    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

    @Column(name = "tipo", nullable = false)
    private String tipo;

    @Column(name = "grupo", nullable = false)
    private String grupo;

    @Column(name = "umbral_ingreso")
    private Double umbralIngreso;

    @Column(name = "orden", nullable = false)
    private Short orden;

    public Categoria() {}

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getGrupo() { return grupo; }
    public void setGrupo(String grupo) { this.grupo = grupo; }

    public Double getUmbralIngreso() { return umbralIngreso; }
    public void setUmbralIngreso(Double umbralIngreso) { this.umbralIngreso = umbralIngreso; }

    public Short getOrden() { return orden; }
    public void setOrden(Short orden) { this.orden = orden; }
}