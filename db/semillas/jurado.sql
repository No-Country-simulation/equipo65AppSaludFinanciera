-- =============================================================================
-- SEMILLA JURADO - la UNICA cuenta de ejemplo que va a PRODUCCION
--
-- Por que existe
-- --------------
-- Produccion arranca VACIA a proposito (FV_CARGAR_DEMO=no) y el alta por la web
-- termina obligando a activar 2FA con una app de autenticacion. Para el jurado
-- del hackathon eso es una barrera: tendria que registrarse, escanear un QR e
-- instalar Google Authenticator antes de ver una sola pantalla con datos.
--
-- Esta semilla deja UNA cuenta lista, con 13 meses de historial, para que el
-- jurado entre y vea el producto funcionando. Es tambien la cuenta con la que
-- se graba el video de la entrega.
--
--     ana.torres@ejemplo.mx   perfil "saludable", es/MXN, SIN 2FA
--
-- Que NO hace
-- -----------
-- No deja a Bruno, Carla ni Emily: en produccion sobra con un usuario, y cuantas
-- menos cuentas abiertas con contrasena publicada, mejor. Se quedan en local y
-- en staging, donde la semilla demo entra entera.
--
-- Como se ejecuta
-- ---------------
-- DENTRO del contenedor de la base, porque el `\i` de aqui abajo apunta a la
-- ruta que la imagen usa para las semillas:
--
--     podman exec -i fintechvital-prod-db \
--       psql -U fintechvital -d fintechvital -v ON_ERROR_STOP=1 \
--            -v pwdemo='<la contrasena>' \
--            -f /opt/fintechvital/semillas/jurado.sql
--
-- En produccion lo lanza  `.\ops\oci\desplegar.ps1 -Accion semilla-jurado`,
-- que ademas saca la contrasena de FV_PASSWORD_DEMO en ops\.env.prod.
--
-- Es RE-EJECUTABLE, y esa es la gracia: la contrasena se publica en el
-- repositorio, asi que cualquiera puede entrar y borrarle los movimientos a Ana.
-- Si eso pasa la vispera de la demo, se vuelve a lanzar y queda como estaba.
-- =============================================================================

-- La semilla demo completa: crea a los cuatro usuarios con todo su historial
-- (movimientos, buro, metas, presupuestos, eventos, analisis y recomendaciones).
-- Se reutiliza tal cual en vez de copiar aqui sus 380 lineas: dos copias del
-- mismo SQL se separan a la primera correccion que alguien hace en una sola.
--
-- Trae su propia limpieza al principio, asi que re-ejecutar no duplica nada.
\i /opt/fintechvital/semillas/demo.sql

-- --- Y ahora se queda solo Ana ----------------------------------------------
-- El borrado de `usuario` arrastra en cascada movimientos, analisis, metas,
-- presupuestos, eventos, buro y credenciales (ON DELETE CASCADE en todas las FK
-- que apuntan a usuario). Las cuentas bancarias NO cuelgan del usuario -- se
-- unen por `cuenta_usuario` -- asi que esas se borran a mano por su numero.
BEGIN;

DELETE FROM usuario WHERE id IN (
    'b2222222-2222-4222-8222-222222222222',   -- Bruno Silva   (pt/BRL)
    'c3333333-3333-4333-8333-333333333333',   -- Carla Mendez  (es/MXN)
    'd4444444-4444-4444-8444-444444444444'    -- Emily Carter  (en/USD)
);

DELETE FROM cuenta_bancaria WHERE numero_cuenta IN (
    'DEMO-BR-7734', 'DEMO-MX-9156', 'DEMO-US-2087'
);

COMMIT;

-- --- Comprobacion ------------------------------------------------------------
-- Sale por pantalla para que quien lanza el despliegue vea que quedo bien sin
-- tener que abrir una sesion de psql aparte.
\echo ''
\echo '=== Semilla jurado: deberia quedar UNA cuenta, con 2FA apagado ==='
SELECT u.email,
       u.nombre || ' ' || u.apellido        AS nombre,
       u.idioma,
       u.moneda_principal                   AS moneda,
       u.rol,
       s.totp_activo,
       (SELECT count(*) FROM transaccion t WHERE t.usuario_id = u.id) AS movimientos,
       (SELECT count(*) FROM analisis a    WHERE a.usuario_id = u.id) AS analisis
FROM usuario u
JOIN usuario_seguridad s ON s.usuario_id = u.id
ORDER BY u.email;
