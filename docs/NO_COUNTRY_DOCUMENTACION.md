# Tarea 1 de No Country - Documentación del Proyecto

**Qué es esto**: la plataforma de No Country (`talent.nocountry.tech` → Proyecto
→ Entregables → *Tarea 1: Documentación del Proyecto*) pide la documentación en
**Markdown, máximo 10.000 caracteres**, en un cuadro de texto. Este archivo
contiene ese texto **listo para copiar y pegar** (entre los marcadores), más
notas de mantenimiento al final.

- **Fecha límite en la plataforma: 25 de agosto de 2026.**
- Es un **documento vivo**: la plataforma recomienda mantenerlo actualizado y
  visible durante todo el proyecto. Al cerrar cada bloque de trabajo, actualizar
  la sección *Estado actual* y volver a pegarlo.
- Antes de pegar: completar el enlace del **video**, que es lo único que queda
  `(pendiente)`.

---

<!-- ============ INICIO DEL TEXTO PARA PEGAR (max 10.000 chars) ============ -->

# Fintech Vital - salud financiera inteligente

Hackathon **ONE G9 - Alura + Oracle** · No Country, equipo 65
**En vivo: <https://fintechvital.com>**

## Introducción

Muchas personas tienen acceso a los datos de sus transacciones, pero les cuesta
transformar esa información en decisiones. **Fintech Vital** analiza el
comportamiento financiero de una persona a partir de sus transacciones y su
información financiera (ingreso mensual, nivel de endeudamiento, frecuencia de
ahorro): clasifica automáticamente los gastos con machine learning, calcula
indicadores de salud financiera, asigna un **perfil financiero** y devuelve
**recomendaciones simples y accionables**, con seguimiento de la evolución en
el tiempo.

El proyecto es **web + app móvil**, y es **trilingüe: español, portugués e
inglés** - no solo la interfaz: el clasificador se entrena con transacciones
reales de los tres mercados (`IFOOD *PEDIDO`, `PIX RECEBIDO`, `WHOLE FOODS`).

## Objetivos

- **Clasificar cada transacción** en una de 12 categorías financieras a partir
  de su descripción de texto libre, en los 3 idiomas.
- **Calcular 8 indicadores** (tasa de ahorro, ratio de endeudamiento, gasto
  esencial/ingreso, gasto discrecional, concentración del gasto, gasto
  recurrente, entre otros).
- **Clasificar el perfil financiero** - `saludable` · `en observación` ·
  `en riesgo` - con su probabilidad.
- **Generar recomendaciones** mediante un **motor de reglas determinista y
  explicable** (sin LLMs): cada recomendación indica qué indicador la disparó.
- **Mostrar la evolución** del perfil y los hábitos a lo largo del tiempo.
- Devolver resultados en **JSON** vía API pública documentada e **integrar
  servicios de OCI** (Oracle Cloud Infrastructure).

## Principios de diseño

- **El servicio de ML es inferencia pura**: recibe features y devuelve
  predicciones; los indicadores, las reglas y la persistencia viven en el
  backend. Los contratos entre módulos están **congelados y documentados**.
- **El modelo trabaja con ratios, no montos absolutos** → inmune a la moneda
  (soporte multi-moneda con tasas cacheadas).
- **Recomendaciones auditables**: reglas deterministas con código + parámetros,
  traducidas por catálogo i18n. Nada de texto generado.
- **Cero datos falsos en la demo**: si la API no responde, la interfaz muestra
  error y "Reintentar" - jamás datos inventados.
- **Anti-alcance explícito**: no se conecta a bancos reales, no mueve dinero,
  no da asesoría financiera regulada.

## Arquitectura

Monorepo con servicios separados y contratos congelados entre ellos:

```text
Navegador  →  Cloudflare (TLS, anti-DDoS)  ─┐  tunel saliente, sin puertos abiertos
                                      ▼
       ┌─ OCI · instancia ARM en subred privada, sin IP publica ─┐
       │  Web (Next.js)  ─┐                                      │
       │                  ├→  API (Java 21 + Spring Boot 3)      │
       │  Movil (Expo)   ─┘         │         │                  │
       │                            │         └→  ML (FastAPI +  │
       │                            │              scikit-learn) │
       │                            └→  PostgreSQL 16            │
       └──────────────────────────────────────────────────────────┘
```

- **Frontend web**: Next.js 15 + TypeScript + Tailwind CSS 4, i18n con
  next-intl (rutas `/es`, `/pt`, `/en`), gráficos con Recharts.
- **App móvil**: React Native 0.86 + Expo SDK 57 + Expo Router, misma capa de
  datos que la web.
- **Backend**: Spring Boot 3 - auth propia (JWT con refresh rotativo y
  detección de reúso, 2FA TOTP, bloqueo por fuerza bruta), validación de
  entrada, cálculo
  de indicadores, motor de reglas, persistencia y API REST documentada
  (OpenAPI/Swagger). Incluye el endpoint literal del enunciado:
  `POST /api/v1/analisis-financiero`.
- **ML**: dos modelos scikit-learn - M1 clasifica transacciones por texto
  (multilingüe), M2 clasifica el perfil financiero sobre los indicadores.
  Notebook con EDA, ingeniería de atributos, entrenamiento, métricas por
  idioma y serialización.
- **Datos**: PostgreSQL 16 con migraciones propias versionadas y verificadas
  por SHA-256; dataset sintético propio (~360k transacciones reproducibles,
  comercios reales de MX/BR/US) + set de validación etiquetado a mano.
