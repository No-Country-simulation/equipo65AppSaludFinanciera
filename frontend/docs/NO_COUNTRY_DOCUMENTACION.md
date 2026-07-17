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
- Antes de pegar: completar los enlaces marcados `(pendiente)` y, cuando el
  equipo decida el nombre (D4), reemplazar "financeAI".

---

<!-- ============ INICIO DEL TEXTO PARA PEGAR (max 10.000 chars) ============ -->

# financeAI - salud financiera inteligente

*(nombre provisional del equipo)* · Hackathon **ONE G9 - Alura + Oracle**

## Introducción

Muchas personas tienen acceso a los datos de sus transacciones, pero les cuesta
transformar esa información en decisiones. **financeAI** analiza el
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
Web (Next.js)  ─┐
                ├→  API pública (Java 21 + Spring Boot 3)  →  Servicio ML (Python + FastAPI + scikit-learn)
Móvil (Expo)   ─┘            │
                             └→  Oracle Autonomous Database (Always Free)
```

- **Frontend web**: Next.js 15 + TypeScript + Tailwind CSS 4, i18n con
  next-intl (rutas `/es`, `/pt`, `/en`), gráficos con Recharts.
- **App móvil**: React Native 0.86 + Expo SDK 57 + Expo Router, misma capa de
  datos que la web.
- **Backend**: Spring Boot 3 - auth propia (JWT con refresh rotativo y
  detección de reúso, 2FA TOTP, rate limiting), validación de entrada, cálculo
  de indicadores, motor de reglas, persistencia y API REST documentada
  (OpenAPI/Swagger). Incluye el endpoint literal del enunciado:
  `POST /api/v1/analisis-financiero`.
- **ML**: dos modelos scikit-learn - M1 clasifica transacciones por texto
  (multilingüe), M2 clasifica el perfil financiero sobre los indicadores.
  Notebook con EDA, ingeniería de atributos, entrenamiento, métricas por
  idioma y serialización.
- **Datos**: Oracle Autonomous Database con migraciones Flyway; dataset
  sintético propio (~360k transacciones reproducibles, comercios reales de
  MX/BR/US) + set de validación etiquetado a mano.
- **Infra**: Docker Compose en local; despliegue en OCI (Terraform + Ansible,
  instancias ARM en red privada, Object Storage para los modelos, OCI Vault
  para secretos) detrás de Cloudflare Tunnel.

## Funcionalidades (web y móvil)

Registro/login con 2FA opcional · carga de transacciones manual e **import
CSV** · clasificación automática con corrección por el usuario · dashboard con
perfil, gastos por categoría e indicadores · recomendaciones con su indicador
disparador · **evolución temporal** del perfil · comparación mensual ·
presupuestos por categoría · metas de ahorro · calendario de pagos ·
multi-moneda · selector de idioma · términos y condiciones + política de
privacidad trilingües, exportación de datos y eliminación de cuenta.

## Estado actual

- ✅ Documentación y **contratos congelados** (API, modelo, taxonomía).
- ✅ **Interfaces web y móvil completas** (todas las pantallas y flujos),
  desarrolladas contra una capa de datos mock desacoplada y eliminable; se
  integran al backend real al existir (regla: cero mocks en la entrega).
- 🔄 En curso según plan por semanas: backend, servicio de ML, base de datos e
  infraestructura OCI, con congelamiento de integración el 9 de agosto.

## Cómo se corre (local)

```text
git clone <repo> && cd financeAI/frontend
# Windows: doble clic en INICIAR.bat · Linux/macOS: ./iniciar.sh
# El menú permite: verificar requisitos, web en contenedor (localhost:3000),
# emulador Android, instalar dependencias.
```

Requisitos: Node.js 20+, Docker (o Podman); Android Studio solo para el
emulador. Guía desde cero y solución de problemas en
`frontend/docs/FRONTEND_DESDE_CERO.md`. Con el stack completo:
`docker compose -f infra/compose/local.yml up -d`.

## Seguridad

Repo público **sin secretos** (gitleaks en pre-commit y CI) · contraseñas con
BCrypt · JWT de vida corta + refresh rotativo con revocación de familia ante
reúso · 2FA TOTP con códigos de respaldo · rate limiting y bloqueo por
intentos · auditoría de eventos · aislamiento de datos por usuario · infra
privada sin puertos expuestos (la única entrada es el túnel).

## Equipo

8 personas: 2 de Data Science, 1 de Data, 1 DBA, 3 de Backend y 1 Fullstack
(frontend web + móvil).

## Enlaces

- Repositorio (GitHub): (pendiente)
- Video demo (YouTube): (pendiente)
- Documentación técnica completa: carpeta `docs/` del repositorio (arquitectura,
  contratos, ADRs, taxonomía, seguridad y guías de despliegue)
- Demo desplegada: (pendiente)

<!-- ============= FIN DEL TEXTO PARA PEGAR ============= -->

---

## Notas de mantenimiento

- **Contar caracteres antes de pegar** (el límite de la plataforma es 10.000):
  el bloque actual mide ~6.200, hay margen para el estado y los enlaces.
- Cuando existan: URL del repo (D1), nombre definitivo (D4), video (D15) y URL
  pública (D8/D9).
- La sección *Estado actual* se actualiza al cerrar cada bloque (misma
  disciplina que `PENDIENTES_AGENTE.md`).
- Las **otras tareas** de la plataforma: Tarea 2 = link de YouTube del video
  ([`DEMO.md`](entrega/DEMO.md)) · Tarea 3 = herramientas
  ([`NO_COUNTRY_HERRAMIENTAS.md`](NO_COUNTRY_HERRAMIENTAS.md)) · Tarea 4 =
  enlaces del proyecto (repo, demo, video).
