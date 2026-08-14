package com.fintechvital.api.service;

import com.fintechvital.api.dto.MetaDtos;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.AportePlan;
import com.fintechvital.api.model.PlanAhorro;
import com.fintechvital.api.repository.AportePlanRepository;
import com.fintechvital.api.repository.PlanAhorroRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Metas de ahorro (`plan_ahorro` + `aporte_plan`).
 *
 * Lo ahorrado se calcula sumando los aportes, nunca se guarda: un total
 * denormalizado se desincroniza en cuanto se borra un aporte, y entonces la
 * barra de progreso miente sin que nadie lo note.
 *
 * Todo filtra por el usuario del token (RN9); lo ajeno devuelve 404, no 403.
 */
@Service
public class MetaService {

    private final PlanAhorroRepository planes;
    private final AportePlanRepository aportes;
    private final UsuarioRepository usuarios;

    public MetaService(PlanAhorroRepository planes,
                       AportePlanRepository aportes,
                       UsuarioRepository usuarios) {
        this.planes = planes;
        this.aportes = aportes;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<MetaDtos.Respuesta> listar() {
        List<PlanAhorro> mias = planes.findByUsuarioIdOrderByCreadoEnAsc(UsuarioActual.id());
        if (mias.isEmpty()) return List.of();

        Map<UUID, BigDecimal> ahorrado = ahorradoDe(mias);
        return mias.stream()
                .map(p -> MetaDtos.Respuesta.de(p, ahorrado.getOrDefault(p.getId(), BigDecimal.ZERO)))
                .toList();
    }

    @Transactional
    public MetaDtos.Respuesta crear(MetaDtos.Alta alta) {
        UUID usuario = UsuarioActual.id();
        if (alta.nombre() == null || alta.nombre().isBlank()) {
            throw ErrorNegocio.validacion("nombre", "es obligatorio");
        }
        if (alta.objetivo() == null || alta.objetivo().signum() <= 0) {
            throw ErrorNegocio.validacion("objetivo", "tiene que ser mayor que cero");
        }

        PlanAhorro p = new PlanAhorro();
        p.setUsuarioId(usuario);
        p.setNombreMeta(alta.nombre().trim());
        p.setMontoMeta(alta.objetivo());
        p.setMoneda(alta.moneda() != null ? alta.moneda() : monedaDe(usuario));
        p.setFechaInicio(LocalDate.now());
        p.setFechaFin(exigirFechaPosterior(alta.fechaLimite(), p.getFechaInicio()));
        p.setEstado("activo");
        p.setIcono(alta.icono());
        p.setColor(alta.color());
        planes.save(p);

        // El saldo inicial entra como primer aporte, no como una columna: asi
        // todo lo ahorrado tiene la misma procedencia y cuadra con el detalle.
        BigDecimal inicial = alta.ahorrado();
        if (inicial != null && inicial.signum() != 0) {
            registrarAporte(p.getId(), inicial);
        }
        return MetaDtos.Respuesta.de(p, aportes.ahorradoDe(p.getId()));
    }

    @Transactional
    public MetaDtos.Respuesta aportar(UUID id, BigDecimal monto) {
        PlanAhorro p = mia(id);
        if (monto == null || monto.signum() == 0) {
            // ck_aporte_plan_monto: un aporte de cero no es un aporte.
            throw ErrorNegocio.validacion("monto", "no puede ser cero");
        }
        registrarAporte(p.getId(), monto);
        return MetaDtos.Respuesta.de(p, aportes.ahorradoDe(p.getId()));
    }

    @Transactional
    public void eliminar(UUID id) {
        // Los aportes se van con ella por el ON DELETE CASCADE del esquema.
        planes.delete(mia(id));
    }

    // ----------------------------------------------------------------- apoyo ---

    private void registrarAporte(UUID plan, BigDecimal monto) {
        AportePlan a = new AportePlan();
        a.setPlanId(plan);
        a.setMonto(monto);
        a.setFecha(LocalDate.now());
        aportes.save(a);
    }

    /** Lo ahorrado de todas las metas en una consulta, para no repetir un SELECT por fila. */
    private Map<UUID, BigDecimal> ahorradoDe(List<PlanAhorro> metas) {
        List<UUID> ids = metas.stream().map(PlanAhorro::getId).toList();
        Map<UUID, BigDecimal> porPlan = new HashMap<>();
        for (Object[] fila : aportes.ahorradoPorPlan(ids)) {
            porPlan.put((UUID) fila[0], (BigDecimal) fila[1]);
        }
        return porPlan;
    }

    private PlanAhorro mia(UUID id) {
        return planes.findByIdAndUsuarioId(id, UsuarioActual.id())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.NOT_FOUND, "META_NO_ENCONTRADA",
                        "Esa meta no existe"));
    }

    /** ck_plan_ahorro_fechas: la fecha limite no puede ser anterior al inicio. */
    private LocalDate exigirFechaPosterior(LocalDate limite, LocalDate inicio) {
        if (limite != null && limite.isBefore(inicio)) {
            throw ErrorNegocio.validacion("fecha_limite", "no puede ser anterior a hoy");
        }
        return limite;
    }

    private String monedaDe(UUID usuario) {
        return usuarios.findById(usuario)
                .map(u -> u.getMonedaPrincipal())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                        "El usuario del token ya no existe"));
    }
}
