/* ============================================================================
BASE DE DATOS: PERFIL FINANCIERO CON IA
Motor: MySQL 8.0 / PostgreSQL Compliant (Sintaxis ANSI SQL)
Objetivo:
  * Sistema bancario enfocado en analizar el comportamiento financiero de 
    los usuarios mediante Data Science e IA.
Principios aplicados:
  - Normalización hasta 3FN
  - Evitar almacenar datos calculables
  - Separación de responsabilidades por entidad
  - Estándar estricto de nomenclatura: snake_case (tablas, columnas, PKs, FKs, UQs, CHKs)
============================================================================ */


USE perfil_financiero;

/* ============================================================================
TABLA 1: ciudades
----------------------------------------------------------------------------
DESCRIPCIÓN: Catálogo de ciudades donde están registrados los usuarios.

INT-002: Normalización en snake_case de tabla y restricciones.
FRONTEND:
  ✔ Utiliza únicamente el nombre de la ciudad actualmente.
  □ Pendiente implementar selección/despliegue de estado y país.
DATA SCIENCE:
  ✔ Permite análisis demográficos regionales.
============================================================================ */
CREATE TABLE ciudades (
    id_ciudad VARCHAR(36) NOT NULL,
    nombre_ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    pais VARCHAR(50) NOT NULL DEFAULT 'México',

    CONSTRAINT pk_ciudades PRIMARY KEY (id_ciudad),
    CONSTRAINT uq_ciudades_nombre_estado UNIQUE (nombre_ciudad, estado)
);

/* ============================================================================
TABLA 2: usuarios
----------------------------------------------------------------------------
DESCRIPCIÓN: Guarda la información personal y preferencia del cliente.
Importante: No se almacena la edad directamente (se calcula de fecha_nacimiento).

INT-003: Integración de campos para auditoría de sesión (ultima_sesion).
FRONTEND:
  ✔ Captura: nombre, apellido, email, telefono, fecha_nacimiento, id_ciudad,
    moneda_principal, idioma.
BACKEND:
  ✔ Soporta autenticación, perfil, presupuestos, metas y movimientos.
  □ Pendiente Backend: Actualizar `ultima_sesion` al autenticar exitosamente.
DATA SCIENCE:
  ✔ Entidad central para vincular variables socioeconómicas y comportamiento.
============================================================================ */
CREATE TABLE usuarios (
    id_usuario VARCHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero CHAR(1),
    id_ciudad VARCHAR(36),
    ingreso_mensual DECIMAL(12,2) NOT NULL,
    telefono VARCHAR(15),
    email VARCHAR(150) NOT NULL,
    moneda_principal CHAR(3) NOT NULL DEFAULT 'MXN',   -- ISO-4217
    idioma CHAR(2) NOT NULL DEFAULT 'es',              -- es | pt | en
    estado_usuario ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultima_sesion TIMESTAMP NULL COMMENT 'Último acceso del usuario al sistema',

    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT fk_usuarios_ciudades FOREIGN KEY (id_ciudad) REFERENCES ciudades (id_ciudad),
    CONSTRAINT chk_usuarios_genero CHECK (genero IN ('M', 'F') OR genero IS NULL),
    CONSTRAINT chk_usuarios_ingreso CHECK (ingreso_mensual >= 0)
);

