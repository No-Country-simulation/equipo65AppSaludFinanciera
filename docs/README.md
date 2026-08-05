# Documentación de Fintech Vital

Índice de toda la documentación del proyecto. **Empieza aquí.**

---

## Empieza por aquí

| Si quieres… | Lee |
|---|---|
| Ver qué es el proyecto y arrancarlo | [`../README.md`](../README.md) |
| **Levantar y operar el stack completo** | [`../ops/README.md`](../ops/README.md) |
| Entender cómo encaja todo | [`ARQUITECTURA.md`](ARQUITECTURA.md) |
| Trabajar en la base de datos | [`../db/README.md`](../db/README.md) |
| Trabajar en la API | [`../backend/README.md`](../backend/README.md) |
| Desplegar en staging o producción | [`DESPLIEGUE.md`](DESPLIEGUE.md) |
| Montar solo el frontend en una máquina limpia | [`../frontend/docs/FRONTEND_DESDE_CERO.md`](../frontend/docs/FRONTEND_DESDE_CERO.md) |
| Ramas, commits y pruebas | [`../frontend/docs/proceso/`](../frontend/docs/proceso/) |
| La marca y sus colores | [`../frontend/docs/BRANDING.md`](../frontend/docs/BRANDING.md) |

---

## Estado por módulo

Medido el **2026-08-04** levantando el stack entero y probándolo en un navegador
real y en el emulador de Android. No es una estimación.

| Módulo | Documentación | Estado |
|---|---|---|
| **Base de datos** | [`../db/README.md`](../db/README.md) | ✅ 30 tablas · 10 migraciones · semilla y dataset |
| **Operación / contenedores** | [`../ops/README.md`](../ops/README.md) | ✅ Un comando levanta todo. Docker y Podman |
| **Frontend** (web + móvil) | [`../frontend/README.md`](../frontend/README.md) | ✅ Interfaz completa · 🚧 sin datos reales que mostrar hasta que exista la API |
| **API** | [`../backend/README.md`](../backend/README.md) | 🚧 **Auth y sesión funcionando**; el resto por construir |
| **Modelo (ML)** | — | ⬜ Sin empezar |

**Lo que está probado de punta a punta**: registro de esquema, semilla, login con
JWT contra PostgreSQL real, sesión persistida, idioma del usuario aplicado en las
dos aplicaciones, y degradación correcta cuando falta un endpoint.

**Lo que falta**: la mayor parte de la API (catálogos, transacciones, análisis,
banca, producto, 2FA), el endpoint del enunciado y el servicio de inferencia.

---

## Documentos de trabajo (no publicados)

Hay tres documentos vivos que **no están en el repositorio** y se comparten por
el canal del equipo. No son borradores: son la herramienta de coordinación.

| Documento | Para qué sirve | Por qué no se publica |
|---|---|---|
| `REVISION_API.md` | Qué le falta a la API y en qué orden atacarlo | Valora trabajo de compañeros con nombre y apellido |
| `ENDPOINTS.md` | Los 44 endpoints, uno a uno, con su forma exacta y su estado | En un repositorio público se lee como el mapa de lo que la aplicación todavía no protege |
| `SINCRONIZACION_<fecha>.md` | Acta de cada sincronización del equipo | Decisiones internas y reparto de trabajo |

Si acabas de entrar al equipo y no los tienes, pídelos: sin `ENDPOINTS.md` no se
puede construir la API sin inventarse la forma del JSON.

---

## Los tres contratos

Son la razón por la que ocho personas pueden trabajar en paralelo sin
bloquearse. **Cambiarlos exige un ADR y avisar al equipo**: un slug mal escrito
rompe la demo en un sitio distinto del que se tocó.

1. **Contrato de la API** — la forma exacta del JSON que entra y sale
   → `../frontend/docs/arquitectura/CONTRATO_API.md`
2. **Contrato del modelo** — la costura entre data science y backend
   → `../frontend/docs/arquitectura/CONTRATO_MODELO.md`
   Responde a la pregunta más frecuente de data science: **el backend manda
   JSON por HTTP, no un CSV.** El CSV es para entrenar; la inferencia se sirve
   detrás de FastAPI.
3. **Taxonomía** — categorías, perfiles e indicadores
   → `../frontend/docs/datos/TAXONOMIA.md`
   ⚠️ **Ya no está congelada** ([`../db/README.md`](../db/README.md)): el
   catálogo lo manda data science y la base de datos se adapta. Ese documento
   describe el catálogo **vigente**, no uno inmutable.

> ⚠️ **Estos tres archivos todavía no se publican** (están excluidos en
> `frontend/.gitignore`, de cuando `frontend/` era lo único que se subía). Ahora
> que la API, la base de datos y el equipo entero trabajan contra ellos,
> mantenerlos ocultos garantiza que se construyan cosas distintas. **Publicarlos
> es una decisión pendiente, y la recomendación es hacerlo.**

---

## Decisiones (ADR)

Una decisión por archivo, con su contexto, las alternativas descartadas y las
consecuencias — **incluidas las malas**. En
[`../frontend/docs/adr/`](../frontend/docs/adr/):

| # | Decisión |
|---|---|
| 0001 | Monorepo |
| 0002 | Tres servicios (web · API · ML) |
| 0003 | ~~Oracle Autonomous DB~~ *(reemplazada por la 0014)* |
| 0004 | Autenticación propia con JWT |
| 0005 | Infraestructura OCI privada |
| 0006 | Dataset sintético |
| 0007 | Recomendaciones por reglas, **no** por LLM |
| 0008 | La infraestructura nunca bloquea a la aplicación |
| 0009 | Proyecto trilingüe (es · pt · en) |
| 0010 | App móvil en React Native |
| 0011 | Capa mock desacoplada *(cumplida: los mocks ya se retiraron)* |
| 0012 | ~~MySQL 8~~ *(reemplazada por la 0014)* |
| 0013 | 2FA obligatorio en el registro |
| **0014** | **PostgreSQL 16 como motor** |

---

## Qué hay en `frontend/docs/`

Documentación anterior a que el repositorio tuviera API y base de datos. Sigue
siendo válida y es **la fuente de los contratos**:

| Carpeta | Contenido |
|---|---|
| `producto/` | El enunciado del hackathon y los requisitos que decidimos |
| `arquitectura/` | Los contratos, diagramas, modelo de datos, infraestructura OCI |
| `datos/` | Taxonomía y construcción del dataset |
| `adr/` | Las decisiones y su porqué |
| `entrega/` | Checklist del hackathon, ejemplos obligatorios, guion de la demo |
| `proceso/` | Ramas, pruebas, onboarding |
| `operacion/` | Runbook, errores, go-live |
| `seguridad/` | Plan y checklist de seguridad |

> ⚠️ Parte de esa documentación **todavía menciona Oracle o MySQL** como motor
> (`arquitectura/STACK.md`, `DATOS.md`, `OCI.md`). El motor real es
> **PostgreSQL 16** ([ADR-0014](../frontend/docs/adr/0014-motor-postgresql.md)) y
> el modelo de datos vigente es [`../db/README.md`](../db/README.md).
> Actualizarla está pendiente.
