# Documentación de Fintech Vital

Índice de toda la documentación del proyecto. **Empieza aquí.**

---

## Empieza por aquí

| Si quieres… | Lee |
|---|---|
| **Saber qué exige el hackathon** (el enunciado oficial) | [`producto/ENUNCIADO.md`](producto/ENUNCIADO.md) |
| Poner el proyecto a correr desde cero | [`proceso/ONBOARDING.md`](proceso/ONBOARDING.md) |
| Instalar SOLO el frontend en una máquina limpia | [`FRONTEND_DESDE_CERO.md`](FRONTEND_DESDE_CERO.md) |
| Entender el producto (lo que **nosotros** decidimos) | [`producto/REQUISITOS.md`](producto/REQUISITOS.md) |
| Entender arquitectura y rumbo | [`arquitectura/SYSTEM_DESIGN.md`](arquitectura/SYSTEM_DESIGN.md) - **hub** |
| **Revisar el stack con el equipo** (propuesta) | [`arquitectura/STACK.md`](arquitectura/STACK.md) |
| Entender la app móvil | [ADR-0010](adr/0010-app-movil-react-native.md) |
| **Desplegar en la nube** | [`../ops/DESPLIEGUE_NUBE.md`](../ops/DESPLIEGUE_NUBE.md) (llano) · [`../ops/DESPLIEGUE_NUBE_TECNICO.md`](../ops/DESPLIEGUE_NUBE_TECNICO.md) (técnico) |
| Ver los diagramas | [`arquitectura/DIAGRAMAS.md`](arquitectura/DIAGRAMAS.md) |
| **Construir contra la API** (backend / web) | [`arquitectura/CONTRATO_API.md`](arquitectura/CONTRATO_API.md) |
| **Entregar o consumir el modelo** (DS / backend) | [`arquitectura/CONTRATO_MODELO.md`](arquitectura/CONTRATO_MODELO.md) |
| Saber cómo se llama cada categoría y perfil | [`datos/TAXONOMIA.md`](datos/TAXONOMIA.md) |
| Construir el dataset | [`datos/DATASET.md`](datos/DATASET.md) |
| Modelar la BD | [`arquitectura/DATOS.md`](arquitectura/DATOS.md) |
| Ver qué se planeó para OCI (y qué se desplegó) | [`arquitectura/OCI.md`](arquitectura/OCI.md) |
| Saber qué falta | `PENDIENTES_AGENTE.md` · `PENDIENTES_ANGEL.md` (internos, ver abajo) |
| Qué hay que entregar y en qué estado está | [`entrega/CHECKLIST.md`](entrega/CHECKLIST.md) |
| Los entregables de No Country (doc ≤10k · herramientas) | [`NO_COUNTRY_DOCUMENTACION.md`](NO_COUNTRY_DOCUMENTACION.md) · [`NO_COUNTRY_HERRAMIENTAS.md`](NO_COUNTRY_HERRAMIENTAS.md) |
| La marca y sus colores | [`BRANDING.md`](BRANDING.md) |
| Las propuestas del equipo de la S0 | `PROPUESTAS_EQUIPO.md` (interno, ver abajo) |
| El porqué de cada decisión | [`adr/`](adr/) |
| Un término que no conoces | [`GLOSARIO.md`](GLOSARIO.md) |
| Levantar y operar el stack | [`../ops/README.md`](../ops/README.md) |
| Trabajar en la base de datos | [`../db/README.md`](../db/README.md) |
| Trabajar en la API | [`../backend/README.md`](../backend/README.md) |
| Trabajar en el servicio de modelo | [`../ml/README.md`](../ml/README.md) |
| El guion del video de entrega | [`entrega/DEMO.md`](entrega/DEMO.md) |


---

## Estado por módulo

Medido el **2026-08-20** levantando el stack entero, probándolo en un navegador
real y desplegándolo en OCI. No es una estimación.

