-- =============================================================================
-- SEMILLA DEMO - datos de ejemplo reproducibles
-- =============================================================================

BEGIN;

-- --- Limpieza (re-ejecutable) ------------------------------------------------
DELETE FROM usuario WHERE id IN (
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333',
    'd4444444-4444-4444-8444-444444444444'
);
DELETE FROM cuenta_bancaria WHERE numero_cuenta LIKE 'DEMO-%';
DELETE FROM modelo_ia WHERE version = '0.0.0-semilla';

-- --- Modelo de IA ficticio, para que los analisis tengan a que apuntar -------
INSERT INTO modelo_ia (id, nombre, algoritmo, version, precision_modelo, recall, f1_score, entrenado_en) VALUES
    ('d0000000-0000-4000-8000-000000000001', 'M2-perfil-financiero', 'RandomForest', '0.0.0-semilla', 0.8400, 0.8300, 0.8350, DATE '2026-07-01');

-- =============================================================================
-- USUARIOS
-- =============================================================================
INSERT INTO usuario (
    id, email, nombre, apellido, fecha_nacimiento, genero, telefono, ciudad_id,
    moneda_principal, idioma, ingreso_mensual, nivel_endeudamiento, frecuencia_ahorro,
    terminos_version, terminos_aceptados_en
) VALUES
    ('a1111111-1111-4111-8111-111111111111', 'ana.torres@ejemplo.mx',   'Ana',   'Torres',  DATE '1991-03-14', 'F', '+52 55 1234 5678',
        (SELECT id FROM ciudad WHERE nombre = 'Ciudad de Mexico'), 'MXN', 'es', 45000.00, 12, 'alta',   '1.0', now()),
    ('b2222222-2222-4222-8222-222222222222', 'bruno.silva@exemplo.br',  'Bruno', 'Silva',   DATE '1988-11-02', 'M', '+55 11 98765 4321',
        (SELECT id FROM ciudad WHERE nombre = 'Sao Paulo'),        'BRL', 'pt',  9000.00, 28, 'media',  '1.0', now()),
    ('c3333333-3333-4333-8333-333333333333', 'carla.mendez@ejemplo.mx', 'Carla', 'Mendez',  DATE '1996-07-23', 'F', '+52 81 2345 6789',
        (SELECT id FROM ciudad WHERE nombre = 'Monterrey'),        'MXN', 'es', 18000.00, 47, 'nula',   '1.0', now()),
    ('d4444444-4444-4444-8444-444444444444', 'emily.carter@example.com', 'Emily', 'Carter', DATE '1993-05-19', 'F', '+1 512 555 0134',
        NULL,                                                      'USD', 'en',  5200.00, 18, 'media',  '1.0', now());

INSERT INTO usuario_seguridad (usuario_id, password_hash, totp_activo)
SELECT u.id,
       CASE WHEN :'pwdemo' = '' THEN 'SIN-PASSWORD-USABLE-semilla-demo'
            ELSE crypt(:'pwdemo', gen_salt('bf', 12)) END,
       FALSE
FROM usuario u
WHERE u.id IN (
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333',
    'd4444444-4444-4444-8444-444444444444'
);

-- =============================================================================
-- CUENTAS Y TARJETAS
-- =============================================================================
INSERT INTO cuenta_bancaria (id, numero_cuenta, tipo_cuenta, moneda, fecha_apertura) VALUES
    ('a1000000-0000-4000-8000-000000000001', 'DEMO-MX-4821', 'nomina',  'MXN', DATE '2021-05-10'),
    ('b2000000-0000-4000-8000-000000000001', 'DEMO-BR-7734', 'nomina',  'BRL', DATE '2020-02-18'),
    ('c3000000-0000-4000-8000-000000000001', 'DEMO-MX-9156', 'debito',  'MXN', DATE '2023-09-01'),
    ('d4000000-0000-4000-8000-000000000001', 'DEMO-US-2087', 'cheques', 'USD', DATE '2019-06-12');

