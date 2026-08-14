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
 * Tabla `evento_calendario` (migracion V6): los recordatorios que el usuario
 * pone en el calendario de Movimientos (un pago que vence, un cobro que espera).
 *
 * No son transacciones: no han ocurrido. Por eso viven en su propia tabla y no
 * entran en ningun indicador.
 */
@Entity
@Table(name = "evento_calendario")
public class EventoCalendario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "titulo", nullable = false)
    private String titulo;

    /** pago | cobro | recordatorio (ck_evento_calendario_tipo). Slug, no se traduce. */
    @Column(name = "tipo", nullable = false)
    private String tipo;

    @Column(name = "monto", precision = 14, scale = 2)
    private BigDecimal monto;

    /** ck_evento_calendario_moneda: un monto sin moneda no se puede ni mostrar. */
    @Column(name = "moneda", length = 3)
    private String moneda;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    public EventoCalendario() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public OffsetDateTime getCreadoEn() { return creadoEn; }
}
