package com.fintechvital.api.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Tarjeta. Mapea `tarjeta` (db/migraciones/V3).
 *
 * ⚠️ NO existe el numero completo (el PAN) y no debe anadirse. Guardarlo mete
 * al proyecto en alcance PCI-DSS, y este repo es publico. Solo viven aqui los 4
 * ultimos digitos, que es lo unico que la interfaz muestra.
 *
 * Los datos de credito (limite, dia de corte, dia de pago) viven en la tabla
 * `tarjeta_credito`, no aqui: asi "una tarjeta de credito tiene limite" es
 * NOT NULL de verdad en vez de tres columnas opcionales que nadie garantiza.
 */
@Entity
@Table(name = "tarjeta")
@Getter
@Setter
public class Tarjeta {

    @Id
    @GeneratedValue
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "cuenta_id", nullable = false)
    private UUID cuentaId;

    @Column(nullable = false)
    private String ultimos4;

    @Column(name = "tipo_tarjeta", nullable = false)
    private String tipoTarjeta;

    @Column(name = "red_pago", nullable = false)
    private String redPago;

    /**
     * La interfaz maneja 'YYYY-MM' y la base una fecha. Se guarda el dia 1 del
     * mes; el dia no significa nada y no se muestra.
     */
    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(nullable = false)
    private String estado = "activa";

    private String etiqueta;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;
}
