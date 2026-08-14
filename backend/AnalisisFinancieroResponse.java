package com.hackathon.analisis.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.hackathon.analisis.service.MotorReglasService.Recomendacion;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Salida de `POST /api/v1/analisis-financiero`.
 *
 * ⚠️ **Los CUATRO PRIMEROS campos son literales del enunciado** y salen con
 * exactamente esos nombres: `perfil_financiero`, `probabilidad`,
 * `resumen_gastos` y `recomendaciones`. Es lo que el jurado va a mirar.
 *
 * El resto son extensiones nuestras. Se anaden **despues** y son aditivas: quien
 * solo lea los cuatro primeros ve exactamente lo que pide el enunciado.
 *
 * `@JsonPropertyOrder` no es cosmetico: fija que los cuatro del enunciado salgan
 * arriba. Sin el, Jackson usa el orden de declaracion y cualquier refactor
 * podria enterrarlos entre los campos extendidos.
 */
@JsonPropertyOrder({
        "perfil_financiero", "probabilidad", "resumen_gastos", "recomendaciones",
        "perfil_codigo", "probabilidades", "indicadores", "transacciones_clasificadas",
        "recomendaciones_detalle", "moneda", "idioma", "modelo_version", "analizado_en"
})
@Schema(description = "Resultado del analisis. Los 4 primeros campos son los del enunciado.")
public record AnalisisFinancieroResponse(

        // --- Los 4 del enunciado ---

        @Schema(example = "En observación", description = "Etiqueta traducida segun Accept-Language.")
        String perfilFinanciero,

        @Schema(example = "0.82")
        BigDecimal probabilidad,

        @Schema(description = "Gasto por categoria. Las claves son SIEMPRE slugs, nunca etiquetas.")
        Map<String, BigDecimal> resumenGastos,

        @Schema(description = "Textos ya traducidos, maximo 5, ordenados por prioridad.")
        List<String> recomendaciones,

        // --- Extensiones ---

        @Schema(example = "en_observacion", description = "Slug estable. Es lo que se persiste.")
        String perfilCodigo,

        Map<String, BigDecimal> probabilidades,

        @Schema(description = "Los 8 indicadores de TAXONOMIA §3.")
        Map<String, Object> indicadores,

        List<TransaccionClasificadaDto> transaccionesClasificadas,

        @Schema(description = "Las mismas recomendaciones con su codigo y parametros, para poder auditarlas.")
        List<Recomendacion> recomendacionesDetalle,

        String moneda,
        String idioma,
        String modeloVersion,
        OffsetDateTime analizadoEn
) {
    @Schema(description = "Una transaccion con la categoria que le asigno el modelo.")
    public record TransaccionClasificadaDto(
            String descripcion,
            BigDecimal valor,
            @Schema(example = "alimentacion", description = "Slug, nunca la etiqueta traducida.")
            String categoria,
            BigDecimal confianza,
            @Schema(example = "modelo", description = "`modelo` o `baseline`. Ver ml/README.md.")
            String origen
    ) {}
}
