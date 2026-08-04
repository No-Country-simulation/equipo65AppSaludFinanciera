/* ============================================================================
BASE DE DATOS: PERFIL FINANCIERO CON IA
Proyecto: equipo65AppSaludFinanciera (No-Country Simulation)
Motor: MySQL 8.0+ / MariaDB / PostgreSQL Compliant
============================================================================ */

CREATE DATABASE IF NOT EXISTS perfil_financiero 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE perfil_financiero;

-- ----------------------------------------------------------------------------
-- TABLA 1: ciudades
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciudades (
    id_ciudad VARCHAR(36) NOT NULL,
    nombre_ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    pais VARCHAR(50) NOT NULL DEFAULT 'Mexico',

    CONSTRAINT pk_ciudades PRIMARY KEY (id_ciudad),
    CONSTRAINT uq_ciudades_nombre_estado UNIQUE (nombre_ciudad, estado)
);

-- ----------------------------------------------------------------------------
-- TABLA 2: usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario VARCHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(20) DEFAULT 'NO_ESPECIFICADO',
    id_ciudad VARCHAR(36) NULL,
    ingreso_mensual DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    telefono VARCHAR(20) NULL,
    email VARCHAR(150) NOT NULL,
    moneda_principal CHAR(3) NOT NULL DEFAULT 'MXN',
    idioma CHAR(2) NOT NULL DEFAULT 'es',
    estado_usuario ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultima_sesion TIMESTAMP NULL,

    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT fk_usuarios_ciudades FOREIGN KEY (id_ciudad) REFERENCES ciudades (id_ciudad) ON DELETE SET NULL,
    CONSTRAINT chk_usuarios_ingreso CHECK (ingreso_mensual >= 0)
);

