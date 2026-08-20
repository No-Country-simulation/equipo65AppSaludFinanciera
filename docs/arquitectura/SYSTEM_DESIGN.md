# System Design - HUB de arquitectura

Si solo se puede leer un doc de arquitectura, es este. Los demás enlazan aquí.
Actualizado: **2026-08-20**.

## §1 Estado actual

**Construido y en producción.** Lo que describe este documento ya no es un
diseño objetivo: es lo que corre. Lo que sí quedó por el camino son tres cosas
del plan original, y están señaladas donde aparecen — el motor de base de datos
(§5), el despliegue (§7) y la CI (§7).

| Entorno | Estado |
|---|---|
| local (compose) | ✅ `./ops/stack.sh arriba` levanta db + ml + api + web |
| OCI | ✅ instancia Compute ARM, subred privada sin IP pública |
| público (Cloudflare Tunnel) | ✅ `fintechvital.com` · `www` · `api` |

**Verificado el 2026-08-20**: los tres hostnames responden, `/api/v1/salud` da
`ok` en API, base de datos y modelo, y el smoke test funcional
(`ops/ejemplos.mjs`) pasa **54/54** contra producción.

## §2 Topología

### Local (el entorno de desarrollo de todos, desde el día 1)

```
                    ./ops/stack.sh arriba

  localhost:3000            localhost:8080           (red interna, sin puerto expuesto)
  ┌──────────────┐   HTTP   ┌──────────────┐  HTTP   ┌──────────────┐
  │   web        │ ───────► │   backend    │ ──────► │      ml      │
  │  Next.js 15  │          │ Spring Boot 3│         │   FastAPI    │
  └──────────────┘          └──────┬───────┘         │  scikit-learn│
  ┌──────────────┐   HTTP          │ JDBC            └──────────────┘
  │   mobile     │ ────────►┐      ▼
  │ React Native │  (10.0.2.2┐┌──────────────┐
  │ (emulador)   │   :8080) └►│      db      │  <- PostgreSQL 16, en contenedor
  └──────────────┘            │  :5432       │     (ADR-0014)
                              └──────────────┘
```

> 📱 La app móvil ([ADR-0010](../adr/0010-app-movil-react-native.md)) es un
> **cuarto cliente de la misma API**: no corre en compose (corre en el emulador /
> dispositivo) y llega al backend local vía `http://10.0.2.2:8080` (alias del
> host en el emulador Android). Los dos frontends comparten `src/data` **byte a
> byte**, y hay un test de la suite E2E que lo comprueba.

> **`ml-fake`**: existió como stub que respetaba el
> [`CONTRATO_MODELO.md`](CONTRATO_MODELO.md) para que el backend no esperara a
> data science. Ya no hace falta: **el servicio real está en uso**. El contrato
> sigue siendo el mismo, que era justo el objetivo. La integración fue cambiar
> una variable (`FV_ML_URL=http://ml:8000`) y funcionó a la primera.

### OCI (producción / demo)

