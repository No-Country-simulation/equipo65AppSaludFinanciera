package com.hackathon.analisis.error;

import com.hackathon.analisis.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;
import java.util.UUID;

/**
 * Traduce CUALQUIER excepcion a la forma de error del contrato (§2):
 *
 *   { "codigo", "mensaje", "detalles": [...], "traza_id" }
 *
 * Antes, un fallo devolvia el getMessage() como texto plano y el frontend no
 * podia parsearlo, o directamente el HTML de error de Spring.
 *
 * El `traza_id` es el mismo que se escribe en el log: permite pasar de "me sale
 * un error" a la linea exacta del servidor sin adivinar.
 */
@RestControllerAdvice
public class ManejadorErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorErrores.class);

    @ExceptionHandler(ErrorNegocio.class)
    public ResponseEntity<ErrorResponse> negocio(ErrorNegocio e) {
        String traza = UUID.randomUUID().toString();
        // Los errores esperados (credenciales, email duplicado) no son incidencias:
        // se registran en INFO para no llenar el log de ruido.
        log.info("[{}] {} - {}", traza, e.getCodigo(), e.getMessage());
        return ResponseEntity.status(e.getEstado())
                .body(new ErrorResponse(e.getCodigo(), e.getMessage(), e.getDetalles(), traza));
    }

    /** Fallos de @Valid: se devuelven TODOS los campos malos, no solo el primero. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validacion(MethodArgumentNotValidException e) {
        String traza = UUID.randomUUID().toString();
        List<ErrorResponse.Detalle> detalles = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ErrorResponse.Detalle(aSnake(f.getField()), f.getDefaultMessage()))
                .toList();
        log.info("[{}] VALIDACION_ENTRADA - {} campo(s)", traza, detalles.size());
        return ResponseEntity.unprocessableEntity().body(new ErrorResponse(
                "VALIDACION_ENTRADA", "La solicitud tiene campos invalidos", detalles, traza));
    }

    /** JSON malformado -> 400, distinto de "JSON valido con datos malos" -> 422. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> jsonMalo(HttpMessageNotReadableException e) {
        String traza = UUID.randomUUID().toString();
        log.info("[{}] JSON_MALFORMADO", traza);
        return ResponseEntity.badRequest().body(new ErrorResponse(
                "JSON_MALFORMADO", "El cuerpo de la peticion no es JSON valido", List.of(), traza));
    }

    /**
     * Ruta inexistente -> 404.
     *
     * Sin esto lo recogia el catch-all de abajo y CUALQUIER endpoint que aun no
     * este implementado respondia 500 con una traza completa en el log. Dos
     * consecuencias, las dos malas: el frontend no puede distinguir "esto todavia
     * no existe" de "el servidor se rompio", y el log se llena de excepciones que
     * no son incidencias. Medido el 2026-08-04: 16 llamadas del panel, 16 quinientos.
     */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> noEncontrado(Exception e) {
        String traza = UUID.randomUUID().toString();
        log.info("[{}] NO_ENCONTRADO - {}", traza, e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(
                "NO_ENCONTRADO", "El recurso solicitado no existe", List.of(), traza));
    }

    /** Red de seguridad: nada inesperado puede salir como stacktrace al cliente. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> inesperado(Exception e) {
        String traza = UUID.randomUUID().toString();
        log.error("[{}] Error inesperado", traza, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse(
                "ERROR_INTERNO", "Ocurrio un error inesperado", List.of(), traza));
    }

    /** Los nombres de campo se devuelven en snake_case, como el resto del JSON. */
    private static String aSnake(String camel) {
        return camel.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }
}
