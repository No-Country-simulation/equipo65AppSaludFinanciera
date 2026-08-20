<div align="center">

# Fintech Vital

**Analiza tus finanzas personales, entiende en qué se te va el dinero y recibe
recomendaciones que puedes aplicar hoy.**

Web · Móvil · API · Base de datos — todo en contenedores.
Español 🇪🇸 · Português 🇧🇷 · English 🇺🇸

**▶ En vivo: [fintechvital.com](https://fintechvital.com)** · API en
[api.fintechvital.com](https://api.fintechvital.com/api/v1/salud)

*Hackathon ONE G9 (Alura + Oracle) — No Country, equipo 65*

</div>

---

## Qué hace

A partir de tus movimientos bancarios, Fintech Vital:

1. **Clasifica** cada transacción en una de 12 categorías, leyendo su descripción.
2. **Calcula 8 indicadores** de salud financiera (tasa de ahorro, endeudamiento,
   gasto esencial, concentración…).
3. **Te asigna un perfil**: `saludable` · `en_observacion` · `en_riesgo`.
4. **Te da recomendaciones concretas**, generadas por un motor de reglas
   determinista — no por un modelo de lenguaje. Cada consejo se puede explicar y
   auditar.
5. **Te muestra tu evolución** en el tiempo, no solo una foto.

**Lo que no hace**: no se conecta a bancos reales, no mueve dinero, no da
asesoría financiera regulada y no inventa recomendaciones con un LLM.

---

## Arrancarlo

Necesitas **Docker o Podman**. Nada más.

```bash
git clone https://github.com/No-Country-simulation/fintech-vital-equipo65.git
cd fintech-vital-equipo65

./ops/stack.sh arriba        # Linux / macOS
.\ops\stack.ps1 arriba       # Windows
```

| | |
|---|---|
| 🌐 Web | http://localhost:3000 |
| 🔌 API | http://localhost:8080 |
| 🗄️ Base de datos | `localhost:5432` |

Y para comprobar que todo funciona de verdad:

```bash
./ops/stack.sh probar
```

¿No estás seguro de que tu máquina tenga lo necesario?

```bash
./frontend/scripts/linux/verificar-requisitos.sh     # o macos/ · windows/
```

Ese *doctor* revisa todo y puede **instalarte Podman** si te falta un motor de
contenedores (te lo pregunta primero).

> 📖 Guía completa de operación: [`ops/README.md`](ops/README.md)

---

## Cómo está montado

```
├── frontend/          Web (Next.js 15) y móvil (React Native + Expo)
│   ├── web/
│   ├── mobile/
│   ├── scripts/       Por sistema operativo: menú, doctor, emulador
│   └── docs/          Documentación del frontend + decisiones (ADR)
├── backend/           API REST — Java 21 + Spring Boot 3
├── ml/                Servicio de inferencia — Python 3.11 + FastAPI
├── db/                PostgreSQL 16: migraciones, semilla e imagen
├── ops/               Stack completo en contenedores (compose + scripts)
└── docs/              Documentación transversal del proyecto
```

| Módulo | Estado | Documentación |
|---|---|---|
| **Web** | ✅ Completa (todas las pantallas, 3 idiomas, modo oscuro) | [`frontend/README.md`](frontend/README.md) |
| **Móvil** | ✅ Completa (misma capa de datos que la web) | [`frontend/README.md`](frontend/README.md) |
| **Base de datos** | ✅ Esquema, migraciones y datos de ejemplo | [`db/README.md`](db/README.md) |
| **Contenedores** | ✅ Verificado con Docker **y** Podman | [`ops/README.md`](ops/README.md) |
| **API** | ✅ Completa para lo que consumen las interfaces (2 endpoints del enunciado, auth con 2FA, transacciones, análisis, catálogos, producto) | [`backend/README.md`](backend/README.md) |
| **Modelo (ML)** | ✅ Los dos modelos entrenados y en uso, con notebook y dataset propio | [`ml/README.md`](ml/README.md) |
| **Despliegue** | ✅ En producción sobre **Oracle Cloud (OCI)**, tras un túnel de Cloudflare | [`ops/DESPLIEGUE_NUBE.md`](ops/DESPLIEGUE_NUBE.md) |

---

## Cómo funciona por dentro

```
   Web (Next.js)  ─┐
                   ├──►  API (Spring Boot)  ──►  PostgreSQL 16
   Móvil (Expo)   ─┘            │
                                └──────────►  Servicio de ML (FastAPI)
                                              clasifica + predice perfil
```

Tres reglas que explican casi todas las decisiones del proyecto:

**El servicio de ML no tiene lógica de negocio.** Recibe características,
devuelve predicciones. Los indicadores, las reglas y la persistencia viven en la
API. Así el modelo se puede reentrenar sin tocar el negocio.

**El modelo trabaja con ratios, no con importes.** Por eso funciona igual con
pesos, reales o dólares: la moneda se cancela sola en la división.

**Los identificadores nunca se traducen; el texto para humanos, siempre.** En la
base de datos y en la API viaja `en_observacion`; *"En observación"*, *"Em
observação"* o *"Under observation"* se resuelven al mostrarlo. Un gráfico no se
puede romper por cambiar de idioma.

---

## Documentación

| Si quieres… | Lee |
|---|---|
| Levantar y operar el proyecto | [`ops/README.md`](ops/README.md) |
| Entender la arquitectura | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) |
| Trabajar en la base de datos | [`db/README.md`](db/README.md) |
| Trabajar en la API | [`backend/README.md`](backend/README.md) |
| Trabajar en el servicio de modelo | [`ml/README.md`](ml/README.md) |
| Desplegar (staging y producción) | [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) |
| Entender cómo llega a internet, sin tecnicismos | [`ops/DESPLIEGUE_NUBE.md`](ops/DESPLIEGUE_NUBE.md) |
| Desplegar en la instancia de OCI | [`ops/DESPLIEGUE_NUBE_TECNICO.md`](ops/DESPLIEGUE_NUBE_TECNICO.md) |
| Los tres contratos (API, modelo, taxonomía) | [`docs/arquitectura/`](docs/arquitectura/) |
| Cómo se prueba y cómo entrar al proyecto | [`docs/proceso/`](docs/proceso/) |
| Montar solo el frontend | [`docs/FRONTEND_DESDE_CERO.md`](docs/FRONTEND_DESDE_CERO.md) |
| El porqué de cada decisión | [`docs/adr/`](docs/adr/) |
| El índice completo | [`docs/README.md`](docs/README.md) |

---

## Tecnologías

**Frontend** Next.js 15 · React Native + Expo · TypeScript · Tailwind · next-intl
**Backend** Java 21 · Spring Boot 3 · Maven
**Datos** PostgreSQL 16 · migraciones versionadas
**Modelo** Python 3.11 · FastAPI · scikit-learn
**Operación** Docker / Podman · Compose · Cloudflare Tunnel
**Nube** Oracle Cloud (OCI): Compute ARM · Container Registry · Vault · Bastion

---

## Licencia

MIT — ver [`LICENSE`](LICENSE).
