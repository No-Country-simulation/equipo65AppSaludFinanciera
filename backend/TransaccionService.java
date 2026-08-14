package com.hackathon.analisis.service;

import com.hackathon.analisis.model.Transaccion;
import org.springframework.stereotype.Service;

@Service
public class TransaccionService {

    public Transaccion procesarTransaccion(Transaccion transaccion) {
        // Aplicamos la regla del notebook de tus compañeros:
        if ("Nómina/Ingresos".equalsIgnoreCase(transaccion.getCategoriaTransaccion())) {
            transaccion.setMacroCategoria("Ingreso");
            transaccion.setMontoSigno(Math.abs(transaccion.getCantidadMonto())); // Positivo
        } else {
            transaccion.setMontoSigno(-Math.abs(transaccion.getCantidadMonto())); // Negativo para gastos
        }
        return transaccion;
    }
}