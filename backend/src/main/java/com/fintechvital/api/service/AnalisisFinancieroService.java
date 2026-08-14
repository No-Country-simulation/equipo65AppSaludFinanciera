package com.fintechvital.api.service;

import com.fintechvital.api.dominio.Indicadores;
import com.fintechvital.api.dominio.Taxonomia;
import com.fintechvital.api.dto.AnalisisFinancieroRequest;
import com.fintechvital.api.dto.AnalisisFinancieroResponse;
import com.fintechvital.api.dto.AnalisisFinancieroResponse.TransaccionClasificadaDto;
import com.fintechvital.api.dominio.TransaccionClasificada;
import com.fintechvital.api.dto.ClasificarDtos;
import com.fintechvital.api.service.MotorReglasService.Recomendacion;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * El analisis financiero de punta a punta. Es el flujo del CONTRATO_MODELO §2:
 *
 *   1. pedir al ML la categoria de cada transaccion
 *   2. agregar los montos por categoria      -> resumen_gastos
 *   3. calcular los 8 indicadores            -> ratios          (AQUI, no en el ML)
 *   4. pedir al ML el perfil
 *   5. motor de reglas sobre los indicadores -> recomendaciones (AQUI, no en el ML)
 *   6. responder
 *
 * Los pasos 3 y 5 estan en Spring a proposito: el ML es inferencia pura y no
 * conoce ninguna regla de negocio. Asi se puede reentrenar o reemplazar el
 * modelo sin tocar una sola formula.
 */
@Service
public class AnalisisFinancieroService {

    private final ClienteMlService ml;
    private final IndicadoresService indicadores;
    private final MotorReglasService reglas;
    private final MessageSource mensajes;

    public AnalisisFinancieroService(ClienteMlService ml,
                                     IndicadoresService indicadores,
                                     MotorReglasService reglas,
                                     MessageSource mensajes) {
        this.ml = ml;
        this.indicadores = indicadores;
        this.reglas = reglas;
        this.mensajes = mensajes;
    }

    public AnalisisFinancieroResponse analizar(AnalisisFinancieroRequest peticion, Locale idioma) {
        // 1. Clasificar
        List<TransaccionClasificada> clasificadas = clasificarTodas(peticion.transacciones());

        // 2. Agregar por categoria
        Map<String, BigDecimal> resumenGastos = soloGastos(
                indicadores.agruparPorCategoria(clasificadas));

        // 3. Indicadores (los calcula Spring)
        Indicadores ind = indicadores.calcular(
                peticion.ingresoMensual(),
                peticion.nivelEndeudamiento(),
                peticion.frecuenciaAhorro(),
                clasificadas);

        // 4. Perfil
        var respuestaPerfil = ml.perfil(ind.comoMapa());

        // 5. Reglas (las aplica Spring)
        List<Recomendacion> detalle = reglas.evaluar(
                ind, resumenGastos, peticion.ingresoMensual(), idioma);

        // 6. Responder
        return new AnalisisFinancieroResponse(
                etiquetaPerfil(respuestaPerfil.perfil(), idioma),
                respuestaPerfil.probabilidad(),
                resumenGastos,
                detalle.stream().map(Recomendacion::texto).toList(),
                respuestaPerfil.perfil(),
                respuestaPerfil.probabilidades(),
                ind.comoMapa(),
                clasificadas.stream().map(AnalisisFinancieroService::aDto).toList(),
                detalle,
                peticion.monedaODefecto(),
                idioma.getLanguage(),
                respuestaPerfil.modeloVersion(),
                OffsetDateTime.now(),
                // El endpoint del enunciado no persiste: no hay id que devolver.
                null);
    }

    /** El endpoint de clasificacion suelta que pide el enunciado. */
    public ClasificarDtos.Respuesta clasificar(List<AnalisisFinancieroRequest.Movimiento> movimientos) {
        var respuesta = ml.clasificar(aEntradas(movimientos));
        return new ClasificarDtos.Respuesta(
                respuesta.modeloVersion(),
                reasociar(movimientos, respuesta).stream()
                        .map(AnalisisFinancieroService::aDto)
                        .toList());
    }

