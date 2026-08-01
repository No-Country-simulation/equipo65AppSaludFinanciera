package com.hackathon.analisis.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "banco_transacciones")
@Data
public class Transaccion {

    @Id
    @Column(name = "id_evento")
    private String idEvento;

    @Column(name = "id_cliente")
    private String idCliente;

    @Column(name = "categoria_transaccion")
    private String categoriaTransaccion;

    @Column(name = "descripcion_transaccion")
    private String descripcionTransaccion;

    @Column(name = "cantidad_monto")
    private Double cantidadMonto;

    @Column(name = "macro_categoria")
    private String macroCategoria; // Ingreso, Necesidades Básicas, Estilo de Vida, etc.

    @Column(name = "monto_signo")
    private Double montoSigno; // Positivo si es ingreso, negativo si es gasto

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;
}