-- ----------------------------------------------------------------------------
-- TABLA 3: usuarios_seguridad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_seguridad (
    id_usuario VARCHAR(36) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    totp_secret VARCHAR(64) NULL,
    totp_activo BOOLEAN NOT NULL DEFAULT FALSE,
    totp_activado_en TIMESTAMP NULL,
    totp_ultimo_paso BIGINT NULL,
    fecha_cambio_password TIMESTAMP NULL,
    requiere_cambio_password BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    ultimo_intento_fallido TIMESTAMP NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios_seguridad PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuarios_seguridad_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- TABLA 4: codigos_respaldo_2fa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS codigos_respaldo_2fa (
    id_codigo VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_uso TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_codigos_respaldo_2fa PRIMARY KEY (id_codigo),
    CONSTRAINT fk_codigos_respaldo_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_codigos_respaldo_usuario ON codigos_respaldo_2fa (id_usuario);

-- ----------------------------------------------------------------------------
-- TABLA 5: refresh_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id_token VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    familia VARCHAR(36) NOT NULL,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    expira_en TIMESTAMP NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso TIMESTAMP NULL,

    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id_token),
    CONSTRAINT fk_refresh_tokens_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (id_usuario);

-- ----------------------------------------------------------------------------
-- TABLA 6: cuentas_bancarias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
    id_cuenta VARCHAR(36) NOT NULL,
    numero_cuenta VARCHAR(50) NOT NULL,
    estado_cuenta ENUM('ACTIVA', 'BLOQUEADA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',
    fecha_apertura DATE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_cuentas_bancarias PRIMARY KEY (id_cuenta),
    CONSTRAINT uq_cuentas_bancarias_numero UNIQUE (numero_cuenta)
);

-- ----------------------------------------------------------------------------
-- TABLA 7: cuentas_usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas_usuarios (
    id_cuenta VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    rol_usuario ENUM('TITULAR_PRINCIPAL', 'COTITULAR', 'AUTORIZADO') NOT NULL DEFAULT 'TITULAR_PRINCIPAL',
    fecha_vinculacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_desvinculacion TIMESTAMP NULL,

    CONSTRAINT pk_cuentas_usuarios PRIMARY KEY (id_cuenta, id_usuario),
    CONSTRAINT fk_cuentas_usuarios_cuenta FOREIGN KEY (id_cuenta) REFERENCES cuentas_bancarias (id_cuenta) ON DELETE CASCADE,
    CONSTRAINT fk_cuentas_usuarios_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- TABLA 8: tarjetas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarjetas (
    id_tarjeta VARCHAR(36) NOT NULL,
    id_cuenta VARCHAR(36) NOT NULL,
    numero_tarjeta VARCHAR(20) NOT NULL,
    tipo_tarjeta ENUM('DEBITO', 'CREDITO') NOT NULL DEFAULT 'DEBITO',
    red_pago ENUM('VISA', 'MASTERCARD', 'AMEX') NOT NULL DEFAULT 'VISA',
    fecha_vencimiento DATE NOT NULL,
    estado_tarjeta ENUM('ACTIVA', 'BLOQUEADA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_tarjetas PRIMARY KEY (id_tarjeta),
    CONSTRAINT fk_tarjetas_cuentas FOREIGN KEY (id_cuenta) REFERENCES cuentas_bancarias (id_cuenta) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- TABLA 9: tarjetas_credito
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarjetas_credito (
    id_tarjeta VARCHAR(36) NOT NULL,
    limite_credito DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    dia_corte TINYINT NOT NULL,
    dia_pago TINYINT NOT NULL,

    CONSTRAINT pk_tarjetas_credito PRIMARY KEY (id_tarjeta),
    CONSTRAINT fk_tarjetas_credito_tarjeta FOREIGN KEY (id_tarjeta) REFERENCES tarjetas (id_tarjeta) ON DELETE CASCADE,
    CONSTRAINT chk_tarjetas_credito_limite CHECK (limite_credito >= 0),
    CONSTRAINT chk_tarjetas_credito_corte CHECK (dia_corte BETWEEN 1 AND 31),
    CONSTRAINT chk_tarjetas_credito_pago CHECK (dia_pago BETWEEN 1 AND 31)
);

-- ----------------------------------------------------------------------------
-- TABLA 10: categorias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT NOT NULL,
    slug VARCHAR(50) NOT NULL,
    nombre_categoria VARCHAR(100) NOT NULL,
    tipo_categoria ENUM('INGRESO', 'EGRESO', 'MOVIMIENTO') NOT NULL,
    descripcion VARCHAR(255) NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_categorias PRIMARY KEY (id_categoria),
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre_categoria),
    CONSTRAINT uq_categorias_slug UNIQUE (slug)
);

-- ----------------------------------------------------------------------------
-- TABLA 11: tasas_cambio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasas_cambio (
    moneda CHAR(3) NOT NULL,
    tasa_a_base DECIMAL(18,8) NOT NULL,
    fecha DATE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_tasas_cambio PRIMARY KEY (moneda, fecha)
);

-- ----------------------------------------------------------------------------
-- TABLA 12: transacciones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacciones (
    id_transaccion VARCHAR(36) NOT NULL,
    id_tarjeta VARCHAR(36) NULL,
    id_categoria INT NULL,
    confianza DECIMAL(5,4) NULL,
    categoria_origen ENUM('modelo', 'usuario') NOT NULL DEFAULT 'modelo',
    moneda CHAR(3) DEFAULT 'MXN',
    fecha_hora TIMESTAMP NOT NULL,
    concepto VARCHAR(150) NOT NULL,
    comercio VARCHAR(150) NULL,
    monto DECIMAL(12,2) NOT NULL,
    tipo_movimiento ENUM('INGRESO', 'EGRESO') NOT NULL,
    medio_operacion ENUM('APP_MOVIL', 'PORTAL_WEB', 'CAJERO', 'SUCURSAL', 'POS', 'TRANSFERENCIA', 'EFECTIVO') DEFAULT 'APP_MOVIL',
    estado_transaccion ENUM('COMPLETADA', 'PENDIENTE', 'CANCELADA') DEFAULT 'COMPLETADA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_transacciones PRIMARY KEY (id_transaccion),
    CONSTRAINT fk_transacciones_tarjetas FOREIGN KEY (id_tarjeta) REFERENCES tarjetas (id_tarjeta) ON DELETE SET NULL,
    CONSTRAINT fk_transacciones_categorias FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria) ON DELETE SET NULL,
    CONSTRAINT chk_transacciones_monto CHECK (monto > 0)
);

-- ----------------------------------------------------------------------------
-- TABLA 13: historial_buro
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_buro (
    id_buro VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    score_crediticio INT NULL,
    dias_atraso INT NOT NULL DEFAULT 0,
    monto_adeudado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_historial_buro PRIMARY KEY (id_buro),
    CONSTRAINT fk_historial_buro_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT chk_historial_buro_score CHECK (score_crediticio BETWEEN 0 AND 999),
    CONSTRAINT chk_historial_buro_atraso CHECK (dias_atraso >= 0),
    CONSTRAINT chk_historial_buro_deuda CHECK (monto_adeudado >= 0)
);

-- ----------------------------------------------------------------------------
-- TABLA 14: planes_ahorro
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planes_ahorro (
    id_plan VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    nombre_meta VARCHAR(100) NOT NULL,
    monto_meta DECIMAL(12,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    estado_plan ENUM('ACTIVO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_planes_ahorro PRIMARY KEY (id_plan),
    CONSTRAINT fk_planes_ahorro_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT chk_planes_ahorro_meta CHECK (monto_meta > 0)
);

-- ----------------------------------------------------------------------------
-- TABLA 15: modelos_ia
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modelos_ia (
    id_modelo VARCHAR(36) NOT NULL,
    nombre_modelo VARCHAR(100) NOT NULL,
    algoritmo VARCHAR(100) NOT NULL,
    version VARCHAR(30) NOT NULL,
    precision_modelo DECIMAL(5,4) NULL,
    recall DECIMAL(5,4) NULL,
    f1_score DECIMAL(5,4) NULL,
    fecha_entrenamiento DATE NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_modelos_ia PRIMARY KEY (id_modelo)
);

-- ----------------------------------------------------------------------------
-- TABLA 16: historial_analisis_financiero
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_analisis_financiero (
    id_analisis VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    id_modelo VARCHAR(36) NULL,
    perfil_financiero ENUM('saludable', 'en_observacion', 'en_riesgo') NOT NULL,
    probabilidad DECIMAL(5,4) NULL,
    detalle JSON NULL,
    fecha_analisis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_historial_analisis PRIMARY KEY (id_analisis),
    CONSTRAINT fk_analisis_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_analisis_modelos FOREIGN KEY (id_modelo) REFERENCES modelos_ia (id_modelo) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- TABLA 17: resumen_mensual
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumen_mensual (
    id_resumen VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    anio INT NOT NULL,
    mes INT NOT NULL,
    ingresos DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gastos DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ahorro DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deuda_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_resumen_mensual PRIMARY KEY (id_resumen),
    CONSTRAINT fk_resumen_mensual_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT chk_resumen_mensual_mes CHECK (mes BETWEEN 1 AND 12)
);

/* ============================================================================
CATÁLOGO SEMILLA (CIUDADES LIMPIAS SIN ACENTOS PARA EVITAR PROBLEMAS EN API)
============================================================================ */

INSERT INTO ciudades (id_ciudad, nombre_ciudad, estado, pais) VALUES
('c1000000-0000-0000-0000-000000000001', 'Ciudad de Mexico', 'CDMX', 'Mexico'),
('c1000000-0000-0000-0000-000000000002', 'Guadalajara', 'Jalisco', 'Mexico'),
('c1000000-0000-0000-0000-000000000003', 'Monterrey', 'Nuevo Leon', 'Mexico'),
('c1000000-0000-0000-0000-000000000004', 'Queretaro', 'Queretaro', 'Mexico'),
('c1000000-0000-0000-0000-000000000005', 'Puebla', 'Puebla', 'Mexico'),
('c1000000-0000-0000-0000-000000000006', 'Tijuana', 'Baja California', 'Mexico'),
('c1000000-0000-0000-0000-000000000007', 'Cancun', 'Quintana Roo', 'Mexico'),
('c1000000-0000-0000-0000-000000000008', 'Merida', 'Yucatan', 'Mexico'),
('c1000000-0000-0000-0000-000000000009', 'Leon', 'Guanajuato', 'Mexico'),
('c1000000-0000-0000-0000-000000000010', 'Toluca', 'Estado de Mexico', 'Mexico')
ON DUPLICATE KEY UPDATE nombre_ciudad = VALUES(nombre_ciudad);

/* ============================================================================
VISTAS OPTIMIZADAS PARA SERVICIOS BACKEND / API REST
============================================================================ */

-- VIEW 1: Resumen de ratios
CREATE OR REPLACE VIEW vw_resumen_cliente_ratios AS
SELECT 
    u.id_usuario,
    u.nombre,
    u.apellido,
    u.ingreso_mensual,
    COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'EGRESO' THEN t.monto ELSE 0 END), 0) AS total_egresos,
    COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'INGRESO' THEN t.monto ELSE 0 END), 0) AS total_ingresos_registrados,
    COALESCE(hb.monto_adeudado, 0.00) AS deudas_totales,
    ROUND((COALESCE(hb.monto_adeudado, 0.00) / NULLIF(u.ingreso_mensual, 0)) * 100, 2) AS ratio_dti_porcentaje,
    ROUND(((u.ingreso_mensual - COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'EGRESO' THEN t.monto ELSE 0 END), 0)) / NULLIF(u.ingreso_mensual, 0)) * 100, 2) AS tasa_ahorro_porcentaje,
    CASE 
        WHEN (COALESCE(hb.monto_adeudado, 0.00) / NULLIF(u.ingreso_mensual, 0)) > 0.50 
             OR (u.ingreso_mensual - COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'EGRESO' THEN t.monto ELSE 0 END), 0)) < 0 
        THEN 'En riesgo'
        WHEN (COALESCE(hb.monto_adeudado, 0.00) / NULLIF(u.ingreso_mensual, 0)) BETWEEN 0.30 AND 0.50 
        THEN 'En observacion'
        ELSE 'Saludable'
    END AS perfil_preliminar
