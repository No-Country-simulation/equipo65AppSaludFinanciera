-- =============================================================================
-- V7 - Funciones de apoyo y vistas
--
-- ⚠️ ALCANCE. La logica de negocio vive en Spring Boot, no aqui
-- (docs/arquitectura/CONTRATO_MODELO.md). Estas vistas son de APOYO:
--
--   * dan al equipo de datos un punto de entrada legible sin reescribir JOINs,
--   * sirven de contraste para QA (si la vista y la API no coinciden, hay bug
--     en alguno de los dos, y eso es exactamente lo que se quiere detectar),
--   * resuelven los campos DERIVADOS que el frontend ya espera y que no se
--     almacenan (saldo de cuenta, saldo usado de la tarjeta, ahorrado de una
--     meta, gastado de un presupuesto).
--
-- Lo que NINGUNA vista hace: devolver etiquetas traducidas. Todas devuelven
-- SLUGS. El modelo original del equipo tenia un CASE que devolvia
-- 'En riesgo' / 'Saludable' desde SQL, y eso mete texto de UI en espanol
-- dentro de la BD de un proyecto trilingue.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fn_a_base - convierte un importe a la moneda base (USD) con la tasa DE SU
-- FECHA. Es lo que hace que los ratios sean comparables entre un usuario en
-- MXN y uno en BRL.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_a_base(p_monto NUMERIC, p_moneda CHAR(3), p_fecha DATE)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    SELECT p_monto * COALESCE(
        -- la tasa vigente a esa fecha
        (SELECT tc.tasa FROM tasa_cambio tc
          WHERE tc.moneda_origen = p_moneda AND tc.moneda_base = 'USD'
            AND tc.vigente_desde <= p_fecha
          ORDER BY tc.vigente_desde DESC LIMIT 1),
        -- si el movimiento es anterior a la primera tasa cargada, la mas vieja
        -- que exista: es mejor que devolver NULL y borrar la fila del reporte
        (SELECT tc.tasa FROM tasa_cambio tc
          WHERE tc.moneda_origen = p_moneda AND tc.moneda_base = 'USD'
          ORDER BY tc.vigente_desde ASC LIMIT 1)
    );
$$;

COMMENT ON FUNCTION fn_a_base(NUMERIC, CHAR, DATE) IS
    'Normaliza a USD con la tasa de la fecha del movimiento. NUNCA con la tasa de hoy: un gasto de mayo convertido a la tasa de julio es un error grande en LatAm.';

-- -----------------------------------------------------------------------------
-- vw_saldo_cuenta - el saldo NO se almacena; es la suma de sus movimientos.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_saldo_cuenta AS
SELECT
    c.id                                  AS cuenta_id,
    c.moneda,
    COALESCE(SUM(t.valor), 0)             AS saldo,
    COUNT(t.id)                           AS movimientos,
    MAX(t.fecha)                          AS ultimo_movimiento
FROM cuenta_bancaria c
LEFT JOIN transaccion t
       ON t.cuenta_id = c.id
      AND t.estado = 'completada'
GROUP BY c.id, c.moneda;

-- -----------------------------------------------------------------------------
-- vw_tarjeta_credito - resuelve CreditoTarjeta.saldo_utilizado del frontend.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_tarjeta_credito AS
SELECT
    tc.tarjeta_id,
    tc.limite_credito,
    tc.dia_corte,
    tc.dia_pago,
    COALESCE(SUM(-t.valor), 0)                                     AS saldo_utilizado,
    tc.limite_credito - COALESCE(SUM(-t.valor), 0)                 AS disponible,
    ROUND(
        COALESCE(SUM(-t.valor), 0) / NULLIF(tc.limite_credito, 0), 3
    )                                                              AS uso_del_limite
FROM tarjeta_credito tc
LEFT JOIN transaccion t
       ON t.tarjeta_id = tc.tarjeta_id
      AND t.estado = 'completada'
GROUP BY tc.tarjeta_id, tc.limite_credito, tc.dia_corte, tc.dia_pago;

COMMENT ON VIEW vw_tarjeta_credito IS
    'saldo_utilizado = cargos menos pagos. Los pagos entran como valor positivo en la tarjeta y por eso restan solos.';

