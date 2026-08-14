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
 * Tabla `aporte_plan` (migracion V6): cada abono a una meta de ahorro.
 *
 * Existe como tabla propia, y no como un total en `plan_ahorro`, para que lo
 * ahorrado se pueda reconstruir y auditar. Un aporte puede venir de una
 * transaccion real (`transaccion_id`) o registrarse a mano desde la interfaz.
 */
@Entity
@Table(name = "aporte_plan")
public class AportePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "transaccion_id")
    private UUID transaccionId;

    @Column(name = "monto", nullable = false, precision = 14, scale = 2)
    private BigDecimal monto;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    public AportePlan() {}

    public Long getId() { return id; }

    public UUID getPlanId() { return planId; }
    public void setPlanId(UUID planId) { this.planId = planId; }

    public UUID getTransaccionId() { return transaccionId; }
    public void setTransaccionId(UUID transaccionId) { this.transaccionId = transaccionId; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public OffsetDateTime getCreadoEn() { return creadoEn; }
}
