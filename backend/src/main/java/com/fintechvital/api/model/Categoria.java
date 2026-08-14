package com.fintechvital.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/**
 * Tabla `categoria` (migracion V1, ampliada en V10 con `activa`).
 *
 * ⚠️ El esquema lo gobiernan las migraciones de db/, no esta clase. Los nombres
 * de columna son los de la tabla real: la version anterior mapeaba `categorias`
 * con `id_categoria`/`nombre_categoria`, que son las tablas que Hibernate se
 * inventa con ddl-auto=update, y por eso no habia forma de leer nada.
 *
 * Las etiquetas legibles NO estan aqui: viven en `categoria_i18n` y se sirven
 * por la vista `vw_categoria_etiqueta` ({@link CategoriaEtiqueta}).
 */
@Entity
@Table(name = "categoria")
public class Categoria {

    /** El identificador estable, compartido por DS, API, BD y frontend. */
    @Id
    @Column(name = "slug", nullable = false)
    private String slug;

    /** gasto | ingreso | movimiento (ck_categoria_tipo). */
    @Column(name = "tipo", nullable = false)
    private String tipo;

    /** esencial | discrecional | financiero | no_gasto | otro (ck_categoria_grupo). */
    @Column(name = "grupo", nullable = false)
    private String grupo;

    /** Umbral del motor de reglas: fraccion del ingreso, no un monto. */
    @Column(name = "umbral_ingreso")
    private BigDecimal umbralIngreso;

    @Column(name = "orden", nullable = false)
    private Short orden;

    /**
     * Una categoria retirada no se puede borrar (hay FK desde `transaccion`:
     * reescribiria el pasado). Se marca inactiva: deja de ofrecerse, y los
     * movimientos viejos siguen contando.
     */
    @Column(name = "activa", nullable = false)
    private Boolean activa = Boolean.TRUE;

    public Categoria() {}

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getGrupo() { return grupo; }
    public void setGrupo(String grupo) { this.grupo = grupo; }

    public BigDecimal getUmbralIngreso() { return umbralIngreso; }
    public void setUmbralIngreso(BigDecimal umbralIngreso) { this.umbralIngreso = umbralIngreso; }

    public Short getOrden() { return orden; }
    public void setOrden(Short orden) { this.orden = orden; }

    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }
}
