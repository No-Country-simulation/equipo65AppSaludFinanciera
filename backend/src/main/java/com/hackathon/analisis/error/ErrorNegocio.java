package com.hackathon.analisis.error;

import com.hackathon.analisis.dto.ErrorResponse;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Excepcion tipada para los errores de negocio.
 *
 * Existe para dejar de usar RuntimeException como control de flujo: antes,
 * "credenciales invalidas" y un fallo real de la aplicacion eran la misma clase
 * y acababan devolviendo el mismo 400 con un String suelto.
 *
 * Lleva ya el codigo HTTP y el codigo estable que consume el frontend.
 */
public class ErrorNegocio extends RuntimeException {

    private final HttpStatus estado;
    private final String codigo;
    private final List<ErrorResponse.Detalle> detalles;

    public ErrorNegocio(HttpStatus estado, String codigo, String mensaje) {
        this(estado, codigo, mensaje, List.of());
    }

    public ErrorNegocio(HttpStatus estado, String codigo, String mensaje,
                        List<ErrorResponse.Detalle> detalles) {
        super(mensaje);
        this.estado = estado;
        this.codigo = codigo;
        this.detalles = detalles;
    }

    /** 422: la peticion esta bien formada pero un dato no es valido. */
    public static ErrorNegocio validacion(String campo, String error) {
        return new ErrorNegocio(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDACION_ENTRADA",
                "La solicitud tiene campos invalidos",
                List.of(new ErrorResponse.Detalle(campo, error)));
    }

    public HttpStatus getEstado() { return estado; }
    public String getCodigo() { return codigo; }
    public List<ErrorResponse.Detalle> getDetalles() { return detalles; }
}
