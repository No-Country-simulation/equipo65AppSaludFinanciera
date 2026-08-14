package com.fintechvital.api.service;

import com.fintechvital.api.dto.EventoDtos;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.EventoCalendario;
import com.fintechvital.api.repository.EventoCalendarioRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * El calendario de Movimientos: pagos que vencen, cobros que se esperan y
 * recordatorios sueltos.
 *
 * Todo filtra por el usuario del token (RN9) y lo ajeno devuelve 404, no 403.
 */
@Service
public class EventoService {

    /** ck_evento_calendario_tipo. Son slugs: no se traducen. */
    private static final Set<String> TIPOS = Set.of("pago", "cobro", "recordatorio");

    private final EventoCalendarioRepository eventos;
    private final UsuarioRepository usuarios;

    public EventoService(EventoCalendarioRepository eventos, UsuarioRepository usuarios) {
        this.eventos = eventos;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<EventoDtos.Respuesta> listar() {
        return eventos.findByUsuarioIdOrderByFechaAsc(UsuarioActual.id()).stream()
                .map(EventoDtos.Respuesta::de)
                .toList();
    }

    @Transactional
    public EventoDtos.Respuesta crear(EventoDtos.Alta alta) {
        UUID usuario = UsuarioActual.id();
        if (alta.fecha() == null) throw ErrorNegocio.validacion("fecha", "es obligatoria");
        if (alta.titulo() == null || alta.titulo().isBlank()) {
            throw ErrorNegocio.validacion("titulo", "es obligatorio");
        }

        EventoCalendario e = new EventoCalendario();
        e.setUsuarioId(usuario);
        e.setFecha(alta.fecha());
        e.setTitulo(alta.titulo().trim());
        e.setTipo(exigirTipo(alta.tipo() != null ? alta.tipo() : "recordatorio"));
        aplicarMonto(e, alta, usuario);
        return EventoDtos.Respuesta.de(eventos.save(e));
    }

    @Transactional
    public EventoDtos.Respuesta actualizar(UUID id, EventoDtos.Alta cambios) {
        EventoCalendario e = mio(id);
        if (cambios.fecha() != null) e.setFecha(cambios.fecha());
        if (cambios.titulo() != null && !cambios.titulo().isBlank()) e.setTitulo(cambios.titulo().trim());
        if (cambios.tipo() != null) e.setTipo(exigirTipo(cambios.tipo()));
        if (cambios.monto() != null || cambios.moneda() != null) {
            aplicarMonto(e, cambios, e.getUsuarioId());
        }
        return EventoDtos.Respuesta.de(eventos.save(e));
    }

    @Transactional
    public void eliminar(UUID id) {
        eventos.delete(mio(id));
    }

    // ----------------------------------------------------------------- apoyo ---

    /**
     * Un monto sin moneda no se puede mostrar ni sumar, y la base lo rechaza
     * (ck_evento_calendario_moneda). Si no viene, se usa la del usuario en vez
     * de devolver un 422 por algo que se sabe resolver.
     */
    private void aplicarMonto(EventoCalendario e, EventoDtos.Alta datos, UUID usuario) {
        e.setMonto(datos.monto());
        if (datos.monto() == null) {
            e.setMoneda(null);
            return;
        }
        e.setMoneda(datos.moneda() != null ? datos.moneda() : monedaDe(usuario));
    }

    private EventoCalendario mio(UUID id) {
        return eventos.findByIdAndUsuarioId(id, UsuarioActual.id())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.NOT_FOUND, "EVENTO_NO_ENCONTRADO",
                        "Ese evento no existe"));
    }

    private String exigirTipo(String tipo) {
        if (!TIPOS.contains(tipo)) {
            throw ErrorNegocio.validacion("tipo", "tiene que ser pago, cobro o recordatorio");
        }
        return tipo;
    }

    private String monedaDe(UUID usuario) {
        return usuarios.findById(usuario)
                .map(u -> u.getMonedaPrincipal())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                        "El usuario del token ya no existe"));
    }
}
