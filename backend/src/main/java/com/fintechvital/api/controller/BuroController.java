package com.fintechvital.api.controller;

import com.fintechvital.api.dto.SimularBuroRequest;
import com.fintechvital.api.model.HistorialBuro;
import com.fintechvital.api.repository.HistorialBuroRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Simulador de consultas de buro.
 *
 * Existe para la DEMO: sin el, quien acaba de registrarse ve la pantalla de
 * Salud crediticia siempre vacia, porque no hay integracion con un buro real
 * (esta en el anti-alcance del proyecto) y la semilla solo trae historial para
 * los usuarios de ejemplo.
 *
 * ⚠️ La primera version de este endpoint tomaba `usuarioId` del CUERPO de la
 * peticion y lo persistia sin comprobar nada: cualquier persona con una sesion
 * valida podia escribir el historial crediticio de otra. Ahora el id sale del
 * token (RN9) y el cuerpo ya ni siquiera lo admite.
 */
@RestController
@RequestMapping("/api/v1/buro")
@Tag(name = "Salud crediticia")
public class BuroController {

    private final HistorialBuroRepository historial;
    private final UsuarioRepository usuarios;

    public BuroController(HistorialBuroRepository historial, UsuarioRepository usuarios) {
        this.historial = historial;
        this.usuarios = usuarios;
    }

    @PostMapping("/simular")
    @Transactional
    @Operation(summary = "Registra una consulta de buro simulada para el usuario del token")
    public ResponseEntity<Void> simular(@Valid @RequestBody SimularBuroRequest peticion) {
        UUID usuarioId = UsuarioActual.id();

        // Una consulta por usuario y dia (UNIQUE en la tabla): si ya hay una de
        // hoy se actualiza en vez de insertar otra. Pulsar el boton dos veces
        // tiene que refrescar el dato, no dar un error.
        LocalDate hoy = LocalDate.now();
        HistorialBuro consulta = historial.findByUsuarioIdAndConsultadoEn(usuarioId, hoy)
                .orElseGet(HistorialBuro::new);
        consulta.setUsuarioId(usuarioId);
        consulta.setScoreCrediticio(peticion.score());
        consulta.setDiasAtraso(peticion.atraso());
        consulta.setMontoAdeudado(peticion.deuda());
        // Si no la mandan, la del usuario: un historial en una moneda distinta a
        // la suya no se puede comparar con sus propios montos.
        consulta.setMoneda(peticion.moneda() != null
                ? peticion.moneda()
                : usuarios.findById(usuarioId).map(u -> u.getMonedaPrincipal()).orElse("MXN"));
        consulta.setConsultadoEn(hoy);

        historial.save(consulta);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
