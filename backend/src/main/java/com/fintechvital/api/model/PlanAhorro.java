package com.fintechvital.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Tabla `plan_ahorro` (migracion V6): las metas de ahorro del usuario.
 *
 * ⚠️ El esquema lo gobiernan las migraciones de db/, no esta clase. La version
 * anterior mapeaba `planes_ahorro` con `id_plan`/`id_usuario`/`estado_plan` y un
 * enum en MAYUSCULAS, que son los nombres que Hibernate se inventa con
 * ddl-auto=update. La tabla real es `plan_ahorro`, la clave `id`, y el estado va
 * en minusculas (ck_plan_ahorro_estado: activo | finalizado | cancelado).
 *
 * Lo ahorrado NO se guarda aqui: es la suma de `aporte_plan` y lo resuelve la
 * vista `vw_meta_progreso`. Un total denormalizado se desincroniza en cuanto
 * alguien borra un aporte.
 */
@Entity
@Table(name = "plan_ahorro")
public class PlanAhorro {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "nombre_meta", nullable = false)
    private String nombreMeta;

    @Column(name = "monto_meta", nullable = false, precision = 14, scale = 2)
    private BigDecimal montoMeta;

    @Column(name = "moneda", nullable = false, length = 3)
    private String moneda;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    /** activo | finalizado | cancelado (ck_plan_ahorro_estado). Slug: no se traduce. */
    @Column(name = "estado", nullable = false)
    private String estado = "activo";

    /** Presentacion pura (emoji y color); la BD los guarda pero no los interpreta. */
    @Column(name = "icono")
    private String icono;

    @Column(name = "color")
    private String color;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    public PlanAhorro() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }

    public String getNombreMeta() { return nombreMeta; }
    public void setNombreMeta(String nombreMeta) { this.nombreMeta = nombreMeta; }

    public BigDecimal getMontoMeta() { return montoMeta; }
    public void setMontoMeta(BigDecimal montoMeta) { this.montoMeta = montoMeta; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getIcono() { return icono; }
    public void setIcono(String icono) { this.icono = icono; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public OffsetDateTime getCreadoEn() { return creadoEn; }
}
