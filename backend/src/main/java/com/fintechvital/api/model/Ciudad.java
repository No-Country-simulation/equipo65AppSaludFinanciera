package com.fintechvital.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Tabla `ciudad` (migracion V1). Catalogo: se lee, no se escribe desde la API.
 *
 * La columna se llama `region` y no `estado` para no chocar con los "estado" de
 * dominio (activa/bloqueada); hacia fuera viaja como `estado_region`, que es lo
 * que consume el frontend (types.ts -> Usuario.estado_region).
 */
@Entity
@Table(name = "ciudad")
public class Ciudad {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "pais", nullable = false, length = 2)
    private String pais;

    protected Ciudad() {}

    public UUID getId() { return id; }
    public String getNombre() { return nombre; }
    public String getRegion() { return region; }
    public String getPais() { return pais; }
}
