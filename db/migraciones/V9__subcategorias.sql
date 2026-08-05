-- =============================================================================
-- V9 - Subcategorias, y los puntos que quedaron a revision del modelo del equipo
--
-- ORIGEN: la rama `base-datos` trajo un catalogo de 34 categorias
-- (`bus`, `supermercado`, `streaming`, `barberia`, `zapatos_de_tacon`...) que a
-- primera vista choca con las 12 congeladas de TAXONOMIA.md.
--
-- No es un choque: son DOS NIVELES, y los dos hacen falta. El propio README de
-- data science lo dice: "mapeo a macro-categorias: transforma subcategorias
-- (Supermercado, Bus, Streaming) en categorias principales (Alimentacion,
-- Transporte, Ocio...)".
--
--   * Las 34 son el DETALLE del extracto bancario. Es lo que le da valor al
--     usuario: "gastaste 380 en barberia" dice mucho mas que "gastaste en
--     compras".
--   * Las 12 son el CONTRATO: lo que predice el modelo M2, lo que viaja en
--     `resumen_gastos` y sobre lo que operan los umbrales del motor de reglas.
--
-- Meter las 34 en `categoria` habria roto el modelo, el contrato y todos los
-- graficos. Meterlas aqui conserva el detalle sin tocar nada de eso.
--
-- ⚠️ El mapeo de abajo lo tiene que CONFIRMAR data science: hay decisiones
-- discutibles y estan marcadas.
-- =============================================================================

CREATE TABLE subcategoria (
    slug            TEXT     PRIMARY KEY,
    categoria_slug  TEXT     NOT NULL REFERENCES categoria (slug),
    nombre          TEXT     NOT NULL,
    origen          TEXT     NOT NULL DEFAULT 'banco',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_subcategoria_slug   CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_subcategoria_origen CHECK (origen IN ('banco', 'usuario', 'modelo'))
);

CREATE INDEX ix_subcategoria_categoria ON subcategoria (categoria_slug);

COMMENT ON TABLE subcategoria IS
    'Detalle del extracto bancario. Cada subcategoria cuelga de UNA de las 12 categorias congeladas. Los indicadores y el modelo trabajan SIEMPRE con categoria_slug, nunca con esto.';
COMMENT ON COLUMN subcategoria.nombre IS
    'Nombre tal como lo entrega el banco. NO se traduce: es un dato de origen, no una etiqueta de interfaz. Las etiquetas traducidas viven en categoria_i18n.';
COMMENT ON COLUMN subcategoria.origen IS
    'De donde salio: del feed del banco, de una correccion del usuario o del modelo.';

INSERT INTO subcategoria (slug, categoria_slug, nombre) VALUES
    -- Ingresos
    ('nomina_ingresos',            'ingresos',        'Nomina/Ingresos'),
    -- Transporte
    ('bus',                        'transporte',      'Bus'),
    ('metro',                      'transporte',      'Metro'),
    ('metrobus',                   'transporte',      'Metrobus'),
    ('taxi',                       'transporte',      'Taxi'),
    ('gasolina',                   'transporte',      'Gasolina'),
    -- Alimentacion
    ('supermercado',               'alimentacion',    'Supermercado'),
    ('comida_rapida',              'alimentacion',    'Comida rapida'),
    -- Servicios
    ('electricidad',               'servicios',       'Electricidad'),
    ('agua',                       'servicios',       'Agua'),
    ('gas',                        'servicios',       'Gas'),
    ('telefonia_movil',            'servicios',       'Telefonia Movil'),
    ('internet_y_telefonia_hogar', 'servicios',       'Internet y Telefonia Hogar'),
    -- Vivienda
    ('renta',                      'vivienda',        'Renta'),
    ('mantenimiento',              'vivienda',        'Mantenimiento'),
    ('herramientas',               'vivienda',        'Herramientas'),
    -- Salud
    ('farmacia',                   'salud',           'Farmacia'),
    -- Educacion
    ('colegiatura',                'educacion',       'Colegiatura'),
    -- Entretenimiento
    ('streaming',                  'entretenimiento', 'Streaming'),
    ('videojuegos',                'entretenimiento', 'Videojuegos'),
    ('videojuegos_consola',        'entretenimiento', 'Videojuegos Consola'),
    ('salidas',                    'entretenimiento', 'Salidas'),
    ('viajes',                     'entretenimiento', 'Viajes'),
    ('articulos_deportivos',       'entretenimiento', 'Articulos Deportivos'),
    -- Compras
    ('ropa',                       'compras',         'Ropa'),
    ('zapatos_de_tacon',           'compras',         'Zapatos de Tacon'),
    ('bolsas',                     'compras',         'Bolsas'),
    ('compras_fisicas',            'compras',         'Compras Fisicas'),
    ('compras_en_linea',           'compras',         'Compras en linea'),
    -- ⚠️ A CONFIRMAR con data science: cuidado personal no tiene categoria
    -- propia en la taxonomia congelada. Se agrupa en `compras` por ser gasto
    -- discrecional; la alternativa era `otros`, que perderia la senal.
    ('maquillaje',                 'compras',         'Maquillaje'),
    ('barberia',                   'compras',         'Barberia'),
    ('salon_de_belleza',           'compras',         'Salon de Belleza'),
    -- Finanzas (TAXONOMIA §1: seguros e impuestos entran aqui)
    ('seguros',                    'finanzas',        'Seguros'),
    ('multas',                     'finanzas',        'Multas');

