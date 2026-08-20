# ADR-0012 - El motor de base de datos es MySQL 8 (reemplaza a Oracle)

> ⚠️ **REEMPLAZADA por [ADR-0014](0014-motor-postgresql.md) (2026-08-03)**: el
> motor vigente es **PostgreSQL 16**. Se conserva como registro del paso
> intermedio: el equipo traia el modelo escrito en MySQL, y de ahi se llego a
> Postgres sin volver a Oracle.

- **Estado**: ⛔ Reemplazada por [ADR-0014](0014-motor-postgresql.md)
- **Fecha**: 2026-07-24
- **Reemplaza a**: [ADR-0003](0003-oracle-autonomous-db.md) (Oracle Autonomous Database)

## Contexto

ADR-0003 eligió **Oracle Autonomous Database (Always Free)** porque el hackathon es
de Alura + **Oracle** y usar su stack sumaba puntos de alineación con el sponsor.

Al llegar el modelo de datos real del equipo (`perfil_financiero.sql`, semana 0-1),
el script estaba escrito **en MySQL 8** y ya modelaba todo el dominio: usuarios,
cuentas, tarjetas (+ subtipo crédito), transacciones, buró, planes de ahorro,
resumen mensual e historial de análisis. Quien lo escribió trabaja con MySQL.

Mantener Oracle implicaba: reescribir el DDL completo (`VARCHAR2`, `NUMBER`,
`IDENTITY`, sin `LIMIT`), montar el wallet mTLS en cada máquina del equipo de 8
personas, y bloquear a quien ya estaba avanzando. Todo eso **antes** de tener un
backend que se conecte.

## Decisión

**El motor es MySQL 8.** El DDL del equipo se mantiene como fuente y se le aplican
las adiciones marcadas `-- [APP]` (ver `CAMBIOS_BASE_DATOS.md`).

Consecuencias directas:

- Se usa `JSON` nativo (columna `detalle` del análisis), `ENUM`, `AUTO_INCREMENT`,
  `CHAR(36)` para UUID y `TIMESTAMP ... ON UPDATE`: casi todo el DDL corre tal cual.
- Desaparecen el wallet mTLS y las trampas de Oracle documentadas en `CLAUDE.md`.
- Migraciones: Flyway sigue sirviendo (con dialecto MySQL).

## Alternativas consideradas

- **Seguir con Oracle** (ADR-0003): descartada. El costo es alto (reescribir DDL +
  wallet en 8 máquinas) y el beneficio es de imagen, no técnico. Con la infra ya
  sin bloquear a la app ([ADR-0008](0008-infra-no-bloquea-app.md)), forzar Oracle
  contradecía esa misma regla: la BD habría bloqueado al equipo.
- **Postgres**: técnicamente cómodo, pero nadie del equipo lo pidió y significaba
  reescribir igual el script del compañero. Cambiar por cambiar.

## Consecuencias

- ✅ El equipo de datos avanza con lo que ya escribió, sin traducción.
- ✅ Entorno local más simple (contenedor de MySQL, sin wallet).
- ❌ **Se pierde el guiño al sponsor Oracle.** Mitigación: el proyecto sigue usando
  el resto del stack del hackathon y se puede justificar la decisión ante el jurado
  como lo que es — una decisión de equipo para no bloquear la entrega.
- ❌ Hay **documentación que todavía menciona Oracle** y hay que corregir:
  `docs/arquitectura/STACK.md`, `docs/arquitectura/DATOS.md`, `docs/arquitectura/OCI.md`
  y el bloque de "trampas" de `CLAUDE.md`. Pendiente en `PENDIENTES_AGENTE.md`.
