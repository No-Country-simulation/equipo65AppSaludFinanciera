package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Una consulta al buro de credito. Mapea `historial_buro` (db/migraciones/V3).
 *
 * Es un HISTORICO, no una foto: el frontend dibuja la evolucion del score, asi
 * que se guarda una fila por consulta. La ultima es la que se muestra como
 * "actual" (vw_buro_vigente) y el resto forma la serie.
 */
@Entity
@Table(name = "historial_buro")
@Getter
@Setter
public class HistorialBuro {

    @Id
    @GeneratedValue
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "score_crediticio")
    private Short scoreCrediticio;

    @Column(name = "dias_atraso", nullable = false)
    private Integer diasAtraso = 0;

    @Column(name = "monto_adeudado", nullable = false)
    private BigDecimal montoAdeudado = BigDecimal.ZERO;

    @Column(nullable = false)
    private String moneda;

    @Column(name = "consultado_en", nullable = false)
    private LocalDate consultadoEn;
}
