package com.hackathon.analisis.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.analisis.dto.UsuarioResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Portabilidad de datos: todo lo que la aplicacion guarda de una persona, en un
 * JSON que se puede descargar (derecho ARCO en Mexico, LGPD en Brasil, GDPR).
 *
 * Va con SQL directo (JdbcTemplate) y no con entidades JPA a proposito:
 *
 *  - Una exportacion incompleta no cumple el proposito legal. Con JPA solo se
 *    podria exportar lo que hoy tiene entidad (usuario, transaccion, plan de
 *    ahorro), y quedarian fuera presupuestos, analisis y eventos, que son
 *    tablas que YA tienen datos del usuario.
 *  - Asi no depende de que el resto del equipo termine sus entidades: cuando
 *    lleguen, esto sigue funcionando igual.
 *
 * Se selecciona columna por columna en vez de `SELECT *` para no filtrar sin
 * querer algo interno que se anada a una tabla mas adelante.
 */
@Service
public class ExportacionService {

    private static final Logger log = LoggerFactory.getLogger(ExportacionService.class);

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ExportacionService(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exportar(UUID usuarioId, UsuarioResponse usuario) {
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("generado_en", OffsetDateTime.now().toString());
        salida.put("usuario", usuario);
        salida.put("transacciones", transacciones(usuarioId));
        salida.put("metas", metas(usuarioId));
        salida.put("presupuestos", presupuestos(usuarioId));
        salida.put("analisis", analisis(usuarioId));
        salida.put("eventos", eventos(usuarioId));
        return salida;
    }

    private List<Map<String, Object>> transacciones(UUID usuarioId) {
        return jdbc.queryForList("""
                SELECT id, fecha, descripcion, comercio, valor, moneda,
                       categoria_slug, categoria_origen, confianza,
                       medio_operacion, estado, es_recurrente, creado_en
                  FROM transaccion
                 WHERE usuario_id = ?
                 ORDER BY fecha
                """, usuarioId);
    }

    private List<Map<String, Object>> metas(UUID usuarioId) {
        return jdbc.queryForList("""
                SELECT id, nombre_meta, monto_meta, moneda, fecha_inicio, fecha_fin,
                       estado, creado_en
                  FROM plan_ahorro
                 WHERE usuario_id = ?
                 ORDER BY creado_en
                """, usuarioId);
    }

    private List<Map<String, Object>> presupuestos(UUID usuarioId) {
        return jdbc.queryForList("""
                SELECT categoria_slug, limite, moneda, creado_en
                  FROM presupuesto
                 WHERE usuario_id = ?
                 ORDER BY categoria_slug
                """, usuarioId);
    }

    private List<Map<String, Object>> eventos(UUID usuarioId) {
        return jdbc.queryForList("""
                SELECT id, fecha, titulo, tipo, monto, creado_en
                  FROM evento_calendario
                 WHERE usuario_id = ?
                 ORDER BY fecha
                """, usuarioId);
    }

    /**
     * Los analisis traen tres columnas JSONB. Se piden ya como texto (`::text`)
     * y se vuelven a parsear con Jackson: si se dejaran como PGobject, el JSON
     * de salida las escribiria como `{"type":"jsonb","value":"..."}` -- es
     * decir, el JSON del usuario quedaria como una cadena escapada dentro del
     * suyo, y una exportacion asi no la puede volver a leer nadie.
     */
    private List<Map<String, Object>> analisis(UUID usuarioId) {
        List<Map<String, Object>> filas = jdbc.queryForList("""
                SELECT id, perfil_codigo, probabilidad, moneda, desde, hasta,
                       modelo_version, creado_en,
                       probabilidades::text AS probabilidades,
                       indicadores::text    AS indicadores,
                       resumen_gastos::text AS resumen_gastos
                  FROM analisis
                 WHERE usuario_id = ?
                 ORDER BY creado_en
                """, usuarioId);

        for (Map<String, Object> fila : filas) {
            for (String campo : List.of("probabilidades", "indicadores", "resumen_gastos")) {
                fila.computeIfPresent(campo, (clave, valor) -> aObjeto(valor));
            }
        }
        return filas;
    }

    private Object aObjeto(Object texto) {
        try {
            return json.readTree(texto.toString());
        } catch (Exception e) {
            // Antes devolver la cadena cruda que perder la fila entera: es una
            // exportacion, y el dato del usuario tiene que salir igual.
            log.warn("No se pudo parsear un campo JSON de la exportacion", e);
            return texto;
        }
    }
}
