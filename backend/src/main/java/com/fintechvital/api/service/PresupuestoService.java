package com.fintechvital.api.service;

import com.fintechvital.api.dto.PresupuestoResponse;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.Presupuesto;
import com.fintechvital.api.model.PresupuestoId;
import com.fintechvital.api.repository.CategoriaRepository;
import com.fintechvital.api.repository.PresupuestoRepository;
import com.fintechvital.api.repository.PresupuestoUsoRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Presupuestos mensuales por categoria.
 *
 * La escritura va contra la tabla `presupuesto`; la lectura, contra la vista
 * `vw_presupuesto_uso`, que ya trae lo gastado del mes en curso con la MISMA
 * definicion de gasto que el analisis y los graficos.
 */
@Service
public class PresupuestoService {

    private final PresupuestoRepository presupuestos;
    private final PresupuestoUsoRepository uso;
    private final CategoriaRepository categorias;
    private final UsuarioRepository usuarios;

    public PresupuestoService(PresupuestoRepository presupuestos,
                              PresupuestoUsoRepository uso,
                              CategoriaRepository categorias,
                              UsuarioRepository usuarios) {
        this.presupuestos = presupuestos;
        this.uso = uso;
        this.categorias = categorias;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<PresupuestoResponse> listar() {
        return uso.findByUsuarioIdOrderByCategoriaSlugAsc(UsuarioActual.id()).stream()
                .map(PresupuestoResponse::de)
                .toList();
    }

    /**
     * Alta o cambio de limite. Es un upsert a proposito: la interfaz no
     * distingue entre "poner presupuesto" y "cambiarlo", es el mismo gesto sobre
     * la misma categoria, y la clave primaria (usuario, categoria) ya lo dice.
     */
    @Transactional
    public PresupuestoResponse guardar(String categoria, BigDecimal limite) {
        UUID usuario = UsuarioActual.id();
        String slug = exigirCategoriaValida(categoria);
        if (limite == null || limite.signum() <= 0) {
            // ck_presupuesto_limite: un presupuesto de cero es no tener presupuesto.
            throw ErrorNegocio.validacion("limite", "tiene que ser mayor que cero");
        }

        Presupuesto p = presupuestos.findById(new PresupuestoId(usuario, slug))
                .orElseGet(() -> {
                    Presupuesto nuevo = new Presupuesto();
                    nuevo.setUsuarioId(usuario);
                    nuevo.setCategoriaSlug(slug);
                    nuevo.setMoneda(monedaDe(usuario));
                    return nuevo;
                });
        p.setLimite(limite);
        presupuestos.save(p);

        // Se vuelve a leer de la vista para devolver `gastado` ya calculado.
        return uso.findById(new PresupuestoId(usuario, slug))
                .map(PresupuestoResponse::de)
                .orElseGet(() -> new PresupuestoResponse(slug, limite, BigDecimal.ZERO, p.getMoneda()));
    }

    @Transactional
    public void eliminar(String categoria) {
        PresupuestoId clave = new PresupuestoId(UsuarioActual.id(), categoria);
        if (!presupuestos.existsById(clave)) {
            throw new ErrorNegocio(HttpStatus.NOT_FOUND, "PRESUPUESTO_NO_ENCONTRADO",
                    "No hay presupuesto para esa categoria");
        }
        presupuestos.deleteById(clave);
    }

    private String exigirCategoriaValida(String slug) {
        if (slug == null || slug.isBlank()) {
            throw ErrorNegocio.validacion("categoria", "es obligatoria");
        }
        String limpio = slug.trim();
        if (!categorias.existsBySlugAndActivaTrue(limpio)) {
            throw ErrorNegocio.validacion("categoria",
                    "'" + limpio + "' no es una categoria del catalogo");
        }
        return limpio;
    }

    private String monedaDe(UUID usuario) {
        return usuarios.findById(usuario)
                .map(u -> u.getMonedaPrincipal())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                        "El usuario del token ya no existe"));
    }
}
