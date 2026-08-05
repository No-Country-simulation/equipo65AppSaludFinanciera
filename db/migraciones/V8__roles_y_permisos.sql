-- =============================================================================
-- V8 - Rol de aplicacion con privilegios minimos
--
-- Hasta aqui, la API se conectaba con el usuario DUENO de la base: puede hacer
-- DROP TABLE, ALTER, crear roles y leerlo todo. Si algun dia hay una inyeccion
-- SQL o se filtra la contrasena de la aplicacion, la diferencia entre "leen
-- datos" y "borran la base entera" es exactamente este archivo.
--
-- El rol `fintechvital_app` puede leer y escribir filas. NO puede modificar el
-- esquema: de eso se encargan las migraciones, que corren con el dueno.
--
-- La contrasena NO se fija aqui (este archivo esta en un repo publico). Se
-- asigna al desplegar:
--
--   ALTER ROLE fintechvital_app WITH PASSWORD '...';
--
-- Mientras no se le ponga contrasena, el rol existe pero NADIE puede entrar con
-- el (NOLOGIN por defecto en este script), asi que es seguro dejarlo creado.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fintechvital_app') THEN
        -- NOLOGIN a proposito: se activa al asignarle contrasena en el despliegue.
        CREATE ROLE fintechvital_app NOLOGIN;
    END IF;
END
$$;

COMMENT ON ROLE fintechvital_app IS
    'Rol de la API. Lee y escribe filas; no puede tocar el esquema. Ver docs/DESPLIEGUE.md.';

-- Puede usar el esquema, pero no crear objetos dentro.
GRANT USAGE ON SCHEMA public TO fintechvital_app;
REVOKE CREATE ON SCHEMA public FROM fintechvital_app;

-- Datos: lectura y escritura sobre lo que ya existe.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO fintechvital_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO fintechvital_app;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO fintechvital_app;

-- Y sobre lo que creen las migraciones FUTURAS: sin esto, cada migracion nueva
-- dejaria su tabla invisible para la aplicacion hasta que alguien se acordara
-- de repetir el GRANT. Es el fallo clasico de este patron.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fintechvital_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO fintechvital_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO fintechvital_app;

-- Los catalogos son de solo lectura para la aplicacion: sus valores son la
-- taxonomia congelada y solo cambian por migracion. Que la API no pueda
-- reescribirlos por accidente es justo lo que se quiere.
REVOKE INSERT, UPDATE, DELETE ON categoria, categoria_i18n, perfil, perfil_i18n, idioma
    FROM fintechvital_app;

-- El historial de migraciones tampoco lo toca la aplicacion.
REVOKE INSERT, UPDATE, DELETE ON esquema_historial FROM fintechvital_app;

-- La auditoria es de solo-anexar: se puede escribir, nunca borrar ni reescribir.
-- Borrar una cuenta no puede borrar la evidencia de lo que paso con ella.
REVOKE UPDATE, DELETE ON evento_auditoria, intento_login FROM fintechvital_app;
