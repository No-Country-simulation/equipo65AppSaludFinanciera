-- =============================================================================
-- V1 - Catalogos
--
-- Tablas de referencia que NO dependen de ningun usuario: idiomas, monedas,
-- tasas de cambio, ciudades y la taxonomia congelada (categorias y perfiles)
-- con sus etiquetas en los 3 idiomas.
--
-- Fuente de verdad de los slugs: frontend/docs/datos/TAXONOMIA.md (congelada).
-- Cambiar un slug de aqui exige un ADR: rompe DS, backend, BD y las dos apps.
-- =============================================================================

-- pgcrypto: aporta crypt() y gen_salt('bf'), que generan hashes BCrypt desde
-- SQL. Lo usa la semilla demo para dar una contrasena utilizable a los usuarios
-- de ejemplo sin tener que dejar un hash escrito en el repositorio.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- idioma - 3 filas. Es tabla y no un CHECK a proposito: sumar un 4o idioma
-- tiene que ser un INSERT, no un ALTER TABLE en cadena.
-- -----------------------------------------------------------------------------
CREATE TABLE idioma (
    codigo  CHAR(2) PRIMARY KEY,
    nombre  TEXT    NOT NULL,
    CONSTRAINT ck_idioma_codigo CHECK (codigo ~ '^[a-z]{2}$')
);

COMMENT ON TABLE idioma IS 'Idiomas soportados (ADR-0009). Default de la API: es.';

INSERT INTO idioma (codigo, nombre) VALUES
    ('es', 'Espanol'),
    ('pt', 'Portugues'),
    ('en', 'English');

