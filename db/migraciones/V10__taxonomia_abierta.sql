-- =============================================================================
-- V10 - La taxonomia deja de estar congelada
--
-- Hasta aqui, las 12 categorias eran intocables: cambiarlas exigia un ADR
-- porque un slug distinto en una capa rompia la demo. Esa regla protegia de un
-- riesgo real, pero tenia un coste: si data science entrega un modelo que
-- predice categorias distintas (por ejemplo `ocio` en vez de `entretenimiento`,
-- que es justo lo que usan sus notebooks), habria que renegociar el contrato en
-- vez de simplemente adaptarse.
--
-- Se invierte el planteamiento: el catalogo pasa a ser DATO, no contrato.
-- Data science manda; la base y las aplicaciones se adaptan.
--
-- ⚠️ Lo que se pierde y hay que compensar: antes, un slug mal escrito rompia la
-- compilacion del frontend. Ahora no: se renderiza una categoria desconocida y
-- el grafico sale raro sin que falle nada. La compensacion es que TODO lo que
-- dependia de la lista cerrada ahora la lee de aqui:
--   * las etiquetas, con respaldo si falta la traduccion (vw_categoria_etiqueta)
--   * los umbrales del motor de reglas (categoria.umbral_ingreso)
--   * la agrupacion de los indicadores (categoria.grupo)
-- Anadir una categoria es un INSERT. No toca esquema, ni entidades, ni tipos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Las categorias se pueden retirar sin romper el historico.
--
-- Borrar una categoria que ya tiene movimientos es imposible (hay FK), y debe
-- serlo: reescribiria el pasado. Se marca inactiva: deja de ofrecerse en la
-- interfaz, pero los movimientos viejos siguen contando.
-- -----------------------------------------------------------------------------
ALTER TABLE categoria ADD COLUMN activa BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN categoria.activa IS
    'FALSE = retirada. No se ofrece para clasificar nuevo, pero el historico que la usa sigue siendo valido.';

-- El UNIQUE sobre `orden` obligaba a reordenar el catalogo entero para meter una
-- categoria en medio. Se quita: el orden admite empates y se desempata por slug.
ALTER TABLE categoria DROP CONSTRAINT uq_categoria_orden;

COMMENT ON COLUMN categoria.orden IS
    'Orden sugerido para la interfaz. Admite empates; se desempata por slug. No es una clave.';

-- -----------------------------------------------------------------------------
-- 2. Etiquetas con respaldo.
--
-- Si data science anade `ocio` y todavia no tiene traducciones, el JOIN directo
-- con categoria_i18n devolveria cero filas y la categoria DESAPARECERIA de la
-- interfaz - un dato que existe pero no se ve. Peor que verlo sin traducir.
--
-- Cadena de respaldo: idioma pedido -> espanol -> el propio slug.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_categoria_etiqueta AS
SELECT
    c.slug,
    i.codigo                                   AS idioma,
    COALESCE(
        (SELECT ci.etiqueta FROM categoria_i18n ci
          WHERE ci.categoria_slug = c.slug AND ci.idioma = i.codigo),
        (SELECT ci.etiqueta FROM categoria_i18n ci
          WHERE ci.categoria_slug = c.slug AND ci.idioma = 'es'),
        -- Ultimo recurso: el slug con la primera letra en mayuscula y sin
        -- guiones bajos. `ahorro_inversion` -> "Ahorro inversion". Feo, pero
        -- legible, y deja claro que falta traducirlo.
        initcap(replace(c.slug, '_', ' '))
    )                                          AS etiqueta,
    c.tipo,
    c.grupo,
    c.orden,
    c.activa
FROM categoria c
CROSS JOIN idioma i;

COMMENT ON VIEW vw_categoria_etiqueta IS
    'Lo que sirve GET /api/v1/categorias. Una categoria nueva sin traducir se ve igual, con el slug formateado: nunca desaparece de la interfaz.';

-- Lo mismo para los perfiles.
CREATE VIEW vw_perfil_etiqueta AS
SELECT
    p.slug,
    i.codigo AS idioma,
    COALESCE(
        (SELECT pi.etiqueta FROM perfil_i18n pi WHERE pi.perfil_slug = p.slug AND pi.idioma = i.codigo),
        (SELECT pi.etiqueta FROM perfil_i18n pi WHERE pi.perfil_slug = p.slug AND pi.idioma = 'es'),
        initcap(replace(p.slug, '_', ' '))
    )        AS etiqueta,
    p.color,
    p.orden
FROM perfil p
CROSS JOIN idioma i;

-- -----------------------------------------------------------------------------
-- 3. El analisis deja de exigir exactamente los 8 indicadores.
--
-- El CHECK original obligaba a que `indicadores` trajera esas 8 claves. Si data
-- science entrega un modelo con 6 features, o con 11, no se podria guardar el
-- analisis. Se relaja a lo minimo defendible: que sea un objeto con AL MENOS un
-- indicador. Lo mismo con las probabilidades: que traiga al menos un perfil.
-- -----------------------------------------------------------------------------
ALTER TABLE analisis DROP CONSTRAINT ck_analisis_indicadores;
ALTER TABLE analisis DROP CONSTRAINT ck_analisis_probabilidades;

ALTER TABLE analisis ADD CONSTRAINT ck_analisis_indicadores
    CHECK (jsonb_typeof(indicadores) = 'object' AND indicadores <> '{}'::jsonb);
ALTER TABLE analisis ADD CONSTRAINT ck_analisis_probabilidades
    CHECK (jsonb_typeof(probabilidades) = 'object' AND probabilidades <> '{}'::jsonb);

COMMENT ON COLUMN analisis.indicadores IS
    'Las features TAL COMO se le mandaron al modelo, sean las que sean. Se guardan para poder responder "por que este analisis dio en_riesgo" tres semanas despues; el conjunto exacto lo decide data science.';

-- -----------------------------------------------------------------------------
-- 4. Origen de los datos del perfil: declarado o derivado.
--
-- `nivel_endeudamiento` y `frecuencia_ahorro` son 2 de las 3 entradas del
-- endpoint del enunciado, y en el dataset del equipo NO vienen. Se pueden
-- derivar de lo que si hay (score de buro, comportamiento mensual real), pero
-- entonces hay que poder distinguirlos de los que declaro el usuario:
--
--   * la interfaz deberia mostrarlos como "estimado" y pedir confirmacion,
--   * data science NO deberia entrenar tratandolos como verdad de campo.
--
-- Sin esta marca, un dato derivado es indistinguible de uno real en cuanto sale
-- de aqui - y eso contamina el modelo en silencio.
-- -----------------------------------------------------------------------------
ALTER TABLE usuario
    ADD COLUMN nivel_endeudamiento_origen TEXT NOT NULL DEFAULT 'declarado',
    ADD COLUMN frecuencia_ahorro_origen   TEXT NOT NULL DEFAULT 'declarado';

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_origen_endeudamiento
        CHECK (nivel_endeudamiento_origen IN ('declarado', 'derivado')),
    ADD CONSTRAINT ck_usuario_origen_frecuencia
        CHECK (frecuencia_ahorro_origen IN ('declarado', 'derivado'));

COMMENT ON COLUMN usuario.nivel_endeudamiento_origen IS
    'declarado = lo dijo el usuario. derivado = lo estimo el sistema. Un derivado NO es verdad de campo: la interfaz lo muestra como estimacion y el entrenamiento deberia excluirlo o ponderarlo.';
COMMENT ON COLUMN usuario.frecuencia_ahorro_origen IS
    'Igual que nivel_endeudamiento_origen.';