| Módulo | Documentación | Estado |
|---|---|---|
| **Base de datos** | [`../db/README.md`](../db/README.md) | ✅ 30 tablas · 10 migraciones · semilla y dataset |
| **Operación / contenedores** | [`../ops/README.md`](../ops/README.md) | ✅ Un comando levanta todo. Docker y Podman |
| **Frontend** (web + móvil) | [`../frontend/README.md`](../frontend/README.md) | ✅ Completo, contra la API real. La capa mock se retiró |
| **API** | [`../backend/README.md`](../backend/README.md) | ✅ Completa para lo que consumen las interfaces. Solo falta `GET /auditoria` (admin) |
| **Modelo (ML)** | [`../ml/README.md`](../ml/README.md) | ✅ M1 y M2 entrenados y en uso, con dataset y notebook propios |
| **Despliegue** | [`../ops/DESPLIEGUE_NUBE.md`](../ops/DESPLIEGUE_NUBE.md) | ✅ En producción en OCI: <https://fintechvital.com> |

**Lo que está probado de punta a punta**: la suite de
[`../frontend/e2e/`](../frontend/e2e/) — contrato **35/35** y navegador
**51/51** (escritorio y móvil-web, con `retries: 0`) — más `ops/ejemplos.mjs`
**54/54** contra la API **de producción**. Medido el 2026-08-20.

**Lo que falta**: `GET /auditoria`, mover los umbrales por categoría a la
columna que ya existe en la base, y un **revisor nativo de portugués** para las
traducciones.

---

## Documentos de trabajo (no publicados)

Unos pocos documentos vivos **no están en el repositorio** y se comparten por el
canal del equipo. No son borradores: son la herramienta de coordinación. Ninguno
hace falta para entender, levantar ni modificar el proyecto — para eso están los
contratos, que **sí** se publican.

| Documento | Para qué sirve | Por qué no se publica |
|---|---|---|
| `REVISION_API.md` | Revisión del estado del código de la API | Valora trabajo de compañeros con nombre y apellido |
| `ENDPOINTS.md` | Inventario interno de rutas y su avance | Nació como mapa de lo que aún no estaba protegido. Lo vigente y público es `CONTRATO_API.md` |
| `SINCRONIZACION_<fecha>.md` | Acta de cada sincronización del equipo | Decisiones internas y reparto de trabajo |
| `PENDIENTES_*.md`, `rondas/` | Reparto de tareas y actas de trabajo | Listas personales: nombran a quién le toca cada cosa |
| `operacion/CUENTAS_SERVICIOS.md` | Qué cuentas existen y de quién son | Sin ningún secreto dentro, pero es el mapa administrativo del proyecto |

---

## Los tres contratos

Son la razón por la que el equipo pudo trabajar en paralelo sin bloquearse
—se plantearon para ocho personas, y el equipo acabó siendo de cuatro—. **Cambiarlos exige un ADR y avisar al equipo**: un slug mal escrito
rompe la demo en un sitio distinto del que se tocó.

1. **Contrato de la API** — la forma exacta del JSON que entra y sale
   → [`../docs/arquitectura/CONTRATO_API.md`](../docs/arquitectura/CONTRATO_API.md)
2. **Contrato del modelo** — la costura entre data science y backend
   → [`../docs/arquitectura/CONTRATO_MODELO.md`](../docs/arquitectura/CONTRATO_MODELO.md)
   Responde a la pregunta más frecuente de data science: **el backend manda
   JSON por HTTP, no un CSV.** El CSV es para entrenar; la inferencia se sirve
   detrás de FastAPI.
3. **Taxonomía** — categorías, perfiles e indicadores
   → [`../docs/datos/TAXONOMIA.md`](../docs/datos/TAXONOMIA.md)
   ⚠️ **Ya no está congelada** ([`../db/README.md`](../db/README.md)): el
   catálogo lo manda data science y la base de datos se adapta. Ese documento
   describe el catálogo **vigente**, no uno inmutable.

> ✅ **Ya se publican** (2026-08-20). Estaban excluidos en `frontend/.gitignore`
> desde cuando `frontend/` era lo único que se subía, y con la API, la base de
> datos y el equipo entero trabajando contra ellos, mantenerlos ocultos solo
> garantizaba que cada capa construyera algo distinto.

---

## 🌎 El proyecto es trilingüe

**Español · Portugués · Inglés** ([ADR-0009](adr/0009-multi-idioma.md)). Buena parte
del jurado es de **Brasil** (Alura es brasileña).

Y **no es solo la interfaz**: el clasificador de transacciones (M1) está **entrenado**
en los tres idiomas. Si un evaluador brasileño escribe `IFOOD *PEDIDO` y el modelo
devuelve `Otros`, la demo se cae ahí mismo. Por eso:

