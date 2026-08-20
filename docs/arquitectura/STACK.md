# STACK - propuesta para revisar con el equipo

> ⚠️ **Documento de la S0: es la propuesta ORIGINAL, no el inventario de lo que
> se construyó.** Varias filas quedaron superadas por ADRs posteriores. Lo que
> corre de verdad está en [`../../../docs/ARQUITECTURA.md`](../ARQUITECTURA.md)
> y en el `README.md` de la raíz.
>
> Lo que cambió respecto a lo que se propone aquí:
>
> - **Base de datos: PostgreSQL 16**, no Oracle Autonomous ([ADR-0014](../adr/0014-motor-postgresql.md),
>   que supersede a la [0012](../adr/0012-motor-mysql.md) —MySQL— y a la
>   [0003](../adr/0003-oracle-autonomous-db.md) —Oracle—).
> - **Migraciones propias**, no Flyway: `db/migraciones/` + `aplicar.sh`.
> - **Se añadió app móvil** (React Native + Expo, [ADR-0010](../adr/0010-app-movil-react-native.md)).
> - **La capa mock se retiró** ([ADR-0011](../adr/0011-mocks-desacoplados-frontend.md)): la única
>   fuente es la API real.
>
> Las tres preguntas del §3 ya están respondidas: Next.js, PostgreSQL y Java.

> 🗣️ **Este doc es para la primera reunión del equipo.** Es la **propuesta inicial**, con el porqué de cada elección y sus alternativas, para que el equipo la
> cuestione **con criterio** en vez de discutir desde cero.
>
> Las decisiones ya están congeladas en los [ADRs](../adr/) para no bloquear el
> arranque (los contratos dependen de ellas). Pero **congelado no es inamovible**: si
> el equipo quiere cambiar algo, se escribe un **ADR nuevo que supersede** al viejo.
> Lo que **no** se puede es cambiarlo en silencio - rompería el trabajo de los demás.

## Cómo leer la columna "firmeza"

| | Significado |
|---|---|
| 🔒 **Fijo** | Lo impone el enunciado o es un requisito duro. Cambiarlo es casi salirse del hackathon. Poco que discutir. |
| 🟡 **Recomendación fuerte** | Es una decisión de diseño, defendible, pero el equipo **puede** cambiarla con un ADR si hay una razón mejor. |
| 🟢 **Abierto** | Detalle donde el equipo elige librería/herramienta concreta. Bajo impacto. |

---

## §1 El stack de un vistazo

| Capa | Elección | Versión | Firmeza | Por qué / ADR |
|---|---|---|---|---|
| **API pública** | Java + Spring Boot | 21 (LTS) · Boot 3.3+ | 🟡 | El enunciado lo pide ("preferentemente"); 3 de backend son perfil Java. [ADR-0002](../adr/0002-tres-servicios.md) |
| **Servicio de modelo** | Python + FastAPI + scikit-learn | 3.11 · sklearn 1.5.x | 🔒 | El modelo es de sklearn; Java no carga un `.joblib`. El notebook es entregable en Python. [ADR-0002](../adr/0002-tres-servicios.md) |
| **Web** | Next.js + TypeScript + Tailwind | 15 · TS 5 | 🟡 | 1 fullstack lo saca solo. **La más abierta - ver §3.** [ADR-0002](../adr/0002-tres-servicios.md) |
| **Móvil** | React Native + Expo + TypeScript | Expo SDK 57 · RN 0.86 | 🟡 | Decisión del equipo; misma API, referencia BBVA. Best-effort, no bloquea la entrega. [ADR-0010](../adr/0010-app-movil-react-native.md) |
| **Base de datos** | ~~Oracle Autonomous Database~~ → **PostgreSQL 16** | 16-alpine | 🔒 | Decidido: [ADR-0014](../adr/0014-motor-postgresql.md). `JSONB`, `UUID` y `TIMESTAMPTZ` nativos; OCI se cumple con Object Storage |
| **Nube** | OCI | Always Free | 🔒 | **Requisito obligatorio del enunciado.** [ADR-0005](../adr/0005-infra-oci-privada.md) |
| **Auth** | Spring Security + JWT propio | - | 🟡 | Control total, sin terceros; el equipo quiere hacerlo. [ADR-0004](../adr/0004-auth-propio-jwt.md) |
| **Multi-idioma** | es · pt · en | - | 🔒 | Jurado mayoritariamente de Brasil. [ADR-0009](../adr/0009-multi-idioma.md) |
| **Recomendaciones** | Motor de reglas (NO LLM) | - | 🟡 | Explicable, determinista, sin costo. [ADR-0007](../adr/0007-recomendaciones-por-reglas.md) |
| **Dataset** | Sintético, generado por el equipo | - | 🟡 | El enunciado obliga a construirlo. [ADR-0006](../adr/0006-dataset-sintetico.md) |
| **Contenedores** | Docker + docker-compose | - | 🟡 | Entorno idéntico local/OCI. |
| **IaC** | Terraform + Ansible | - | 🟡 | Infra reproducible. [ADR-0005](../adr/0005-infra-oci-privada.md) |
| **Ingress** | Cloudflare Tunnel + nginx | - | 🟡 | Cero puertos abiertos, sin IP pública. |
| **CI/CD** | GitHub Actions | - | 🟡 | Repo público + Actions. |
| **Repo** | Monorepo | - | 🟡 | Un lugar para los contratos, una entrega. [ADR-0001](../adr/0001-monorepo.md) |

