package com.fintechvital.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintechvital.api.dominio.Indicadores;
import com.fintechvital.api.dominio.TransaccionClasificada;
import com.fintechvital.api.dto.AnalisisFinancieroResponse;
import com.fintechvital.api.dto.AnalisisFinancieroResponse.TransaccionClasificadaDto;
import com.fintechvital.api.dto.EvolucionResponse;
import com.fintechvital.api.dto.ResumenAnalisisResponse;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.Transaccion;
import com.fintechvital.api.model.Usuario;
import com.fintechvital.api.repository.TransaccionRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import com.fintechvital.api.service.MotorReglasService.Recomendacion;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * El analisis PERSISTIDO del usuario (CONTRATO_API §6), que es lo que alimentan
 * el Panel, la pantalla de Analisis y el grafico de evolucion.
 *
 * Se diferencia de {@link AnalisisFinancieroService} -- el del enunciado -- en
 * tres cosas:
 *
 *  - las transacciones NO vienen en el cuerpo: salen de la base, ya clasificadas
 *    (y con las correcciones que haya hecho la persona, que el modelo no debe
 *    pisar);
 *  - el ingreso, el endeudamiento y la frecuencia de ahorro salen del perfil;
 *  - el resultado se GUARDA, y es una foto inmutable (RN1): un analisis viejo se
 *    consulta tal cual se genero, no se recalcula con los datos de hoy.
 *
 * Se usa JdbcTemplate y no JPA por las tres columnas JSONB con CHECK
 * (`indicadores`, `probabilidades`, `resumen_gastos`): mapear jsonb con
 * entidades anade una capa de conversion para ganar poco, y aqui lo que importa
 * es escribir exactamente lo que el esquema valida. Es el mismo criterio de
 * {@link ExportacionService}.
 */