- **Infra**: Docker Compose (o Podman) en local; en producción, **Oracle Cloud
  (OCI)**: instancia Compute ARM en red privada **sin IP pública**, imágenes en
  OCI Container Registry, secretos en OCI Vault, acceso administrativo solo por
  OCI Bastion, y **Cloudflare Tunnel como única entrada** desde internet.

## Funcionalidades (web y móvil)

Registro/login con **2FA TOTP obligatorio** · carga de transacciones manual e **import
CSV** · clasificación automática con corrección por el usuario · dashboard con
perfil, gastos por categoría e indicadores · recomendaciones con su indicador
disparador · **evolución temporal** del perfil · comparación mensual ·
presupuestos por categoría · metas de ahorro · calendario de pagos ·
multi-moneda · selector de idioma · términos y condiciones + política de
privacidad trilingües, exportación de datos y eliminación de cuenta.

## Estado actual

**El proyecto está desplegado y funcionando en <https://fintechvital.com>.**

- ✅ **Interfaces web y móvil completas**, contra la API real. La capa de datos
  mock con la que se desarrollaron **se retiró por completo**: se cumplió la
  regla de cero mocks en la entrega.
- ✅ **API completa** para todo lo que consumen las interfaces, incluidos los dos
  endpoints que pide el enunciado, con Swagger en `/api/v1/docs`.
- ✅ **Los dos modelos entrenados y en uso**, con dataset y notebook propios.
- ✅ **Base de datos** con 30 tablas y 10 migraciones versionadas.
- ✅ **Desplegado en OCI** el 2026-08-20 y verificado contra producción: los tres
  hostnames responden y el smoke test funcional pasa **54/54** comprobaciones.
- ✅ **Probado de punta a punta**: 35 casos de contrato de API y 51 de navegador
  (escritorio y móvil-web), sin reintentos.

## Cómo se corre (local)

**Solo hace falta Docker o Podman.** Un comando levanta las cuatro piezas
(base de datos, modelo, API y web), migradas y con datos de ejemplo:

```text
git clone https://github.com/No-Country-simulation/fintech-vital-equipo65.git
cd fintech-vital-equipo65

./ops/stack.sh arriba        # Linux / macOS
.\ops\stack.ps1 arriba       # Windows

./ops/stack.sh probar        # comprueba esquema, migraciones, API y web
```

Web en `localhost:3000`, API en `localhost:8080`, Swagger en
`localhost:8080/api/v1/docs`.

Para trabajar solo en las interfaces hay un menú (`frontend/INICIAR.bat` o
`./frontend/iniciar.sh`) con un **doctor** que revisa la máquina y puede
instalar Podman. Guía desde cero: `docs/FRONTEND_DESDE_CERO.md`.
La app móvil pide Android Studio solo para el emulador.

## Seguridad

Repo público **sin secretos**, auditado antes de publicar (ni llaves, ni tokens,
ni identificadores de la cuenta de OCI, tampoco en el historial) · contraseñas
con **BCrypt coste 12** · JWT de vida corta + **refresh rotativo con revocación
de la familia entera ante reúso** · 2FA TOTP con códigos de respaldo · bloqueo
por fuerza bruta (5 fallos → 15 min) · auditoría de eventos · **aislamiento de
datos por usuario**: toda consulta filtra por el identificador que viaja en el
token, nunca por un parámetro · un recurso ajeno responde 404, no 403 · CORS con
orígenes explícitos · infraestructura privada sin puertos expuestos, con el túnel
como única entrada.

Lo que **falta** y está anotado como tal en `docs/seguridad/SEGURIDAD.md`:
límite de peticiones en los dos endpoints públicos, el test automático del
aislamiento por usuario, y `gitleaks` en CI.

## Equipo

8 personas: 2 de Data Science, 1 de Data, 1 DBA, 3 de Backend y 1 Fullstack
(frontend web + móvil).

## Enlaces

- **Aplicación en vivo**: <https://fintechvital.com>
- **API pública**: <https://api.fintechvital.com/api/v1/docs> (Swagger)
- Repositorio (GitHub): <https://github.com/No-Country-simulation/fintech-vital-equipo65>
- Video demo (YouTube): (pendiente)
- Documentación técnica completa: carpeta `docs/` del repositorio (arquitectura,
  contratos, ADRs, taxonomía, seguridad y guías de despliegue)

<!-- ============= FIN DEL TEXTO PARA PEGAR ============= -->

---

## Notas de mantenimiento

- **Contar caracteres antes de pegar** (el límite de la plataforma es 10.000).
  Medida del 2026-08-20: **~8.000**, con unos 2.000 de margen. Para contarlo:

  ```bash
  python -c "import io,re; s=io.open('docs/NO_COUNTRY_DOCUMENTACION.md',encoding='utf-8').read(); a=s.index(chr(10),s.index('INICIO DEL TEXTO PARA PEGAR'))+1; b=s.index('<!-- ============= FIN DEL TEXTO'); print(len(s[a:b].strip()))"
  ```

- Lo único `(pendiente)` es el **video** (D15).
- La sección *Estado actual* se actualiza al cerrar cada bloque (misma
  disciplina que `PENDIENTES_AGENTE.md`).
- Las **otras tareas** de la plataforma: Tarea 2 = link de YouTube del video
  ([`DEMO.md`](entrega/DEMO.md)) · Tarea 3 = herramientas
  ([`NO_COUNTRY_HERRAMIENTAS.md`](NO_COUNTRY_HERRAMIENTAS.md)) · Tarea 4 =
  enlaces del proyecto (repo, demo, video).
