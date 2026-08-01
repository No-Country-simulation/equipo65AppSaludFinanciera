package com.hackathon.analisis.controller;

import com.hackathon.analisis.dto.ResumenFinancieroDTO;
import com.hackathon.analisis.model.Transaccion;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Clave para que React se comunique sin bloqueos CORS
public class AnalisisController {

    @PostMapping("/analisis-financiero")
    public ResumenFinancieroDTO analizarFinanzas(@RequestBody List<Transaccion> transacciones) {
        double ingresos = 0;
        double basicas = 0;
        double estiloVida = 0;
        double prescindibles = 0;

        for (Transaccion t : transacciones) {
            String macro = t.getMacroCategoria() != null ? t.getMacroCategoria() : "";
            double monto = t.getCantidadMonto() != null ? t.getCantidadMonto() : 0.0;

            if ("Ingreso".equalsIgnoreCase(macro)) {
                ingresos += Math.abs(monto);
            } else if ("Necesidades Básicas".equalsIgnoreCase(macro)) {
                basicas += Math.abs(monto);
            } else if ("Estilo de Vida".equalsIgnoreCase(macro)) {
                estiloVida += Math.abs(monto);
            } else if ("Gasto Prescindible".equalsIgnoreCase(macro)) {
                prescindibles += Math.abs(monto);
            }
        }

        ResumenFinancieroDTO resumen = new ResumenFinancieroDTO();
        resumen.setTotalIngresos(ingresos);
        resumen.setTotalNecesidadesBasicas(basicas);
        resumen.setTotalEstiloDeVida(estiloVida);
        resumen.setTotalGastosPrescindibles(prescindibles);
        resumen.setSaldoFinal(ingresos - (basicas + estiloVida + prescindibles));

        return resumen;
    }
}