@Service
public class AnalisisService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransaccionRepository transacciones;
    private final UsuarioRepository usuarios;
    private final IndicadoresService indicadores;
    private final MotorReglasService reglas;
    private final ClienteMlService ml;
    private final MessageSource mensajes;

    public AnalisisService(JdbcTemplate jdbc,
                           ObjectMapper json,
                           TransaccionRepository transacciones,
                           UsuarioRepository usuarios,
                           IndicadoresService indicadores,
                           MotorReglasService reglas,
                           ClienteMlService ml,
                           MessageSource mensajes) {
        this.jdbc = jdbc;
        this.json = json;
        this.transacciones = transacciones;
        this.usuarios = usuarios;
        this.indicadores = indicadores;
        this.reglas = reglas;
        this.ml = ml;
        this.mensajes = mensajes;
    }

    // -------------------------------------------------------------- ejecutar ---

    @Transactional
    public AnalisisFinancieroResponse ejecutar(LocalDate desde, LocalDate hasta) {
        UUID id = UsuarioActual.id();
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new ErrorNegocio(
                HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO", "El usuario del token ya no existe"));
        Locale idioma = LocaleContextHolder.getLocale();

        BigDecimal ingreso = usuario.getIngresoMensual();
        if (ingreso == null || ingreso.signum() <= 0) {
            // RN7: sin ingreso no hay ratio que calcular. Se dice cual es el
            // campo que falta en vez de devolver un analisis con ceros.
            throw ErrorNegocio.validacion("ingreso_mensual",
                    "hace falta el ingreso mensual del perfil para poder analizar");
        }

        List<TransaccionClasificada> clasificadas = clasificadasDe(id, desde, hasta);
        if (clasificadas.isEmpty()) {
            throw ErrorNegocio.validacion("transacciones",
                    "no hay movimientos en ese periodo para analizar");
        }

        Map<String, BigDecimal> resumenGastos = soloGastos(
                indicadores.agruparPorCategoria(clasificadas));

        Indicadores ind = indicadores.calcular(
                ingreso,
                usuario.getNivelEndeudamiento() == null ? 0 : usuario.getNivelEndeudamiento(),
                usuario.getFrecuenciaAhorro(),
                clasificadas);

        var perfil = ml.perfil(ind.comoMapa());
        List<Recomendacion> detalle = reglas.evaluar(ind, resumenGastos, ingreso, idioma);

        UUID analisisId = persistir(id, usuario.getMonedaPrincipal(), desde, hasta,
                perfil, ind, resumenGastos, detalle);

        return new AnalisisFinancieroResponse(
                etiquetaPerfil(perfil.perfil(), idioma),
                perfil.probabilidad(),
                resumenGastos,
                detalle.stream().map(Recomendacion::texto).toList(),
                perfil.perfil(),
                perfil.probabilidades(),
                ind.comoMapa(),
                clasificadas.stream().map(AnalisisService::aDto).toList(),
                detalle,
                usuario.getMonedaPrincipal(),
                idioma.getLanguage(),
                perfil.modeloVersion(),
                OffsetDateTime.now(),
                analisisId.toString());
    }

    // --------------------------------------------------------------- lectura ---

    /** Historial: solo el resumen de cada analisis, que es lo que pinta la lista. */
    @Transactional(readOnly = true)
    public List<ResumenAnalisisResponse> historial(Integer pagina, Integer tam) {
        int indice = Math.max(pagina == null ? 0 : pagina, 0);
        int tamano = Math.min(Math.max(tam == null ? 12 : tam, 1), 100);

        return jdbc.query("""
                SELECT id, perfil_codigo, probabilidad, creado_en
                  FROM analisis
                 WHERE usuario_id = ?
                 ORDER BY creado_en DESC
                 LIMIT ? OFFSET ?
                """,
                (rs, fila) -> new ResumenAnalisisResponse(
                        rs.getString("id"),
                        rs.getString("perfil_codigo"),
                        rs.getBigDecimal("probabilidad"),
                        aOffset(rs.getTimestamp("creado_en"))),
                UsuarioActual.id(), tamano, indice * tamano);
    }

    /** Un analisis completo. Foto inmutable (RN1): se devuelve tal cual se guardo. */
    @Transactional(readOnly = true)
    public AnalisisFinancieroResponse obtener(UUID id) {
        UUID usuario = UsuarioActual.id();
        Locale idioma = LocaleContextHolder.getLocale();

        List<AnalisisFinancieroResponse> encontrados = jdbc.query("""
                SELECT id, perfil_codigo, probabilidad, probabilidades, indicadores,
                       resumen_gastos, moneda, modelo_version, creado_en
                  FROM analisis
                 WHERE id = ? AND usuario_id = ?
                """,
                (rs, fila) -> {
                    List<Recomendacion> detalle = recomendacionesDe(
                            UUID.fromString(rs.getString("id")), idioma);
                    return new AnalisisFinancieroResponse(
                            etiquetaPerfil(rs.getString("perfil_codigo"), idioma),
                            rs.getBigDecimal("probabilidad"),
                            aMapaDecimal(rs.getString("resumen_gastos")),
                            detalle.stream().map(Recomendacion::texto).toList(),
                            rs.getString("perfil_codigo"),
                            aMapaDecimal(rs.getString("probabilidades")),
                            aMapaObjeto(rs.getString("indicadores")),
                            // La foto guarda los agregados, no la lista de
                            // movimientos: esos siguen vivos y editables en su
                            // tabla, y meterlos aqui haria que el "analisis
                            // inmutable" cambiara al corregir una categoria.
                            List.of(),
                            detalle,
                            rs.getString("moneda"),
                            idioma.getLanguage(),
                            rs.getString("modelo_version"),
                            aOffset(rs.getTimestamp("creado_en")),
                            rs.getString("id"));
                },
                id, usuario);

        if (encontrados.isEmpty()) {
            throw new ErrorNegocio(HttpStatus.NOT_FOUND, "ANALISIS_NO_ENCONTRADO",
                    "Ese analisis no existe");
        }
        return encontrados.get(0);
    }

    /** La serie temporal del grafico de evolucion (CONTRATO_API §6). */
    @Transactional(readOnly = true)
    public EvolucionResponse evolucion(LocalDate desde, LocalDate hasta) {
        UUID usuario = UsuarioActual.id();

        List<EvolucionResponse.Punto> puntos = jdbc.query("""
                SELECT creado_en, perfil_codigo, probabilidad,
                       (indicadores ->> 'tasa_ahorro')::numeric         AS tasa_ahorro,
                       (indicadores ->> 'ratio_endeudamiento')::numeric AS ratio_endeudamiento
                  FROM analisis
                 WHERE usuario_id = ?
                   AND (CAST(? AS date) IS NULL OR creado_en >= CAST(? AS date))
                   AND (CAST(? AS date) IS NULL OR creado_en <  CAST(? AS date) + 1)
                 ORDER BY creado_en
                """,
                (rs, fila) -> new EvolucionResponse.Punto(
                        aOffset(rs.getTimestamp("creado_en")).toLocalDate(),
                        rs.getString("perfil_codigo"),
                        rs.getBigDecimal("probabilidad"),
                        rs.getBigDecimal("tasa_ahorro"),
                        rs.getBigDecimal("ratio_endeudamiento")),
                usuario, desde, desde, hasta, hasta);

        String moneda = usuarios.findById(usuario).map(Usuario::getMonedaPrincipal).orElse("USD");
        return new EvolucionResponse(moneda, puntos);
    }

    // ----------------------------------------------------------- persistencia ---

    private UUID persistir(UUID usuario, String moneda, LocalDate desde, LocalDate hasta,
                           ClienteMlService.RespuestaPerfil perfil, Indicadores ind,
                           Map<String, BigDecimal> resumenGastos, List<Recomendacion> detalle) {

        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO analisis (id, usuario_id, perfil_codigo, probabilidad, probabilidades,
                                      indicadores, resumen_gastos, moneda, desde, hasta, modelo_version)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, ?, ?, ?)
                """,
                id, usuario, perfil.perfil(), perfil.probabilidad(),
                aJson(perfil.probabilidades()), aJson(ind.comoMapa()), aJson(resumenGastos),
                moneda, desde, hasta, perfil.modeloVersion());

        // Se guarda el CODIGO y los PARAMETROS, nunca la frase (ADR-0009): el
        // mismo analisis se lee luego en es, pt o en, y una frase guardada
        // quedaria congelada en el idioma en el que se genero.
        int orden = 0;
        for (Recomendacion r : detalle) {
            jdbc.update("""
                    INSERT INTO recomendacion (analisis_id, codigo, parametros, prioridad, indicador, orden)
                    VALUES (?, ?, CAST(? AS jsonb), ?, ?, ?)
                    """,
                    id, r.codigo(), aJson(r.parametros()), r.prioridad(), r.indicador(), orden++);
        }
        return id;
    }

    /** Las recomendaciones de un analisis, re-traducidas al idioma que se pide ahora. */
    private List<Recomendacion> recomendacionesDe(UUID analisisId, Locale idioma) {
        return jdbc.query("""
                SELECT codigo, parametros, prioridad, indicador
                  FROM recomendacion
                 WHERE analisis_id = ?
                 ORDER BY orden
                """,
                (rs, fila) -> {
                    Map<String, String> parametros = aMapaTexto(rs.getString("parametros"));
                    return new Recomendacion(
                            rs.getString("codigo"),
                            traducir(rs.getString("codigo"), parametros, idioma),
                            parametros,
                            rs.getString("prioridad"),
                            rs.getString("indicador"));
                },
                analisisId);
    }

    // ----------------------------------------------------------------- apoyo ---

    /** Las transacciones guardadas, ya clasificadas: no se vuelve a llamar al ML. */
    private List<TransaccionClasificada> clasificadasDe(UUID usuario, LocalDate desde, LocalDate hasta) {
        List<TransaccionClasificada> salida = new ArrayList<>();
        for (Transaccion t : transacciones.findByUsuarioIdOrderByFechaDesc(usuario)) {
            if (desde != null && t.getFecha().isBefore(desde)) continue;
            if (hasta != null && t.getFecha().isAfter(hasta)) continue;
            if (t.getCategoriaSlug() == null) continue;
            salida.add(new TransaccionClasificada(
                    t.getDescripcion(), t.getValor(), t.getCategoriaSlug(),
                    t.getConfianza(), t.getCategoriaOrigen()));
        }
        return salida;
    }

    /** `resumen_gastos` es SOLO gasto: un ingreso ahi descuadraria el grafico. */
    private static Map<String, BigDecimal> soloGastos(Map<String, BigDecimal> porCategoria) {
        Map<String, BigDecimal> salida = new LinkedHashMap<>();
        porCategoria.forEach((slug, monto) -> {
            if (com.fintechvital.api.dominio.Taxonomia.esGasto(slug)) salida.put(slug, monto);
        });
        return salida;
    }

    private String etiquetaPerfil(String slug, Locale idioma) {
        return mensajes.getMessage("perfil." + slug, null, slug, idioma);
    }

    private String traducir(String codigo, Map<String, String> parametros, Locale idioma) {
        String plantilla = mensajes.getMessage("recomendacion." + codigo, null, codigo, idioma);
        for (Map.Entry<String, String> p : parametros.entrySet()) {
            plantilla = plantilla.replace("{" + p.getKey() + "}", p.getValue());
        }
        return plantilla;
    }

    private static TransaccionClasificadaDto aDto(TransaccionClasificada t) {
        return new TransaccionClasificadaDto(
                t.descripcion(), t.valor(), t.categoria(), t.confianza(), t.origen());
    }

    private static OffsetDateTime aOffset(Timestamp marca) {
        return marca == null ? null : marca.toInstant().atOffset(ZoneOffset.UTC);
    }

    private String aJson(Object valor) {
        try {
            return json.writeValueAsString(valor);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo serializar el analisis", e);
        }
    }

    private Map<String, BigDecimal> aMapaDecimal(String crudo) {
        return leer(crudo, new TypeReference<LinkedHashMap<String, BigDecimal>>() {});
    }

    private Map<String, Object> aMapaObjeto(String crudo) {
        return leer(crudo, new TypeReference<LinkedHashMap<String, Object>>() {});
    }

    private Map<String, String> aMapaTexto(String crudo) {
        return leer(crudo, new TypeReference<LinkedHashMap<String, String>>() {});
    }

    private <T extends Map<String, ?>> T leer(String crudo, TypeReference<T> tipo) {
        try {
            return json.readValue(crudo == null || crudo.isBlank() ? "{}" : crudo, tipo);
        } catch (Exception e) {
            throw new IllegalStateException("El analisis guardado tiene un JSON invalido", e);
        }
    }
}
