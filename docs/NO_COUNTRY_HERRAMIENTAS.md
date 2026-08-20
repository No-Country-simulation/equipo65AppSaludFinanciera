# Tarea 3 de No Country - Herramientas del Equipo

**Qué es esto**: la plataforma de No Country (Proyecto → Entregables → *Tarea
3: Herramientas del Equipo*) pide seleccionar **hasta 10 herramientas y
tecnologías** que el equipo utilizó. Este documento fija cuáles 10 se
seleccionan (para que representen todo el stack, no solo una capa) y lleva el
registro completo de lo que realmente se usa, para actualizar la selección si
el stack cambia.

**Fecha límite en la plataforma: 25 de agosto de 2026** (documento vivo).
**Revisado contra lo desplegado el 2026-08-20.**

## Las 10 a seleccionar

Criterio: una por capa visible del proyecto, priorizando lo que el jurado
puede verificar en el repo y la demo.

| # | Herramienta | Representa |
|---|---|---|
| 1 | **Java / Spring Boot** | API pública, auth, motor de reglas |
| 2 | **Python** | Ciencia de datos y servicio de inferencia |
| 3 | **scikit-learn** | Los 2 modelos de ML (M1 texto, M2 perfil) |
| 4 | **FastAPI** | Servicio de inferencia |
| 5 | **Next.js (React)** | Dashboard web |
| 6 | **React Native / Expo** | App móvil |
| 7 | **TypeScript** | Todo el frontend |
| 8 | **Oracle Cloud (OCI)** | Requisito del hackathon: Compute ARM, Container Registry, Vault, Bastion |
| 9 | **Docker** | Contenedores. En local funciona con Docker **y** con Podman; en la instancia de OCI corre con **podman-compose**, rootless |
| 10 | **PostgreSQL** | Toda la persistencia: 30 tablas, 10 migraciones versionadas |

> Si el buscador de la plataforma no tiene alguna exacta, elegir la más
> cercana (ej. "React" por Next.js, "Oracle" por OCI) y anotarlo aquí.
>
> ⚠️ **Solo se listan herramientas que el proyecto usa de verdad y que el jurado
> puede verificar en el repositorio.** En la lista había *GitHub Actions*, que
> se planeó y **no se llegó a montar**: no hay ningún workflow en `.github/`.
> Su lugar lo ocupa PostgreSQL, que sí es una capa entera del proyecto.
>
> **Quedaron fuera por el tope de 10**, aunque se usan: **Cloudflare Tunnel** (es
> la única entrada a producción y probablemente lo más distintivo del montaje),
> **Tailwind CSS**, **next-intl** y **Playwright**. Si la plataforma admitiera
> una más, la candidata es Cloudflare; si hubiera que sacar una, la menos
> informativa es *TypeScript*, que ya va implícita en Next.js y React Native.

## Registro completo (se actualiza al incorporar herramientas)

**Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · next-intl ·
Recharts · React Native 0.86 · Expo SDK 57 · Expo Router · AsyncStorage ·
react-native-svg

**Backend**: Java 21 · Spring Boot 3 · Maven · Bean Validation ·
OpenAPI/Swagger (springdoc) · JWT · BCrypt · TOTP propio (RFC 6238)

**Data / ML**: Python 3.11 · pandas · scikit-learn · FastAPI ·
Jupyter · joblib · ruff · pytest

**Base de datos**: PostgreSQL 16, en contenedor tanto en local como en
producción. Migraciones propias versionadas (no Flyway).

**Infra / operación**: Docker + Docker Compose · Podman + podman-compose ·
Cloudflare Tunnel · OCI (Compute ARM, Container Registry, Vault, Bastion) ·
Playwright (pruebas de navegador)

**Proceso**: Git + GitHub · PowerShell / Bash (scripts de desarrollo por SO)

**Planeado y NO usado** — se anota para no listarlo por error: Terraform ·
Ansible · nginx · GitHub Actions · gitleaks · Flyway · Oracle Autonomous
Database · OCI Object Storage.

## Pendiente

- ⬜ Confirmar con el equipo la lista de 10 (junto con el reparto de módulos).
- ⬜ Cargarla en la plataforma y marcar la tarea.
- ✅ Revisada tras el despliegue en OCI (2026-08-20): lo que no se usó, fuera.

> Si alguien monta CI antes de la entrega, **GitHub Actions vuelve a la lista** y
> hay que actualizar también `docs/proceso/PRUEBAS.md` §3, `GLOSARIO.md` y
> `docs/seguridad/SEGURIDAD.md` §1, que hoy dicen explícitamente que no existe.
