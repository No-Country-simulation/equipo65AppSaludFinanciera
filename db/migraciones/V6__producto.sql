-- =============================================================================
-- V6 - Funcionalidades de producto: metas, presupuestos y calendario
--
-- Estas tres pantallas YA EXISTEN en la web y en la app movil contra la capa
-- mock, pero no tenian ninguna tabla detras. Al integrar contra la API real se
-- habrian caido o habrian perdido los datos en cada recarga.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- plan_ahorro - las "metas" de la interfaz.
-- -----------------------------------------------------------------------------
CREATE TABLE plan_ahorro (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    nombre_meta   TEXT          NOT NULL,
    monto_meta    NUMERIC(14,2) NOT NULL,
    moneda        CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    fecha_inicio  DATE          NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin     DATE,
    estado        TEXT          NOT NULL DEFAULT 'activo',
    icono         TEXT,
    color         TEXT,
    creado_en     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_plan_ahorro_monto  CHECK (monto_meta > 0),
    CONSTRAINT ck_plan_ahorro_estado CHECK (estado IN ('activo', 'finalizado', 'cancelado')),
    CONSTRAINT ck_plan_ahorro_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX ix_plan_ahorro_usuario ON plan_ahorro (usuario_id);

CREATE TRIGGER tg_plan_ahorro_actualizado
    BEFORE UPDATE ON plan_ahorro
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON COLUMN plan_ahorro.icono IS
    'Emoji elegido por el usuario. El contrato del frontend lo marcaba como "solo presentacion, no va a la BD", pero entonces se perderia en cada sesion y en cada dispositivo. Persistirlo cuesta una columna.';

-- -----------------------------------------------------------------------------
-- aporte_plan
--
-- El frontend expone MetaAhorro.ahorrado como "calculado, no se guarda: suma
-- de aportes". Los aportes no existian en ninguna tabla, asi que ese calculo
-- no tenia de donde salir. Aqui estan.
-- -----------------------------------------------------------------------------
CREATE TABLE aporte_plan (
    id             BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_id        UUID          NOT NULL REFERENCES plan_ahorro (id) ON DELETE CASCADE,
    transaccion_id UUID          REFERENCES transaccion (id) ON DELETE SET NULL,
    monto          NUMERIC(14,2) NOT NULL,
    fecha          DATE          NOT NULL DEFAULT CURRENT_DATE,
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_aporte_plan_monto CHECK (monto <> 0)
);

CREATE INDEX ix_aporte_plan_plan ON aporte_plan (plan_id, fecha DESC);

COMMENT ON COLUMN aporte_plan.transaccion_id IS
    'Enlaza el aporte con el movimiento real que lo genero, cuando lo hay. Permite que "aporte a la meta" y "transferencia a ahorro" sean el mismo hecho contado una sola vez.';
COMMENT ON CONSTRAINT ck_aporte_plan_monto ON aporte_plan IS
    'Se permite negativo: retirar de una meta es un caso real.';

-- -----------------------------------------------------------------------------
-- presupuesto - limite mensual por categoria.
-- -----------------------------------------------------------------------------
CREATE TABLE presupuesto (
    usuario_id     UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    categoria_slug TEXT          NOT NULL REFERENCES categoria (slug) ON DELETE CASCADE,
    limite         NUMERIC(14,2) NOT NULL,
    moneda         CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_presupuesto        PRIMARY KEY (usuario_id, categoria_slug),
    CONSTRAINT ck_presupuesto_limite CHECK (limite > 0)
);

CREATE TRIGGER tg_presupuesto_actualizado
    BEFORE UPDATE ON presupuesto
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON TABLE presupuesto IS
    'Un limite vigente por usuario y categoria (mensual). El "gastado" no se guarda: se calcula sobre el mes en curso en vw_presupuesto_uso.';

-- -----------------------------------------------------------------------------
-- evento_calendario - recordatorios que crea el usuario.
-- -----------------------------------------------------------------------------
CREATE TABLE evento_calendario (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    fecha       DATE          NOT NULL,
    titulo      TEXT          NOT NULL,
    tipo        TEXT          NOT NULL,
    monto       NUMERIC(14,2),
    moneda      CHAR(3)       REFERENCES moneda (codigo),
    creado_en   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_evento_calendario_tipo   CHECK (tipo IN ('pago', 'cobro', 'recordatorio')),
    CONSTRAINT ck_evento_calendario_titulo CHECK (length(btrim(titulo)) BETWEEN 1 AND 120),
    -- Un monto sin moneda no se puede mostrar ni sumar.
    CONSTRAINT ck_evento_calendario_moneda CHECK (monto IS NULL OR moneda IS NOT NULL)
);

CREATE INDEX ix_evento_calendario_usuario_fecha ON evento_calendario (usuario_id, fecha);

CREATE TRIGGER tg_evento_calendario_actualizado
    BEFORE UPDATE ON evento_calendario
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON COLUMN evento_calendario.tipo IS
    'Slugs, no se traducen: pago | cobro | recordatorio. La etiqueta la pone cada interfaz segun su idioma.';
