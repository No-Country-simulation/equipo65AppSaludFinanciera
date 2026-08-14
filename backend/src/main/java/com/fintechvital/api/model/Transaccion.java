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
 * Tabla `transaccion` (migracion V4).
 *
 * ⚠️ El esquema lo gobiernan las migraciones de db/, no esta clase. La version
 * anterior mapeaba `banco_transacciones` con `descripcion_transaccion` y
 * `categoria_transaccion`, que son los nombres que Hibernate se inventa con
 * ddl-auto=update: por eso no habia forma de leer un solo movimiento.
 *
 * `valor` es BigDecimal, nunca double: es dinero. Y el SIGNO es el dato (RN4),
 * no un campo aparte: > 0 ingreso, < 0 gasto. Un movimiento de 0 esta prohibido
 * por ck_transaccion_valor porque no significa nada y ensucia todos los ratios.
 */
@Entity
@Table(name = "transaccion")
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "cuenta_id")
    private UUID cuentaId;

    @Column(name = "tarjeta_id")
    private UUID tarjetaId;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    /** Hora exacta cuando el extracto la trae; la fecha de negocio es `fecha`. */
    @Column(name = "fecha_hora")
    private OffsetDateTime fechaHora;

    @Column(name = "descripcion", nullable = false)
    private String descripcion;

    /** El establecimiento ("Barberia El Sol"), cuando el extracto lo separa. */
    @Column(name = "comercio")
    private String comercio;

    @Column(name = "valor", nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    @Column(name = "moneda", nullable = false, length = 3)
    private String moneda;

    /** El mismo valor en la moneda principal del usuario. Lo calcula la BD. */
    @Column(name = "valor_base", precision = 14, scale = 2)
    private BigDecimal valorBase;

    @Column(name = "categoria_slug")
    private String categoriaSlug;

    /** modelo | usuario (ck_transaccion_origen). */
    @Column(name = "categoria_origen", nullable = false)
    private String categoriaOrigen = "modelo";

    /**
     * Confianza del modelo, 0..1.
     *
     * ⚠️ Va NULL cuando la categoria la puso una persona: la restriccion
     * ck_transaccion_confianza_origen lo exige, porque la confianza del modelo
     * ya no describe nada una vez que alguien la corrigio a mano (RN3). Hacia
     * fuera, el DTO lo reporta como 1: una correccion humana es certeza.
     */
    @Column(name = "confianza", precision = 4, scale = 3)
    private BigDecimal confianza;

    @Column(name = "modelo_version")
    private String modeloVersion;

    /** app_movil | portal_web | cajero | sucursal | pos | transferencia | efectivo. */
    @Column(name = "medio_operacion")
    private String medioOperacion;

    /** completada | pendiente | cancelada (ck_transaccion_estado). */
    @Column(name = "estado", nullable = false)
    private String estado = "completada";

    @Column(name = "es_recurrente", nullable = false)
    private boolean esRecurrente = false;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    public Transaccion() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }

    public UUID getCuentaId() { return cuentaId; }
    public void setCuentaId(UUID cuentaId) { this.cuentaId = cuentaId; }

    public UUID getTarjetaId() { return tarjetaId; }
    public void setTarjetaId(UUID tarjetaId) { this.tarjetaId = tarjetaId; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public OffsetDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(OffsetDateTime fechaHora) { this.fechaHora = fechaHora; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getComercio() { return comercio; }
    public void setComercio(String comercio) { this.comercio = comercio; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public BigDecimal getValorBase() { return valorBase; }
    public void setValorBase(BigDecimal valorBase) { this.valorBase = valorBase; }

    public String getCategoriaSlug() { return categoriaSlug; }
    public void setCategoriaSlug(String categoriaSlug) { this.categoriaSlug = categoriaSlug; }

    public String getCategoriaOrigen() { return categoriaOrigen; }
    public void setCategoriaOrigen(String categoriaOrigen) { this.categoriaOrigen = categoriaOrigen; }

    public BigDecimal getConfianza() { return confianza; }
    public void setConfianza(BigDecimal confianza) { this.confianza = confianza; }

    public String getModeloVersion() { return modeloVersion; }
    public void setModeloVersion(String modeloVersion) { this.modeloVersion = modeloVersion; }

    public String getMedioOperacion() { return medioOperacion; }
    public void setMedioOperacion(String medioOperacion) { this.medioOperacion = medioOperacion; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public boolean isEsRecurrente() { return esRecurrente; }
    public void setEsRecurrente(boolean esRecurrente) { this.esRecurrente = esRecurrente; }

    public OffsetDateTime getCreadoEn() { return creadoEn; }
}
