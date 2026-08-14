package com.fintechvital.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Proyeccion de solo lectura sobre `vw_presupuesto_uso` (migracion V7).
 *
 * La vista resuelve el `gastado` del mes en curso cruzando el presupuesto con
 * `vw_gasto_mensual_categoria`. Se lee de ahi y no se recalcula en Java porque
 * es la misma definicion de gasto que usan el analisis y los graficos: dos
 * formulas para el mismo numero acaban dando dos numeros distintos.
 */
@Entity
@Immutable
@Table(name = "vw_presupuesto_uso")
@IdClass(PresupuestoId.class)
public class PresupuestoUso {

    @Id
    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Id
    @Column(name = "categoria_slug", nullable = false)
    private String categoriaSlug;

    @Column(name = "limite", nullable = false, precision = 14, scale = 2)
    private BigDecimal limite;

    @Column(name = "moneda", nullable = false, length = 3)
    private String moneda;

    @Column(name = "gastado", nullable = false, precision = 14, scale = 2)
    private BigDecimal gastado;

    /** gastado / limite, redondeado a 3 decimales. Puede pasar de 1. */
    @Column(name = "uso", precision = 6, scale = 3)
    private BigDecimal uso;

    protected PresupuestoUso() {}

    public UUID getUsuarioId() { return usuarioId; }
    public String getCategoriaSlug() { return categoriaSlug; }
    public BigDecimal getLimite() { return limite; }
    public String getMoneda() { return moneda; }
    public BigDecimal getGastado() { return gastado; }
    public BigDecimal getUso() { return uso; }
}
