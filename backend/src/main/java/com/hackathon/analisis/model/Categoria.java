package com.hackathon.analisis.model;

import jakarta.persistence.*;

@Entity
@Table(name = "categorias")
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria")
    private Integer idCategoria;

    @Column(nullable = false, unique = true, length = 50)
    private String slug;

    @Column(name = "nombre_categoria", nullable = false, unique = true, length = 100)
    private String nombreCategoria;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_categoria", nullable = false)
    private TipoCategoria tipoCategoria;

    @Column(length = 255)
    private String descripcion;

    public enum TipoCategoria { INGRESO, EGRESO, MOVIMIENTO }

    public Categoria() {}

    public Integer getIdCategoria() { return idCategoria; }
    public void setIdCategoria(Integer idCategoria) { this.idCategoria = idCategoria; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getNombreCategoria() { return nombreCategoria; }
    public void setNombreCategoria(String nombreCategoria) { this.nombreCategoria = nombreCategoria; }

    public TipoCategoria getTipoCategoria() { return tipoCategoria; }
    public void setTipoCategoria(TipoCategoria tipoCategoria) { this.tipoCategoria = tipoCategoria; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}