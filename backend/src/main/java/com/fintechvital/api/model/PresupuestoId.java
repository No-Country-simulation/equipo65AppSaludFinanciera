package com.fintechvital.api.model;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

// Esta clase representa la llave primaria compuesta: (usuario_id + categoria_slug)
public class PresupuestoId implements Serializable {

    private UUID usuarioId;
    private String categoriaSlug;

    public PresupuestoId() {}

    public PresupuestoId(UUID usuarioId, String categoriaSlug) {
        this.usuarioId = usuarioId;
        this.categoriaSlug = categoriaSlug;
    }

    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }

    public String getCategoriaSlug() { return categoriaSlug; }
    public void setCategoriaSlug(String categoriaSlug) { this.categoriaSlug = categoriaSlug; }

    // Equals y HashCode son OBLIGATORIOS en llaves compuestas en Java
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PresupuestoId that = (PresupuestoId) o;
        return Objects.equals(usuarioId, that.usuarioId) && Objects.equals(categoriaSlug, that.categoriaSlug);
    }

    @Override
    public int hashCode() {
        return Objects.hash(usuarioId, categoriaSlug);
    }
}