FROM usuarios u
LEFT JOIN cuentas_usuarios cu ON u.id_usuario = cu.id_usuario
LEFT JOIN tarjetas tr ON cu.id_cuenta = tr.id_cuenta
LEFT JOIN transacciones t ON tr.id_tarjeta = t.id_tarjeta
LEFT JOIN (
    SELECT h1.id_usuario, h1.monto_adeudado
    FROM historial_buro h1
    INNER JOIN (
        SELECT id_usuario, MAX(fecha_consulta) AS max_fecha
        FROM historial_buro
        GROUP BY id_usuario
    ) h2 ON h1.id_usuario = h2.id_usuario AND h1.fecha_consulta = h2.max_fecha
) hb ON u.id_usuario = hb.id_usuario
GROUP BY u.id_usuario, u.nombre, u.apellido, u.ingreso_mensual, hb.monto_adeudado;

-- VIEW 2: Gastos por categoría
CREATE OR REPLACE VIEW vw_gastos_por_categoria AS
SELECT 
    cu.id_usuario,
    cat.nombre_categoria,
    COUNT(t.id_transaccion) AS cantidad_transacciones,
    SUM(t.monto) AS total_gastado,
    ROUND(
        (SUM(t.monto) / NULLIF((
            SELECT SUM(t2.monto) 
            FROM transacciones t2 
            JOIN tarjetas tr2 ON t2.id_tarjeta = tr2.id_tarjeta
            JOIN cuentas_usuarios cu2 ON tr2.id_cuenta = cu2.id_cuenta
            WHERE cu2.id_usuario = cu.id_usuario AND t2.tipo_movimiento = 'EGRESO'
        ), 0)) * 100, 2
    ) AS porcentaje_del_total_egresos
