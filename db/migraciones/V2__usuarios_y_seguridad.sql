-- =============================================================================
-- V2 - Usuarios, autenticacion y auditoria
--
-- Separa a proposito el PERFIL (usuario) de las CREDENCIALES
-- (usuario_seguridad): el 90% de las consultas de la app leen el perfil y no
-- tienen ninguna razon para traerse el hash de la contrasena ni el secreto TOTP
-- en el mismo SELECT *. Es la misma separacion que ya hizo el equipo en su
-- modelo, y se mantiene.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PostgreSQL no tiene el "ON UPDATE CURRENT_TIMESTAMP" de MySQL: se resuelve
-- con un trigger. Se declara una sola vez y se reutiliza en cada tabla que
-- lleve actualizado_en.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_marcar_actualizado() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_marcar_actualizado() IS
    'Equivalente al ON UPDATE CURRENT_TIMESTAMP de MySQL. Se engancha con un trigger BEFORE UPDATE.';

-- -----------------------------------------------------------------------------
-- usuario
--
-- ingreso_mensual, nivel_endeudamiento y frecuencia_ahorro son NULLABLE: en el
-- alta el usuario todavia no los declaro. Ponerlos NOT NULL obligaria a
-- inventar un 0, y un ingreso 0 en la BD es indistinguible de "no lo cargo
-- todavia" - justo el caso que la API tiene que responder con 422 (RN7).
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email                  TEXT          NOT NULL,
    nombre                 TEXT          NOT NULL,
    apellido               TEXT          NOT NULL,
    fecha_nacimiento       DATE          NOT NULL,
    genero                 CHAR(1),
    telefono               TEXT,
    ciudad_id              UUID          REFERENCES ciudad (id) ON DELETE SET NULL,
    moneda_principal       CHAR(3)       NOT NULL DEFAULT 'USD' REFERENCES moneda (codigo),
    idioma                 CHAR(2)       NOT NULL DEFAULT 'es'  REFERENCES idioma (codigo),
    ingreso_mensual        NUMERIC(14,2),
    nivel_endeudamiento    SMALLINT,
    frecuencia_ahorro      TEXT,
    rol                    TEXT          NOT NULL DEFAULT 'usuario',
    estado                 TEXT          NOT NULL DEFAULT 'activo',
    terminos_version       TEXT,
    terminos_aceptados_en  TIMESTAMPTZ,
    ultima_sesion          TIMESTAMPTZ,
    creado_en              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_usuario_email         CHECK (email = lower(email) AND email LIKE '%_@_%._%'),
    CONSTRAINT ck_usuario_genero        CHECK (genero IS NULL OR genero IN ('M', 'F')),
    CONSTRAINT ck_usuario_nacimiento    CHECK (fecha_nacimiento > DATE '1900-01-01'),
    CONSTRAINT ck_usuario_ingreso       CHECK (ingreso_mensual IS NULL OR ingreso_mensual >= 0),
    CONSTRAINT ck_usuario_endeudamiento CHECK (nivel_endeudamiento IS NULL OR nivel_endeudamiento BETWEEN 0 AND 100),
    CONSTRAINT ck_usuario_frecuencia    CHECK (frecuencia_ahorro IS NULL OR frecuencia_ahorro IN ('nula', 'baja', 'media', 'alta')),
    CONSTRAINT ck_usuario_rol           CHECK (rol IN ('usuario', 'admin')),
    CONSTRAINT ck_usuario_estado        CHECK (estado IN ('activo', 'inactivo'))
);

-- El email se guarda en minusculas (lo garantiza el CHECK) y por eso el UNIQUE
-- normal ya es case-insensitive. Sin el CHECK harian falta citext o un indice
-- funcional, y ambos se olvidan de aplicar en algun INSERT.
CREATE UNIQUE INDEX ux_usuario_email ON usuario (email);
CREATE INDEX ix_usuario_ciudad ON usuario (ciudad_id);

CREATE TRIGGER tg_usuario_actualizado
    BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON COLUMN usuario.nivel_endeudamiento IS
    'Porcentaje 0-100 declarado por el usuario. La API lo divide entre 100 para el indicador ratio_endeudamiento.';
COMMENT ON COLUMN usuario.fecha_nacimiento IS
    'La edad NO se guarda: se calcula. Guardar la edad la vuelve incorrecta al dia siguiente del cumpleanos.';
COMMENT ON CONSTRAINT ck_usuario_nacimiento ON usuario IS
    'Solo un piso de cordura. La regla "mayor de 18" se valida en la API: un CHECK con CURRENT_DATE no es inmutable y PostgreSQL lo rechaza.';

