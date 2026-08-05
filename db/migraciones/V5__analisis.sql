-- =============================================================================
-- V5 - Analisis financiero, recomendaciones y resumen mensual
--
-- Un analisis es una FOTO INMUTABLE (RN1): reentrenar el modelo o corregir una
-- categoria no puede reescribir un diagnostico que ya se le mostro al usuario.
-- Por eso guarda sus propios indicadores y su propio resumen de gastos en vez
-- de recalcularlos al leer.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- modelo_ia - catalogo de versiones del modelo, con sus metricas.
-- -----------------------------------------------------------------------------
CREATE TABLE modelo_ia (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre            TEXT          NOT NULL,
    algoritmo         TEXT          NOT NULL,
    version           TEXT          NOT NULL,
    precision_modelo  NUMERIC(5,4),
    recall            NUMERIC(5,4),
    f1_score          NUMERIC(5,4),
    entrenado_en      DATE,
    creado_en         TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_modelo_ia_nombre_version UNIQUE (nombre, version)
);

COMMENT ON TABLE modelo_ia IS
    'M1 = clasificador de transacciones, M2 = perfil financiero. Ver docs/arquitectura/CONTRATO_MODELO.md.';

-- -----------------------------------------------------------------------------
-- analisis
-- -----------------------------------------------------------------------------
CREATE TABLE analisis (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    modelo_id       UUID          REFERENCES modelo_ia (id),

    perfil_codigo   TEXT          NOT NULL REFERENCES perfil (slug),
    probabilidad    NUMERIC(4,3)  NOT NULL,
    probabilidades  JSONB         NOT NULL,
    indicadores     JSONB         NOT NULL,
    resumen_gastos  JSONB         NOT NULL,

    moneda          CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    desde           DATE,
    hasta           DATE,
    modelo_version  TEXT          NOT NULL,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_analisis_probabilidad CHECK (probabilidad BETWEEN 0 AND 1),
    CONSTRAINT ck_analisis_periodo      CHECK (desde IS NULL OR hasta IS NULL OR desde <= hasta),
    -- Los 8 indicadores de TAXONOMIA §3 tienen que estar TODOS. Un analisis al
    -- que le falta una feature no es reproducible y no sirve para depurar.
    CONSTRAINT ck_analisis_indicadores CHECK (
        indicadores ?& ARRAY[
            'tasa_ahorro', 'ratio_endeudamiento', 'ratio_gasto_ingreso',
            'ratio_gasto_esencial', 'ratio_gasto_discrecional',
            'concentracion_gasto', 'frecuencia_ahorro_num', 'ratio_recurrente'
        ]
    ),
    CONSTRAINT ck_analisis_probabilidades CHECK (
        probabilidades ?& ARRAY['saludable', 'en_observacion', 'en_riesgo']
    )
);

CREATE INDEX ix_analisis_usuario ON analisis (usuario_id, creado_en DESC);

COMMENT ON COLUMN analisis.indicadores IS
    'Los 8 indicadores TAL COMO se le mandaron al modelo. Sin esto es imposible responder "por que este analisis dio en_riesgo" tres semanas despues.';
COMMENT ON COLUMN analisis.resumen_gastos IS
    'Claves = slugs de categoria, SIEMPRE. Nunca etiquetas traducidas: un resumen con la clave "Alimentacao" romperia todos los graficos al cambiar de idioma.';
COMMENT ON COLUMN analisis.modelo_version IS
    'Critico: reentrenar el modelo no reescribe los analisis viejos, quedan atribuidos a la version que los produjo.';
COMMENT ON TABLE analisis IS
    'NO guarda el idioma ni textos traducidos. Guarda slugs. El texto se renderiza al leer, con el idioma de ese momento, para que el historial completo se vea en el idioma que el usuario tiene hoy.';

-- -----------------------------------------------------------------------------
-- recomendacion
--
-- 🌎 Se guarda `codigo` + `parametros`, NUNCA el texto renderizado. Si se
-- guardara la frase en espanol, el historial quedaria congelado en espanol
-- para siempre y un usuario brasileno veria sus analisis viejos en un idioma
-- que no eligio. El texto se arma al leer desde el ResourceBundle.
-- -----------------------------------------------------------------------------
CREATE TABLE recomendacion (
    id           BIGINT   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    analisis_id  UUID     NOT NULL REFERENCES analisis (id) ON DELETE CASCADE,
    codigo       TEXT     NOT NULL,
    parametros   JSONB    NOT NULL DEFAULT '{}'::jsonb,
    prioridad    TEXT     NOT NULL,
    indicador    TEXT,
    orden        SMALLINT NOT NULL,

    CONSTRAINT ck_recomendacion_codigo    CHECK (codigo ~ '^REC_[A-Z_]+$'),
    CONSTRAINT ck_recomendacion_prioridad CHECK (prioridad IN ('alta', 'media', 'baja')),
    CONSTRAINT uq_recomendacion_orden     UNIQUE (analisis_id, orden)
);

CREATE INDEX ix_recomendacion_analisis ON recomendacion (analisis_id);

COMMENT ON COLUMN recomendacion.codigo IS
    'REC_AHORRO_BAJO, REC_DEFICIT, ... (TAXONOMIA §4). Nunca se traduce.';
COMMENT ON COLUMN recomendacion.parametros IS
    'Valores para interpolar en el texto: {"categoria":"alimentacion","pct":17}.';

-- -----------------------------------------------------------------------------
-- resumen_mensual - agregado precalculado por mes.
--
-- Es cache, no fuente de verdad: se puede reconstruir entero desde
-- transaccion. Existe porque el grafico de evolucion recorre 12 meses y no
-- vale la pena reagregar miles de filas en cada carga.
-- -----------------------------------------------------------------------------
CREATE TABLE resumen_mensual (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID          NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    anio          SMALLINT      NOT NULL,
    mes           SMALLINT      NOT NULL,
    ingresos      NUMERIC(14,2) NOT NULL DEFAULT 0,
    gastos        NUMERIC(14,2) NOT NULL DEFAULT 0,
    ahorro        NUMERIC(14,2) NOT NULL DEFAULT 0,
    deuda_total   NUMERIC(14,2) NOT NULL DEFAULT 0,
    moneda        CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    generado_en   TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_resumen_mensual_mes  CHECK (mes  BETWEEN 1 AND 12),
    CONSTRAINT ck_resumen_mensual_anio CHECK (anio BETWEEN 2000 AND 2100),
    CONSTRAINT uq_resumen_mensual      UNIQUE (usuario_id, anio, mes)
);

COMMENT ON TABLE resumen_mensual IS
    'Cache reconstruible desde transaccion. El UNIQUE permite recalcular con INSERT ... ON CONFLICT DO UPDATE sin duplicar.';
