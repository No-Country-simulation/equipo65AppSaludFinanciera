package com.fintechvital.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.io.Serializable;
import java.util.Objects;

/**
 * Proyeccion de solo lectura sobre la vista `vw_categoria_etiqueta` (migracion
 * V10), que es lo que sirve GET /api/v1/categorias.
 *
 * La traduccion NO se hace aqui ni con MessageSource: la vista ya trae la
 * cadena de respaldo (idioma pedido -> español -> el slug formateado). Gracias
 * a eso una categoria nueva sin traducir se sigue viendo en la interfaz en vez
 * de desaparecer del desplegable, que es justo el fallo que se reporto.
 *
 * ⚠️ Es una VISTA: se lee y no se escribe. `@Immutable` se lo dice a Hibernate
 * para que no intente actualizarla ni la meta en el dirty checking.
 */
@Entity
@Immutable
@Table(name = "vw_categoria_etiqueta")
@IdClass(CategoriaEtiqueta.Clave.class)
public class CategoriaEtiqueta {

    /** La vista es un producto cartesiano categoria x idioma: la clave son los dos. */
    @Id
    @Column(name = "slug", nullable = false)
    private String slug;

    @Id
    @Column(name = "idioma", nullable = false)
    private String idioma;

    @Column(name = "etiqueta", nullable = false)
    private String etiqueta;

    /** gasto | ingreso | movimiento (ck_categoria_tipo). Nunca se traduce. */
    @Column(name = "tipo", nullable = false)
    private String tipo;

    /** esencial | discrecional | financiero | no_gasto | otro. */
    @Column(name = "grupo", nullable = false)
    private String grupo;

    @Column(name = "orden", nullable = false)
    private Short orden;

    @Column(name = "activa", nullable = false)
    private Boolean activa;

    protected CategoriaEtiqueta() {}

    public String getSlug() { return slug; }
    public String getIdioma() { return idioma; }
    public String getEtiqueta() { return etiqueta; }
    public String getTipo() { return tipo; }
    public String getGrupo() { return grupo; }
    public Short getOrden() { return orden; }
    public Boolean getActiva() { return activa; }

    /** Clave compuesta (slug, idioma). La exige JPA para mapear la vista. */
    public static class Clave implements Serializable {
        private String slug;
        private String idioma;

        public Clave() {}

        public Clave(String slug, String idioma) {
            this.slug = slug;
            this.idioma = idioma;
        }

        @Override
        public boolean equals(Object otro) {
            if (this == otro) return true;
            if (!(otro instanceof Clave clave)) return false;
            return Objects.equals(slug, clave.slug) && Objects.equals(idioma, clave.idioma);
        }

        @Override
        public int hashCode() {
            return Objects.hash(slug, idioma);
        }
    }
}
