package com.hackathon.analisis.service;

import com.hackathon.analisis.dto.*;
import com.hackathon.analisis.error.ErrorNegocio;
import com.hackathon.analisis.model.HistorialBuro;
import com.hackathon.analisis.model.Tarjeta;
import com.hackathon.analisis.model.TarjetaCredito;
import com.hackathon.analisis.repository.*;
import com.hackathon.analisis.security.UsuarioActual;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Productos bancarios: cuentas, tarjetas y buro de credito.
 *
 * Cuentas y buro son de SOLO LECTURA: esos datos los pone el banco, la app los
 * muestra. Las tarjetas si se administran desde la interfaz (alta, edicion,
 * baja), porque es lo que pedia el frontend que ya estaba hecho.
 *
 * Todo filtra por el usuario del token (RN9) y lo que no es tuyo devuelve 404,
 * nunca 403: un 403 confirmaria que ese id existe.
 */
@Service
public class BancaService {

    private final CuentaBancariaRepository cuentas;
    private final TarjetaRepository tarjetas;
    private final TarjetaCreditoRepository creditos;
    private final HistorialBuroRepository buro;

    public BancaService(CuentaBancariaRepository cuentas,
                        TarjetaRepository tarjetas,
                        TarjetaCreditoRepository creditos,
                        HistorialBuroRepository buro) {
        this.cuentas = cuentas;
        this.tarjetas = tarjetas;
        this.creditos = creditos;
        this.buro = buro;
    }

    // --------------------------------------------------------------- cuentas ---

    @Transactional(readOnly = true)
    public List<CuentaResponse> cuentas() {
        return cuentas.deUsuario(UsuarioActual.id()).stream()
                .map(CuentaResponse::de)
                .toList();
    }

    // -------------------------------------------------------------- tarjetas ---

    @Transactional(readOnly = true)
    public List<TarjetaResponse> tarjetas() {
        UUID usuario = UsuarioActual.id();
        Map<UUID, CreditoResponse> porTarjeta = creditosDe(usuario);

        return tarjetas.deUsuario(usuario).stream()
                .map(t -> TarjetaResponse.de(t, porTarjeta.get(t.getId())))
                .toList();
    }

    @Transactional
    public TarjetaResponse crear(AltaTarjetaRequest alta) {
        UUID usuario = UsuarioActual.id();

        // Campos que en el alta si son obligatorios. No van como @NotNull en el
        // record porque el mismo record sirve para el PATCH, donde null
        // significa "no lo toques".
        exigir(alta.idCuenta(), "id_cuenta");
        exigir(alta.tipo(), "tipo");
        exigir(alta.redPago(), "red_pago");
        exigir(alta.ultimos4(), "ultimos4");
        exigir(alta.fechaVencimiento(), "fecha_vencimiento");

        UUID cuentaId = aUuid(alta.idCuenta(), "id_cuenta");
        // RN9: la cuenta tiene que ser suya. Sin esto, mandar el id de la cuenta
        // de otra persona colgaria una tarjeta de ella.
        if (!cuentas.esDelUsuario(cuentaId, usuario)) {
            throw new ErrorNegocio(HttpStatus.NOT_FOUND, "CUENTA_NO_ENCONTRADA",
                    "Esa cuenta no existe");
        }

        boolean esCredito = "credito".equals(alta.tipo());
        if (esCredito && alta.credito() == null) {
            throw ErrorNegocio.validacion("credito",
                    "es obligatorio cuando la tarjeta es de credito");
        }

        Tarjeta tarjeta = new Tarjeta();
        tarjeta.setCuentaId(cuentaId);
        tarjeta.setTipoTarjeta(alta.tipo());
        tarjeta.setRedPago(alta.redPago());
        tarjeta.setUltimos4(alta.ultimos4());
        tarjeta.setFechaVencimiento(aFecha(alta.fechaVencimiento()));
        tarjeta.setEtiqueta(alta.etiqueta());
        if (alta.estado() != null) tarjeta.setEstado(alta.estado());
        tarjeta = tarjetas.saveAndFlush(tarjeta);

        CreditoResponse credito = null;
        if (esCredito) {
            credito = guardarCredito(tarjeta.getId(), alta.credito());
        }
        return TarjetaResponse.de(tarjeta, credito);
    }

