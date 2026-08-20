# Diagramas de arquitectura

El enunciado exige: *"La arquitectura adoptada deberá ser documentada por el equipo"*.
Este doc + [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) + los [ADRs](../adr/) lo cubren.

Los diagramas están en **Mermaid**: se renderizan solos en GitHub y en el `.md`, y se
versionan como texto (nada de imágenes que nadie puede editar). **Para el video y la
presentación**, se exportan a PNG.

---

## §1 Contexto - quién habla con qué

```mermaid
graph LR
    U["👤 Usuario<br/>(dashboard)"]
    J["⚖️ Jurado<br/>(curl / Swagger)"]

    subgraph sis["Fintech Vital"]
        WEB["🖥️ web<br/>Next.js 15<br/>es · pt · en"]
        API["⚙️ backend<br/>Spring Boot 3<br/>auth · reglas · indicadores"]
        ML["🧠 ml<br/>FastAPI + scikit-learn<br/>M1 texto · M2 perfil"]
        DB[("🗄️ PostgreSQL 16<br/>29 tablas · 10 migraciones")]
        TX["🔄 tasas<br/>refresca tasa_cambio"]
    end

    OS["☁️ OCI Object Storage<br/>modelos · datasets<br/>(previsto)"]
    FX["🌐 ExchangeRate-API<br/>(cacheada, con fallback)"]

    U -->|HTTPS| WEB
    WEB -->|"REST + JWT<br/>Accept-Language"| API
    J -->|"POST /analisis-financiero<br/>(público, sin auth)"| API
    API -->|"HTTP interno<br/>X-Clave-Interna"| ML
    API -->|JDBC| DB
    TX -->|"cada 6 h"| DB
    TX -.-> FX
    ML -.->|"previsto: versionado<br/>de los .pkl"| OS

    style ML fill:#e8f0fe,stroke:#4285f4
    style API fill:#e6f4ea,stroke:#34a853
    style WEB fill:#fef7e0,stroke:#fbbc04
    style DB fill:#e8eaf6,stroke:#3949ab
    style OS stroke-dasharray: 5 5
```

> ⚠️ **Object Storage aparece punteado porque todavía no está integrado.** Hoy los
> dos `.pkl` viajan dentro de la imagen del servicio `ml` y se cargan al arrancar.
> El bucket es el paso que cubre el requisito 7 del enunciado.

> El **jurado entra directo a la API pública**, sin pasar por el dashboard. Por eso
> ese endpoint es sagrado y no se toca.

---

## §2 El flujo del análisis - **el diagrama más importante del proyecto**

Es donde se ve la regla dura: **el ML es inferencia pura; toda la lógica de negocio
vive en Spring Boot.**

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant W as web
    participant A as backend (Spring)
    participant M as ml (FastAPI)
    participant D as PostgreSQL

    U->>W: "Analizar"
    W->>A: POST /api/v1/analisis<br/>Accept-Language: pt
    A->>D: SELECT transacciones del usuario
    D-->>A: 13 transacciones

    rect rgb(232, 240, 254)
    Note over A,M: 1) CLASIFICAR (M1)
    A->>M: POST /interno/v1/clasificar<br/>[{descripcion, valor}]
    M-->>A: [{categoria, confianza}]<br/>modelo_version
    end

    rect rgb(230, 244, 234)
    Note over A: 2) AGREGAR por categoría → resumen_gastos
    Note over A: 3) CALCULAR los 8 indicadores (ratios)
    end

    rect rgb(232, 240, 254)
    Note over A,M: 4) PREDECIR PERFIL (M2)
    A->>M: POST /interno/v1/perfil<br/>{8 indicadores}
    M-->>A: {perfil, probabilidad, probabilidades}
    end

    rect rgb(230, 244, 234)
    Note over A: 5) MOTOR DE REGLAS → [codigo + parametros]
    Note over A: 6) Renderizar textos en 'pt' (MessageSource)
    end

    A->>D: INSERT analisis + recomendaciones
    A-->>W: 200 {perfil_financiero: "Em observação", ...}
    W-->>U: Dashboard

    Note over A,M: ⚠️ Si el ML no responde en 5s → 503.<br/>NUNCA se inventa una predicción.
