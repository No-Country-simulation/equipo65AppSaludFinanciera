package com.fintechvital.api.service;

import com.fintechvital.api.dto.ComparacionMensualResponse;
import com.fintechvital.api.dto.ComparacionMensualResponse.ResumenMensual;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.Usuario;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * La comparacion "este mes contra el anterior" del Panel.
 *
 * Se calcula sobre `transaccion` en dos consultas y no se guarda: el mes en
 * curso cambia con cada movimiento nuevo, asi que un total persistido estaria
 * desactualizado desde el segundo siguiente.
 *
 * El signo ES el dato (RN4): lo que suma por encima de cero es ingreso y lo que
 * baja de cero es gasto. El gasto se devuelve en POSITIVO porque es como se
 * pinta ("gastaste 12.300"), no en negativo.
 */
@Service
public class ResumenService {

    private final JdbcTemplate jdbc;
    private final UsuarioRepository usuarios;

    public ResumenService(JdbcTemplate jdbc, UsuarioRepository usuarios) {
        this.jdbc = jdbc;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public ComparacionMensualResponse comparacion() {
        UUID usuario = UsuarioActual.id();
        String moneda = usuarios.findById(usuario)
                .map(Usuario::getMonedaPrincipal)
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                        "El usuario del token ya no existe"));

        YearMonth esteMes = YearMonth.now();
        return new ComparacionMensualResponse(
                resumenDe(usuario, esteMes, moneda),
                resumenDe(usuario, esteMes.minusMonths(1), moneda));
    }

    private ResumenMensual resumenDe(UUID usuario, YearMonth mes, String moneda) {
        LocalDate inicio = mes.atDay(1);
        LocalDate finExclusivo = mes.plusMonths(1).atDay(1);

        Map<String, BigDecimal> porCategoria = new LinkedHashMap<>();
        jdbc.query("""
                SELECT categoria_slug, SUM(-valor) AS gasto
                  FROM transaccion
                 WHERE usuario_id = ? AND fecha >= ? AND fecha < ?
                   AND valor < 0 AND estado = 'completada'
                   AND categoria_slug IS NOT NULL
                 GROUP BY categoria_slug
                 ORDER BY gasto DESC
                """,
                rs -> { porCategoria.put(rs.getString("categoria_slug"), rs.getBigDecimal("gasto")); },
                usuario, inicio, finExclusivo);

        BigDecimal gasto = totalDe(usuario, inicio, finExclusivo, "valor < 0", true);
        BigDecimal ingreso = totalDe(usuario, inicio, finExclusivo, "valor > 0", false);

        return new ResumenMensual(
                mes.toString(),
                gasto,
                ingreso,
                ingreso.subtract(gasto),
                porCategoria);
    }

    /**
     * @param invertirSigno los gastos se guardan negativos y se reportan en
     *                      positivo; los ingresos ya vienen como toca.
     */
    private BigDecimal totalDe(UUID usuario, LocalDate inicio, LocalDate fin,
                               String condicionSigno, boolean invertirSigno) {
        BigDecimal total = jdbc.queryForObject(
                "SELECT COALESCE(SUM(valor), 0) FROM transaccion"
              + " WHERE usuario_id = ? AND fecha >= ? AND fecha < ?"
              + " AND estado = 'completada' AND " + condicionSigno,
                BigDecimal.class, usuario, inicio, fin);
        if (total == null) return BigDecimal.ZERO;
        return invertirSigno ? total.negate() : total;
    }
}
