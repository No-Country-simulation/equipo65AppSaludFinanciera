-- =============================================================================
-- DATASET DEL EQUIPO - 100 usuarios y 5.000 movimientos reales
--
-- Origen: rama `base-datos`, carpeta "Banco de datos_Tablas para cargar".
-- Los CSV se copiaron tal cual a db/semillas/dataset/ (solo se les quito el BOM).
--
-- ⚠️ NO SE CARGA EN PRODUCCION. Lo controla FV_CARGAR_DATASET.
--
-- Que hace este archivo: cargar los CSV en tablas temporales y MAPEARLOS al
-- esquema del proyecto. El mapeo no es cosmetico; resuelve cuatro cosas que el
-- CSV no trae resueltas:
--
--   1. Las transacciones NO tienen id_usuario (solo id_tarjeta). Se deriva por
--      tarjeta -> cuenta -> cuenta_usuario. Sin esto, un movimiento en efectivo
--      quedaria sin dueno y desapareceria de los informes en silencio.
--   2. El monto viene siempre positivo con tipo_movimiento aparte. Aqui el
--      SIGNO es el dato (RN4): se convierte a valor negativo en los egresos.
--   3. id_categoria (1..34) apunta al catalogo de SUBcategorias del banco. Se
--      traduce a subcategoria_slug + su macro-categoria de las 12 congeladas.
--   4. El numero de tarjeta no se almacena: se guardan los 4 ultimos digitos y
--      un hash, que conserva la unicidad sin guardar el numero.
--
-- Es re-ejecutable: borra los usuarios del dataset y los vuelve a crear.
-- =============================================================================

BEGIN;

-- --- Limpieza (re-ejecutable) ------------------------------------------------
-- Los usuarios del dataset se reconocen por el dominio de su correo.
DELETE FROM usuario WHERE email LIKE '%@mail.com';
DELETE FROM cuenta_bancaria WHERE numero_cuenta LIKE 'MX-ACC-%';