-- -----------------------------------------------------------------------------
-- vw_gasto_mensual_categoria - la base del grafico de gastos por categoria y
-- del resumen_gastos del analisis. Devuelve SLUGS.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_gasto_mensual_categoria AS
SELECT
    t.usuario_id,
    date_trunc('month', t.fecha)::date              AS mes,
    t.categoria_slug,
    c.tipo,
    c.grupo,
    SUM(-t.valor)                                   AS gasto,
    SUM(fn_a_base(-t.valor, t.moneda, t.fecha))     AS gasto_base,
    -- En la MISMA unidad que gasto_base (USD), no en la moneda original: si no,
    -- ratio_recurrente = recurrente_MXN / total_USD y sale ~17 en vez de ~0.3.
    SUM(fn_a_base(-t.valor, t.moneda, t.fecha))
        FILTER (WHERE t.es_recurrente)              AS gasto_recurrente_base,
    SUM(-t.valor) FILTER (WHERE t.es_recurrente)    AS gasto_recurrente,
    COUNT(*)                                        AS movimientos
FROM transaccion t
JOIN categoria c ON c.slug = t.categoria_slug
WHERE t.valor < 0
  AND t.estado = 'completada'
GROUP BY t.usuario_id, 2, t.categoria_slug, c.tipo, c.grupo;

-- -----------------------------------------------------------------------------
-- vw_resumen_mensual_calculado - la version derivada de resumen_mensual. Sirve
-- para regenerar esa tabla-cache y para verificar que no se desincronizo.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_resumen_mensual_calculado AS
SELECT
    t.usuario_id,
    EXTRACT(YEAR  FROM t.fecha)::smallint                         AS anio,
    EXTRACT(MONTH FROM t.fecha)::smallint                         AS mes,
    COALESCE(SUM(fn_a_base(t.valor, t.moneda, t.fecha))
             FILTER (WHERE t.valor > 0), 0)                       AS ingresos_base,
    COALESCE(SUM(fn_a_base(-t.valor, t.moneda, t.fecha))
             FILTER (WHERE t.valor < 0 AND c.tipo = 'gasto'), 0)  AS gastos_base,
    COALESCE(SUM(fn_a_base(-t.valor, t.moneda, t.fecha))
             FILTER (WHERE t.valor < 0 AND c.slug = 'ahorro_inversion'), 0) AS ahorro_base
FROM transaccion t
LEFT JOIN categoria c ON c.slug = t.categoria_slug
WHERE t.estado = 'completada'
GROUP BY t.usuario_id, 2, 3;

-- -----------------------------------------------------------------------------
-- vw_indicadores_mensuales - los 8 indicadores de TAXONOMIA §3, por mes.
--
-- ⚠️ NO es la fuente de verdad: los indicadores que se le mandan al modelo los
-- calcula Spring Boot. Esta vista aplica las MISMAS formulas para poder
-- contrastar ambos resultados en QA y para que DS explore el dataset sin
-- levantar el backend.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_indicadores_mensuales AS
WITH agregado AS (
    SELECT
        g.usuario_id,
        g.mes,
        COALESCE(SUM(g.gasto_base) FILTER (WHERE g.tipo = 'gasto'), 0)                              AS gasto_total,
        COALESCE(SUM(g.gasto_base) FILTER (WHERE g.tipo = 'gasto' AND g.grupo = 'esencial'), 0)     AS gasto_esencial,
        COALESCE(SUM(g.gasto_base) FILTER (WHERE g.tipo = 'gasto' AND g.grupo = 'discrecional'), 0) AS gasto_discrecional,
        COALESCE(SUM(g.gasto_recurrente_base) FILTER (WHERE g.tipo = 'gasto'), 0)                   AS gasto_recurrente,
        COALESCE(MAX(g.gasto_base) FILTER (WHERE g.tipo = 'gasto'), 0)                              AS gasto_categoria_top
    FROM vw_gasto_mensual_categoria g
    GROUP BY g.usuario_id, g.mes
)
SELECT
    u.id                                                          AS usuario_id,
    a.mes,
    fn_a_base(u.ingreso_mensual, u.moneda_principal, a.mes)       AS ingreso_base,
    a.gasto_total,
    -- 1. tasa_ahorro, acotada a [-2, 1]: un outlier de -47 por un ingreso mal
    --    cargado envenena la prediccion del modelo.
    ROUND(GREATEST(-2, LEAST(1,
        (fn_a_base(u.ingreso_mensual, u.moneda_principal, a.mes) - a.gasto_total)
        / NULLIF(fn_a_base(u.ingreso_mensual, u.moneda_principal, a.mes), 0)
    )), 3)                                                        AS tasa_ahorro,
    -- 2.
    ROUND(u.nivel_endeudamiento / 100.0, 3)                       AS ratio_endeudamiento,
    -- 3.
    ROUND(a.gasto_total / NULLIF(fn_a_base(u.ingreso_mensual, u.moneda_principal, a.mes), 0), 3)        AS ratio_gasto_ingreso,
    -- 4.
    ROUND(a.gasto_esencial / NULLIF(fn_a_base(u.ingreso_mensual, u.moneda_principal, a.mes), 0), 3)     AS ratio_gasto_esencial,
    -- 5.
    ROUND(a.gasto_discrecional / NULLIF(fn_a_base(u.ingreso_mensual, u.moneda_principal, a.mes), 0), 3) AS ratio_gasto_discrecional,
    -- 6. sin gastos -> 0, no division por cero
    ROUND(COALESCE(a.gasto_categoria_top / NULLIF(a.gasto_total, 0), 0), 3)  AS concentracion_gasto,
    -- 7.
    CASE u.frecuencia_ahorro
        WHEN 'nula'  THEN 0 WHEN 'baja' THEN 1
        WHEN 'media' THEN 2 WHEN 'alta' THEN 3
    END                                                           AS frecuencia_ahorro_num,
    -- 8.
    ROUND(COALESCE(a.gasto_recurrente / NULLIF(a.gasto_total, 0), 0), 3)     AS ratio_recurrente