INSERT INTO cuenta_usuario (cuenta_id, usuario_id, rol_titular) VALUES
    ('a1000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'titular_principal'),
    ('b2000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'titular_principal'),
    ('c3000000-0000-4000-8000-000000000001', 'c3333333-3333-4333-8333-333333333333', 'titular_principal'),
    ('d4000000-0000-4000-8000-000000000001', 'd4444444-4444-4444-8444-444444444444', 'titular_principal');

INSERT INTO tarjeta (id, cuenta_id, ultimos4, tipo_tarjeta, red_pago, fecha_vencimiento, etiqueta) VALUES
    ('a1a00000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '4821', 'debito',  'visa',       DATE '2029-05-31', 'Nomina'),
    ('a1a00000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '7712', 'credito', 'mastercard', DATE '2028-11-30', 'Oro'),
    ('b2b00000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', '7734', 'debito',  'visa',       DATE '2029-02-28', 'Conta'),
    ('b2b00000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000001', '3390', 'credito', 'visa',       DATE '2028-08-31', 'Internacional'),
    ('c3c00000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', '9156', 'debito',  'mastercard', DATE '2027-09-30', 'Principal'),
    ('c3c00000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', '2043', 'credito', 'amex',       DATE '2027-12-31', 'Clasica'),
    ('d4d00000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', '2087', 'debito',  'visa',       DATE '2029-06-30', 'Checking'),
    ('d4d00000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', '5514', 'credito', 'mastercard', DATE '2028-03-31', 'Rewards');

INSERT INTO tarjeta_credito (tarjeta_id, limite_credito, dia_corte, dia_pago) VALUES
    ('a1a00000-0000-4000-8000-000000000002',  80000.00, 15,  5),
    ('b2b00000-0000-4000-8000-000000000002',  12000.00, 20, 10),
    ('c3c00000-0000-4000-8000-000000000002',  25000.00, 28, 18),
    ('d4d00000-0000-4000-8000-000000000002',   9000.00, 12,  2);

-- =============================================================================
-- MOVIMIENTOS
-- =============================================================================

-- --- Ana: perfil saludable (Modificada para cuadrar EXACTO con el dashboard) ---
INSERT INTO transaccion (usuario_id, cuenta_id, tarjeta_id, fecha, descripcion, comercio,
                         valor, moneda, categoria_slug, categoria_origen, confianza,
                         modelo_version, medio_operacion, es_recurrente)
SELECT
    'a1111111-1111-4111-8111-111111111111',
    'a1000000-0000-4000-8000-000000000001',
    p.tarjeta,
    (m.mes + (p.dia - 1) * INTERVAL '1 day')::date,
    p.descripcion, p.comercio,
    p.monto, -- SIN VARIACIÓN MATEMÁTICA, NÚMEROS FIJOS
    'MXN', p.categoria, 'modelo', p.confianza, '0.0.0-semilla', p.medio, p.recurrente
FROM (
    -- ACTUALIZADO HASTA AGOSTO 2026
    SELECT generate_series(DATE '2025-08-01', DATE '2026-08-01', INTERVAL '1 month')::date AS mes
) m
CROSS JOIN (VALUES
    --  descripcion              comercio             categoria          dia   monto    medio          recur  confianza  tarjeta
    ('Nomina quincenal',       'Empresa SA',        'ingresos',          1,  22500.00, 'transferencia', TRUE,  0.990, NULL::uuid),
    ('Nomina quincenal',       'Empresa SA',        'ingresos',         16,  22500.00, 'transferencia', TRUE,  0.990, NULL::uuid),
    ('Renta departamento',     'Inmobiliaria Lux',  'vivienda',          2, -10560.00, 'transferencia', TRUE,  0.970, NULL::uuid),
    ('Supermercado',           'La Comer',          'alimentacion',      5,  -2304.00, 'pos',           FALSE, 0.960, 'a1a00000-0000-4000-8000-000000000001'),
    ('Supermercado',           'Costco',            'alimentacion',     19,  -2784.00, 'pos',           FALSE, 0.960, 'a1a00000-0000-4000-8000-000000000001'),
    ('Gasolina',               'Pemex',             'transporte',        7,  -1248.00, 'pos',           FALSE, 0.950, 'a1a00000-0000-4000-8000-000000000001'),
    ('Luz CFE',                'CFE',               'servicios',         9,   -652.80, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Internet y telefono',    'Totalplay',         'servicios',        11,   -767.04, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Streaming',              'Netflix',           'entretenimiento',  12,   -287.04, 'app_movil',     TRUE,  0.930, 'a1a00000-0000-4000-8000-000000000002'),
    ('Gimnasio',               'Smart Fit',         'entretenimiento',  14,   -432.00, 'app_movil',     TRUE,  0.910, 'a1a00000-0000-4000-8000-000000000002'),
    ('Farmacia',               'Farmacia Guadalajara','salud',          17,   -499.20, 'pos',           FALSE, 0.940, 'a1a00000-0000-4000-8000-000000000001'),
    ('Ropa',                   'Zara',              'compras',          21,  -1536.00, 'pos',           FALSE, 0.920, 'a1a00000-0000-4000-8000-000000000002'),
    ('Comision de cuenta',     'Banco',             'finanzas',         24,   -172.80, 'app_movil',     TRUE,  0.970, NULL::uuid),
    ('Transferencia a ahorro', 'Cetesdirecto',      'ahorro_inversion', 26,  -9000.00, 'transferencia', TRUE,  0.990, NULL::uuid)
) AS p(descripcion, comercio, categoria, dia, monto, medio, recurrente, confianza, tarjeta);

-- --- Bruno: en observacion ------------------------
INSERT INTO transaccion (usuario_id, cuenta_id, tarjeta_id, fecha, descripcion, comercio,
                         valor, moneda, categoria_slug, categoria_origen, confianza,
                         modelo_version, medio_operacion, es_recurrente)
SELECT
    'b2222222-2222-4222-8222-222222222222',
    'b2000000-0000-4000-8000-000000000001',
    p.tarjeta,
    (m.mes + (p.dia - 1) * INTERVAL '1 day')::date,
    p.descripcion, p.comercio,
    ROUND(p.monto * (1 + ((EXTRACT(MONTH FROM m.mes)::int * 7 % 11) - 5) / 100.0), 2),
    'BRL', p.categoria, 'modelo', p.confianza, '0.0.0-semilla', p.medio, p.recurrente
FROM (
    SELECT generate_series(DATE '2025-08-01', DATE '2026-08-01', INTERVAL '1 month')::date AS mes
) m
CROSS JOIN (VALUES
    ('Salario mensal',         'Empresa LTDA',      'ingresos',          5,   9000.00, 'transferencia', TRUE,  0.990, NULL::uuid),
    ('Aluguel',                'Imobiliaria Paulista','vivienda',        6,  -2800.00, 'transferencia', TRUE,  0.970, NULL::uuid),
    ('Supermercado',           'Pao de Acucar',     'alimentacion',      8,   -980.00, 'pos',           FALSE, 0.960, 'b2b00000-0000-4000-8000-000000000001'),
    ('IFOOD *PEDIDO',          'iFood',             'alimentacion',     13,   -420.00, 'app_movil',     FALSE, 0.940, 'b2b00000-0000-4000-8000-000000000002'),
    ('Uber',                   'Uber',              'transporte',       10,   -560.00, 'app_movil',     FALSE, 0.950, 'b2b00000-0000-4000-8000-000000000002'),
    ('Conta de luz',           'Enel',              'servicios',        12,   -310.00, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Internet',               'Vivo Fibra',        'servicios',        14,   -180.00, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Spotify',                'Spotify',           'entretenimiento',  15,    -35.00, 'app_movil',     TRUE,  0.930, 'b2b00000-0000-4000-8000-000000000002'),
    ('HBO Max',                'HBO Max',           'entretenimiento',  16,    -55.00, 'app_movil',     TRUE,  0.930, 'b2b00000-0000-4000-8000-000000000002'),
    ('Farmacia',               'Drogasil',          'salud',            18,   -210.00, 'pos',           FALSE, 0.940, 'b2b00000-0000-4000-8000-000000000001'),
    ('Curso online',           'Alura',             'educacion',        20,   -180.00, 'portal_web',    TRUE,  0.950, 'b2b00000-0000-4000-8000-000000000002'),
    ('Roupas',                 'Renner',            'compras',          22,   -650.00, 'pos',           FALSE, 0.920, 'b2b00000-0000-4000-8000-000000000002'),
    ('Juros do cartao',        'Banco',             'finanzas',         25,   -430.00, 'app_movil',     TRUE,  0.970, NULL::uuid),
    ('Poupanca',               'Tesouro Direto',    'ahorro_inversion', 27,   -600.00, 'transferencia', TRUE,  0.990, NULL::uuid)
) AS p(descripcion, comercio, categoria, dia, monto, medio, recurrente, confianza, tarjeta);

-- --- Carla: en riesgo ------------------------
INSERT INTO transaccion (usuario_id, cuenta_id, tarjeta_id, fecha, descripcion, comercio,
                         valor, moneda, categoria_slug, categoria_origen, confianza,
                         modelo_version, medio_operacion, es_recurrente)
SELECT
    'c3333333-3333-4333-8333-333333333333',
    'c3000000-0000-4000-8000-000000000001',
    p.tarjeta,
    (m.mes + (p.dia - 1) * INTERVAL '1 day')::date,
    p.descripcion, p.comercio,
    ROUND(p.monto * (1 + ((EXTRACT(MONTH FROM m.mes)::int * 7 % 11) - 5) / 100.0), 2),
    'MXN', p.categoria, 'modelo', p.confianza, '0.0.0-semilla', p.medio, p.recurrente
FROM (
    SELECT generate_series(DATE '2025-08-01', DATE '2026-08-01', INTERVAL '1 month')::date AS mes
) m
CROSS JOIN (VALUES
    ('Nomina',                 'Comercial MX',      'ingresos',          3,  18000.00, 'transferencia', TRUE,  0.990, NULL::uuid),
    ('Renta',                  'Arrendadora Norte', 'vivienda',          4,  -7500.00, 'transferencia', TRUE,  0.970, NULL::uuid),
    ('Supermercado',           'Soriana',           'alimentacion',      6,  -2200.00, 'pos',           FALSE, 0.960, 'c3c00000-0000-4000-8000-000000000001'),
    ('Comida rapida',          'Rappi',             'alimentacion',     11,  -1450.00, 'app_movil',     FALSE, 0.930, 'c3c00000-0000-4000-8000-000000000002'),
    ('Uber',                   'Uber',              'transporte',        9,  -1100.00, 'app_movil',     FALSE, 0.950, 'c3c00000-0000-4000-8000-000000000002'),
    ('Luz CFE',                'CFE',               'servicios',        10,   -640.00, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Telefonia',             'Telcel',            'servicios',        13,   -450.00, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Streaming',              'Disney+',           'entretenimiento',  14,   -199.00, 'app_movil',     TRUE,  0.930, 'c3c00000-0000-4000-8000-000000000002'),
    ('Streaming',              'Netflix',           'entretenimiento',  15,   -299.00, 'app_movil',     TRUE,  0.930, 'c3c00000-0000-4000-8000-000000000002'),
    ('Bar',                    'Cerveceria Centro', 'entretenimiento',  20,  -1800.00, 'pos',           FALSE, 0.900, 'c3c00000-0000-4000-8000-000000000002'),
    ('Ropa y calzado',         'Liverpool',         'compras',          21,  -2600.00, 'pos',           FALSE, 0.920, 'c3c00000-0000-4000-8000-000000000002'),
    ('Electronica',            'Amazon',            'compras',          23,  -1900.00, 'portal_web',    FALSE, 0.910, 'c3c00000-0000-4000-8000-000000000002'),
    ('Pago minimo tarjeta',    'Banco',             'finanzas',         25,  -2400.00, 'app_movil',     TRUE,  0.970, NULL::uuid),
    ('Intereses',              'Banco',             'finanzas',         26,   -980.00, 'app_movil',     TRUE,  0.970, NULL::uuid)
) AS p(descripcion, comercio, categoria, dia, monto, medio, recurrente, confianza, tarjeta);

-- --- Emily: saludable, en dolares e ingles -------------------------
INSERT INTO transaccion (usuario_id, cuenta_id, tarjeta_id, fecha, descripcion, comercio,
                         valor, moneda, categoria_slug, categoria_origen, confianza,
                         modelo_version, medio_operacion, es_recurrente)
SELECT
    'd4444444-4444-4444-8444-444444444444',
    'd4000000-0000-4000-8000-000000000001',
    p.tarjeta,
    (m.mes + (p.dia - 1) * INTERVAL '1 day')::date,
    p.descripcion, p.comercio,
    ROUND(p.monto * (1 + ((EXTRACT(MONTH FROM m.mes)::int * 7 % 11) - 5) / 100.0), 2),
    'USD', p.categoria, 'modelo', p.confianza, '0.0.0-semilla', p.medio, p.recurrente
FROM (
    SELECT generate_series(DATE '2025-08-01', DATE '2026-08-01', INTERVAL '1 month')::date AS mes
) m
CROSS JOIN (VALUES
    ('Payroll deposit',     'Acme Corp',       'ingresos',          1,   5200.00, 'transferencia', TRUE,  0.990, NULL::uuid),
    ('Rent',                'Oak Street Apts', 'vivienda',          3,  -1650.00, 'transferencia', TRUE,  0.970, NULL::uuid),
    ('Groceries',           'Whole Foods',     'alimentacion',      6,   -420.00, 'pos',           FALSE, 0.960, 'd4d00000-0000-4000-8000-000000000001'),
    ('Groceries',           'Trader Joes',     'alimentacion',     18,   -310.00, 'pos',           FALSE, 0.960, 'd4d00000-0000-4000-8000-000000000001'),
    ('Gas',                 'Shell',           'transporte',        8,   -140.00, 'pos',           FALSE, 0.950, 'd4d00000-0000-4000-8000-000000000001'),
    ('Electric bill',       'City Power',      'servicios',        10,    -95.00, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Internet',            'Xfinity',         'servicios',        11,    -70.00, 'app_movil',     TRUE,  0.980, NULL::uuid),
    ('Netflix',             'Netflix',         'entretenimiento',  12,    -18.00, 'app_movil',     TRUE,  0.930, 'd4d00000-0000-4000-8000-000000000002'),
    ('Gym membership',      'Planet Fitness',  'entretenimiento',  14,    -25.00, 'app_movil',     TRUE,  0.910, 'd4d00000-0000-4000-8000-000000000002'),
    ('Pharmacy',            'CVS',             'salud',            17,    -60.00, 'pos',           FALSE, 0.940, 'd4d00000-0000-4000-8000-000000000001'),
    ('Online course',       'Coursera',        'educacion',        19,    -49.00, 'portal_web',    TRUE,  0.950, 'd4d00000-0000-4000-8000-000000000002'),
    ('Clothing',            'Target',          'compras',          21,   -180.00, 'pos',           FALSE, 0.920, 'd4d00000-0000-4000-8000-000000000002'),
    ('Card interest',       'Bank',            'finanzas',         24,    -35.00, 'app_movil',     TRUE,  0.970, NULL::uuid),
    ('Transfer to savings', 'Vanguard',        'ahorro_inversion', 26,   -900.00, 'transferencia', TRUE,  0.990, NULL::uuid)
) AS p(descripcion, comercio, categoria, dia, monto, medio, recurrente, confianza, tarjeta);

-- Normalizacion a la moneda base
UPDATE transaccion
   SET valor_base = ROUND(fn_a_base(valor, moneda, fecha), 2)
 WHERE modelo_version = '0.0.0-semilla';

-- =============================================================================
-- BURO DE CREDITO 
-- =============================================================================
INSERT INTO historial_buro (usuario_id, score_crediticio, dias_atraso, monto_adeudado, moneda, consultado_en)
SELECT u.id,
       LEAST(999, GREATEST(0, u.score_base + (n * u.delta))),
       CASE WHEN u.dias > 0 THEN GREATEST(0, u.dias - n * 2) ELSE 0 END,
       ROUND(u.deuda * (1 - n * 0.015), 2),
       u.moneda,
       (DATE '2025-08-01' + n * INTERVAL '1 month')::date
FROM generate_series(0, 12) AS n
CROSS JOIN (VALUES
    ('a1111111-1111-4111-8111-111111111111'::uuid, 742, 4,  0, 54000.00, 'MXN'),
    ('b2222222-2222-4222-8222-222222222222'::uuid, 651, 3, 12, 25200.00, 'BRL'),
    ('c3333333-3333-4333-8333-333333333333'::uuid, 498, 6, 41, 84600.00, 'MXN'),
    ('d4444444-4444-4444-8444-444444444444'::uuid, 705, 5,  0,  9360.00, 'USD')
) AS u(id, score_base, delta, dias, deuda, moneda);

-- =============================================================================
-- METAS, PRESUPUESTOS Y EVENTOS
-- =============================================================================
INSERT INTO plan_ahorro (id, usuario_id, nombre_meta, monto_meta, moneda, fecha_inicio, fecha_fin, icono, color) VALUES
    ('a1f00000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'Fondo de emergencia', 135000.00, 'MXN', DATE '2026-01-01', DATE '2026-12-31', '🛟', 'verde'),
    ('a1f00000-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 'Viaje a Japon',       90000.00, 'MXN', DATE '2026-02-01', DATE '2027-03-31', '✈️', 'azul'),
    ('b2f00000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'Reserva de emergencia', 27000.00, 'BRL', DATE '2026-01-01', DATE '2026-12-31', '🛟', 'verde'),
    ('c3f00000-0000-4000-8000-000000000001', 'c3333333-3333-4333-8333-333333333333', 'Salir de la deuda',    84600.00, 'MXN', DATE '2026-03-01', NULL,             '💳', 'rojo'),
    ('d4f00000-0000-4000-8000-000000000001', 'd4444444-4444-4444-8444-444444444444', 'Emergency fund',       15600.00, 'USD', DATE '2025-08-01', DATE '2026-12-31', '🛟', 'verde');

INSERT INTO aporte_plan (plan_id, transaccion_id, monto, fecha)
SELECT
    CASE t.usuario_id
        WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'a1f00000-0000-4000-8000-000000000001'::uuid
        WHEN 'b2222222-2222-4222-8222-222222222222' THEN 'b2f00000-0000-4000-8000-000000000001'::uuid
        WHEN 'd4444444-4444-4444-8444-444444444444' THEN 'd4f00000-0000-4000-8000-000000000001'::uuid
    END,
    t.id, -t.valor, t.fecha
FROM transaccion t
WHERE t.categoria_slug = 'ahorro_inversion'
  AND t.modelo_version = '0.0.0-semilla'
  AND t.usuario_id IN ('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222',
                       'd4444444-4444-4444-8444-444444444444');

INSERT INTO presupuesto (usuario_id, categoria_slug, limite, moneda) VALUES
    ('a1111111-1111-4111-8111-111111111111', 'alimentacion',    6000.00,  'MXN'),
    ('a1111111-1111-4111-8111-111111111111', 'entretenimiento', 1500.00,  'MXN'),
    ('a1111111-1111-4111-8111-111111111111', 'compras',         2500.00,  'MXN'),
    ('b2222222-2222-4222-8222-222222222222', 'alimentacion',    1500.00,  'BRL'),
    ('b2222222-2222-4222-8222-222222222222', 'entretenimiento',  150.00,  'BRL'),
    ('c3333333-3333-4333-8333-333333333333', 'alimentacion',    3000.00,  'MXN'),
    ('c3333333-3333-4333-8333-333333333333', 'entretenimiento', 1200.00,  'MXN'),
    ('c3333333-3333-4333-8333-333333333333', 'compras',         2000.00,  'MXN'),
    ('d4444444-4444-4444-8444-444444444444', 'alimentacion',     800.00,  'USD'),
    ('d4444444-4444-4444-8444-444444444444', 'entretenimiento',   80.00,  'USD');

INSERT INTO evento_calendario (usuario_id, fecha, titulo, tipo, monto, moneda) VALUES
    ('a1111111-1111-4111-8111-111111111111', DATE '2026-08-05', 'Pago tarjeta Oro',       'pago',          -12400.00, 'MXN'),
    ('a1111111-1111-4111-8111-111111111111', DATE '2026-08-16', 'Nomina',                 'cobro',          22500.00, 'MXN'),
    ('a1111111-1111-4111-8111-111111111111', DATE '2026-08-20', 'Revisar fondo de emergencia', 'recordatorio', NULL,  NULL),
    ('b2222222-2222-4222-8222-222222222222', DATE '2026-08-10', 'Fatura do cartao',       'pago',           -3200.00, 'BRL'),
    ('b2222222-2222-4222-8222-222222222222', DATE '2026-08-05', 'Salario',                'cobro',           9000.00, 'BRL'),
    ('c3333333-3333-4333-8333-333333333333', DATE '2026-08-18', 'Pago minimo tarjeta',    'pago',           -2400.00, 'MXN'),
    ('c3333333-3333-4333-8333-333333333333', DATE '2026-08-03', 'Nomina',                 'cobro',          18000.00, 'MXN'),
    ('d4444444-4444-4444-8444-444444444444', DATE '2026-08-02', 'Credit card payment',    'pago',            -640.00, 'USD'),
    ('d4444444-4444-4444-8444-444444444444', DATE '2026-08-01', 'Paycheck',               'cobro',           5200.00, 'USD');

-- =============================================================================
-- ANALISIS - DERIVADOS
-- =============================================================================
INSERT INTO analisis (id, usuario_id, modelo_id, perfil_codigo, probabilidad, probabilidades,
                      indicadores, resumen_gastos, moneda, desde, hasta, modelo_version)
SELECT
    gen_random_uuid(),
    i.usuario_id,
    'd0000000-0000-4000-8000-000000000001',
    e.perfil,
    e.prob,
    CASE e.perfil
        WHEN 'saludable'      THEN jsonb_build_object('saludable', e.prob, 'en_observacion', ROUND((1 - e.prob) * 0.7, 3), 'en_riesgo',      ROUND((1 - e.prob) * 0.3, 3))
        WHEN 'en_observacion' THEN jsonb_build_object('saludable', ROUND((1 - e.prob) * 0.5, 3), 'en_observacion', e.prob, 'en_riesgo',      ROUND((1 - e.prob) * 0.5, 3))
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
    u.moneda_principal,
    i.mes,
    (i.mes + INTERVAL '1 month - 1 day')::date,
    '0.0.0-semilla'
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
WHERE i.usuario_id IN (
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333',
    'd4444444-4444-4444-8444-444444444444'
);

INSERT INTO recomendacion (analisis_id, codigo, parametros, prioridad, indicador, orden)
SELECT analisis_id, codigo, parametros, prioridad, indicador,
       ROW_NUMBER() OVER (PARTITION BY analisis_id
                          ORDER BY CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, codigo)
FROM (
    SELECT a.id AS analisis_id, r.codigo, r.parametros, r.prioridad, r.indicador
    FROM analisis a
    CROSS JOIN LATERAL (VALUES
        ('REC_DEFICIT',            '{}'::jsonb, 'alta',  'tasa_ahorro',              (a.indicadores->>'tasa_ahorro')::numeric < 0),
        ('REC_DEUDA_ALTA',         '{}'::jsonb, 'alta',  'ratio_endeudamiento',      (a.indicadores->>'ratio_endeudamiento')::numeric > 0.40),
        ('REC_AHORRO_BAJO',        '{}'::jsonb, 'alta',  'tasa_ahorro',              (a.indicadores->>'tasa_ahorro')::numeric >= 0 AND (a.indicadores->>'tasa_ahorro')::numeric < 0.10),
        ('REC_SIN_AHORRO',         '{}'::jsonb, 'alta',  'frecuencia_ahorro_num',    (a.indicadores->>'frecuencia_ahorro_num')::int = 0),
        ('REC_ESENCIAL_ALTO',      '{}'::jsonb, 'media', 'ratio_gasto_esencial',     (a.indicadores->>'ratio_gasto_esencial')::numeric > 0.60),
        ('REC_DISCRECIONAL_ALTO',  '{}'::jsonb, 'media', 'ratio_gasto_discrecional', (a.indicadores->>'ratio_gasto_discrecional')::numeric > 0.30),
        ('REC_RECURRENTE_ALTO',    '{}'::jsonb, 'media', 'ratio_recurrente',         (a.indicadores->>'ratio_recurrente')::numeric > 0.15),
        ('REC_CONSOLIDA',          '{}'::jsonb, 'baja',  'tasa_ahorro',              (a.indicadores->>'tasa_ahorro')::numeric >= 0.20 AND (a.indicadores->>'ratio_endeudamiento')::numeric <= 0.20)
    ) AS r(codigo, parametros, prioridad, indicador, aplica)
    WHERE a.modelo_version = '0.0.0-semilla' AND r.aplica
) reglas;

DELETE FROM recomendacion WHERE orden > 5;

-- =============================================================================
-- RESUMEN MENSUAL
-- =============================================================================
INSERT INTO resumen_mensual (usuario_id, anio, mes, ingresos, gastos, ahorro, deuda_total, moneda)
SELECT r.usuario_id, r.anio, r.mes,
       ROUND(r.ingresos_base, 2), ROUND(r.gastos_base, 2), ROUND(r.ahorro_base, 2),
       COALESCE((SELECT b.monto_adeudado FROM vw_buro_vigente b WHERE b.usuario_id = r.usuario_id), 0),
       'USD'
FROM vw_resumen_mensual_calculado r
WHERE r.usuario_id IN (
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333',
    'd4444444-4444-4444-8444-444444444444'
)
ON CONFLICT (usuario_id, anio, mes) DO UPDATE
    SET ingresos = EXCLUDED.ingresos, gastos = EXCLUDED.gastos,
        ahorro = EXCLUDED.ahorro, deuda_total = EXCLUDED.deuda_total,
        generado_en = now();

COMMIT;

\echo ''
\echo '=== Semilla demo cargada con datos exactos ==='