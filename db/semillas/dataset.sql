-- 1. Crear la cuenta principal (Esto desbloquea la pantalla de Tarjetas al instante)
INSERT INTO cuentas (id, usuario_id, nombre, saldo, moneda, tipo) 
VALUES ('cuenta-demo-1', 'ID_DE_TU_USUARIO_PRUEBA', 'Cuenta Principal', 5000.00, 'MXN', 'DEBITO');

-- 2. Crear la meta asociada que pusiste en el Onboarding
INSERT INTO metas (id, usuario_id, nombre, monto_objetivo, monto_actual, moneda) 
VALUES ('meta-demo-1', 'ID_DE_TU_USUARIO_PRUEBA', 'Comprar un auto', 20000.00, 0.00, 'MXN');

-- 3. Crear movimientos iniciales para que el motor de análisis tenga datos que procesar
INSERT INTO movimientos (id, cuenta_id, monto, tipo, categoria, fecha) VALUES 
('mov-demo-1', 'cuenta-demo-1', 15000.00, 'INGRESO', 'salario', '2026-08-10'),
('mov-demo-2', 'cuenta-demo-1', 1350.00, 'GASTO', 'alimentacion', '2026-08-12'),
('mov-demo-3', 'cuenta-demo-1', 800.00, 'GASTO', 'servicios', '2026-08-15');