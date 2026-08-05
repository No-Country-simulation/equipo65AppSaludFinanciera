-- =============================================================================
-- V3 - Productos bancarios: cuentas, tarjetas y buro de credito
--
-- Estos datos los tiene el banco; la app los LEE. Solo las tarjetas se
-- administran desde la interfaz (alta/edicion/baja).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cuenta_bancaria
--
-- No guarda saldo: el saldo es la suma de los movimientos y guardarlo
-- duplicado garantiza que algun dia los dos numeros no coincidan. Se calcula
-- en la vista vw_saldo_cuenta (V7).
-- -----------------------------------------------------------------------------
CREATE TABLE cuenta_bancaria (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cuenta   TEXT        NOT NULL,
    tipo_cuenta     TEXT        NOT NULL DEFAULT 'debito',
    moneda          CHAR(3)     NOT NULL REFERENCES moneda (codigo),
    estado          TEXT        NOT NULL DEFAULT 'activa',
    fecha_apertura  DATE        NOT NULL,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_cuenta_bancaria_numero UNIQUE (numero_cuenta),
    CONSTRAINT ck_cuenta_bancaria_tipo   CHECK (tipo_cuenta IN ('debito', 'nomina', 'cheques', 'ahorro')),
    CONSTRAINT ck_cuenta_bancaria_estado CHECK (estado IN ('activa', 'bloqueada', 'cancelada'))
);

CREATE TRIGGER tg_cuenta_bancaria_actualizado
    BEFORE UPDATE ON cuenta_bancaria
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON COLUMN cuenta_bancaria.moneda IS
    'La cuenta tiene su propia moneda: puede no ser la moneda_principal del usuario. Sin esto, una cuenta en USD de un usuario con perfil en MXN queda ambigua.';
COMMENT ON COLUMN cuenta_bancaria.estado IS
    'Slugs en minusculas, identicos a los del frontend (EstadoBancario). Evita que cada capa haga toLowerCase().';

-- -----------------------------------------------------------------------------
-- cuenta_usuario - relacion N:M. Soporta cuentas mancomunadas.
-- -----------------------------------------------------------------------------
CREATE TABLE cuenta_usuario (
    cuenta_id             UUID        NOT NULL REFERENCES cuenta_bancaria (id) ON DELETE CASCADE,
    usuario_id            UUID        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    rol_titular           TEXT        NOT NULL DEFAULT 'titular_principal',
    vinculado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    desvinculado_en       TIMESTAMPTZ,

    CONSTRAINT pk_cuenta_usuario     PRIMARY KEY (cuenta_id, usuario_id),
    CONSTRAINT ck_cuenta_usuario_rol CHECK (rol_titular IN ('titular_principal', 'cotitular', 'autorizado'))
);

CREATE INDEX ix_cuenta_usuario_usuario ON cuenta_usuario (usuario_id) WHERE desvinculado_en IS NULL;

-- -----------------------------------------------------------------------------
-- tarjeta
--
-- ⚠️ CAMBIO IMPORTANTE respecto al modelo original del equipo: NO se guarda el
-- numero completo de la tarjeta (el PAN). Guardarlo mete al proyecto en
-- alcance PCI-DSS, y un repo publico con PANs - aunque sean sinteticos - es
-- una mala historia que contar delante de un jurado.
--
-- Se guardan los 4 ultimos digitos (lo unico que la UI muestra) y, si hiciera
-- falta deduplicar altas, un hash del PAN. Es exactamente lo que ya consume el
-- frontend (Tarjeta.ultimos4).
-- -----------------------------------------------------------------------------
CREATE TABLE tarjeta (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id          UUID        NOT NULL REFERENCES cuenta_bancaria (id) ON DELETE CASCADE,
    ultimos4           CHAR(4)     NOT NULL,
    pan_hash           TEXT,
    tipo_tarjeta       TEXT        NOT NULL,
    red_pago           TEXT        NOT NULL,
    fecha_vencimiento  DATE        NOT NULL,
    estado             TEXT        NOT NULL DEFAULT 'activa',
    etiqueta           TEXT,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_tarjeta_pan_hash  UNIQUE (pan_hash),
    CONSTRAINT ck_tarjeta_ultimos4  CHECK (ultimos4 ~ '^[0-9]{4}$'),
    CONSTRAINT ck_tarjeta_tipo      CHECK (tipo_tarjeta IN ('debito', 'credito')),
    CONSTRAINT ck_tarjeta_red       CHECK (red_pago IN ('visa', 'mastercard', 'amex')),
    CONSTRAINT ck_tarjeta_estado    CHECK (estado IN ('activa', 'bloqueada', 'cancelada'))
);

CREATE INDEX ix_tarjeta_cuenta ON tarjeta (cuenta_id);

CREATE TRIGGER tg_tarjeta_actualizado
    BEFORE UPDATE ON tarjeta
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON COLUMN tarjeta.pan_hash IS
    'SHA-256 del numero completo, solo para detectar altas duplicadas. Opcional. El PAN en claro no se guarda nunca.';
COMMENT ON COLUMN tarjeta.etiqueta IS
    'Apodo que le pone el usuario ("Nomina", "Oro"). Solo presentacion.';

-- -----------------------------------------------------------------------------
-- tarjeta_credito - subtipo. Solo existe fila si tipo_tarjeta = 'credito'.
--
-- Tabla aparte y no columnas nullables en tarjeta: asi "una tarjeta de credito
-- tiene limite, dia de corte y dia de pago" es NOT NULL de verdad, en vez de
-- tres columnas opcionales que nadie garantiza.
-- -----------------------------------------------------------------------------
CREATE TABLE tarjeta_credito (
    tarjeta_id       UUID          PRIMARY KEY REFERENCES tarjeta (id) ON DELETE CASCADE,
    limite_credito   NUMERIC(14,2) NOT NULL,
    dia_corte        SMALLINT      NOT NULL,
    dia_pago         SMALLINT      NOT NULL,

    CONSTRAINT ck_tarjeta_credito_limite CHECK (limite_credito >= 0),
    CONSTRAINT ck_tarjeta_credito_corte  CHECK (dia_corte BETWEEN 1 AND 31),
    CONSTRAINT ck_tarjeta_credito_pago   CHECK (dia_pago  BETWEEN 1 AND 31)
);

-- -----------------------------------------------------------------------------
-- historial_buro - historico por usuario (no una foto). El frontend dibuja la
-- evolucion del score, asi que se guarda una fila por consulta.
-- -----------------------------------------------------------------------------
CREATE TABLE historial_buro (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    score_crediticio  SMALLINT,
    dias_atraso       INTEGER       NOT NULL DEFAULT 0,
    monto_adeudado    NUMERIC(14,2) NOT NULL DEFAULT 0,
    moneda            CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    consultado_en     DATE          NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT ck_historial_buro_score  CHECK (score_crediticio IS NULL OR score_crediticio BETWEEN 0 AND 999),
    CONSTRAINT ck_historial_buro_atraso CHECK (dias_atraso >= 0),
    CONSTRAINT ck_historial_buro_deuda  CHECK (monto_adeudado >= 0),
    CONSTRAINT uq_historial_buro        UNIQUE (usuario_id, consultado_en)
);

CREATE INDEX ix_historial_buro_usuario ON historial_buro (usuario_id, consultado_en DESC);

COMMENT ON CONSTRAINT uq_historial_buro ON historial_buro IS
    'Una consulta de buro por usuario y dia. Sin esto, un job que se reintenta duplica puntos en el grafico de evolucion.';
