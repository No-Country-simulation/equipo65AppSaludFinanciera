package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID; // <-- Importación necesaria

@Entity
@Table(name = "transaccion")
@Data
public class Transaccion {

    @Id
    @Column(name = "id")
    private UUID idEvento; // <-- Cambiado a UUID

    @Column(name = "usuario_id")
    private UUID idCliente; // <-- Cambiado a UUID

    @Column(name = "categoria_slug")
    private String categoriaTransaccion;

    @Column(name = "descripcion")
    private String descripcionTransaccion;

    @Transient
    private Double cantidadMonto;

    @Transient
    private String macroCategoria;

    @Column(name = "valor")
    private Double montoSigno;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @Column(name = "moneda")
    private String moneda;
}