FROM transacciones t
JOIN tarjetas tr ON t.id_tarjeta = tr.id_tarjeta
JOIN cuentas_usuarios cu ON tr.id_cuenta = cu.id_cuenta
JOIN categorias cat ON t.id_categoria = cat.id_categoria
WHERE t.tipo_movimiento = 'EGRESO'
GROUP BY cu.id_usuario, cat.nombre_categoria;

-- VIEW 3: Gastos recurrentes / suscripciones
CREATE OR REPLACE VIEW vw_gastos_recurrentes_suscripciones AS
SELECT 
    cu.id_usuario,
    t.concepto,
    cat.nombre_categoria,
    t.monto,
    COUNT(*) AS frecuencia_mensual,
    MAX(t.fecha_hora) AS ultima_transaccion
FROM transacciones t
JOIN tarjetas tr ON t.id_tarjeta = tr.id_tarjeta
JOIN cuentas_usuarios cu ON tr.id_cuenta = cu.id_cuenta
JOIN categorias cat ON t.id_categoria = cat.id_categoria
WHERE t.tipo_movimiento = 'EGRESO'
  AND (
      cat.slug IN ('ocio', 'servicios', 'streaming') 
      OR LOWER(t.concepto) LIKE '%netflix%'
      OR LOWER(t.concepto) LIKE '%prime%'
      OR LOWER(t.concepto) LIKE '%hbo%'
      OR LOWER(t.concepto) LIKE '%spotify%'
  )
GROUP BY cu.id_usuario, t.concepto, cat.nombre_categoria, t.monto
HAVING COUNT(*) >= 1;

-- VIEW 4: Alertas financieras
CREATE OR REPLACE VIEW vw_alertas_financieras AS
SELECT 
    v.id_usuario,
    v.nombre,
    v.apellido,
    v.ratio_dti_porcentaje,
    v.tasa_ahorro_porcentaje,
    v.perfil_preliminar,
    CASE 
        WHEN v.ratio_dti_porcentaje > 50 THEN 'Alto endeudamiento: DTI supera el 50% de los ingresos.'
        WHEN v.tasa_ahorro_porcentaje < 0 THEN 'Deficit presupuestal: Los gastos superan los ingresos mensuales.'
        ELSE 'Atencion: Nivel de endeudamiento en zona de precaucion.'
    END AS motivo_alerta
FROM vw_resumen_cliente_ratios v
WHERE v.perfil_preliminar IN ('En riesgo', 'En observacion');

/* ============================================================================
TRIGGERS
============================================================================ */

DELIMITER //

CREATE TRIGGER tg_validar_monto_transaccion
BEFORE INSERT ON transacciones
FOR EACH ROW
BEGIN
    IF NEW.monto <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El monto de la transacción debe ser mayor a cero.';
    END IF;
END //

DELIMITER ;


-- ============================================================================
-- DATASET DE PRUEBA / SEED DATA PARA TESTING DE BACKEND Y FRONTEND
-- Base de datos: perfil_financiero
-- ============================================================================

USE perfil_financiero;