-- -----------------------------------------------------------------------------
-- La transaccion puede llevar el detalle ADEMAS de la macro-categoria.
--
-- categoria_slug sigue siendo el que manda: es el que consumen los indicadores,
-- el modelo y el contrato. subcategoria_slug es informacion extra para la
-- interfaz y para que data science pueda entrenar con mas grano.
-- -----------------------------------------------------------------------------
ALTER TABLE transaccion
    ADD COLUMN subcategoria_slug TEXT REFERENCES subcategoria (slug);

CREATE INDEX ix_transaccion_subcategoria ON transaccion (subcategoria_slug)
    WHERE subcategoria_slug IS NOT NULL;

COMMENT ON COLUMN transaccion.subcategoria_slug IS
    'Detalle opcional del extracto. Si esta, su categoria_slug DEBE coincidir con el de la transaccion; lo garantiza el trigger de abajo.';

-- Si la subcategoria dijera `bus` y la categoria `alimentacion`, los graficos
-- mostrarian una cosa y el detalle otra, sin que nada fallara. Se bloquea aqui.
CREATE FUNCTION fn_validar_subcategoria() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    macro_esperada TEXT;
BEGIN
    IF NEW.subcategoria_slug IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT categoria_slug INTO macro_esperada
      FROM subcategoria WHERE slug = NEW.subcategoria_slug;

    -- Si la transaccion no trae categoria, se deduce de la subcategoria.
    IF NEW.categoria_slug IS NULL THEN
        NEW.categoria_slug := macro_esperada;
    ELSIF NEW.categoria_slug <> macro_esperada THEN
        RAISE EXCEPTION
            'La subcategoria % pertenece a %, no a %',
            NEW.subcategoria_slug, macro_esperada, NEW.categoria_slug;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_transaccion_subcategoria
    BEFORE INSERT OR UPDATE OF subcategoria_slug, categoria_slug ON transaccion
    FOR EACH ROW EXECUTE FUNCTION fn_validar_subcategoria();

-- =============================================================================
-- Puntos que quedaron a revision del modelo del equipo
-- =============================================================================

-- 1. GENERO. Su version lo amplio a VARCHAR(20) con 'NO_ESPECIFICADO'. La idea
--    es correcta (M/F deja fuera a gente), pero un texto libre acaba con cinco
--    grafias distintas del mismo valor. Se amplia el conjunto cerrado en vez de
--    abrirlo: NULL sigue significando "no lo dijo", que es distinto de "prefiere
--    no decirlo" (X).
ALTER TABLE usuario DROP CONSTRAINT ck_usuario_genero;
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_genero
    CHECK (genero IS NULL OR genero IN ('M', 'F', 'X'));

COMMENT ON COLUMN usuario.genero IS
    'M | F | X (no binario / prefiere no decirlo). NULL = no se pregunto o no se contesto. Es opcional a proposito: el analisis financiero no lo necesita.';

-- 2. UNICIDAD DE LA TARJETA. Su version quito UNIQUE (numero_tarjeta). Se
--    comprobo el dataset: los 100 numeros son distintos, asi que la restriccion
--    no estorbaba y quitarla solo deja pasar duplicados de verdad. Aqui se
--    conserva via `uq_tarjeta_pan_hash`, que ademas no guarda el numero.
--
-- 3. INGRESO MENSUAL. Su version puso NOT NULL DEFAULT 0.00. No se adopta: un 0
--    es indistinguible de "todavia no lo declaro", y RN7 dice que ingreso 0
--    tiene que devolver 422. Se mantiene NULLABLE.
--
-- Ambas decisiones estan documentadas en db/README.md.
