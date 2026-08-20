# ADR-0003 - Oracle Autonomous Database como base de datos

> ⚠️ **REEMPLAZADA.** Primero por [ADR-0012](0012-motor-mysql.md) (MySQL 8,
> 2026-07-24) y despues por [**ADR-0014**](0014-motor-postgresql.md)
> (**PostgreSQL 16**, 2026-08-03), que es **el motor vigente**. Este ADR se
> conserva como registro historico de por que se eligio Oracle en su momento.
>
> El requisito de OCI **se cumple igual**, y por cuatro servicios en vez de uno:
> Compute, Container Registry, Vault y Bastion. Ver
> [`../../../ops/DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md).

- **Estado**: ⛔ Reemplazada (por 0012, y esta por 0014)
- **Fecha**: 2026-07-13

## Contexto

El hackathon es **de Oracle** (Alura + Oracle, ONE G9) y exige usar al menos un
servicio de OCI. El equipo tiene un **DBA dedicado**, que necesita trabajo real y
visible.

El enunciado menciona explícitamente *"Base de datos opcional para la persistencia
de información"* entre los servicios OCI válidos.

## Decisión

**Oracle Autonomous Database (Always Free, 23ai)** como única base de datos, tanto
en OCI como -vía **Oracle 23ai Free en contenedor**- en desarrollo local.

Migraciones con **Flyway**. El DBA es el responsable de `db/`.

## Alternativas consideradas

**PostgreSQL en contenedor sobre OCI Compute.** Era la opción "segura": el equipo
probablemente la conoce mejor, local y producción son idénticos, cero fricción de
wallet. Descartada porque:

- El requisito de OCI se cumpliría igual (vía Compute + Object Storage), pero
  **desaprovecha la afinidad con el jurado**. En un hackathon de Oracle, usar la
  base de datos insignia de Oracle es una señal que se nota.
- Deja al DBA con menos que mostrar.

**Postgres en local, Autonomous DB en producción.** Descartada de plano: dos
dialectos de SQL, dos juegos de migraciones, y bugs que **solo aparecen el día de
la demo**. Es la peor de las tres opciones y suena a la mejor - por eso vale la
pena dejarlo escrito.

## Consecuencias

**A favor:**

- Cumple el requisito de OCI de la forma más alineada con el espíritu del
  hackathon.
- Always Free: 1 OCPU / 20 GB, más que suficiente.
- Backups automáticos, sin administración de servidor.
- **Spring Boot + JDBC Oracle es una combinación de primera clase** - el driver es
  maduro y Flyway soporta Oracle. La fricción real es baja.
- El DBA tiene un motor serio que modelar.

**En contra (asumido, y hay que gestionarlo):**

- **La conexión exige wallet (mTLS)**: un `.zip` de certificados que **NUNCA** puede
  entrar al repo, que es público. Vive en OCI Vault y lo monta Ansible. Es un paso
  extra en el onboarding de cada persona del equipo.
- **Oracle SQL ≠ Postgres.** La lista de trampas está en
  [`../arquitectura/DATOS.md`](../arquitectura/DATOS.md) §6. La peor: **en Oracle,
  la cadena vacía `''` ES `NULL`**. Un `NOT NULL` no rechaza `''` como uno
  esperaría. La validación de "no vacío" se hace en Spring, no en la BD.
- **Local usa contenedor, OCI usa Autonomous.** No son *idénticos* (el contenedor no
  usa wallet). La diferencia está encapsulada en los perfiles de Spring
  (`application-local.yml` vs `application-oci.yml`) y es la única. Aceptamos ese
  riesgo residual porque el **dialecto SQL sí es el mismo**, que es lo que importa.
- La imagen de Oracle 23ai Free es **pesada (~2 GB)** - el primer `docker compose
  up` de cada persona va a tardar. Se avisa en el ONBOARDING.