---

## §2 Tooling por capa (versiones y librerías concretas)

Esto es lo que hay que instalar y con qué se construye. La mayoría es 🟢 **abierto**:
si alguien prefiere otra librería equivalente, adelante.

### Backend (Java)

| Qué | Elección | Firmeza |
|---|---|---|
| Build | **Maven** (`./mvnw`, wrapper en el repo) | 🟡 (o Gradle, si el equipo lo prefiere) |
| Framework | Spring Boot 3.3+ (Web, Security, Validation, Data JPA) | 🟡 |
| Migraciones | ~~Flyway~~ → **propias** (`db/migraciones/` + `aplicar.sh`, SHA-256 en `esquema_historial`) | 🔒 |
| Docs API | **springdoc-openapi** → Swagger UI en `/api/v1/docs` | 🟢 |
| JWT | **`jjwt`** (o `java-jwt` de Auth0) | 🟢 |
| TOTP (2FA) | librería conocida (p. ej. `dev.samstevens.totp`) - **no implementar HMAC a mano** | 🟢 |
| Tests | **JUnit 5** + E2E de contrato contra el stack real (`frontend/e2e/`) | 🔒 |
| Estilo | Checkstyle o Spotless | 🟢 |

### Servicio de modelo (Python)

| Qué | Elección | Firmeza |
|---|---|---|
| Runtime | **Python 3.11** | 🔒 (fijar la versión: sklearn es sensible) |
| API | **FastAPI** + **uvicorn** | 🟡 |
| ML | **scikit-learn 1.5.x** (versión **fijada exacta** con `==`) | 🔒 (el `.joblib` depende de la versión) |
| Datos | pandas, numpy | 🔒 |
| Serialización | **joblib** (no pickle crudo) | 🟡 |
| Explicabilidad | SHAP (opcional, v1.1) | 🟢 |
| Dataset | Faker + YAML de catálogos | 🟢 |
| Tests / lint | **pytest** + **ruff** | 🟢 |

> ⚠️ **La versión de scikit-learn se fija exacta** (`scikit-learn==1.5.2`, no `>=`).
> Un `.joblib` entrenado con 1.5 y cargado con 1.4 puede fallar o -peor- cargar mal en
> silencio. Ver [`CONTRATO_MODELO.md`](CONTRATO_MODELO.md) §6.

### Web (Next.js)

| Qué | Elección | Firmeza |
|---|---|---|
| Framework | **Next.js 15** (App Router) + **TypeScript** | 🟡 |
| Estilos | **Tailwind CSS** | 🟢 |
| i18n | **next-intl** (rutas `/es`, `/pt`, `/en`) | 🟡 (decidir ANTES de escribir pantallas) |
| Gráficos | **Recharts** (o Chart.js) | 🟢 |
| Fetch/estado | fetch nativo + TanStack Query (opcional) | 🟢 |
| Datos en dev | ~~Capa mock desacoplada~~ → **retirada**: la API real, siempre | ✅ ([ADR-0011](../adr/0011-mocks-desacoplados-frontend.md), cumplida) |
| Tests | Vitest + Playwright (si da el tiempo) | 🟢 |

### Móvil (React Native) - [ADR-0010](../adr/0010-app-movil-react-native.md)

| Qué | Elección | Firmeza |
|---|---|---|
| Framework | **React Native + Expo** (TypeScript) | 🟡 |
| Navegación | **Expo Router** (tabs + stacks, file-based) | 🟢 |
| Gráficos | `react-native-svg` (donut/barras/línea propios, livianos) | 🟢 |
| i18n | Diccionarios JSON compartidos con la web (`es`/`pt`/`en`) | 🟡 |
| Datos en dev | Misma capa mock desacoplada que la web | 🟡 ([ADR-0011](../adr/0011-mocks-desacoplados-frontend.md)) |
| Distribución | Emulador / APK de desarrollo (NO stores en este alcance) | 🔒 |

### Infra / DevOps

| Qué | Elección | Firmeza |
|---|---|---|
| Contenedores | Docker + docker-compose | 🟡 |
| IaC | Terraform (infra) + Ansible (config/deploy) | 🟡 |
| Ingress | Cloudflare Tunnel (`cloudflared`) + nginx | 🟡 |
| Registro de imágenes | GHCR (GitHub Container Registry) | 🟢 |
| Secretos | OCI Vault (prod) · `.env` gitignoreado (local) | 🔒 (el repo es público) |
| Escaneo de secretos | **gitleaks** (pre-commit + CI) | 🔒 |
| Servicios OCI | Autonomous DB · Object Storage · Compute · Vault · Bastion | 🔒 (al menos uno; usamos varios) |