-- 1. USUARIOS DE PRUEBA
INSERT INTO usuarios (id_usuario, nombre, apellido, fecha_nacimiento, genero, id_ciudad, ingreso_mensual, email) VALUES
('u1000000-0000-0000-0000-000000000001', 'Carlos', 'Mendoza', '1992-05-14', 'M', 'c1000000-0000-0000-0000-000000000001', 25000.00, 'carlos.mendoza_1@mail.com'),
('u1000000-0000-0000-0000-000000000002', 'Ana', 'Garcia', '1995-11-20', 'F', 'c1000000-0000-0000-0000-000000000002', 18500.00, 'ana.garcia_2@mail.com'),
('u1000000-0000-0000-0000-000000000003', 'Luis', 'Hernandez', '1988-03-08', 'M', 'c1000000-0000-0000-0000-000000000004', 32000.00, 'luis.hernandez_3@mail.com')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 2. SEGURIDAD DE USUARIOS (Hash genérico de prueba)
INSERT INTO usuarios_seguridad (id_usuario, password_hash) VALUES
('u1000000-0000-0000-0000-000000000001', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123'),
('u1000000-0000-0000-0000-000000000002', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123'),
('u1000000-0000-0000-0000-000000000003', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- 3. CATEGORIAS DE PRUEBA
INSERT INTO categorias (id_categoria, slug, nombre_categoria, tipo_categoria, descripcion) VALUES
(1, 'nomina_ingresos', 'Nomina / Ingresos', 'INGRESO', 'Ingresos por salarios o honorarios'),
(2, 'supermercado', 'Supermercado', 'EGRESO', 'Compras de viveres y hogar'),
(3, 'restaurantes', 'Restaurantes', 'EGRESO', 'Comidas fuera de casa'),
(4, 'servicios', 'Servicios', 'EGRESO', 'Pago de luz, agua, internet'),
(5, 'streaming', 'Streaming / Ocio', 'EGRESO', 'Suscripciones digitales')
ON DUPLICATE KEY UPDATE nombre_categoria = VALUES(nombre_categoria);

-- 4. CUENTAS BANCARIAS
INSERT INTO cuentas_bancarias (id_cuenta, numero_cuenta, fecha_apertura) VALUES
('b1000000-0000-0000-0000-000000000001', '123456789012', '2024-01-15'),
('b1000000-0000-0000-0000-000000000002', '987654321098', '2024-02-10'),
('b1000000-0000-0000-0000-000000000003', '456789012345', '2024-03-01')
ON DUPLICATE KEY UPDATE numero_cuenta = VALUES(numero_cuenta);

-- 5. RELACION CUENTAS - USUARIOS
INSERT INTO cuentas_usuarios (id_cuenta, id_usuario, rol_usuario) VALUES
('b1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', 'TITULAR_PRINCIPAL'),
('b1000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000002', 'TITULAR_PRINCIPAL'),
('b1000000-0000-0000-0000-000000000003', 'u1000000-0000-0000-0000-000000000003', 'TITULAR_PRINCIPAL')
ON DUPLICATE KEY UPDATE rol_usuario = VALUES(rol_usuario);

-- 6. TARJETAS
INSERT INTO tarjetas (id_tarjeta, id_cuenta, numero_tarjeta, tipo_tarjeta, red_pago, fecha_vencimiento) VALUES
('t1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '4152310011223344', 'DEBITO', 'VISA', '2029-12-31'),
('t1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '4152980099887766', 'DEBITO', 'VISA', '2029-12-31'),
('t1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', '4152450044556677', 'DEBITO', 'VISA', '2029-12-31')
ON DUPLICATE KEY UPDATE numero_tarjeta = VALUES(numero_tarjeta);

-- 7. HISTORIAL BURO DE CREDITO
INSERT INTO historial_buro (id_buro, id_usuario, score_crediticio, dias_atraso, monto_adeudado) VALUES
('h1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', 720, 0, 3500.00),
('h1000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000002', 610, 15, 12000.00),
('h1000000-0000-0000-0000-000000000003', 'u1000000-0000-0000-0000-000000000003', 780, 0, 1500.00)
ON DUPLICATE KEY UPDATE score_crediticio = VALUES(score_crediticio);

-- 8. TRANSACCIONES DE PRUEBA
INSERT INTO transacciones (id_transaccion, id_tarjeta, id_categoria, fecha_hora, concepto, comercio, monto, tipo_movimiento, medio_operacion) VALUES
('tx100000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001', 1, '2026-07-01 09:00:00', 'Pago de Nomina Quincenal', 'Empresa Tech MX', 12500.00, 'INGRESO', 'TRANSFERENCIA'),
('tx100000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000001', 2, '2026-07-02 15:30:00', 'Compra de despensa', 'Supermercado Walmart', 1450.50, 'EGRESO', 'POS'),
('tx100000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000001', 5, '2026-07-05 20:00:00', 'Suscripcion Netflix Mensual', 'Netflix Digital', 219.00, 'EGRESO', 'APP_MOVIL'),
('tx100000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000002', 1, '2026-07-01 09:00:00', 'Pago de Honorarios', 'Cliente Consultoria', 9250.00, 'INGRESO', 'TRANSFERENCIA'),
('tx100000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000002', 3, '2026-07-03 14:10:00', 'Consumo de restaurante', 'Taqueria El Pastor', 480.00, 'EGRESO', 'POS')
ON DUPLICATE KEY UPDATE monto = VALUES(monto);

USE perfil_financiero;

-- 1. CARGA DE USUARIOS
INSERT INTO usuarios (id_usuario, nombre, apellido, fecha_nacimiento, genero, id_ciudad, ingreso_mensual, email) VALUES
('u2000000-0000-0000-0000-000000000001', 'Rodrigo', 'Navarro', '1997-04-10', 'M', 'c1000000-0000-0000-0000-000000000001', 28000.0, 'rodrigo.navarro2026@testmail.com'),
('u2000000-0000-0000-0000-000000000002', 'Mariana', 'Gomez', '1994-04-10', 'F', 'c1000000-0000-0000-0000-000000000002', 35000.0, 'mariana.gomez2026@testmail.com'),
('u2000000-0000-0000-0000-000000000003', 'Gonzalo', 'Perez', '1986-04-10', 'M', 'c1000000-0000-0000-0000-000000000003', 50000.0, 'gonzalo.perez2026@testmail.com'),
('u2000000-0000-0000-0000-000000000004', 'Elena', 'Soto', '2000-04-10', 'F', 'c1000000-0000-0000-0000-000000000004', 19000.0, 'elena.soto2026@testmail.com'),
('u2000000-0000-0000-0000-000000000005', 'Ximena', 'Ibarra', '1991-04-10', 'F', 'c1000000-0000-0000-0000-000000000005', 42000.0, 'ximena.ibarra2026@testmail.com');

-- 2. CARGA DE SEGURIDAD
INSERT INTO usuarios_seguridad (id_usuario, password_hash) VALUES
('u2000000-0000-0000-0000-000000000001', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123'),
('u2000000-0000-0000-0000-000000000002', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123'),
('u2000000-0000-0000-0000-000000000003', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123'),
('u2000000-0000-0000-0000-000000000004', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123'),
('u2000000-0000-0000-0000-000000000005', '$2b$12$eImiTXuWVxfM37uY4JANjO5E.12345678901234567890123');

-- 3. CARGA DE CUENTAS BANCARIAS Y VÍNCULOS
INSERT INTO cuentas_bancarias (id_cuenta, numero_cuenta, fecha_apertura) VALUES
('b2000000-0000-0000-0000-000000000001', '880000000001', '2026-01-01'),
('b2000000-0000-0000-0000-000000000002', '880000000002', '2026-01-01'),
('b2000000-0000-0000-0000-000000000003', '880000000003', '2026-01-01'),
('b2000000-0000-0000-0000-000000000004', '880000000004', '2026-01-01'),
('b2000000-0000-0000-0000-000000000005', '880000000005', '2026-01-01');

INSERT INTO cuentas_usuarios (id_cuenta, id_usuario, rol_usuario) VALUES
('b2000000-0000-0000-0000-000000000001', 'u2000000-0000-0000-0000-000000000001', 'TITULAR_PRINCIPAL'),
('b2000000-0000-0000-0000-000000000002', 'u2000000-0000-0000-0000-000000000002', 'TITULAR_PRINCIPAL'),
('b2000000-0000-0000-0000-000000000003', 'u2000000-0000-0000-0000-000000000003', 'TITULAR_PRINCIPAL'),
('b2000000-0000-0000-0000-000000000004', 'u2000000-0000-0000-0000-000000000004', 'TITULAR_PRINCIPAL'),
('b2000000-0000-0000-0000-000000000005', 'u2000000-0000-0000-0000-000000000005', 'TITULAR_PRINCIPAL');

-- 4. CARGA DE TARJETAS
INSERT INTO tarjetas (id_tarjeta, id_cuenta, numero_tarjeta, tipo_tarjeta, red_pago, fecha_vencimiento) VALUES
('t2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '4152880000000001', 'DEBITO', 'VISA', '2030-12-31'),
('t2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', '4152880000000002', 'DEBITO', 'VISA', '2030-12-31'),
('t2000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', '4152880000000003', 'DEBITO', 'VISA', '2030-12-31'),
('t2000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000004', '4152880000000004', 'DEBITO', 'VISA', '2030-12-31'),
('t2000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000005', '4152880000000005', 'DEBITO', 'VISA', '2030-12-31');

-- 5. CARGA DE BURÓ DE CRÉDITO
INSERT INTO historial_buro (id_buro, id_usuario, score_crediticio, dias_atraso, monto_adeudado) VALUES
('h2000000-0000-0000-0000-000000000001', 'u2000000-0000-0000-0000-000000000001', 680, 0, 2496.72),
('h2000000-0000-0000-0000-000000000002', 'u2000000-0000-0000-0000-000000000002', 700, 0, 4802.86),
('h2000000-0000-0000-0000-000000000003', 'u2000000-0000-0000-0000-000000000003', 720, 5, 3927.98),
('h2000000-0000-0000-0000-000000000004', 'u2000000-0000-0000-0000-000000000004', 740, 0, 3394.63),
('h2000000-0000-0000-0000-000000000005', 'u2000000-0000-0000-0000-000000000005', 760, 0, 1624.07);

-- 6. CARGA DE TRANSACCIONES
INSERT INTO transacciones (id_transaccion, id_tarjeta, id_categoria, fecha_hora, concepto, comercio, monto, tipo_movimiento, medio_operacion) VALUES
('tx200000-0000-0000-0000-000000000001', 't2000000-0000-0000-0000-000000000003', 2, '2026-07-01 10:30:00', 'Pago en Walmart', 'Walmart', 2140.23, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000002', 't2000000-0000-0000-0000-000000000005', 1, '2026-07-02 10:30:00', 'Deposito de Nomina / Ingresos', 'Empresa Tech Corp', 21000.0, 'INGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000003', 't2000000-0000-0000-0000-000000000003', 2, '2026-07-03 10:30:00', 'Pago en Chedraui', 'Chedraui', 1845.18, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000004', 't2000000-0000-0000-0000-000000000003', 1, '2026-07-04 10:30:00', 'Deposito de Nomina / Ingresos', 'Consultora Global', 25000.0, 'INGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000005', 't2000000-0000-0000-0000-000000000003', 5, '2026-07-05 10:30:00', 'Pago en Netflix', 'Netflix', 123.13, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000006', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-06 10:30:00', 'Pago en Uber Eats', 'Uber Eats', 807.13, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000007', 't2000000-0000-0000-0000-000000000003', 4, '2026-07-07 10:30:00', 'Pago en Telmex', 'Telmex', 320.17, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000008', 't2000000-0000-0000-0000-000000000005', 4, '2026-07-08 10:30:00', 'Pago en Telmex', 'Telmex', 438.35, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000009', 't2000000-0000-0000-0000-000000000004', 4, '2026-07-09 10:30:00', 'Pago en Izzi', 'Izzi', 993.8, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000010', 't2000000-0000-0000-0000-000000000003', 2, '2026-07-10 10:30:00', 'Pago en Chedraui', 'Chedraui', 1833.02, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000011', 't2000000-0000-0000-0000-000000000005', 3, '2026-07-11 10:30:00', 'Pago en Taqueria El Jarocho', 'Taqueria El Jarocho', 506.77, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000012', 't2000000-0000-0000-0000-000000000003', 3, '2026-07-12 10:30:00', 'Pago en Uber Eats', 'Uber Eats', 338.2, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000013', 't2000000-0000-0000-0000-000000000005', 2, '2026-07-13 10:30:00', 'Pago en Soriana', 'Soriana', 1391.73, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000014', 't2000000-0000-0000-0000-000000000004', 3, '2026-07-14 10:30:00', 'Pago en Restaurante Italia', 'Restaurante Italia', 695.53, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000015', 't2000000-0000-0000-0000-000000000005', 5, '2026-07-15 10:30:00', 'Pago en Netflix', 'Netflix', 188.42, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000016', 't2000000-0000-0000-0000-000000000003', 4, '2026-07-16 10:30:00', 'Pago en Izzi', 'Izzi', 464.3, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000017', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-17 10:30:00', 'Pago en Starbucks', 'Starbucks', 211.83, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000018', 't2000000-0000-0000-0000-000000000004', 2, '2026-07-18 10:30:00', 'Pago en Costco', 'Costco', 811.23, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000019', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-19 10:30:00', 'Pago en Taqueria El Jarocho', 'Taqueria El Jarocho', 386.72, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000020', 't2000000-0000-0000-0000-000000000004', 4, '2026-07-20 10:30:00', 'Pago en Telmex', 'Telmex', 433.99, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000021', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-21 10:30:00', 'Pago en Starbucks', 'Starbucks', 221.78, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000022', 't2000000-0000-0000-0000-000000000004', 2, '2026-07-22 10:30:00', 'Pago en Costco', 'Costco', 2110.19, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000023', 't2000000-0000-0000-0000-000000000003', 1, '2026-07-23 10:30:00', 'Deposito de Nomina / Ingresos', 'Empresa Tech Corp', 25000.0, 'INGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000024', 't2000000-0000-0000-0000-000000000003', 5, '2026-07-24 10:30:00', 'Pago en Amazon Prime', 'Amazon Prime', 391.81, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000025', 't2000000-0000-0000-0000-000000000003', 3, '2026-07-25 10:30:00', 'Pago en Starbucks', 'Starbucks', 648.8, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000026', 't2000000-0000-0000-0000-000000000005', 5, '2026-07-26 10:30:00', 'Pago en Amazon Prime', 'Amazon Prime', 101.42, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000027', 't2000000-0000-0000-0000-000000000004', 2, '2026-07-27 10:30:00', 'Pago en Soriana', 'Soriana', 2108.68, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000028', 't2000000-0000-0000-0000-000000000002', 2, '2026-07-28 10:30:00', 'Pago en Costco', 'Costco', 1327.42, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000029', 't2000000-0000-0000-0000-000000000003', 4, '2026-07-01 10:30:00', 'Pago en Telmex', 'Telmex', 1032.55, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000030', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-02 10:30:00', 'Pago en Taqueria El Jarocho', 'Taqueria El Jarocho', 246.3, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000031', 't2000000-0000-0000-0000-000000000004', 3, '2026-07-03 10:30:00', 'Pago en Taqueria El Jarocho', 'Taqueria El Jarocho', 811.23, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000032', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-04 10:30:00', 'Pago en Restaurante Italia', 'Restaurante Italia', 698.86, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000033', 't2000000-0000-0000-0000-000000000003', 5, '2026-07-05 10:30:00', 'Pago en Amazon Prime', 'Amazon Prime', 171.74, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000034', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-06 10:30:00', 'Pago en Uber Eats', 'Uber Eats', 811.39, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000035', 't2000000-0000-0000-0000-000000000002', 3, '2026-07-07 10:30:00', 'Pago en Taqueria El Jarocho', 'Taqueria El Jarocho', 363.36, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000036', 't2000000-0000-0000-0000-000000000002', 4, '2026-07-08 10:30:00', 'Pago en Naturgy', 'Naturgy', 497.16, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000037', 't2000000-0000-0000-0000-000000000004', 3, '2026-07-09 10:30:00', 'Pago en Uber Eats', 'Uber Eats', 512.98, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000038', 't2000000-0000-0000-0000-000000000004', 1, '2026-07-10 10:30:00', 'Deposito de Nomina / Ingresos', 'Nomina Quincenal SD', 9500.0, 'INGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000039', 't2000000-0000-0000-0000-000000000005', 2, '2026-07-11 10:30:00', 'Pago en Walmart', 'Walmart', 2110.13, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000040', 't2000000-0000-0000-0000-000000000003', 2, '2026-07-12 10:30:00', 'Pago en Chedraui', 'Chedraui', 1673.86, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000041', 't2000000-0000-0000-0000-000000000003', 5, '2026-07-13 10:30:00', 'Pago en Spotify', 'Spotify', 354.02, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000042', 't2000000-0000-0000-0000-000000000001', 1, '2026-07-14 10:30:00', 'Deposito de Nomina / Ingresos', 'Nomina Quincenal SD', 14000.0, 'INGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000043', 't2000000-0000-0000-0000-000000000003', 4, '2026-07-15 10:30:00', 'Pago en Izzi', 'Izzi', 1419.66, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000044', 't2000000-0000-0000-0000-000000000003', 4, '2026-07-16 10:30:00', 'Pago en CFE', 'CFE', 1391.24, 'EGRESO', 'TRANSFERENCIA'),
('tx200000-0000-0000-0000-000000000045', 't2000000-0000-0000-0000-000000000003', 3, '2026-07-17 10:30:00', 'Pago en Taqueria El Jarocho', 'Taqueria El Jarocho', 831.06, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000046', 't2000000-0000-0000-0000-000000000004', 2, '2026-07-18 10:30:00', 'Pago en Costco', 'Costco', 1605.9, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000047', 't2000000-0000-0000-0000-000000000002', 4, '2026-07-19 10:30:00', 'Pago en Izzi', 'Izzi', 463.02, 'EGRESO', 'POS'),
('tx200000-0000-0000-0000-000000000048', 't2000000-0000-0000-0000-000000000005', 4, '2026-07-20 10:30:00', 'Pago en Izzi', 'Izzi', 1475.29, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000049', 't2000000-0000-0000-0000-000000000003', 2, '2026-07-21 10:30:00', 'Pago enSoriana', 'Soriana', 2289.47, 'EGRESO', 'APP_MOVIL'),
('tx200000-0000-0000-0000-000000000050', 't2000000-0000-0000-0000-000000000003', 2, '2026-07-22 10:30:00', 'Pago en Walmart', 'Walmart', 2568.12, 'EGRESO', 'TRANSFERENCIA');
