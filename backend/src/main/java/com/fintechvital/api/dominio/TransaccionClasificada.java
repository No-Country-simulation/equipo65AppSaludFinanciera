package com.fintechvital.api.dominio;

import java.math.BigDecimal;

/**
 * Una transaccion con su categoria ya resuelta.
 *
 * Vive en `dominio` y no dentro de un servicio porque la usan tres: el que
 * calcula los indicadores, el motor de reglas y el que arma la respuesta.
 * Teniendola en uno de ellos, los otros dos dependerian de un servicio solo para
 * poder nombrar un dato.
 *
 * `origen` dice si la categoria la puso el modelo o el baseline por palabras
 * clave del servicio de ML. No influye en ningun calculo -- se arrastra hasta la
 * respuesta para que se pueda auditar de donde salio cada clasificacion. Ver
 * ml/README.md.
 */
public record TransaccionClasificada(
        String descripcion,
        BigDecimal valor,
        String categoria,
        BigDecimal confianza,
        String origen
) {}