    @Transactional
    public TarjetaResponse actualizar(UUID id, AltaTarjetaRequest cambios) {
        UUID usuario = UsuarioActual.id();
        Tarjeta tarjeta = tarjetas.delUsuario(id, usuario).orElseThrow(this::noEncontrada);

        // PATCH: solo se toca lo que viene.
        if (cambios.redPago() != null) tarjeta.setRedPago(cambios.redPago());
        if (cambios.ultimos4() != null) tarjeta.setUltimos4(cambios.ultimos4());
        if (cambios.fechaVencimiento() != null) {
            tarjeta.setFechaVencimiento(aFecha(cambios.fechaVencimiento()));
        }
        if (cambios.etiqueta() != null) tarjeta.setEtiqueta(cambios.etiqueta());
        if (cambios.estado() != null) tarjeta.setEstado(cambios.estado());

        // El TIPO no se puede cambiar: pasar de debito a credito exigiria crear
        // la fila de tarjeta_credito, y de credito a debito la borraria junto
        // con el limite y las fechas de corte. Para eso se da de baja y se crea
        // otra, que ademas es lo que pasa en el banco de verdad.
        if (cambios.tipo() != null && !cambios.tipo().equals(tarjeta.getTipoTarjeta())) {
            throw ErrorNegocio.validacion("tipo",
                    "no se puede cambiar el tipo de una tarjeta ya creada");
        }

        tarjetas.save(tarjeta);

        CreditoResponse credito = null;
        if ("credito".equals(tarjeta.getTipoTarjeta())) {
            if (cambios.credito() != null) {
                guardarCredito(tarjeta.getId(), cambios.credito());
            }
            // Se relee de la vista para devolver el saldo_utilizado actualizado.
            credito = creditosDe(usuario).get(tarjeta.getId());
        }
        return TarjetaResponse.de(tarjeta, credito);
    }

    @Transactional
    public void eliminar(UUID id) {
        Tarjeta tarjeta = tarjetas.delUsuario(id, UsuarioActual.id()).orElseThrow(this::noEncontrada);
        // La fila de tarjeta_credito se va sola: la FK es ON DELETE CASCADE.
        tarjetas.delete(tarjeta);
    }

    // ------------------------------------------------------------------ buro ---

    @Transactional(readOnly = true)
    public SaludCrediticiaResponse saludCrediticia() {
        List<HistorialBuro> historial = buro.findByUsuarioIdOrderByConsultadoEnAsc(UsuarioActual.id());

        if (historial.isEmpty()) {
            // 404 y no una respuesta vacia: "no hay consultas de buro" es un
            // estado real y distinto de "score 0", que la interfaz pintaria
            // como si la persona tuviera el peor historial posible.
            throw new ErrorNegocio(HttpStatus.NOT_FOUND, "SIN_HISTORIAL_BURO",
                    "Todavia no hay consultas de buro para esta cuenta");
        }

        HistorialBuro vigente = historial.get(historial.size() - 1);
        return new SaludCrediticiaResponse(
                vigente.getMoneda(),
                RegistroBuroResponse.de(vigente),
                historial.stream().map(RegistroBuroResponse::de).toList());
    }

    // ----------------------------------------------------------------- comun ---

    /** Datos de credito del usuario indexados por tarjeta, leidos de la vista. */
    private Map<UUID, CreditoResponse> creditosDe(UUID usuario) {
        Map<UUID, CreditoResponse> porTarjeta = new HashMap<>();
        for (Object[] fila : creditos.creditoDeUsuario(usuario)) {
            porTarjeta.put(
                    (UUID) fila[0],
                    new CreditoResponse(
                            (BigDecimal) fila[1],
                            ((Number) fila[2]).shortValue(),
                            ((Number) fila[3]).shortValue(),
                            (BigDecimal) fila[4]));
        }
        return porTarjeta;
    }

    private CreditoResponse guardarCredito(UUID tarjetaId, AltaTarjetaRequest.Credito datos) {
        TarjetaCredito credito = creditos.findById(tarjetaId).orElseGet(TarjetaCredito::new);
        credito.setTarjetaId(tarjetaId);
        if (datos.limiteCredito() != null) credito.setLimiteCredito(datos.limiteCredito());
        if (datos.diaCorte() != null) credito.setDiaCorte(datos.diaCorte());
        if (datos.diaPago() != null) credito.setDiaPago(datos.diaPago());
        creditos.save(credito);

        // Una tarjeta recien creada no tiene movimientos, asi que su saldo
        // utilizado es 0. Se devuelve directo en vez de releer la vista.
        return new CreditoResponse(credito.getLimiteCredito(), credito.getDiaCorte(),
                credito.getDiaPago(), BigDecimal.ZERO);
    }

    /** 'YYYY-MM' -> primer dia del mes. El dia no se muestra ni significa nada. */
    private static LocalDate aFecha(String anioMes) {
        return LocalDate.parse(anioMes + "-01");
    }

    private static UUID aUuid(String valor, String campo) {
        try {
            return UUID.fromString(valor);
        } catch (IllegalArgumentException e) {
            throw ErrorNegocio.validacion(campo, "no es un identificador valido");
        }
    }

    private static void exigir(String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw ErrorNegocio.validacion(campo, "es obligatorio");
        }
    }

    private ErrorNegocio noEncontrada() {
        return new ErrorNegocio(HttpStatus.NOT_FOUND, "TARJETA_NO_ENCONTRADA",
                "Esa tarjeta no existe");
    }
}