- El dataset tiene comercios reales de **MX, BR y EE.UU.** ([`datos/DATASET.md`](datos/DATASET.md) §5.1).
- Se reporta **macro-F1 por idioma**, no solo el global.
- Los slugs **nunca** se traducen; las etiquetas, siempre.

---

## Decisiones (ADR)

Una decisión por archivo, con su contexto, las alternativas descartadas y las
consecuencias — **incluidas las malas**. En
[`../docs/adr/`](../docs/adr/):

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
| **0015** | **Tokens de sesión en el cliente** (localStorage en web, llavero en móvil) |

---

## Cómo está organizada esta carpeta

Desde el **2026-08-20** toda la documentación vive aquí. Antes estaba partida
entre `docs/` y `frontend/docs/`, por herencia de cuando `frontend/` era lo único
que había en el repositorio — pero los tres contratos y los ADR **gobiernan el
proyecto entero**, no solo las interfaces, así que estaban en el sitio
equivocado.

| Carpeta | Contenido |
|---|---|
| `producto/` | `ENUNCIADO.md` (lo que exige el hackathon; fuente externa, no se edita) · `REQUISITOS.md` (lo que decidimos) |
| `arquitectura/` | `SYSTEM_DESIGN.md` (hub) · `CONTRATO_API.md` · `CONTRATO_MODELO.md` · `DIAGRAMAS.md` · y tres planes de la S0 **superados**, que abren con la tabla de qué cambió: `STACK.md`, `DATOS.md`, `OCI.md` |
| `datos/` | `TAXONOMIA.md` (categorías, perfiles, indicadores) · `DATASET.md` |
| `contratos/` | `casos.json` — casos de la costura DS↔Backend |
| `adr/` | Las 15 decisiones, una por archivo, con su porqué |
| `entrega/` | `CHECKLIST.md` · `EJEMPLOS.md` (los 3 obligatorios) · `DEMO.md` (guion del video) |
| `seguridad/` | `SEGURIDAD.md` |
| `proceso/` | `PRUEBAS.md` · `ONBOARDING.md` |
| `operacion/` | `RUNBOOK.md` · `ERRORES.md` · `GO_LIVE.md` (superado) |
| `futuro/` | `ROADMAP.md` — lo que queda fuera a propósito |
| `marca/` | Los SVG originales del diseñador |

En la raíz de `docs/`: `ARQUITECTURA.md` y `DESPLIEGUE.md` (transversales),
`GLOSARIO.md`, `BRANDING.md`, `FRONTEND_DESDE_CERO.md` y los dos entregables de
No Country.

---|---|
| `producto/` | El enunciado del hackathon y los requisitos que decidimos |
| `arquitectura/` | Los contratos, diagramas, modelo de datos, infraestructura OCI |
| `datos/` | Taxonomía y construcción del dataset |
| `adr/` | Las decisiones y su porqué |
| `entrega/` | Checklist del hackathon, ejemplos obligatorios, guion de la demo |
| `proceso/` | Ramas, pruebas, onboarding |
| `operacion/` | Runbook, errores, go-live |
| `seguridad/` | Plan y checklist de seguridad |

> ⚠️ Tres documentos de `arquitectura/` describen **planes de la S0 que se
> cumplieron de otra forma**: `STACK.md` (propuesta original), `DATOS.md` (modelo
> sobre Oracle) y `OCI.md` (infraestructura planeada). Se conservan como registro
> de por qué las cosas quedaron como quedaron, y **cada uno abre con una tabla de
> qué cambió**. Las fuentes de verdad son
> [`ARQUITECTURA.md`](ARQUITECTURA.md), [`../db/README.md`](../db/README.md) y
> [`../ops/DESPLIEGUE_NUBE_TECNICO.md`](../ops/DESPLIEGUE_NUBE_TECNICO.md).

---

## Lo que NO está definido todavía (a propósito)

- **La coordinación formal del equipo.** Reparto de módulos, revisión de PRs y
  CODEOWNERS nunca se formalizaron: con cuatro personas se resolvió hablando.
  Todo lo demás ya está resuelto.

> ℹ️ **Sobre el nombre**: el proyecto se llama **Fintech Vital** desde el
> 2026-07-30, fijado por el logo del equipo. El codename `financeAI` está
> retirado del código y de la documentación; solo sobrevive como nombre de la
> **carpeta en disco**, y por eso alguna ruta lo menciona.