```
   Internet
      │
      ▼
 ┌─────────────────────┐
 │    Cloudflare       │   TLS, anti-DDoS, DNS: fintechvital.com
 │  (Zero Trust)       │   Balancea entre las 4 replicas del tunel
 └──────────┬──────────┘
            │  Cloudflare Tunnel (saliente desde OCI - NINGUN puerto de entrada abierto)
 ═══════════╪══════════════════════════════════════════════════════════════
            ▼           VCN privada  10.0.0.0/16   (SIN IPs publicas)
 ┌────────────────────────────────────────────────────────────────────┐
 │                                                                    │
 │   Subred privada  10.0.1.0/24                                      │
 │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
 │   │  app-1   │  │  app-2   │  │  app-3   │  │  app-4   │  ARM 1/6GB│
 │   │──────────│  │──────────│  │──────────│  │──────────│  c/u      │
 │   │cloudflared  │cloudflared  │cloudflared  │cloudflared           │
 │   │ nginx    │  │ nginx    │  │ nginx    │  │ nginx    │           │
 │   │ web      │  │ web      │  │ web      │  │ web      │           │
 │   │ backend  │  │ backend  │  │ backend  │  │ backend  │           │
 │   │ ml       │  │ ml       │  │ ml       │  │ ml       │           │
 │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
 │        └─────────────┴──────┬──────┴─────────────┘                 │
 │                             │ JDBC (wallet mTLS)                   │
 │                             ▼                                      │
 │                  ┌─────────────────────┐                           │
 │                  │  Autonomous Database │  Oracle 23ai, Always Free │
 │                  │  (endpoint privado)  │                          │
 │                  └─────────────────────┘                           │
 │                                                                    │
 │   NAT Gateway  ──► salida a internet (cloudflared, API de tasas)   │
 │   Service GW   ──► Object Storage (modelos, datasets) sin salir    │
 │   OCI Bastion  ──► unico acceso SSH del equipo (sesiones efimeras) │
 │   OCI Vault    ──► secretos (JWT, wallet, clave interna, tokens)   │
 └────────────────────────────────────────────────────────────────────┘

> ⚠️ **Ese diagrama es el PLAN de la S0, no lo desplegado.** Lo que corre desde
> el 2026-08-20 es más pequeño: **una sola instancia** con los cinco
> contenedores, **PostgreSQL en contenedor** (no Autonomous DB, ADR-0014), y sin
> Object Storage — los modelos van horneados en la imagen del servicio de ML. Lo
> que sí es tal cual: subred privada sin IP pública, Bastion como único acceso,
> Vault para los secretos y Cloudflare Tunnel como única entrada.
>
> La topología real está en §7 y, con detalle, en
> [`../../../ops/DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md) §1.
```

**Decisión de topología (importante, y va contra la intuición inicial):**

Se planteó poner un **Load Balancer privado de OCI** entre el túnel y las
instancias. **No lo usamos en v1**, porque `cloudflared` **ya balancea solo**: al
correr 4 réplicas del mismo túnel (una por instancia), Cloudflare reparte el
tráfico entre ellas y hace failover si una muere. Poner un LB detrás del túnel
agrega un salto, un punto de fallo y consume el único LB del Always Free **sin
aportar nada** que el túnel no haga ya.

El LB entra **solo si** aparece una necesidad real (p. ej. terminar tráfico
interno entre servicios, o balancear algo que no pasa por el túnel). Está
documentado como decisión reversible en
[`../adr/0005-infra-oci-privada.md`](../adr/0005-infra-oci-privada.md).

## §3 Stack y porqués

| Capa | Elección | Porqué | ADR |
|---|---|---|---|
| Repo | Monorepo | Un solo lugar para los contratos; entrega en un link | [0001](../adr/0001-monorepo.md) |
| API pública | **Java 21 + Spring Boot 3** | El enunciado lo pide ("preferentemente"); 3 personas de backend | [0002](../adr/0002-tres-servicios.md) |
| Inferencia | **Python 3.11 + FastAPI + scikit-learn** | El modelo es de sklearn; convertirlo a Java (ONNX) es frágil y caro | [0002](../adr/0002-tres-servicios.md) |
| Web | **Next.js 15 + TS + Tailwind** | 1 fullstack lo saca solo; Recharts para los gráficos | [0002](../adr/0002-tres-servicios.md) |
| Móvil | **React Native + Expo + TS** | Decisión del equipo; mismo contrato de API, referencia visual BBVA. Best-effort: no bloquea la entrega | [0010](../adr/0010-app-movil-react-native.md) |
| Mocks de desarrollo | ~~Capa de datos desacoplada~~ → **retirada** al completarse la API | El frontend construyó sin backend; la demo corre SIEMPRE contra la API real | [0011](../adr/0011-mocks-desacoplados-frontend.md) |
| BD | ~~Oracle Autonomous Database~~ → **PostgreSQL 16** | El modelo del equipo ya venía escrito para SQL abierto y forzar Oracle costaba más de lo que sumaba. El requisito de OCI se cumple por Compute, OCIR, Vault y Bastion | [0014](../adr/0014-motor-postgresql.md) |
| Auth | JWT propio (Spring Security) | Control total, sin dependencias fuera de OCI, y el equipo quiere hacerlo desde 0 | [0004](../adr/0004-auth-propio-jwt.md) |
| Infra | VCN privada + Cloudflare Tunnel (~~Terraform + Ansible~~ → scripts propios en `ops/oci/`) | Cero puertos abiertos, cero IPs públicas | [0005](../adr/0005-infra-oci-privada.md) |
| Dataset | Sintético | El enunciado obliga a construirlo; control del balance de clases | [0006](../adr/0006-dataset-sintetico.md) |
| Recomendaciones | Motor de reglas (NO LLM) | Explicable, auditable, determinista, sin costo ni latencia | [0007](../adr/0007-recomendaciones-por-reglas.md) |
| - | **La infra no bloquea a la app** | Regla de gestión de riesgo del hackathon | [0008](../adr/0008-infra-no-bloquea-app.md) |

## §4 Datos

Detalle completo en [`DATOS.md`](DATOS.md). Resumen:

- **Las 9 tablas del núcleo**: `usuario`, `refresh_token`, `intento_login`,
  `evento_auditoria`, `transaccion`, `categoria`, `tasa_cambio`, `analisis`,
  `recomendacion`. El esquema real acabó teniendo **30**; el inventario completo
  está en [`../../../db/README.md`](../../db/README.md).
- **Migraciones**: propias, **no Flyway** (`db/migraciones/V<n>__*.sql` +
  `aplicar.sh`, con SHA-256 en `esquema_historial`). Nunca se edita una ya
  aplicada: el script aborta si el hash cambió.
- **Dinero**: `DECIMAL(12,2)`. Nunca float.
- **PII**: el dataset es sintético; las cuentas de usuario son de prueba. Aun así
  la contraseña va con **BCrypt (cost 12)** y los refresh tokens **hasheados**.
- **Multi-moneda**: cada transacción guarda su `moneda`; los análisis normalizan a
  la moneda principal del usuario con la tasa **vigente a la fecha de la
  transacción** (tabla `tasa_cambio`, con `vigente_desde`).

## §5 Auth

- **Registro/login** con email + contraseña (BCrypt cost 12, mínimo 10 chars).
- **Access token**: JWT HS256, TTL 15 min. Claims: `sub`, `email`, `rol`.
- **Refresh token**: opaco (256 bits random), TTL 7 días, **guardado hasheado**,
  **rotativo**. Reúso de un refresh ya consumido → se revoca **toda la familia** y
  se audita: es la señal de que alguien robó un token.
- **2FA TOTP** (RFC 6238): opcional, se activa desde el perfil. Códigos de
  respaldo de un solo uso.
- **Bloqueo**: 5 fallos de login sobre el mismo email → 15 min de bloqueo (429).
- **Rate limit**: nginx (por IP) + Spring (por usuario). Ver
  [`CONTRATO_API.md`](CONTRATO_API.md) §9.
- **Auditoría**: login ok/fallido, cambio de contraseña, activación/desactivación
  de 2FA, reúso de refresh, acceso a datos financieros → tabla `evento_auditoria`.

**Regla dura que el agente no debe romper (RN9)**: un usuario **solo** ve sus
propias transacciones y análisis. Toda query filtra por `usuario_id` sacado del
JWT - **nunca** de un parámetro de la petición. Si el recurso no es tuyo →
**404**, no 403 (no filtramos la existencia).

## §6 Seguridad

Resumen + checklist en [`../seguridad/SEGURIDAD.md`](../seguridad/SEGURIDAD.md).

Lo crítico: **el repo es PÚBLICO**. Las llaves de OCI y los
`.env` con valores reales **nunca** entran al repo. Los secretos viven en **OCI
Vault** (prod) y en un `.env` local gitignoreado (dev). Estaba previsto instalar
`gitleaks` en el pre-commit y en CI; **no se llegó a montar**, así que la
auditoría de secretos se hace a mano antes de cada publicación.

## §7 Entornos y despliegue

> ✅ **Desplegado el 2026-08-20.** Esta tabla describe **lo que se hizo**, que es
> más pequeño que lo que se había planeado en
> [`OCI.md`](OCI.md): una instancia en vez de cuatro, PostgreSQL en contenedor en
> vez de Autonomous DB, y scripts propios en vez de Terraform + Ansible.

| | local | OCI (producción) |
|---|---|---|
| **Cómo se levanta** | `./ops/stack.sh arriba` | `ops/oci/desplegar.ps1` |
| **BD** | PostgreSQL 16 en contenedor | PostgreSQL 16 en contenedor, volumen propio |
| **Secretos** | `.env` (gitignoreado, hay `.env.ejemplo`) | OCI Vault → `/opt/fintechvital/.env` en `0600` |
| **Acceso** | localhost | **solo por OCI Bastion** (sin IP pública, sin SSH abierto) |
| **Modelos** | horneados en la imagen | horneados en la imagen (Object Storage no hizo falta) |
| **Imágenes** | se construyen en el sitio | arm64, construidas fuera y bajadas de **OCIR** |
| **Entrada pública** | ninguna | **Cloudflare Tunnel**, sin ningún puerto abierto |

**El pipeline es manual, a propósito.** No hay CI que despliegue: se dispara a
mano. No queremos un push accidental rompiendo la demo. Lo que sí es automático
es la comprobación posterior — `ops/ejemplos.mjs` contra producción — y un gate
que verifica que los contenedores son **realmente nuevos**, porque
`podman-compose` puede reportar éxito sin haber recreado nada.

**Trade-off asumido (una sola instancia)**: no hay alta disponibilidad; si la
máquina cae, la aplicación cae. A cambio, cabe entera en el plan gratuito y hay
un solo sitio donde mirar. Para un hackathon con plan B de demo grabada
([ADR-0008](../adr/0008-infra-no-bloquea-app.md)), es el intercambio correcto.

El procedimiento completo:
[`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md).

