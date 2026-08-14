package com.fintechvital.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Tabla `moneda` (migracion V1). Catalogo: se lee, no se escribe desde la API. */
@Entity
@Table(name = "moneda")
public class Moneda {

    @Id
    @Column(name = "codigo", nullable = false, length = 3)
    private String codigo;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "simbolo", nullable = false)
    private String simbolo;

    @Column(name = "decimales", nullable = false)
    private Short decimales;

    protected Moneda() {}

    public String getCodigo() { return codigo; }
    public String getNombre() { return nombre; }
    public String getSimbolo() { return simbolo; }
    public Short getDecimales() { return decimales; }
}
