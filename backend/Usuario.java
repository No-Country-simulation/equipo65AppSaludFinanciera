package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Usuario de la aplicacion. Mapea la tabla `usuario` de db/migraciones/V2.
 *
 * Cambios respecto a la version anterior de esta clase, y por que:
 *
 *  - La tabla se llama `usuario` (singular), no `usuarios`.
 *  - La clave es UUID, no Long: asi esta en el esquema. Un id autoincremental
 *    ademas filtra cuantos usuarios hay y permite adivinar los de al lado.
 *  - Ya NO existe el campo `password`. Las credenciales viven en
 *    `usuario_seguridad`. Tenerlas aqui hacia que cualquier SELECT del perfil
 *    arrastrara el hash y que serializar la entidad devolviera la contrasena
 *    por HTTP - que es exactamente lo que estaba pasando.
 *  - @Getter/@Setter en vez de @Data: @Data genera equals/hashCode sobre TODOS
 *    los campos, relaciones incluidas, y eso trae LazyInitializationException y
 *    bucles infinitos al serializar.
 */
@Entity
@Table(name = "usuario")
@Getter
@Setter
public class Usuario {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(name = "fecha_nacimiento", nullable = false)
    private LocalDate fechaNacimiento;

    private String genero;

    private String telefono;

    @Column(name = "ciudad_id")
    private UUID ciudadId;

    @Column(name = "moneda_principal", nullable = false)
    private String monedaPrincipal = "USD";

    @Column(nullable = false)
    private String idioma = "es";

    @Column(name = "ingreso_mensual")
    private BigDecimal ingresoMensual;

    @Column(name = "nivel_endeudamiento")
    private Short nivelEndeudamiento;

    @Column(name = "frecuencia_ahorro")
    private String frecuenciaAhorro;

    @Column(nullable = false)
    private String rol = "usuario";

    @Column(nullable = false)
    private String estado = "activo";

    @Column(name = "terminos_version")
    private String terminosVersion;

    @Column(name = "terminos_aceptados_en")
    private OffsetDateTime terminosAceptadosEn;

    @Column(name = "ultima_sesion")
    private OffsetDateTime ultimaSesion;

    // Las pone la base de datos (DEFAULT now() y un trigger). Se leen, no se escriben.
    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;
}
