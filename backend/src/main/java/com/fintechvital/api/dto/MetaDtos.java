package com.fintechvital.api.dto;

import com.fintechvital.api.model.PlanAhorro;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Entrada y salida de `/api/v1/metas` (metas de ahorro, tabla `plan_ahorro`). */
public final class MetaDtos {

    private MetaDtos() {}

    @Schema(description = "Alta de una meta de ahorro.")
    public record Alta(
            @Size(max = 100, message = "no puede pasar de 100 caracteres") String nombre,
            BigDecimal objetivo,
            /** Saldo inicial: si viene, se registra como primer aporte. */
            BigDecimal ahorrado,
            LocalDate fechaLimite,
            String moneda,
            String icono,
            String color
    ) {}

    @Schema(description = "Aporte a una meta.")
    public record Aporte(BigDecimal monto) {}

    /**
     * Una meta como la pinta la interfaz (types.ts -> MetaAhorro).
     *
     * `ahorrado` NO se guarda: es la suma de `aporte_plan`. Se calcula en cada
     * lectura para que no pueda desincronizarse del detalle.
     */
    public record Respuesta(
            String id,
            String nombre,
            BigDecimal objetivo,
            BigDecimal ahorrado,
            String moneda,
            LocalDate fechaInicio,
            LocalDate fechaLimite,
            String estado,
            String icono,
            String color
    ) {
        public static Respuesta de(PlanAhorro p, BigDecimal ahorrado) {
            return new Respuesta(
                    p.getId().toString(),
                    p.getNombreMeta(),
                    p.getMontoMeta(),
                    ahorrado,
                    p.getMoneda(),
                    p.getFechaInicio(),
                    p.getFechaFin(),
                    p.getEstado(),
                    p.getIcono(),
                    p.getColor());
        }
    }
}
