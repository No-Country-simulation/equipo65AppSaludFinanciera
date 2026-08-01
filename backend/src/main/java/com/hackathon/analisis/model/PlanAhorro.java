package com.hackathon.analisis.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "planes_ahorro")
public class PlanAhorro {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_plan", length = 36)
    private String idPlan;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "nombre_meta", nullable = false, length = 100)
    private String nombreMeta;

    @Column(name = "monto_meta", nullable = false, precision = 12, scale = 2)
    private BigDecimal montoMeta;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_plan", nullable = false)
    private EstadoPlan estadoPlan = EstadoPlan.ACTIVO;

    public enum EstadoPlan { ACTIVO, FINALIZADO, CANCELADO }

    public PlanAhorro() {}

    public String getIdPlan() { return idPlan; }
    public void setIdPlan(String idPlan) { this.idPlan = idPlan; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public String getNombreMeta() { return nombreMeta; }
    public void setNombreMeta(String nombreMeta) { this.nombreMeta = nombreMeta; }

    public BigDecimal getMontoMeta() { return montoMeta; }
    public void setMontoMeta(BigDecimal montoMeta) { this.montoMeta = montoMeta; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public EstadoPlan getEstadoPlan() { return estadoPlan; }
    public void setEstadoPlan(EstadoPlan estadoPlan) { this.estadoPlan = estadoPlan; }
}