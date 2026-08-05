-- =============================================================================
-- V4 - Transacciones
--
-- ⚠️ ARREGLO DE FONDO respecto al modelo original del equipo.
--
-- Alli, `transacciones` colgaba SOLO de `id_tarjeta`, y ademas nullable. Eso
-- produce dos problemas graves:
--
--   1. Un movimiento en efectivo (o una transferencia sin tarjeta) queda SIN
--      DUENO: no hay forma de saber de quien es. Y el metodo_pago del propio
--      modelo incluia EFECTIVO, asi que el caso no era teorico.
--   2. Las vistas hacian transacciones -> tarjetas -> cuentas_usuarios. Ese
--      JOIN descarta en silencio todo movimiento sin tarjeta. El usuario ve un
--      dashboard incompleto y nada falla: es el peor tipo de bug.
--
-- Aqui `usuario_id` es NOT NULL. La tarjeta y la cuenta son opcionales porque
-- lo son de verdad; el dueno, no. Ademas hace que RN9 (aislamiento por
-- usuario) sea una clausula WHERE directa y no un JOIN de tres tablas.
-- =============================================================================

CREATE TABLE transaccion (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    cuenta_id        UUID          REFERENCES cuenta_bancaria (id) ON DELETE SET NULL,
    tarjeta_id       UUID          REFERENCES tarjeta (id) ON DELETE SET NULL,

    fecha            DATE          NOT NULL,
    fecha_hora       TIMESTAMPTZ,
    descripcion      TEXT          NOT NULL,
    comercio         TEXT,

    valor            NUMERIC(14,2) NOT NULL,
    moneda           CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    valor_base       NUMERIC(14,2),

    categoria_slug   TEXT          REFERENCES categoria (slug),
    categoria_origen TEXT          NOT NULL DEFAULT 'modelo',
    confianza        NUMERIC(4,3),
    modelo_version   TEXT,

    medio_operacion  TEXT,
    estado           TEXT          NOT NULL DEFAULT 'completada',
    es_recurrente    BOOLEAN       NOT NULL DEFAULT FALSE,
    creado_en        TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- El signo ES el dato (RN4): > 0 ingreso, < 0 gasto. Un movimiento de 0 no
    -- significa nada y ensucia todos los ratios.
    CONSTRAINT ck_transaccion_valor      CHECK (valor <> 0),
    CONSTRAINT ck_transaccion_descripcion CHECK (length(btrim(descripcion)) BETWEEN 1 AND 200),
    CONSTRAINT ck_transaccion_origen     CHECK (categoria_origen IN ('modelo', 'usuario')),
    CONSTRAINT ck_transaccion_confianza  CHECK (confianza IS NULL OR confianza BETWEEN 0 AND 1),
    CONSTRAINT ck_transaccion_estado     CHECK (estado IN ('completada', 'pendiente', 'cancelada')),
    CONSTRAINT ck_transaccion_medio      CHECK (medio_operacion IS NULL OR medio_operacion IN
        ('app_movil', 'portal_web', 'cajero', 'sucursal', 'pos', 'transferencia', 'efectivo')),

    -- Si la categoria la corrigio el usuario, la confianza del modelo ya no
    -- describe nada (RN3). Se guarda NULL, no el numero viejo.
    CONSTRAINT ck_transaccion_confianza_origen
        CHECK (categoria_origen <> 'usuario' OR confianza IS NULL)
);

-- Columna derivada: la mantiene PostgreSQL, no puede desincronizarse del signo.
-- Existe para que el equipo de datos y quien venia del modelo MySQL sigan
-- teniendo `tipo_movimiento` sin duplicar informacion a mano.
ALTER TABLE transaccion
    ADD COLUMN tipo_movimiento TEXT
    GENERATED ALWAYS AS (CASE WHEN valor > 0 THEN 'ingreso' ELSE 'egreso' END) STORED;

-- --- Indices -----------------------------------------------------------------
-- El del listado paginado. Es EL indice que importa: es la consulta que la app
-- hace en cada carga de pantalla.
CREATE INDEX ix_transaccion_usuario_fecha ON transaccion (usuario_id, fecha DESC);
-- El del resumen por categoria (dashboard y resumen_gastos del analisis).
CREATE INDEX ix_transaccion_usuario_categoria ON transaccion (usuario_id, categoria_slug);
-- Filtro "ver solo los movimientos de esta tarjeta". Parcial: la mayoria de
-- las filas no tienen tarjeta y no tiene sentido indexarlas.
CREATE INDEX ix_transaccion_tarjeta ON transaccion (tarjeta_id) WHERE tarjeta_id IS NOT NULL;
CREATE INDEX ix_transaccion_cuenta  ON transaccion (cuenta_id)  WHERE cuenta_id  IS NOT NULL;
-- Cola de reclasificacion: que quedo sin categorizar o con poca confianza.
CREATE INDEX ix_transaccion_sin_categoria ON transaccion (usuario_id)
    WHERE categoria_slug IS NULL;

COMMENT ON COLUMN transaccion.valor IS
    'Con signo (RN4): > 0 ingreso, < 0 gasto. En la moneda de la columna moneda.';
COMMENT ON COLUMN transaccion.valor_base IS
    'El mismo importe normalizado a USD con la tasa de SU fecha. Lo calcula la API al insertar. NULL = pendiente de normalizar.';
COMMENT ON COLUMN transaccion.fecha IS
    'DATE y no TIMESTAMPTZ a proposito: un gasto del 1 de julio no puede volverse del 30 de junio por un huso horario.';
COMMENT ON COLUMN transaccion.fecha_hora IS
    'Hora exacta cuando el origen la trae (extracto bancario, CSV del banco). Opcional: en el alta manual el usuario no la sabe.';
COMMENT ON COLUMN transaccion.categoria_slug IS
    'NULL solo mientras el clasificador no corrio. Una vez clasificada nunca es NULL: si el modelo duda cae en "otros" (RN6).';
COMMENT ON COLUMN transaccion.es_recurrente IS
    'Heuristica de la API: misma descripcion normalizada >= 2 veces en el periodo con montos similares (+-10%). Alimenta ratio_recurrente.';
COMMENT ON COLUMN transaccion.tipo_movimiento IS
    'DERIVADA del signo de valor. No se escribe: PostgreSQL la calcula.';
