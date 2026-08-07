package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Datos exclusivos de una tarjeta de credito. Mapea `tarjeta_credito`
 * (db/migraciones/V3). Solo hay fila si `tarjeta.tipo_tarjeta = 'credito'`.
 *
 * ⚠️ Aqui NO esta `saldo_utilizado`: es derivado (la suma de los cargos) y lo
 * calcula la vista `vw_tarjeta_credito`. Guardarlo seria tener el mismo numero
 * en dos sitios.
 */
@Entity
@Table(name = "tarjeta_credito")
@Getter
@Setter
public class TarjetaCredito {

    @Id
    @Column(name = "tarjeta_id")
    private UUID tarjetaId;

    @Column(name = "limite_credito", nullable = false)
    private BigDecimal limiteCredito;

    @Column(name = "dia_corte", nullable = false)
    private Short diaCorte;

    @Column(name = "dia_pago", nullable = false)
    private Short diaPago;
}