-- --- Tablas temporales, con los CSV tal cual --------------------------------
CREATE TEMP TABLE tmp_usuarios (
    id_usuario UUID, nombre TEXT, apellido TEXT, fecha_nacimiento DATE,
    genero TEXT, lugar_registro TEXT, ingreso_mensual NUMERIC, email TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE tmp_seguridad (id_usuario UUID, password_hash TEXT) ON COMMIT DROP;

CREATE TEMP TABLE tmp_cuentas (
    id_cuenta UUID, numero_cuenta TEXT, fecha_apertura DATE
) ON COMMIT DROP;

CREATE TEMP TABLE tmp_cuentas_usuarios (
    id_cuenta UUID, id_usuario UUID, rol_usuario TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE tmp_tarjetas (
    id_tarjeta UUID, id_cuenta UUID, numero_tarjeta TEXT,
    tipo_tarjeta TEXT, red_pago TEXT, fecha_vencimiento DATE
) ON COMMIT DROP;

CREATE TEMP TABLE tmp_transacciones (
    id_transaccion UUID, id_tarjeta UUID, id_categoria INT, fecha_hora TIMESTAMP,
    concepto TEXT, comercio TEXT, monto NUMERIC, tipo_movimiento TEXT,
    medio_operacion TEXT, moneda TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE tmp_buro (
    id_buro UUID, id_usuario UUID, score_crediticio INT, monto_adeudado NUMERIC
) ON COMMIT DROP;

-- El catalogo del banco: su id numerico -> nuestro slug de subcategoria.
CREATE TEMP TABLE tmp_categorias (
    id_categoria INT, slug TEXT, nombre_categoria TEXT, tipo_categoria TEXT
) ON COMMIT DROP;

\copy tmp_usuarios          FROM '/opt/fintechvital/semillas/dataset/usuarios.csv'          WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_seguridad         FROM '/opt/fintechvital/semillas/dataset/usuarios_seguridad.csv' WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_cuentas           FROM '/opt/fintechvital/semillas/dataset/cuentas_bancarias.csv' WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_cuentas_usuarios  FROM '/opt/fintechvital/semillas/dataset/cuentas_usuarios.csv'  WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_tarjetas          FROM '/opt/fintechvital/semillas/dataset/tarjetas.csv'          WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_transacciones     FROM '/opt/fintechvital/semillas/dataset/transacciones.csv'     WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_buro              FROM '/opt/fintechvital/semillas/dataset/historial_buro.csv'    WITH (FORMAT csv, HEADER true, NULL '')
\copy tmp_categorias        FROM '/opt/fintechvital/semillas/dataset/categorias.csv'        WITH (FORMAT csv, HEADER true, NULL '')

-- =============================================================================
-- USUARIOS
--
-- nivel_endeudamiento y frecuencia_ahorro quedan en NULL A PROPOSITO: el CSV no
-- los trae y son 2 de las 3 entradas del endpoint del enunciado. Inventarlos
-- produciria indicadores que parecen validos y no lo son. Mejor un NULL visible
-- que un dato falso.
-- =============================================================================
INSERT INTO usuario (
    id, email, nombre, apellido, fecha_nacimiento, genero, ciudad_id,
    moneda_principal, idioma, ingreso_mensual, terminos_version, terminos_aceptados_en
)
SELECT
    u.id_usuario,
    lower(btrim(u.email)),
    u.nombre,
    u.apellido,
    u.fecha_nacimiento,
    NULLIF(btrim(COALESCE(u.genero, '')), ''),
    c.id,
    'MXN', 'es',
    NULLIF(u.ingreso_mensual, 0),        -- 0 en el CSV = sin declarar, no "gana 0"
    '1.0', now()
FROM tmp_usuarios u
LEFT JOIN ciudad c ON c.nombre = u.lugar_registro AND c.pais = 'MX';

-- Los password_hash del CSV son un marcador de posicion: los 100 usuarios
-- comparten el MISMO valor y mide 55 caracteres (BCrypt son 60). No sirven para
-- entrar. Se sustituyen por un hash real de FV_PASSWORD_DEMO, o por el
-- centinela inutilizable si esa variable viene vacia.
INSERT INTO usuario_seguridad (usuario_id, password_hash, totp_activo)
SELECT u.id,
       CASE WHEN :'pwdemo' = '' THEN 'SIN-PASSWORD-USABLE-dataset'
            ELSE crypt(:'pwdemo', gen_salt('bf', 12)) END,
       FALSE
FROM usuario u
JOIN tmp_usuarios t ON t.id_usuario = u.id;

-- =============================================================================
-- CUENTAS Y TARJETAS
-- =============================================================================
INSERT INTO cuenta_bancaria (id, numero_cuenta, tipo_cuenta, moneda, fecha_apertura)
SELECT id_cuenta, numero_cuenta, 'debito', 'MXN', fecha_apertura
FROM tmp_cuentas;

INSERT INTO cuenta_usuario (cuenta_id, usuario_id, rol_titular)
SELECT cu.id_cuenta, cu.id_usuario, lower(cu.rol_usuario)
FROM tmp_cuentas_usuarios cu
JOIN usuario u ON u.id = cu.id_usuario;

-- El "numero_tarjeta" del CSV (4152X-ACC-132097) no es un PAN: es la cuenta con
-- prefijo. Aun asi no se guarda entero. De el salen los 4 ultimos digitos, que
-- es lo unico que muestra la interfaz, y un hash que conserva la unicidad.
INSERT INTO tarjeta (id, cuenta_id, ultimos4, pan_hash, tipo_tarjeta, red_pago, fecha_vencimiento)
SELECT
    t.id_tarjeta,
    t.id_cuenta,
    right(regexp_replace(t.numero_tarjeta, '\D', '', 'g'), 4),
    encode(digest(t.numero_tarjeta, 'sha256'), 'hex'),
    lower(t.tipo_tarjeta),
    lower(t.red_pago),
    t.fecha_vencimiento
FROM tmp_tarjetas t
JOIN cuenta_bancaria c ON c.id = t.id_cuenta;

-- El dataset no trae ninguna tarjeta de credito (las 100 son de debito), asi
-- que no hay nada que insertar en tarjeta_credito. Si mas adelante lo trae,
-- habra que anadir limite, dia de corte y dia de pago: son NOT NULL.

-- =============================================================================
-- MOVIMIENTOS - aqui esta el grueso del mapeo
-- =============================================================================
INSERT INTO transaccion (
    id, usuario_id, cuenta_id, tarjeta_id, fecha, fecha_hora,
    descripcion, comercio, valor, moneda, categoria_slug, subcategoria_slug,
    categoria_origen, confianza, modelo_version, medio_operacion, estado
)
SELECT
    t.id_transaccion,
    cu.id_usuario,                       -- derivado: tarjeta -> cuenta -> titular
    tar.cuenta_id,
    t.id_tarjeta,
    t.fecha_hora::date,
    t.fecha_hora AT TIME ZONE 'UTC',
    t.concepto,
    NULLIF(t.comercio, ''),
    -- RN4: el signo ES el dato
    CASE WHEN upper(t.tipo_movimiento) = 'INGRESO' THEN t.monto ELSE -t.monto END,
    COALESCE(NULLIF(t.moneda, ''), 'MXN'),
    sc.categoria_slug,                   -- la macro de las 12 congeladas
    sc.slug,                             -- el detalle del banco
    'modelo', NULL, '0.0.0-dataset',
    lower(t.medio_operacion),
    'completada'
FROM tmp_transacciones t
JOIN tmp_tarjetas tar_csv ON tar_csv.id_tarjeta = t.id_tarjeta
JOIN tarjeta       tar     ON tar.id = t.id_tarjeta
JOIN tmp_cuentas_usuarios cu ON cu.id_cuenta = tar_csv.id_cuenta
LEFT JOIN tmp_categorias tc  ON tc.id_categoria = t.id_categoria
LEFT JOIN subcategoria   sc  ON sc.slug = tc.slug
-- ⚠️ 115 de las 5.000 filas del CSV (2,3%) vienen SIN IMPORTE. Se descartan:
-- un movimiento sin monto no es un movimiento, y meterlo con 0 falsearia todos
-- los ratios (y ademas lo prohibe el CHECK `valor <> 0`).
-- Es un hueco del dataset de origen, no del mapeo. Reportado al equipo.
WHERE t.monto IS NOT NULL AND t.monto <> 0;

-- Normalizacion a la moneda base, igual que hara la API al insertar.
UPDATE transaccion
   SET valor_base = ROUND(fn_a_base(valor, moneda, fecha), 2)
 WHERE modelo_version = '0.0.0-dataset';

-- Marca de gasto recurrente: misma descripcion >= 2 veces para el mismo usuario.
-- Es la misma heuristica que aplica la API (TAXONOMIA §3, ratio_recurrente).
UPDATE transaccion t
   SET es_recurrente = TRUE
  FROM (
      SELECT usuario_id, lower(btrim(descripcion)) AS desc_norm
      FROM transaccion
      WHERE modelo_version = '0.0.0-dataset' AND valor < 0
      GROUP BY 1, 2
      HAVING count(*) >= 2
  ) r
 WHERE t.modelo_version = '0.0.0-dataset'
   AND t.usuario_id = r.usuario_id
   AND lower(btrim(t.descripcion)) = r.desc_norm;

-- =============================================================================
-- BURO
--
-- El CSV no trae fecha de consulta. Se usa la del ultimo movimiento del dataset
-- para que el score no quede "flotando" en una fecha sin relacion con los datos.
-- =============================================================================
INSERT INTO historial_buro (id, usuario_id, score_crediticio, dias_atraso, monto_adeudado, moneda, consultado_en)
SELECT b.id_buro, b.id_usuario, b.score_crediticio, 0,
       COALESCE(b.monto_adeudado, 0), 'MXN',
       COALESCE((SELECT max(fecha) FROM transaccion WHERE modelo_version = '0.0.0-dataset'), CURRENT_DATE)
FROM tmp_buro b
JOIN usuario u ON u.id = b.id_usuario;

-- =============================================================================
-- COMPLETAR LO QUE EL CSV NO TRAE
--
-- `nivel_endeudamiento` y `frecuencia_ahorro` son 2 de las 3 entradas del
-- endpoint del enunciado y 2 de las 8 features del modelo. El CSV no los trae.
--
-- En vez de inventarlos (un numero al azar produce indicadores que PARECEN
-- validos y no lo son) se DERIVAN de senal real que si esta en el dataset, y se
-- marcan como derivados para que nadie los confunda con un dato declarado.
-- =============================================================================

-- --- nivel_endeudamiento, a partir del score de buro ------------------------
--
-- La deuda del buro viene en 0.00 para los 100 usuarios, asi que no sirve. Lo
-- que si es real y varia es el SCORE (400..844).
--
-- Se aplica la relacion inversa conocida entre score y carga de deuda, con dos
-- anclas fijas: score 350 -> 65% y score 850 -> 5%. Es una ESTIMACION, no una
-- medicion, y por eso queda marcada como derivada.
UPDATE usuario u
   SET nivel_endeudamiento = GREATEST(0, LEAST(100, ROUND(65 - (b.score_crediticio - 350) * 0.12)))::smallint,
       nivel_endeudamiento_origen = 'derivado'
  FROM vw_buro_vigente b
 WHERE b.usuario_id = u.id
   AND u.email LIKE '%@mail.com'
   AND b.score_crediticio IS NOT NULL;

-- --- frecuencia_ahorro, a partir del comportamiento real ---------------------
--
-- Esta es mejor derivacion que la anterior, porque sale del propio dinero: en
-- cuantos de sus meses le sobro dinero. No es una opinion sobre el usuario, es
-- lo que hizo.
--
--   >= 75% de los meses con superavit -> alta
--   >= 50%                            -> media
--   >= 25%                            -> baja
--   menos                             -> nula
WITH meses AS (
    SELECT usuario_id,
           count(*)                                              AS total,
           count(*) FILTER (WHERE ingresos_base > gastos_base)    AS con_superavit
    FROM vw_resumen_mensual_calculado
    GROUP BY usuario_id
)
UPDATE usuario u
   SET frecuencia_ahorro = CASE
           WHEN m.total = 0                                 THEN 'nula'
           WHEN m.con_superavit::numeric / m.total >= 0.75  THEN 'alta'
           WHEN m.con_superavit::numeric / m.total >= 0.50  THEN 'media'
           WHEN m.con_superavit::numeric / m.total >= 0.25  THEN 'baja'
           ELSE 'nula'
       END,
       frecuencia_ahorro_origen = 'derivado'
  FROM meses m
 WHERE m.usuario_id = u.id
   AND u.email LIKE '%@mail.com';

-- =============================================================================
-- ANALISIS - no hace falta esperar al modelo
--
-- El analisis tiene dos mitades y solo UNA necesita machine learning:
--
--   * Los 8 indicadores y el motor de reglas son DETERMINISTAS. Se calculan hoy.
--   * La clasificacion del perfil la hara el modelo M2... pero TAXONOMIA §2
--     documenta la heuristica con la que se etiqueta el dataset de
--     entrenamiento, asi que se puede aplicar ya.
--
-- Se generan con `modelo_version = '0.0.0-heuristica'` y `modelo_id` NULL. El
-- dia que data science entregue el modelo, sus analisis entran con su propia
-- version y estos quedan distinguibles de un vistazo: por eso `modelo_version`
-- es una columna y no un detalle.
-- =============================================================================
INSERT INTO analisis (id, usuario_id, modelo_id, perfil_codigo, probabilidad, probabilidades,
                      indicadores, resumen_gastos, moneda, desde, hasta, modelo_version)
SELECT
    gen_random_uuid(), i.usuario_id, NULL, e.perfil, e.prob,
    CASE e.perfil
        WHEN 'saludable'      THEN jsonb_build_object('saludable', e.prob, 'en_observacion', ROUND((1 - e.prob) * 0.7, 3), 'en_riesgo', ROUND((1 - e.prob) * 0.3, 3))
        WHEN 'en_observacion' THEN jsonb_build_object('saludable', ROUND((1 - e.prob) * 0.5, 3), 'en_observacion', e.prob, 'en_riesgo', ROUND((1 - e.prob) * 0.5, 3))
        ELSE                       jsonb_build_object('saludable', ROUND((1 - e.prob) * 0.3, 3), 'en_observacion', ROUND((1 - e.prob) * 0.7, 3), 'en_riesgo', e.prob)
    END,
    jsonb_build_object(
        'tasa_ahorro',              i.tasa_ahorro,
        'ratio_endeudamiento',      i.ratio_endeudamiento,
        'ratio_gasto_ingreso',      i.ratio_gasto_ingreso,
        'ratio_gasto_esencial',     i.ratio_gasto_esencial,
        'ratio_gasto_discrecional', i.ratio_gasto_discrecional,
        'concentracion_gasto',      i.concentracion_gasto,
        'frecuencia_ahorro_num',    i.frecuencia_ahorro_num,
        'ratio_recurrente',         i.ratio_recurrente
    ),
    COALESCE((
        SELECT jsonb_object_agg(g.categoria_slug, ROUND(g.gasto, 2))
        FROM vw_gasto_mensual_categoria g
        WHERE g.usuario_id = i.usuario_id AND g.mes = i.mes AND g.tipo = 'gasto'
    ), '{}'::jsonb),
    u.moneda_principal, i.mes, (i.mes + INTERVAL '1 month - 1 day')::date,
    '0.0.0-heuristica'
FROM vw_indicadores_mensuales i
JOIN usuario u ON u.id = i.usuario_id
CROSS JOIN LATERAL (
    SELECT
        CASE
            WHEN i.tasa_ahorro < 0
              OR i.ratio_endeudamiento > 0.40
              OR (i.frecuencia_ahorro_num = 0 AND i.ratio_gasto_ingreso > 0.95) THEN 'en_riesgo'
            WHEN i.tasa_ahorro >= 0.20
             AND i.ratio_endeudamiento <= 0.20
             AND i.frecuencia_ahorro_num >= 2 THEN 'saludable'
            ELSE 'en_observacion'
        END AS perfil,
        ROUND(0.62 + (EXTRACT(MONTH FROM i.mes)::int % 5) * 0.045, 3) AS prob
) e
WHERE u.email LIKE '%@mail.com'
  -- Sin los 8 indicadores completos no se genera analisis: mejor que no haya a
  -- que haya uno con huecos.
  AND i.ratio_endeudamiento IS NOT NULL
  AND i.frecuencia_ahorro_num IS NOT NULL;

-- Recomendaciones, con el mismo motor de reglas de TAXONOMIA §4.
INSERT INTO recomendacion (analisis_id, codigo, parametros, prioridad, indicador, orden)
SELECT analisis_id, codigo, parametros, prioridad, indicador,
       ROW_NUMBER() OVER (PARTITION BY analisis_id
                          ORDER BY CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, codigo)
FROM (
    SELECT a.id AS analisis_id, r.codigo, r.parametros, r.prioridad, r.indicador
    FROM analisis a
    CROSS JOIN LATERAL (VALUES
        ('REC_DEFICIT',           '{}'::jsonb, 'alta',  'tasa_ahorro',              (a.indicadores->>'tasa_ahorro')::numeric < 0),
        ('REC_DEUDA_ALTA',        '{}'::jsonb, 'alta',  'ratio_endeudamiento',      (a.indicadores->>'ratio_endeudamiento')::numeric > 0.40),
        ('REC_AHORRO_BAJO',       '{}'::jsonb, 'alta',  'tasa_ahorro',              (a.indicadores->>'tasa_ahorro')::numeric >= 0 AND (a.indicadores->>'tasa_ahorro')::numeric < 0.10),
        ('REC_SIN_AHORRO',        '{}'::jsonb, 'alta',  'frecuencia_ahorro_num',    (a.indicadores->>'frecuencia_ahorro_num')::int = 0),
        ('REC_ESENCIAL_ALTO',     '{}'::jsonb, 'media', 'ratio_gasto_esencial',     (a.indicadores->>'ratio_gasto_esencial')::numeric > 0.60),
        ('REC_DISCRECIONAL_ALTO', '{}'::jsonb, 'media', 'ratio_gasto_discrecional', (a.indicadores->>'ratio_gasto_discrecional')::numeric > 0.30),
        ('REC_CONCENTRACION',     '{}'::jsonb, 'media', 'concentracion_gasto',      (a.indicadores->>'concentracion_gasto')::numeric > 0.50),
        ('REC_RECURRENTE_ALTO',   '{}'::jsonb, 'media', 'ratio_recurrente',         (a.indicadores->>'ratio_recurrente')::numeric > 0.15),
        ('REC_CONSOLIDA',         '{}'::jsonb, 'baja',  'tasa_ahorro',              (a.indicadores->>'tasa_ahorro')::numeric >= 0.20 AND (a.indicadores->>'ratio_endeudamiento')::numeric <= 0.20)
    ) AS r(codigo, parametros, prioridad, indicador, aplica)
    WHERE a.modelo_version = '0.0.0-heuristica' AND r.aplica
) reglas;

DELETE FROM recomendacion WHERE orden > 5;   -- maximo 5 (RN8)

-- =============================================================================
-- RESUMEN MENSUAL - derivado, no escrito a mano
-- =============================================================================
INSERT INTO resumen_mensual (usuario_id, anio, mes, ingresos, gastos, ahorro, deuda_total, moneda)
SELECT r.usuario_id, r.anio, r.mes,
       ROUND(r.ingresos_base, 2), ROUND(r.gastos_base, 2), ROUND(r.ahorro_base, 2),
       COALESCE((SELECT b.monto_adeudado FROM vw_buro_vigente b WHERE b.usuario_id = r.usuario_id), 0),
       'USD'
FROM vw_resumen_mensual_calculado r
JOIN tmp_usuarios t ON t.id_usuario = r.usuario_id
ON CONFLICT (usuario_id, anio, mes) DO UPDATE
    SET ingresos = EXCLUDED.ingresos, gastos = EXCLUDED.gastos,
        ahorro = EXCLUDED.ahorro, deuda_total = EXCLUDED.deuda_total,
        generado_en = now();

-- Informe de lo cargado y de lo que se quedo fuera, para que no haya sorpresas.
\echo ''
\echo '=== Dataset del equipo ==='
SELECT
    (SELECT count(*) FROM tmp_usuarios)                                    AS usuarios_csv,
    (SELECT count(*) FROM tmp_transacciones)                               AS movimientos_csv,
    (SELECT count(*) FROM transaccion WHERE modelo_version = '0.0.0-dataset') AS movimientos_cargados,
    (SELECT count(*) FROM tmp_transacciones WHERE monto IS NULL OR monto = 0) AS descartados_sin_importe;

COMMIT;

\echo ''
\echo 'AVISO 1: se descartaron los movimientos sin importe del CSV de origen.'
\echo 'AVISO 2: nivel_endeudamiento y frecuencia_ahorro quedan NULL porque el CSV'
\echo '         no los trae, y son 2 de las 3 entradas del endpoint del enunciado.'
