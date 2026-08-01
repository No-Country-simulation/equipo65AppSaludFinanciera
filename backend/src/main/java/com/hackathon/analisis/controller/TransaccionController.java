package com.hackathon.analisis.controller;

import com.hackathon.analisis.model.Transaccion;
import com.hackathon.analisis.service.TransaccionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transacciones")
@CrossOrigin(origins = "*") // Permite la comunicación con el Frontend en React
public class TransaccionController {

    @Autowired
    private TransaccionService transaccionService;

    @PostMapping
    public Transaccion recibirTransaccion(@RequestBody Transaccion transaccion) {
        return transaccionService.procesarTransaccion(transaccion);
    }
}