-- -----------------------------------------------------------------------------
-- usuario_seguridad - credenciales. 1:1 con usuario.
-- -----------------------------------------------------------------------------
CREATE TABLE usuario_seguridad (
    usuario_id                UUID        PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
    password_hash             TEXT        NOT NULL,
    password_cambiado_en      TIMESTAMPTZ,
    requiere_cambio_password  BOOLEAN     NOT NULL DEFAULT FALSE,
    totp_secreto              TEXT,
    totp_activo               BOOLEAN     NOT NULL DEFAULT FALSE,
    totp_activado_en          TIMESTAMPTZ,
    totp_ultimo_paso          BIGINT,
    intentos_fallidos         SMALLINT    NOT NULL DEFAULT 0,
    ultimo_intento_fallido    TIMESTAMPTZ,
    bloqueado_hasta           TIMESTAMPTZ,
    actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_usuario_seguridad_intentos CHECK (intentos_fallidos >= 0),
    -- 2FA activo sin secreto es un estado imposible que dejaria a la cuenta sin
    -- forma de entrar. Lo bloquea la BD, no la confianza en el codigo.
    CONSTRAINT ck_usuario_seguridad_totp CHECK (NOT totp_activo OR totp_secreto IS NOT NULL)
);

CREATE TRIGGER tg_usuario_seguridad_actualizado
    BEFORE UPDATE ON usuario_seguridad
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_actualizado();

COMMENT ON COLUMN usuario_seguridad.password_hash IS 'BCrypt cost 12. Nunca la contrasena en claro.';
COMMENT ON COLUMN usuario_seguridad.totp_secreto IS
    'Secreto TOTP CIFRADO con la clave de aplicacion (no en claro). Ver docs/seguridad/SEGURIDAD.md.';
COMMENT ON COLUMN usuario_seguridad.totp_ultimo_paso IS
    'Ultimo contador TOTP aceptado. Impide reusar el mismo codigo de 6 digitos dentro de su ventana de 30 s.';

-- -----------------------------------------------------------------------------
-- codigo_respaldo_2fa - con 2FA obligatorio (ADR-0013), perder el telefono sin
-- codigos de respaldo significa perder la cuenta.
-- -----------------------------------------------------------------------------
CREATE TABLE codigo_respaldo_2fa (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    codigo_hash TEXT        NOT NULL,
    usado_en    TIMESTAMPTZ,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_codigo_respaldo_usuario ON codigo_respaldo_2fa (usuario_id) WHERE usado_en IS NULL;

-- -----------------------------------------------------------------------------
-- refresh_token - rotativo, con deteccion de reuso por familia.
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_token (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,
    familia_id  UUID        NOT NULL,
    expira_en   TIMESTAMPTZ NOT NULL,
    usado_en    TIMESTAMPTZ,
    revocado_en TIMESTAMPTZ,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX ix_refresh_token_usuario ON refresh_token (usuario_id);
CREATE INDEX ix_refresh_token_familia ON refresh_token (familia_id);

COMMENT ON COLUMN refresh_token.token_hash IS 'SHA-256 del token. El token en claro NUNCA se guarda.';
COMMENT ON COLUMN refresh_token.familia_id IS
    'Rotar conserva la familia. Si llega un refresh con usado_en NO NULL, alguien lo reuso: se revoca la familia entera y se audita.';

-- -----------------------------------------------------------------------------
-- intento_login - SIN FK a usuario, a proposito: hay que poder registrar los
-- intentos contra emails que no existen (es justo el patron de un ataque).
-- -----------------------------------------------------------------------------
CREATE TABLE intento_login (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email      TEXT        NOT NULL,
    ip         INET,
    exito      BOOLEAN     NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice del contador de "5 fallos en 15 minutos" del rate limit (CONTRATO §9).
CREATE INDEX ix_intento_login_email_fecha ON intento_login (email, creado_en DESC);
CREATE INDEX ix_intento_login_ip_fecha    ON intento_login (ip, creado_en DESC);

-- -----------------------------------------------------------------------------
-- evento_auditoria - traza de seguridad. usuario_id nullable y ON DELETE SET
-- NULL: borrar una cuenta no puede borrar la evidencia de lo que paso con ella.
-- -----------------------------------------------------------------------------
CREATE TABLE evento_auditoria (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  UUID        REFERENCES usuario (id) ON DELETE SET NULL,
    tipo        TEXT        NOT NULL,
    ip          INET,
    user_agent  TEXT,
    detalle     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_evento_auditoria_tipo CHECK (tipo IN (
        'LOGIN_OK', 'LOGIN_FALLIDO', 'BLOQUEO', 'PASSWORD_CAMBIADO',
        '2FA_ACTIVADO', '2FA_DESACTIVADO', 'REFRESH_REUSADO',
        'ANALISIS_EJECUTADO', 'DATOS_EXPORTADOS', 'CUENTA_BORRADA'
    ))
);

CREATE INDEX ix_evento_auditoria_usuario ON evento_auditoria (usuario_id, creado_en DESC);
CREATE INDEX ix_evento_auditoria_tipo    ON evento_auditoria (tipo, creado_en DESC);