    // ----------------------------------------------------------------- comun ---

    private List<TransaccionClasificada> clasificarTodas(
            List<AnalisisFinancieroRequest.Movimiento> movimientos) {
        return reasociar(movimientos, ml.clasificar(aEntradas(movimientos)));
    }

    /**
     * Vuelve a unir cada resultado con su transaccion, POR EL ID que se mando,
     * no por la posicion de la lista.
     *
     * El contrato dice que el id se devuelve tal cual, pero no garantiza el
     * orden. Confiar en el indice funcionaria hoy y se romperia en silencio el
     * dia que el ML procese en paralelo: cada gasto quedaria con la categoria de
     * otro y nada fallaria de forma visible.
     */
    private static List<TransaccionClasificada> reasociar(
            List<AnalisisFinancieroRequest.Movimiento> movimientos,
            ClienteMlService.RespuestaClasificar respuesta) {

        Map<String, ClienteMlService.ResultadoClasificacion> porId = new LinkedHashMap<>();
        for (var resultado : respuesta.resultados()) porId.put(resultado.id(), resultado);

        List<TransaccionClasificada> clasificadas = new ArrayList<>(movimientos.size());
        for (int i = 0; i < movimientos.size(); i++) {
            var movimiento = movimientos.get(i);
            var resultado = porId.get(String.valueOf(i));
            if (resultado == null) {
                // El ML devolvio menos resultados de los que se le mandaron. Se
                // marca como "otros" con confianza 0 en vez de perder la
                // transaccion: el gasto tiene que seguir contando en los totales.
                clasificadas.add(new TransaccionClasificada(movimiento.descripcion(),
                        movimiento.valor(), Taxonomia.OTROS, BigDecimal.ZERO, "baseline"));
                continue;
            }
            clasificadas.add(new TransaccionClasificada(
                    movimiento.descripcion(), movimiento.valor(),
                    resultado.categoria(), resultado.confianza(), resultado.origen()));
        }
        return clasificadas;
    }

    private static TransaccionClasificadaDto aDto(TransaccionClasificada t) {
        return new TransaccionClasificadaDto(
                t.descripcion(), t.valor(), t.categoria(), t.confianza(), t.origen());
    }

    private List<ClienteMlService.EntradaTransaccion> aEntradas(
            List<AnalisisFinancieroRequest.Movimiento> movimientos) {
        List<ClienteMlService.EntradaTransaccion> entradas = new ArrayList<>(movimientos.size());
        for (int i = 0; i < movimientos.size(); i++) {
            // El id es el indice: el ML lo devuelve tal cual y asi se reasocia
            // cada resultado con su transaccion sin depender del orden.
            entradas.add(new ClienteMlService.EntradaTransaccion(
                    String.valueOf(i), movimientos.get(i).descripcion(), movimientos.get(i).valor()));
        }
        return entradas;
    }

    /**
     * `resumen_gastos` solo lleva GASTOS.
     *
     * Si entrara `ingresos`, la grafica de "en que se va tu dinero" mostraria el
     * sueldo como si fuera un gasto, que es el mayor de todos, y el resto de las
     * categorias quedarian aplastadas.
     */
    private static Map<String, BigDecimal> soloGastos(Map<String, BigDecimal> porCategoria) {
        Map<String, BigDecimal> gastos = new LinkedHashMap<>();
        porCategoria.forEach((categoria, monto) -> {
            if (Taxonomia.esGasto(categoria)) gastos.put(categoria, monto);
        });
        return gastos;
    }

    /** La etiqueta traducida del perfil; el slug va aparte en `perfil_codigo`. */
    private String etiquetaPerfil(String slug, Locale idioma) {
        return mensajes.getMessage("perfil." + slug, null, idioma);
    }
}