```

---

## §3 Modelo de datos (ER)

```mermaid
erDiagram
    USUARIO ||--|| USUARIO_SEGURIDAD : "credenciales y 2FA"
    USUARIO ||--o{ TRANSACCION : registra
    USUARIO ||--o{ ANALISIS : ejecuta
    USUARIO ||--o{ REFRESH_TOKEN : tiene
    USUARIO ||--o{ EVENTO_AUDITORIA : genera
    CATEGORIA ||--o{ TRANSACCION : clasifica
    CATEGORIA ||--o{ CATEGORIA_I18N : "se traduce en"
    ANALISIS ||--o{ RECOMENDACION : produce
    MONEDA ||--o{ TASA_CAMBIO : cotiza
    MONEDA ||--o{ TRANSACCION : denomina

    USUARIO {
        uuid id PK "gen_random_uuid()"
        text email UK "lower(), CHECK de formato"
        date fecha_nacimiento "CHECK 18 anios"
        uuid ciudad_id FK
        char_2 idioma FK "es|pt|en"
        char_3 moneda_principal FK
        numeric ingreso_mensual "14,2"
        smallint nivel_endeudamiento
        text frecuencia_ahorro
        text terminos_version "prueba de consentimiento"
        timestamptz terminos_aceptados_en
    }
    USUARIO_SEGURIDAD {
        uuid usuario_id PK "tabla aparte, no en USUARIO"
        text password_hash "BCrypt 12"
        text totp_secreto
        boolean totp_activo
        smallint intentos_fallidos "bloqueo por fuerza bruta"
        timestamptz bloqueado_hasta
    }
    TRANSACCION {
        uuid id PK
        uuid usuario_id FK
        text descripcion "feature de M1"
        numeric valor "14,2 · neg=gasto pos=ingreso"
        char_3 moneda FK
        numeric valor_base "normalizado a USD"
        date fecha
        text categoria_slug FK
        text categoria_origen "modelo|usuario"
        numeric confianza "4,3"
        boolean es_recurrente
    }
    CATEGORIA {
        text slug PK "los 12, NUNCA se traducen"
        text tipo "gasto|ingreso|movimiento"
        text grupo "esencial|discrecional"
    }
    CATEGORIA_I18N {
        text categoria_slug PK
        char_2 idioma PK
        text etiqueta "Alimentación|Alimentação|Food"
    }
    ANALISIS {
        uuid id PK
        uuid usuario_id FK
        text perfil_codigo FK "slug estable"
        numeric probabilidad "4,3"
        jsonb indicadores "CHECK: las 8 claves"
        jsonb probabilidades "CHECK: los 3 perfiles"
        jsonb resumen_gastos
        text modelo_version "foto inmutable"
    }
    RECOMENDACION {
        bigint id PK "identity"
        uuid analisis_id FK
        text codigo "CHECK ^REC_[A-Z_]+$"
        jsonb parametros "NO el texto"
        text prioridad "alta|media|baja"
        smallint orden
    }
    TASA_CAMBIO {
        char_3 moneda PK
        char_3 moneda_base PK
        date vigente PK
        numeric por_unidad_base
    }
```

> **Solo las 10 tablas del núcleo del análisis.** El esquema real tiene **29**:
> banca (cuentas, tarjetas, buró), producto (metas, presupuestos, eventos),
> catálogos y auditoría. Los tipos son los de PostgreSQL 16 — `UUID` como clave,
> `JSONB` con `CHECK` sobre las claves obligatorias, `TIMESTAMPTZ`, y `NUMERIC`
> para todo lo que sea dinero. Nunca `float`.

Detalle completo en [`DATOS.md`](DATOS.md).

---

## §4 Despliegue

### §4.1 Lo que corre hoy

Un único `compose.yml` para los tres entornos; lo único que cambia es el archivo
de entorno. El túnel de Cloudflare es la **única puerta de entrada**: no se abre
ni un puerto en el router.

```mermaid
graph LR
    NET["🌍 Internet"]
    CF["☁️ Cloudflare<br/>TLS · DNS · anti-DDoS"]

    subgraph host["Máquina anfitriona · docker compose"]
        direction TB
        TUN["cloudflared<br/>(perfil tunel)"]
        WEB["web :3000"]
        API["api :8080"]
        ML["ml<br/>(sin puerto publicado)"]
        DB[("db<br/>PostgreSQL 16")]
        VOL[("volumen<br/>datos_db")]
    end

    NET --> CF
    CF -.->|"túnel SALIENTE<br/>ningún puerto abierto"| TUN
    TUN --> WEB
    TUN --> API
    API --> ML
    API --> DB
    DB --- VOL

    style CF fill:#fff3e0,stroke:#f57c00
    style DB fill:#e8eaf6,stroke:#3949ab
    style ML fill:#e8f0fe,stroke:#4285f4
```

| Entorno | `FV_PROYECTO` | Dominio |
|---|---|---|
| local | `fintechvital` | `localhost` |
| staging | `fintechvital-staging` | `staging.fintechvital.com` |
| producción | `fintechvital-prod` | `fintechvital.com` · `www` · `api` |

`FV_PROYECTO` aísla contenedores y volumen, así que los tres pueden convivir en
la misma máquina sin pisarse.

### §4.2 Producción en OCI

> ✅ **Desplegado y en pie desde el 2026-08-20**: <https://fintechvital.com>.
> Salió **más pequeño que el plan de la S0** — una instancia en vez de cuatro y
> sin Object Storage. Procedimiento completo en
> [`../../../ops/DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md).

```mermaid
graph TB
    NET["🌍 Internet"]
    CF["☁️ Cloudflare<br/>TLS · anti-DDoS · DNS<br/>fintechvital.com · www · api"]
    OCIR["📦 OCI Container Registry<br/>las 4 imágenes arm64"]

    subgraph vcn["VCN privada - la instancia NO tiene IP pública"]
        direction TB
        subgraph vm["1× Compute Ampere A1 · 1 OCPU · 6 GB · arm64"]
            TUN["cloudflared"]
            WEB["web :3000"]
            API["api :8080"]
            ML["ml :8000"]
            DB[("db :5432<br/>volumen")]
        end
        BAS["🔐 OCI Bastion<br/>único acceso admin"]
        VLT["🔑 OCI Vault<br/>secretos"]
        NAT["NAT GW<br/>solo salida"]
    end

    NET --> CF
    CF -.->|"túnel SALIENTE<br/>ningún puerto abierto"| TUN
    TUN --> WEB
    TUN --> API
    API --> ML
    API --> DB
    vm --> NAT
    NAT -.->|"pull de imágenes"| OCIR
    BAS -.->|ssh efímero| vm
    VLT -.->|"al desplegar"| vm

    style CF fill:#fff3e0,stroke:#f57c00
    style vcn fill:#f5f5f5,stroke:#616161
    style OCIR fill:#e6f4ea,stroke:#34a853
```

**Lo que hay que notar**: **ninguna flecha entra** a la VCN desde internet. El
túnel es una conexión **saliente**, y los puertos del host solo escuchan en
`127.0.0.1`. No hay Load Balancer ni hace falta
([ADR-0005](../adr/0005-infra-oci-privada.md)).

**Los servicios de OCI que se usan son cuatro**: **Compute** aloja la aplicación,
**Container Registry** guarda las imágenes `arm64`, **Vault** los secretos y
**Bastion** es el único acceso administrativo. El enunciado pedía uno.

La base de datos vive en su contenedor: Autonomous Database quedó descartada
cuando la [ADR-0014](../adr/0014-motor-postgresql.md) movió el proyecto a
PostgreSQL 16, porque las migraciones usan `JSONB`, `UUID` nativo y `pgcrypto`,
que no existen en Oracle. **Object Storage** también se planeó y no se usó: los
modelos viajan dentro de la imagen del servicio de ML.

> ⚠️ **Sin alta disponibilidad**: si la instancia cae, la aplicación cae. Es el
> intercambio aceptado para caber en el plan gratuito, y el plan B de la demo
> (grabar en local) sigue en pie.

---

## §5 Cómo trabajan en paralelo las 8 personas

El diagrama que explica por qué nadie espera a nadie.

```mermaid
graph LR
    subgraph contratos["🧊 LOS 3 CONTRATOS (congelados en la S0)"]
        C1["CONTRATO_API"]
        C2["CONTRATO_MODELO"]
        C3["TAXONOMIA"]
    end

    subgraph paralelo["Trabajo simultáneo, sin bloqueos"]
        BE["3× Backend<br/>auth · núcleo · transacciones"]
        DS["2× Data Science<br/>M1 · M2"]
        DA["1× Data<br/>generador de dataset"]
        DB["1× DBA<br/>migraciones · índices"]
        FS["1× Fullstack<br/>dashboard"]
    end

    STUB["🤖 ml-fake (stub)<br/>respeta el contrato<br/>desde el día 1"]

    C1 --> BE
    C1 --> FS
    C2 --> BE
    C2 --> DS
    C3 --> BE
    C3 --> DS
    C3 --> DA
    C3 --> DB
    C3 --> FS

    STUB -.->|"backend construye<br/>SIN el modelo real"| BE
    DA -->|dataset| DS
    DS -->|"modelos .joblib"| REAL["ml real"]
    REAL -.->|"S3: cambiar 1 variable<br/>ML_URL"| BE

    style contratos fill:#e3f2fd,stroke:#1565c0
    style STUB fill:#fff9c4,stroke:#f9a825
```

**La idea completa en una frase**: los contratos se congelan primero, el backend
construye contra un **stub**, y el día de la integración se cambia una variable.
Si no funciona a la primera, es que alguien rompió el contrato.

> ✅ **Así fue.** El 2026-08-07 se cambió `FV_ML_URL` al servicio real y funcionó
> a la primera. El stub `ml-fake` cumplió su función y ya no está en el
> repositorio; este diagrama describe **cómo se llegó hasta aquí**, no lo que
> corre hoy.

---

## §6 Exportar para el video

Mermaid se renderiza en GitHub, pero para las slides y el video hacen falta PNG:

```bash
npm i -g @mermaid-js/mermaid-cli
mmdc -i docs/arquitectura/DIAGRAMAS.md -o docs/arquitectura/img/diagrama.png -t neutral -b transparent
```

**Para el video, usa el §1 (contexto) y el §2 (flujo del análisis).** El §4 (OCI) solo
si sobra tiempo - es el bloque que se recorta primero.
