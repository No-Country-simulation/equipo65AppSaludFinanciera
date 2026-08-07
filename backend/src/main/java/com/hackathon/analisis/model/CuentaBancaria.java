package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Cuenta bancaria. Mapea `cuenta_bancaria` (db/migraciones/V3).
 *
 * NO guarda saldo a proposito: el saldo es la suma de los movimientos, y
 * guardarlo duplicado garantiza que algun dia los dos numeros no coincidan. Se
 * calcula en la vista vw_saldo_cuenta.
 *
 * La relacion con el usuario es N:M (`cuenta_usuario`), porque hay cuentas
 * mancomunadas. No se mapea como @ManyToMany: las consultas que hacen falta se
 * resuelven mejor con un JOIN explicito en el repositorio.
 */
@Entity
@Table(name = "cuenta_bancaria")
@Getter
@Setter
public class CuentaBancaria {

    @Id
    @GeneratedValue
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "numero_cuenta", nullable = false)
    private String numeroCuenta;

    @Column(name = "tipo_cuenta", nullable = false)
    private String tipoCuenta = "debito";

    @Column(nullable = false)
    private String moneda;

    @Column(nullable = false)
    private String estado = "activa";

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDate fechaApertura;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;
}
