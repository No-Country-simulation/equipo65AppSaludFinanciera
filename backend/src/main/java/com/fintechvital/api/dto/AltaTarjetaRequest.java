package com.fintechvital.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Alta y edicion de tarjeta (datasource.ts -> AltaTarjeta).
 *
 * Se usa el MISMO record para POST y para PATCH. En el POST se valida entero
 * con @Valid; en el PATCH los nulos significan "no lo toques", asi que las
 * anotaciones de obligatoriedad no se aplican y el servicio comprueba a mano lo
 * que llegue. Por eso `idCuenta` y compania no llevan @NotNull: un PATCH que
 * solo cambia la etiqueta es legitimo.
 *
 * ⚠️ NO se acepta el numero completo de la tarjeta, solo `ultimos4`. Recibirlo
 * aunque fuera para descartarlo ya significaria que el PAN viaja y queda en los
 * logs de acceso.
 */
public record AltaTarjetaRequest(

        String idCuenta,

        @Pattern(regexp = "debito|credito", message = "debe ser debito o credito")
        String tipo,

        @Pattern(regexp = "visa|mastercard|amex", message = "red de pago no soportada")
        String redPago,

        @Pattern(regexp = "[0-9]{4}", message = "deben ser 4 digitos")
        String ultimos4,

        @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])", message = "formato esperado YYYY-MM")
        String fechaVencimiento,

        @Size(max = 60, message = "maximo 60 caracteres")
        String etiqueta,

        @Pattern(regexp = "activa|bloqueada|cancelada", message = "estado no valido")
        String estado,

        @Valid
        Credito credito
) {
    /**
     * Solo tiene sentido cuando `tipo` es "credito". El servicio lo exige en ese
     * caso: la tabla `tarjeta_credito` tiene las tres columnas NOT NULL.
     */
    public record Credito(

            @NotNull(message = "es obligatorio")
            @DecimalMin(value = "0", message = "no puede ser negativo")
            BigDecimal limiteCredito,

            @NotNull(message = "es obligatorio")
            @Min(value = 1, message = "minimo 1")
            @Max(value = 31, message = "maximo 31")
            Short diaCorte,

            @NotNull(message = "es obligatorio")
            @Min(value = 1, message = "minimo 1")
            @Max(value = 31, message = "maximo 31")
            Short diaPago
    ) {}
}
