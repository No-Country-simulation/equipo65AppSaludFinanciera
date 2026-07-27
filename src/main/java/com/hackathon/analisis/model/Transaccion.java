package com.hackathon.analisis.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transacciones")
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_transaccion", length = 36)
    private String idTransaccion;

    @Column(name = "id_tarjeta", length = 36)
    private String idTarjeta;

    @ManyToOne
    @JoinColumn(name = "id_categoria")
    private Categoria categoria;

    @Column(nullable = false)
    private LocalDateTime fechaHora = LocalDateTime.now();

    @Column(nullable = false, length = 100)
    private String concepto;

    @Column(length = 100)
    private String comercio;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false)
    private TipoMovimiento tipoMovimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "medio_operacion")
    private MedioOperacion medioOperacion = MedioOperacion.APP_MOVIL;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_transaccion")
    private EstadoTransaccion estadoTransaccion = EstadoTransaccion.COMPLETADA;

    public enum TipoMovimiento { INGRESO, EGRESO }
    public enum MedioOperacion { APP_MOVIL, PORTAL_WEB, CAJERO, SUCURSAL, POS }
    public enum EstadoTransaccion { COMPLETADA, PENDIENTE, CANCELADA }

    public Transaccion() {}

    public String getIdTransaccion() { return idTransaccion; }
    public void setIdTransaccion(String idTransaccion) { this.idTransaccion = idTransaccion; }

    public String getIdTarjeta() { return idTarjeta; }
    public void setIdTarjeta(String idTarjeta) { this.idTarjeta = idTarjeta; }

    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }

    public String getComercio() { return comercio; }
    public void setComercio(String comercio) { this.comercio = comercio; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public TipoMovimiento getTipoMovimiento() { return tipoMovimiento; }
    public void setTipoMovimiento(TipoMovimiento tipoMovimiento) { this.tipoMovimiento = tipoMovimiento; }

    public MedioOperacion getMedioOperacion() { return medioOperacion; }
    public void setMedioOperacion(MedioOperacion medioOperacion) { this.medioOperacion = medioOperacion; }

    public EstadoTransaccion getEstadoTransaccion() { return estadoTransaccion; }
    public void setEstadoTransaccion(EstadoTransaccion estadoTransaccion) { this.estadoTransaccion = estadoTransaccion; }
}