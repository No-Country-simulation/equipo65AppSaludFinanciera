# Tarea 3 de No Country - Herramientas del Equipo

**Qué es esto**: la plataforma de No Country (Proyecto → Entregables → *Tarea
3: Herramientas del Equipo*) pide seleccionar **hasta 10 herramientas y
tecnologías** que el equipo utilizó. Este documento fija cuáles 10 se
seleccionan (para que representen todo el stack, no solo una capa) y lleva el
registro completo de lo que realmente se usa, para actualizar la selección si
el stack cambia.

**Fecha límite en la plataforma: 25 de agosto de 2026** (documento vivo).

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
| 8 | **Oracle Cloud (OCI)** | Requisito del hackathon: Autonomous DB, Object Storage, Compute |
| 9 | **Docker** | Contenedores en local y en despliegue |
| 10 | **GitHub Actions** | CI (tests + lint por módulo) |

> Si el buscador de la plataforma no tiene alguna exacta, elegir la más
> cercana (ej. "React" por Next.js, "Oracle" por OCI) y anotarlo aquí.

## Registro completo (se actualiza al incorporar herramientas)

**Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · next-intl ·
Recharts · React Native 0.86 · Expo SDK 57 · Expo Router · AsyncStorage ·
react-native-svg

**Backend** *(desde S1)*: Java 21 · Spring Boot 3 · Maven · Bean Validation ·
Flyway · OpenAPI/Swagger · JWT · BCrypt

**Data / ML** *(desde S1)*: Python 3.11 · pandas · scikit-learn · FastAPI ·
Jupyter · joblib · ruff · pytest

**Base de datos**: Oracle Autonomous Database (local: Oracle 23ai Free en
contenedor)

**Infra / operación**: Docker + Docker Compose (alternativa local: Podman) ·
Terraform · Ansible · nginx · Cloudflare Tunnel · OCI (Compute ARM, Object
Storage, Vault, Bastion) · GitHub Actions · gitleaks

**Proceso**: Git + GitHub · PowerShell / Bash (scripts de desarrollo por SO)

## Pendiente

- ⬜ Confirmar con el equipo la lista de 10 en la primera reunión (junto con
  el reparto de módulos).
- ⬜ Cargarla en la plataforma y marcar la tarea.
- ⬜ Revisarla al congelar la integración (9 de agosto): lo que no se usó, se
  saca; lo nuevo, entra.