-- -----------------------------------------------------------------------------
-- moneda - las 8 de TAXONOMIA.md §6. La sirve GET /api/v1/monedas.
-- -----------------------------------------------------------------------------
CREATE TABLE moneda (
    codigo     CHAR(3)  PRIMARY KEY,
    nombre     TEXT     NOT NULL,
    simbolo    TEXT     NOT NULL,
    decimales  SMALLINT NOT NULL DEFAULT 2,
    CONSTRAINT ck_moneda_codigo    CHECK (codigo ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_moneda_decimales CHECK (decimales BETWEEN 0 AND 4)
);

COMMENT ON TABLE moneda IS 'ISO-4217. Moneda base de normalizacion interna: USD.';

INSERT INTO moneda (codigo, nombre, simbolo) VALUES
    ('USD', 'Dolar estadounidense', 'US$'),
    ('MXN', 'Peso mexicano',        '$'),
    ('ARS', 'Peso argentino',       '$'),
    ('COP', 'Peso colombiano',      '$'),
    ('CLP', 'Peso chileno',         '$'),
    ('PEN', 'Sol peruano',          'S/'),
    ('BRL', 'Real brasileno',       'R$'),
    ('EUR', 'Euro',                 'EUR');

-- -----------------------------------------------------------------------------
-- tasa_cambio - cache alimentada por un job cada 6 h.
--
-- No se sobrescribe: se inserta una fila nueva por dia. Cuesta lo mismo (8
-- monedas x 1 fila/dia) y permite convertir cada movimiento con la tasa DE SU
-- FECHA. Sobrescribir haria que un gasto de mayo se convierta con la tasa de
-- julio, y en LatAm eso es un error grande.
-- -----------------------------------------------------------------------------
CREATE TABLE tasa_cambio (
    moneda_origen   CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    moneda_base     CHAR(3)       NOT NULL REFERENCES moneda (codigo),
    vigente_desde   DATE          NOT NULL,
    tasa            NUMERIC(18,6) NOT NULL,
    fuente          TEXT          NOT NULL DEFAULT 'semilla',
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_tasa_cambio PRIMARY KEY (moneda_origen, moneda_base, vigente_desde),
    CONSTRAINT ck_tasa_cambio_tasa CHECK (tasa > 0)
);

COMMENT ON COLUMN tasa_cambio.tasa IS
    'Cuantas unidades de moneda_base vale 1 unidad de moneda_origen. 6 decimales: COP->USD ~ 0.00024.';

-- Tasas de arranque, INDICATIVAS. Existen para que la API no dependa de un
-- tercero el dia de la demo; el job las reemplaza con las reales.
INSERT INTO tasa_cambio (moneda_origen, moneda_base, vigente_desde, tasa, fuente) VALUES
    ('USD', 'USD', DATE '2026-01-01', 1.000000, 'semilla'),
    ('MXN', 'USD', DATE '2026-01-01', 0.058000, 'semilla'),
    ('ARS', 'USD', DATE '2026-01-01', 0.000950, 'semilla'),
    ('COP', 'USD', DATE '2026-01-01', 0.000240, 'semilla'),
    ('CLP', 'USD', DATE '2026-01-01', 0.001050, 'semilla'),
    ('PEN', 'USD', DATE '2026-01-01', 0.270000, 'semilla'),
    ('BRL', 'USD', DATE '2026-01-01', 0.180000, 'semilla'),
    ('EUR', 'USD', DATE '2026-01-01', 1.080000, 'semilla');

-- -----------------------------------------------------------------------------
-- ciudad - catalogo de sucursales/residencia. pais en ISO-3166-1 alfa-2 para
-- no repetir 'Mexico'/'México'/'MX' en tres grafias distintas.
-- -----------------------------------------------------------------------------
CREATE TABLE ciudad (
    id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  TEXT    NOT NULL,
    region  TEXT    NOT NULL,
    pais    CHAR(2) NOT NULL,
    CONSTRAINT uq_ciudad          UNIQUE (nombre, region, pais),
    CONSTRAINT ck_ciudad_pais     CHECK (pais ~ '^[A-Z]{2}$')
);

COMMENT ON COLUMN ciudad.region IS 'Estado/provincia/departamento. Se llama region y no estado para no chocar con los "estado" de dominio (activa/bloqueada).';

INSERT INTO ciudad (nombre, region, pais) VALUES
    ('Ciudad de Mexico', 'CDMX',             'MX'),
    ('Guadalajara',      'Jalisco',          'MX'),
    ('Monterrey',        'Nuevo Leon',       'MX'),
    ('Queretaro',        'Queretaro',        'MX'),
    ('Puebla',           'Puebla',           'MX'),
    ('Tijuana',          'Baja California',  'MX'),
    ('Cancun',           'Quintana Roo',     'MX'),
    ('Merida',           'Yucatan',          'MX'),
    ('Leon',             'Guanajuato',       'MX'),
    ('Toluca',           'Estado de Mexico', 'MX'),
    ('Sao Paulo',        'Sao Paulo',        'BR'),
    ('Rio de Janeiro',   'Rio de Janeiro',   'BR'),
    ('Buenos Aires',     'CABA',             'AR'),
    ('Bogota',           'Cundinamarca',     'CO'),
    ('Lima',             'Lima',             'PE'),
    ('Santiago',         'Region Metropolitana', 'CL');

-- -----------------------------------------------------------------------------
-- categoria - las 12 de TAXONOMIA.md §1. CONGELADA.
--
-- grupo y umbral_ingreso viven aqui y no en el codigo Java: el motor de reglas
-- los lee de la BD, asi que ajustar un umbral es un UPDATE y no un redeploy de
-- tres servicios.
-- -----------------------------------------------------------------------------
CREATE TABLE categoria (
    slug            TEXT         PRIMARY KEY,
    tipo            TEXT         NOT NULL,
    grupo           TEXT         NOT NULL,
    umbral_ingreso  NUMERIC(4,3),
    orden           SMALLINT     NOT NULL,
    CONSTRAINT ck_categoria_slug  CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_categoria_tipo  CHECK (tipo  IN ('gasto', 'ingreso', 'movimiento')),
    CONSTRAINT ck_categoria_grupo CHECK (grupo IN ('esencial', 'discrecional', 'financiero', 'no_gasto', 'otro')),
    CONSTRAINT ck_categoria_umbral CHECK (umbral_ingreso IS NULL OR umbral_ingreso > 0),
    CONSTRAINT uq_categoria_orden UNIQUE (orden)
);

COMMENT ON TABLE categoria IS
    'Taxonomia congelada (12 filas). Los slugs son identicos en DS, backend, BD, web y movil.';
COMMENT ON COLUMN categoria.grupo IS
    'Agrupacion que usan los indicadores: ESENCIAL / DISCRECIONAL / FINANCIERO / NO_GASTO / OTRO. educacion queda en "otro" a proposito (TAXONOMIA §1).';
COMMENT ON COLUMN categoria.umbral_ingreso IS
    'Fraccion del ingreso a partir de la cual dispara REC_CATEGORIA_EXCESO. NULL = la regla no aplica.';

INSERT INTO categoria (slug, tipo, grupo, umbral_ingreso, orden) VALUES
    ('alimentacion',     'gasto',      'esencial',     0.350,  1),
    ('transporte',       'gasto',      'esencial',     0.200,  2),
    ('vivienda',         'gasto',      'esencial',     0.350,  3),
    ('servicios',        'gasto',      'esencial',     0.150,  4),
    ('salud',            'gasto',      'esencial',     0.200,  5),
    ('educacion',        'gasto',      'otro',         0.250,  6),
    ('entretenimiento',  'gasto',      'discrecional', 0.150,  7),
    ('compras',          'gasto',      'discrecional', 0.150,  8),
    ('finanzas',         'gasto',      'financiero',   0.200,  9),
    ('ahorro_inversion', 'movimiento', 'no_gasto',     NULL,  10),
    ('ingresos',         'ingreso',    'no_gasto',     NULL,  11),
    ('otros',            'gasto',      'otro',         0.100, 12);

-- -----------------------------------------------------------------------------
-- categoria_i18n - 12 x 3 = 36 filas. La sirve GET /api/v1/categorias segun el
-- Accept-Language. El frontend NO hardcodea estas etiquetas.
-- -----------------------------------------------------------------------------
CREATE TABLE categoria_i18n (
    categoria_slug  TEXT   NOT NULL REFERENCES categoria (slug) ON DELETE CASCADE,
    idioma          CHAR(2) NOT NULL REFERENCES idioma (codigo) ON DELETE CASCADE,
    etiqueta        TEXT   NOT NULL,
    CONSTRAINT pk_categoria_i18n PRIMARY KEY (categoria_slug, idioma)
);

INSERT INTO categoria_i18n (categoria_slug, idioma, etiqueta) VALUES
    ('alimentacion',     'es', 'Alimentación'),            ('alimentacion',     'pt', 'Alimentação'),              ('alimentacion',     'en', 'Food'),
    ('transporte',       'es', 'Transporte'),              ('transporte',       'pt', 'Transporte'),               ('transporte',       'en', 'Transport'),
    ('vivienda',         'es', 'Vivienda'),                ('vivienda',         'pt', 'Moradia'),                  ('vivienda',         'en', 'Housing'),
    ('servicios',        'es', 'Servicios'),               ('servicios',        'pt', 'Contas e serviços'),        ('servicios',        'en', 'Utilities'),
    ('salud',            'es', 'Salud'),                   ('salud',            'pt', 'Saúde'),                    ('salud',            'en', 'Health'),
    ('educacion',        'es', 'Educación'),               ('educacion',        'pt', 'Educação'),                 ('educacion',        'en', 'Education'),
    ('entretenimiento',  'es', 'Entretenimiento'),         ('entretenimiento',  'pt', 'Entretenimento'),           ('entretenimiento',  'en', 'Entertainment'),
    ('compras',          'es', 'Compras'),                 ('compras',          'pt', 'Compras'),                  ('compras',          'en', 'Shopping'),
    ('finanzas',         'es', 'Finanzas'),                ('finanzas',         'pt', 'Finanças'),                 ('finanzas',         'en', 'Finance'),
    ('ahorro_inversion', 'es', 'Ahorro e inversión'),      ('ahorro_inversion', 'pt', 'Poupança e investimento'),  ('ahorro_inversion', 'en', 'Savings & investment'),
    ('ingresos',         'es', 'Ingresos'),                ('ingresos',         'pt', 'Receitas'),                 ('ingresos',         'en', 'Income'),
    ('otros',            'es', 'Otros'),                   ('otros',            'pt', 'Outros'),                   ('otros',            'en', 'Other');

-- -----------------------------------------------------------------------------
-- perfil / perfil_i18n - los 3 de TAXONOMIA.md §2.
--
-- perfil_financiero en la respuesta de la API es la ETIQUETA legible; el slug
-- estable es perfil_codigo. La BD guarda SIEMPRE el slug.
-- -----------------------------------------------------------------------------
CREATE TABLE perfil (
    slug   TEXT     PRIMARY KEY,
    color  TEXT     NOT NULL,
    orden  SMALLINT NOT NULL,
    CONSTRAINT ck_perfil_slug  CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT uq_perfil_orden UNIQUE (orden)
);

INSERT INTO perfil (slug, color, orden) VALUES
    ('saludable',      'verde', 1),
    ('en_observacion', 'ambar', 2),
    ('en_riesgo',      'rojo',  3);

CREATE TABLE perfil_i18n (
    perfil_slug  TEXT    NOT NULL REFERENCES perfil (slug) ON DELETE CASCADE,
    idioma       CHAR(2) NOT NULL REFERENCES idioma (codigo) ON DELETE CASCADE,
    etiqueta     TEXT    NOT NULL,
    CONSTRAINT pk_perfil_i18n PRIMARY KEY (perfil_slug, idioma)
);

INSERT INTO perfil_i18n (perfil_slug, idioma, etiqueta) VALUES
    ('saludable',      'es', 'Saludable'),      ('saludable',      'pt', 'Saudável'),      ('saludable',      'en', 'Healthy'),
    ('en_observacion', 'es', 'En observación'), ('en_observacion', 'pt', 'Em observação'), ('en_observacion', 'en', 'Under observation'),
    ('en_riesgo',      'es', 'En riesgo'),      ('en_riesgo',      'pt', 'Em risco'),      ('en_riesgo',      'en', 'At risk');