---

## §3 Las 3 decisiones que MÁS conviene revisar con el equipo

El resto del stack es bastante forzado por el enunciado. Estas tres son donde la
opinión del equipo puede cambiar la elección:

### 🟡 Frontend: ¿Next.js, Vite o Angular?

Todo el frontend recae en quien lo construya, así que **la elección correcta es la que esa persona domine mejor**, no la "mejor en abstracto".

| Opción | A favor | En contra |
|---|---|---|
| **Next.js 15** *(propuesta)* | Ecosistema enorme, i18n y auth resueltos, SSR | Más "magia" que aprender si no lo conoce |
| React + Vite (SPA) | Más simple, build estático → se puede servir desde Object Storage (otro uso de OCI) | Hay que cablear i18n y rutas a mano |
| Angular | Afinidad con el mundo Oracle/Alura | Solo si el fullstack ya lo domina; si no, fricción pura |

> **Pregunta para el kickoff**: ¿qué domina de verdad el fullstack? Si no es
> Next.js, cambiarlo ahora es barato; en la semana 3, carísimo.

### ✅ RESUELTO - Base de datos: PostgreSQL 16

> **Decidido en la [ADR-0014](../adr/0014-motor-postgresql.md).** El texto de abajo
> es la pregunta original de la S0; se conserva para que se vea el razonamiento.
> La respuesta fue la "ruta segura": Postgres, cumpliendo OCI vía Object Storage.

Elegimos Oracle por **afinidad con el jurado** (es un hackathon de Oracle) y porque
hay un DBA. El costo real: wallet mTLS, `''` es `NULL`, imagen local pesada.

> **Pregunta para el kickoff**: ¿el DBA se siente cómodo con Oracle, o el equipo
> prefiere la ruta segura de Postgres (cumpliendo OCI vía Object Storage + Compute)?
> Es un trade-off de **puntos con el jurado vs. fricción de desarrollo**. Yo me
> inclino por Oracle, pero es defendible al revés.

### 🟡 Backend: ¿de verdad Java, o Python también para la API?

El enunciado dice "preferentemente Java". Si los 3 de backend fueran más fuertes en
Python, un backend 100% FastAPI (API + modelo en un servicio) sería más simple.

> **Pregunta para el kickoff**: ¿los 3 de backend están cómodos en Spring Boot? Si
> sí, Java suma puntos con el jurado. Si hay dudas, vale la pena saberlo hoy.

---

## §4 Lo que NO está a discusión (🔒)

Para que la reunión no se vaya por las ramas: **estas no se cuestionan** salvo que
alguien encuentre que el enunciado dice otra cosa.

- **OCI** - requisito obligatorio.
- **Python + scikit-learn para el modelo** - es el entregable de Data Science.
- **Multi-idioma es/pt/en** - el jurado es mayoritariamente de Brasil.
- **Formato del endpoint `/analisis-financiero`** - es literal del enunciado.
- **La taxonomía congelada** - cambiarla rompe las 4 capas.
- **Secretos fuera del repo + gitleaks** - el repo es público.

---

## §5 Qué necesita instalar cada rol

Detalle en [`../proceso/ONBOARDING.md`](../proceso/ONBOARDING.md) §1. Resumen:

| Rol | Instala | Trabaja en |
|---|---|---|
| Backend (×3) | Docker, JDK 21 | `backend/` |
| Data Science (×2) | Docker, Python 3.11 | `ml/` (notebooks + servicio) |
| Data (×1) | Python 3.11 | `ml/dataset/` |
| DBA (×1) | Docker, cliente SQL Oracle | `db/` |
| Fullstack (×1) | Docker, Node 20+ | `web/` |
| Infra (×1) | Terraform, Ansible, OCI CLI | `infra/` |

> **Con Docker alcanza para levantar todo el stack.** El resto es solo para
> desarrollar esa capa en concreto.

---

## §6 Resumen para llevar a la reunión

1. **El 80% del stack está forzado** por el enunciado (OCI, Python/sklearn,
   multi-idioma, formato del endpoint). Poco que discutir ahí.
2. **Discutan estas 3**: framework del frontend (según el fullstack), Oracle vs
   Postgres (según el DBA), y confirmar que los 3 de backend están cómodos en Java.
3. **Todo cambio se hace con un ADR nuevo**, no en silencio - porque los contratos ya
   están congelados y otras personas dependen de ellos.
4. Lo demás (librería de gráficos, de TOTP, Maven vs Gradle) es 🟢: **que cada responsable
   de módulo elija** y lo anote.