## §8 Los tres riesgos que pueden hundir el proyecto

Nombrarlos es la mitad de mitigarlos.

| # | Riesgo | Mitigación |
|---|---|---|
| **R1** | **La infra se come el proyecto.** VCN privada + Bastion + Vault + Terraform + Ansible + túnel es un proyecto en sí mismo, y **no es lo que evalúa el jurado** (el enunciado pide "al menos un servicio OCI"). | [ADR-0008](../adr/0008-infra-no-bloquea-app.md): la infra es un **track paralelo** que nunca bloquea a la app. Dev es compose local. **Plan B: demo grabada en local.** Fecha límite para decidir el plan B: **9 de agosto**. |
| **R2** | **La integración DS↔Backend explota al final.** El clásico: cada mitad funciona sola y juntas no. | ✅ **No pasó.** El [`CONTRATO_MODELO.md`](CONTRATO_MODELO.md) se congeló en la S0 y el backend construyó contra un **stub** desde el día 1: el 2026-08-07 se cambió `FV_ML_URL` al servicio real y funcionó a la primera. ⚠️ Los **tests de contrato compartidos** (`docs/contratos/casos.json`) se diseñaron y **nunca se cablearon**; lo que cubrió el hueco fueron los 17 tests de `ml/tests/` y los 35 de `frontend/e2e/contrato.mjs`. |
| **R3** | **El jurado no le cree al dataset sintético.** "¿Su modelo aprendió algo o memorizó su generador?" | [`../datos/DATASET.md`](../datos/DATASET.md) §1: ruido deliberado, baselines honestos, y un **set de validación escrito a mano** que se reporta aparte. |
| **R4** | 🌎 **El modelo no entiende portugués** y devuelve `Otros` ante `IFOOD` - **delante de un jurado brasileño**. | [ADR-0009](../adr/0009-multi-idioma.md): un solo M1 entrenado en los 3 idiomas con `char_wb` n-gramas, dataset con comercios de BR y **macro-F1 reportado por idioma** (`ml/README.md`). ⚠️ **Riesgo aún abierto por el lado humano**: falta un revisor nativo de portugués para los textos de la interfaz (D17). |