/* ============================================================================
TABLA 3: usuarios_seguridad
----------------------------------------------------------------------------
DESCRIPCIÓN: Credenciales y secretos de 2FA. Se aisla de `usuarios` por
principios de seguridad (cifrado en reposo, permisos de lectura mínimos). Relación 1:1.

INT-004: Agregados campos de auditoría de contraseñas e intentos fallidos.
BACKEND:
  ✔ Obligatorio 2FA: `totp_activo` = TRUE al confirmar registro.
  □ Pendiente Backend: Incrementar `intentos_fallidos` y bloquear cuenta tras N fallos.
  □ Pendiente Backend: Forzar cambio de contraseña si `requiere_cambio_password` = TRUE.
============================================================================ */
CREATE TABLE usuarios_seguridad (
    id_usuario VARCHAR(36) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,               -- bcrypt / argon2
    totp_secret VARCHAR(64) NULL,                       -- Base32 cifrado
    totp_activo BOOLEAN NOT NULL DEFAULT FALSE,
    totp_activado_en TIMESTAMP NULL,
    totp_ultimo_paso BIGINT NULL,                       -- Anti-replay TOTP
    fecha_cambio_password TIMESTAMP NULL,
    requiere_cambio_password BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    ultimo_intento_fallido TIMESTAMP NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios_seguridad PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuarios_seguridad_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

/* ============================================================================
TABLA 4: codigos_respaldo_2fa
----------------------------------------------------------------------------
DESCRIPCIÓN: Códigos de respaldo de un solo uso, almacenados hasheados.

INT-005: Estructura de códigos unifilar con indexación por usuario.
FRONTEND:
  □ Mostrar los códigos en texto plano ÚNICAMENTE al momento de generarlos.
BACKEND:
  □ Marcar `usado` = TRUE y actualizar `fecha_uso` al ser consumido.
============================================================================ */
CREATE TABLE codigos_respaldo_2fa (
    id_codigo VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL COMMENT 'Hash del código de respaldo',
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_uso TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_codigos_respaldo_2fa PRIMARY KEY (id_codigo),
    CONSTRAINT fk_codigos_respaldo_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_codigos_respaldo_usuario ON codigos_respaldo_2fa (id_usuario);

/* ============================================================================
TABLA 5: refresh_tokens
----------------------------------------------------------------------------
DESCRIPCIÓN: Almacena Refresh Tokens rotativos (JWTs accesibles son stateless).

INT-006: Inclusión de campo auditor `ultimo_uso` y rastreo de familias de tokens.
BACKEND:
  □ Guardar únicamente el hash del token.
  □ Revocar toda la `familia` si se detecta reutilización (reuso malicioso).
  □ Implementar Job de limpieza para tokens expirados.
FRONTEND:
  ✔ Envío del token en encabezados / cookies HTTP-Only.
============================================================================ */
CREATE TABLE refresh_tokens (
    id_token VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL COMMENT 'Hash del Refresh Token',
    familia VARCHAR(36) NOT NULL COMMENT 'Identificador de la familia de tokens',
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    expira_en TIMESTAMP NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso TIMESTAMP NULL,

    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id_token),
    CONSTRAINT fk_refresh_tokens_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (id_usuario);
CREATE INDEX idx_refresh_tokens_familia ON refresh_tokens (familia);

/* ============================================================================
TABLA 6: cuentas_bancarias
----------------------------------------------------------------------------
DESCRIPCIÓN: Representa el contrato bancario formal del cliente.
No almacena saldo actual, tipo de cuenta ni deuda (datos dinámicos/calculados).

INT-007: Se añade `fecha_actualizacion` para trazabilidad de estados.
FRONTEND:
  □ Pendiente verificar que el Backend responda el `estado_cuenta` al Dashboard.
DATA SCIENCE:
  ✔ Permite analizar el ciclo de vida y antigüedad contractual de cuentas.
============================================================================ */
CREATE TABLE cuentas_bancarias (
    id_cuenta VARCHAR(36) NOT NULL,
    numero_cuenta VARCHAR(50) NOT NULL,
    estado_cuenta ENUM('ACTIVA', 'BLOQUEADA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',
    fecha_apertura DATE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_cuentas_bancarias PRIMARY KEY (id_cuenta),
    CONSTRAINT uq_cuentas_bancarias_numero UNIQUE (numero_cuenta)
);

/* ============================================================================
TABLA 7: cuentas_usuarios
----------------------------------------------------------------------------
DESCRIPCIÓN: Tabla pivote N:M entre usuarios y cuentas bancarias.

INT-008: Inclusión de `fecha_desvinculacion` para trazabilidad histórica.
FRONTEND:
  □ Verificar que el módulo de cuentas muestre el `rol_usuario` correctamente.
BUSINESS LOGIC:
  ✔ Permite historial sin perder integridad cuando un cotitular se retira.
============================================================================ */
CREATE TABLE cuentas_usuarios (
    id_cuenta VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    rol_usuario ENUM('TITULAR_PRINCIPAL', 'COTITULAR', 'AUTORIZADO') NOT NULL DEFAULT 'TITULAR_PRINCIPAL',
    fecha_vinculacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_desvinculacion TIMESTAMP NULL,

    CONSTRAINT pk_cuentas_usuarios PRIMARY KEY (id_cuenta, id_usuario),
    CONSTRAINT fk_cuentas_usuarios_cuenta FOREIGN KEY (id_cuenta) REFERENCES cuentas_bancarias (id_cuenta) ON DELETE CASCADE,
    CONSTRAINT fk_cuentas_usuarios_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

/* ============================================================================
TABLA 8: tarjetas
----------------------------------------------------------------------------
DESCRIPCIÓN: Entidad base para tarjetas físicas/virtuales asociadas a una cuenta.

INT-009: Estandarización de `numero_tarjeta` a VARCHAR(16) y restricciones de integridad.
============================================================================ */
CREATE TABLE tarjetas (
    id_tarjeta VARCHAR(36) NOT NULL,
    id_cuenta VARCHAR(36) NOT NULL,
    numero_tarjeta VARCHAR(16) NOT NULL,
    tipo_tarjeta ENUM('DEBITO', 'CREDITO') NOT NULL,
    red_pago ENUM('VISA', 'MASTERCARD', 'AMEX') NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado_tarjeta ENUM('ACTIVA', 'BLOQUEADA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_tarjetas PRIMARY KEY (id_tarjeta),
    CONSTRAINT uq_tarjetas_numero UNIQUE (numero_tarjeta),
    CONSTRAINT fk_tarjetas_cuentas FOREIGN KEY (id_cuenta) REFERENCES cuentas_bancarias (id_cuenta) ON DELETE CASCADE
);

/* ============================================================================
TABLA 9: tarjetas_credito
----------------------------------------------------------------------------
DESCRIPCIÓN: Extensión 1:1 exclusiva para tarjetas de crédito.

INT-010: Normalización de llaves secundarias e imposición de rangos válidos.
============================================================================ */
CREATE TABLE tarjetas_credito (
    id_tarjeta VARCHAR(36) NOT NULL,
    limite_credito DECIMAL(12,2) NOT NULL,
    dia_corte TINYINT NOT NULL,
    dia_pago TINYINT NOT NULL,

    CONSTRAINT pk_tarjetas_credito PRIMARY KEY (id_tarjeta),
    CONSTRAINT fk_tarjetas_credito_tarjeta FOREIGN KEY (id_tarjeta) REFERENCES tarjetas (id_tarjeta) ON DELETE CASCADE,
    CONSTRAINT chk_tarjetas_credito_limite CHECK (limite_credito >= 0),
    CONSTRAINT chk_tarjetas_credito_corte CHECK (dia_corte BETWEEN 1 AND 31),
    CONSTRAINT chk_tarjetas_credito_pago CHECK (dia_pago BETWEEN 1 AND 31)
);

/* ============================================================================
TABLA 10: categorias
----------------------------------------------------------------------------
DESCRIPCIÓN: Catálogo parametrizado de categorías transaccionales.

INT-011: Unificación de restricción de slugs canónicos y tipo de movimiento.
DATA SCIENCE / IA:
  ✔ Permite clasificación mediante TF-IDF + Logistic Regression.
  ✔ `MOVIMIENTO` = Ahorro/Inversión (salida que no penaliza como gasto).
============================================================================ */
CREATE TABLE categorias (
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

/* ============================================================================
TABLA 11: tasas_cambio
----------------------------------------------------------------------------
DESCRIPCIÓN: Cache de tasas multi-moneda normalizadas a la base (USD).

INT-012: Soporte para conversiones financieras históricas cross-currency.
============================================================================ */
CREATE TABLE tasas_cambio (
    moneda CHAR(3) NOT NULL,                         -- ISO-4217
    tasa_a_base DECIMAL(18,8) NOT NULL,               -- Unidades por 1 USD
    fecha DATE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_tasas_cambio PRIMARY KEY (moneda, fecha)
);

/* ============================================================================
TABLA 12: transacciones
----------------------------------------------------------------------------
DESCRIPCIÓN: Registro de movimientos financieros individuales.

INT-013: Relaciones hacia tarjetas y categorías, incorporando atributos de ML.
DATA SCIENCE / IA:
  ✔ `confianza`: Probabilidad del modelo al clasificar (0.0000 a 1.0000).
  ✔ `categoria_origen`: Identifica si fue asignada por 'modelo' o 'usuario'.
============================================================================ */
CREATE TABLE transacciones (
    id_transaccion VARCHAR(36) NOT NULL,
    id_tarjeta VARCHAR(36) NULL,
    id_categoria INT NULL,
    confianza DECIMAL(5,4) NULL,                      -- Rango [0, 1]
    categoria_origen ENUM('modelo', 'usuario') NOT NULL DEFAULT 'modelo',
    moneda CHAR(3) NULL,                              -- ISO-4217 si difiere de preferencia
    fecha_hora TIMESTAMP NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    comercio VARCHAR(100) NULL,
    monto DECIMAL(12,2) NOT NULL,
    tipo_movimiento ENUM('INGRESO', 'EGRESO') NOT NULL,
    medio_operacion ENUM('APP_MOVIL', 'PORTAL_WEB', 'CAJERO', 'SUCURSAL', 'POS') DEFAULT 'APP_MOVIL',
    estado_transaccion ENUM('COMPLETADA', 'PENDIENTE', 'CANCELADA') DEFAULT 'COMPLETADA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_transacciones PRIMARY KEY (id_transaccion),
    CONSTRAINT fk_transacciones_tarjetas FOREIGN KEY (id_tarjeta) REFERENCES tarjetas (id_tarjeta),
    CONSTRAINT fk_transacciones_categorias FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria),
    CONSTRAINT chk_transacciones_monto CHECK (monto > 0)
);

/* ============================================================================
TABLA 13: historial_buro
----------------------------------------------------------------------------
DESCRIPCIÓN: Registro histórico del comportamiento en buró de crédito.

INT-014: Normalización de contenciones numéricas y auditoría crediticia.
============================================================================ */
CREATE TABLE historial_buro (
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

/* ============================================================================
TABLA 14: planes_ahorro
----------------------------------------------------------------------------
DESCRIPCIÓN: Definición y seguimiento de metas de ahorro del cliente.

INT-015: Definición estandarizada para evaluación de desempeño del usuario.
============================================================================ */
CREATE TABLE planes_ahorro (
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

/* ============================================================================
TABLA 15: modelos_ia
----------------------------------------------------------------------------
DESCRIPCIÓN: Catálogo de modelos ML entrenados y desplegados.

INT-016: Habilitación de la tabla de catálogo para linaje de datos.
============================================================================ */
CREATE TABLE modelos_ia (
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

/* ============================================================================
TABLA 16: historial_analisis_financiero
----------------------------------------------------------------------------
DESCRIPCIÓN: Almacena las inferencias/diagnósticos producidos por la IA.

INT-017: Relación explícita con la tabla `modelos_ia` y payload JSON inmutable.
============================================================================ */
CREATE TABLE historial_analisis_financiero (
    id_analisis VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL,
    id_modelo VARCHAR(36) NULL,
    perfil_financiero ENUM('saludable', 'en_observacion', 'en_riesgo') NOT NULL,
    probabilidad DECIMAL(5,4) NULL,
    detalle JSON NULL COMMENT 'Foto inmutable de los 8 indicadores clave y recomendaciones',
    fecha_analisis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_historial_analisis PRIMARY KEY (id_analisis),
    CONSTRAINT fk_analisis_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_analisis_modelos FOREIGN KEY (id_modelo) REFERENCES modelos_ia (id_modelo)
);

/* ============================================================================
TABLA 17: resumen_mensual
----------------------------------------------------------------------------
DESCRIPCIÓN: Dataset consolidado para Data Science y Dashboards.
Alimentado por ETLs o tareas batch externas.

INT-018: Creación estandarizada de agregado mensual.
============================================================================ */
CREATE TABLE resumen_mensual (
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
VIEW 1.  Resumen de ratios
Calcula en tiempo real los ingresos acumulados, egresos, nivel de endeudamiento (DTI) 
y tasa de ahorro de cada cliente para determinar su perfil de riesgo predeterminado.
============================================================================ */
CREATE OR REPLACE VIEW vw_resumen_cliente_ratios AS
SELECT 
    c.id_cliente,
    c.nombre,
    c.apellido,
    c.ingreso_mensual,
    COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'Egreso' THEN t.monto ELSE 0 END), 0) AS total_egresos,
    COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'Ingreso' THEN t.monto ELSE 0 END), 0) AS total_ingresos_registrados,
    c.deudas_totales,
    -- Ratio Deuda-Ingreso (DTI) = Deudas Totales / Ingreso Mensual
    ROUND(
        (c.deudas_totales / NULLIF(c.ingreso_mensual, 0)) * 100, 2
    ) AS ratio_dti_porcentaje,
    -- Tasa de Ahorro = (Ingreso Mensual - Total Egresos) / Ingreso Mensual
    ROUND(
        ((c.ingreso_mensual - COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'Egreso' THEN t.monto ELSE 0 END), 0)) / NULLIF(c.ingreso_mensual, 0)) * 100, 2
    ) AS tasa_ahorro_porcentaje,
    -- Clasificación preliminar del perfil financiero
    CASE 
        WHEN (c.deudas_totales / NULLIF(c.ingreso_mensual, 0)) > 0.50 
             OR (c.ingreso_mensual - COALESCE(SUM(CASE WHEN t.tipo_movimiento = 'Egreso' THEN t.monto ELSE 0 END), 0)) < 0 
        THEN 'En riesgo'
        WHEN (c.deudas_totales / NULLIF(c.ingreso_mensual, 0)) BETWEEN 0.30 AND 0.50 
        THEN 'En observación'
        ELSE 'Saludable'
    END AS perfil_preliminar
FROM clientes c
LEFT JOIN transacciones t ON c.id_cliente = t.id_cliente
GROUP BY c.id_cliente, c.nombre, c.apellido, c.ingreso_mensual, c.deudas_totales;

/* ============================================================================
VIEW 2.  Gatos por categoria
Agrupa los gastos por categoría para alimentar el gráfico de dona/pastel del dashboard financiero.
============================================================================ */

CREATE OR REPLACE VIEW vw_gastos_por_categoria AS
SELECT 
    t.id_cliente,
    cat.nombre_categoria,
    COUNT(t.id_transaccion) AS cantidad_transacciones,
    SUM(t.monto) AS total_gastado,
    ROUND(
        (SUM(t.monto) / NULLIF((
            SELECT SUM(t2.monto) 
            FROM transacciones t2 
            WHERE t2.id_cliente = t.id_cliente AND t2.tipo_movimiento = 'Egreso'
        ), 0)) * 100, 2
    ) AS porcentaje_del_total_egresos
FROM transacciones t
JOIN categorias cat ON t.id_categoria = cat.id_categoria
WHERE t.tipo_movimiento = 'Egreso'
GROUP BY t.id_cliente, cat.nombre_categoria;

/* ============================================================================
VIEW 3.  Gastor recurrentes por suscripciones
Identifica posibles suscripciones fijas o gastos recurrentes
 (como Netflix, Spotify, servicios) para las recomendaciones de la IA
============================================================================ */

CREATE OR REPLACE VIEW vw_gastos_recurrentes_suscripciones AS
SELECT 
    t.id_cliente,
    t.descripcion,
    cat.nombre_categoria,
    t.monto,
    COUNT(*) AS frecuencia_mensual,
    MAX(t.fecha_hora) AS ultima_transaccion
FROM transacciones t
JOIN categorias cat ON t.id_categoria = cat.id_categoria
WHERE t.tipo_movimiento = 'Egreso'
  AND (
      cat.nombre_categoria IN ('Streaming', 'Servicios', 'Renta') 
      OR LOWER(t.descripcion) LIKE '%netflix%'
      OR LOWER(t.descripcion) LIKE '%prime%'
      OR LOWER(t.descripcion) LIKE '%hbo%'
      OR LOWER(t.descripcion) LIKE '%spotify%'
  )
GROUP BY t.id_cliente, t.descripcion, cat.nombre_categoria, t.monto
HAVING COUNT(*) >= 1;

/* ============================================================================
VIEW 4.  Alertas financieras.
Filtra únicamente los clientes que presentan indicadores de riesgo financiero para el sistema de alertas.
============================================================================ */

CREATE OR REPLACE VIEW vw_alertas_financieras AS
SELECT 
    v.id_cliente,
    v.nombre,
    v.apellido,
    v.ratio_dti_porcentaje,
    v.tasa_ahorro_porcentaje,
    v.perfil_preliminar,
    CASE 
        WHEN v.ratio_dti_porcentaje > 50 THEN 'Alto endeudamiento: DTI supera el 50% de los ingresos.'
        WHEN v.tasa_ahorro_porcentaje < 0 THEN 'Déficit presupuestal: Los gastos superan los ingresos mensuales.'
        ELSE 'Atención: Nivel de endeudamiento en zona de precaución.'
    END AS motivo_alerta
FROM vw_resumen_cliente_ratios v
WHERE v.perfil_preliminar IN ('En riesgo', 'En observación');

/* ============================================================================
Trigger 1:  Asegura que no se puedan insertar transacciones con montos iguales o inferiores a cero 
(validación de entrada a nivel de BD).
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

/* ============================================================================
 Trigger 2: Actualiza la deuda del cliente
Cuando se registra una transacción de gasto pagada con tarjeta de crédito o préstamos en estado "Adeudo"
actualiza automáticamente el saldo total de deudas acumuladas del cliente.
============================================================================ */

DELIMITER //

CREATE TRIGGER tg_actualizar_deuda_cliente
AFTER INSERT ON transacciones
FOR EACH ROW
BEGIN
    IF NEW.tipo_movimiento = 'Egreso' 
       AND NEW.metodo_pago = 'Tarjeta de crédito' 
       AND NEW.estatus_pago = 'Adeudo' THEN
        
        UPDATE clientes
        SET deudas_totales = COALESCE(deudas_totales, 0) + NEW.monto
        WHERE id_cliente = NEW.id_cliente;
        
    END IF;
END //

DELIMITER ;