FROM agregado a
JOIN usuario u ON u.id = a.usuario_id
WHERE u.ingreso_mensual IS NOT NULL
  AND u.ingreso_mensual > 0;

COMMENT ON VIEW vw_indicadores_mensuales IS
    'Vista de contraste. Los indicadores que se envian al modelo los calcula Spring Boot (CONTRATO_MODELO §1). Filtra ingreso_mensual = 0: ese caso es un 422 de la API (RN7), no una division por cero.';

-- -----------------------------------------------------------------------------
-- vw_meta_progreso - resuelve MetaAhorro.ahorrado del frontend.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_meta_progreso AS
SELECT
    p.id                                        AS plan_id,
    p.usuario_id,
    p.nombre_meta,
    p.monto_meta,
    p.moneda,
    p.estado,
    COALESCE(SUM(ap.monto), 0)                  AS ahorrado,
    ROUND(COALESCE(SUM(ap.monto), 0) / NULLIF(p.monto_meta, 0), 3) AS avance
FROM plan_ahorro p
LEFT JOIN aporte_plan ap ON ap.plan_id = p.id
GROUP BY p.id, p.usuario_id, p.nombre_meta, p.monto_meta, p.moneda, p.estado;

-- -----------------------------------------------------------------------------
-- vw_presupuesto_uso - resuelve Presupuesto.gastado (mes en curso).
-- -----------------------------------------------------------------------------
CREATE VIEW vw_presupuesto_uso AS
SELECT
    pr.usuario_id,
    pr.categoria_slug,
    pr.limite,
    pr.moneda,
    COALESCE(g.gasto, 0)                                   AS gastado,
    ROUND(COALESCE(g.gasto, 0) / NULLIF(pr.limite, 0), 3)  AS uso
FROM presupuesto pr
LEFT JOIN vw_gasto_mensual_categoria g
       ON g.usuario_id = pr.usuario_id
      AND g.categoria_slug = pr.categoria_slug
      AND g.mes = date_trunc('month', CURRENT_DATE)::date;

-- -----------------------------------------------------------------------------
-- vw_buro_vigente - ultimo registro de buro por usuario (el frontend muestra
-- este como "actual" y el resto como historial).
-- -----------------------------------------------------------------------------
CREATE VIEW vw_buro_vigente AS
SELECT DISTINCT ON (b.usuario_id)
    b.usuario_id,
    b.score_crediticio,
    b.dias_atraso,
    b.monto_adeudado,
    b.moneda,
    b.consultado_en
FROM historial_buro b
ORDER BY b.usuario_id, b.consultado_en DESC;

COMMENT ON VIEW vw_buro_vigente IS
    'DISTINCT ON es especifico de PostgreSQL y reemplaza el self-join con MAX(fecha) que hacia falta en MySQL. Mismo resultado, una pasada.';
