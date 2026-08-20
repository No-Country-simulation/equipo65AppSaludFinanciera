# CHECKLIST DE ENTREGA - Hackathon ONE G9 (Alura + Oracle)

**Cada línea de este doc sale literalmente del enunciado.** Es el documento que se
revisa el día de la entrega, línea por línea. Si algo está en ⬜ el 16 de agosto,
es una emergencia.

🚨 **Fecha límite oficial (plataforma No Country): 25 de agosto de 2026.**
🎬 Regla interna: el **video se sube el 23 de agosto** como máximo (colchón).
🎯 **Meta interna: 16 de agosto** (una semana de colchón).

> ⚠️ **D16 en `PENDIENTES_ANGEL.md`**: este checklist se
> armó con el enunciado que tenemos. **2026-07-16**: se revisó la pestaña
> *Entregables* de la plataforma (4 tareas, límite 25 ago → sección 0). Queda
> leer las **bases completas** (formato/duración del video, criterios de
> evaluación, presentación en vivo) si existen.

---

## 0. Entregables en la plataforma No Country (talent.nocountry.tech)

La plataforma pide **4 tareas** (Proyecto → Entregables), editables hasta el
**25 de agosto**. Son *documentos vivos*: mantenerlos actualizados y visibles
durante todo el proyecto.

| # | Tarea | Con qué se cumple | ✅ |
|---|---|---|---|
| 0.1 | **Documentación del Proyecto** (Markdown, máx. 10.000 caracteres) | [`NO_COUNTRY_DOCUMENTACION.md`](../NO_COUNTRY_DOCUMENTACION.md) - texto listo para pegar (~6.2k) | 🟡 borrador listo; cargar y actualizar |
| 0.2 | **Video Demo** (link de YouTube) | [`DEMO.md`](DEMO.md) → grabación D15 | ⬜ |
| 0.3 | **Herramientas del Equipo** (máx. 10) | [`NO_COUNTRY_HERRAMIENTAS.md`](../NO_COUNTRY_HERRAMIENTAS.md) - selección propuesta | 🟡 propuesta; confirmar con el equipo y cargar |
| 0.4 | **Enlaces del Proyecto** | Repo GitHub (D1) + demo pública (D8/D9) + video | ⬜ |

---

## 1. Requisitos MÍNIMOS (los 8 del enunciado)

Si falta **uno solo** de estos, el proyecto no compite.

| # | Requisito (textual del enunciado) | Dónde se cumple | Responsable | ✅ |
|---|---|---|---|---|
| 1 | *"Modelo entrenado y cargado correctamente"* | M1 y M2 entrenados, evaluados y en uso. Notebook + dataset propio en `ml/` | Data Science | ✅ |
| 2 | *"Validación de entrada"* | Bean Validation → `422` con detalle por campo. Probado | Backend | ✅ |
| 3 | *"Clasificación funcional de las transacciones"* | `POST /api/v1/transacciones/clasificar`, 12 slugs, trilingüe | DS + Backend | ✅ |
| 4 | *"Análisis del perfil financiero"* | 3 perfiles + probabilidades. Hoy por la regla determinista (el M2 de DS pide montos absolutos) | DS + Backend | ✅ |
| 5 | *"Generación de recomendaciones"* | Motor de reglas, 11 reglas, `codigo`+`parametros`, i18n es/pt/en | Backend | ✅ |
| 6 | *"API documentada"* | springdoc: Swagger en `/api/v1/docs` + [`CONTRATO_API.md`](../arquitectura/CONTRATO_API.md) | Backend | ✅ |
| 7 | *"Integración con OCI"* | **Desplegado el 2026-08-20**: Compute ARM + Container Registry + Vault + Bastion. En vivo en <https://fintechvital.com> | Infra | ✅ |
| 8 | *"Mínimo de tres ejemplos reales de uso"* | [`EJEMPLOS.md`](EJEMPLOS.md) — ejecutables y **verificados contra producción**: `ops/ejemplos.mjs` pasa 54/54 | Equipo | ✅ |

> **Sobre el #7**: el enunciado pide *"al menos UN servicio OCI"*. Se usan
> **cuatro**: la aplicación entera corre en una instancia de **Compute** (ARM
> Ampere, subred privada sin IP pública), las imágenes viven en **Container
> Registry (OCIR)**, los secretos en **Vault** y el único acceso administrativo es
> por **Bastion**. Cómo está montado:
> [`DESPLIEGUE_NUBE.md`](../../ops/DESPLIEGUE_NUBE.md) (llano) y
> [`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md) (técnico).
>
> Se desplegó **más pequeño que el plan original** de
> [`../arquitectura/OCI.md`](../arquitectura/OCI.md): una instancia en vez de
> cuatro y PostgreSQL en contenedor en vez de Autonomous DB. El requisito se
> cumple igual y la máquina va sobrada (~450 MB de 6 GB).

---

## 2. Entregable de CIENCIA DE DATOS

El enunciado pide **un notebook** con estos 8 puntos. Es un entregable evaluado, no
un borrador.

| # | Contenido exigido | ✅ |
|---|---|---|
| 1 | Exploración y limpieza de datos (EDA) | ✅ |
| 2 | Procesamiento de variables financieras y textuales | ✅ |
| 3 | Ingeniería de atributos | ✅ |
| 4 | Clasificación de gastos | ✅ |
| 5 | Análisis del perfil financiero | ✅ |
| 6 | Entrenamiento y evaluación de modelos | ✅ |
| 7 | Métricas de rendimiento adecuadas | ✅ |
| 8 | Serialización de los modelos | ✅ |

**Nuestro estándar, por encima del mínimo** (es lo que separa un notebook aprobado
de uno que gana):

| | ✅ |
|---|---|
| Comparación honesta contra **baselines** (keywords / regla) | ✅ |
| **Split por comercio**, no por fila (sin fuga de datos) | ✅ |
| Métrica reportada en el **set de validación manual**, por separado | ✅ |
| Matriz de confusión + precisión/recall **por clase** (no solo accuracy) | ✅ |
| Markdown explicando el **porqué** de cada decisión | ✅ |
| Una conclusión honesta, incluyendo **qué no funcionó** | ✅ |

---

## 3. Entregable de BACK-END

| # | Requisito | ✅ |
|---|---|---|
| 1 | Endpoint para **análisis financiero** (`POST /analisis-financiero`) | ✅ |
| 2 | Endpoint para **clasificación de transacciones** | ✅ |
| 3 | Validación de entrada | ✅ |
| 4 | Manejo de errores | ✅ |
| 5 | Documentación de los endpoints | ✅ |
| 6 | *"La arquitectura adoptada deberá ser documentada por el equipo"* → [`SYSTEM_DESIGN`](../arquitectura/SYSTEM_DESIGN.md) + [`adr/`](../adr/) | ✅ |

**El endpoint del enunciado debe aceptar EXACTAMENTE este JSON** (el jurado lo va a
copiar y pegar):

```json
{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "frecuencia_ahorro": "Media",
  "transacciones": [
    { "descripcion": "Supermercado", "valor": 420 },
    { "descripcion": "Combustible",  "valor": 300 },
    { "descripcion": "Streaming",    "valor": 40 }
  ]
}
```

…y devolver, **como mínimo**, estos 4 campos con estos nombres:
`perfil_financiero` · `probabilidad` · `resumen_gastos` · `recomendaciones`.

> ⚠️ Que este `curl` funcione **es lo más importante del proyecto**. Se prueba en
> cada release, y está en el smoke test.

---

## 4. Funcionalidades obligatorias (MVP)

| Funcionalidad | Detalle exigido | ✅ |
|---|---|---|
| **Clasificación de transacciones** | Alimentación, Transporte, Salud, Vivienda, Educación, Ocio, Servicios + otras del equipo → **cubierto con las 12** | ✅ |
| **Análisis del perfil financiero** | Saludable / En observación / En riesgo, con probabilidad | ✅ |
| **Recomendaciones financieras** | Motor de reglas, `codigo` + `parametros`, traducidas en las 3 lenguas | ✅ |

Los tres se verifican de una vez con `ops/ejemplos.mjs`, que **corre contra la
API pública** y comprueba las tres salidas campo a campo.

---

## 5. Recursos OPCIONALES (los que sumamos)

El enunciado los lista como valorados. **Vamos por 7 de 9.**

| Recurso opcional | ¿Lo hacemos? | Dónde |
|---|---|---|
| Dashboard financiero | ✅ **Sí** | F6 |
| Visualización de la evolución financiera | ✅ **Sí** - es nuestro diferencial | F6.5 |
| Procesamiento por lotes mediante CSV | ✅ **Sí** | F5.5 |
| Historial de análisis | ✅ **Sí** | F5.6 |
| Containerización con Docker | ✅ **Sí** | F1.2 |
| Pruebas automatizadas | ✅ **Sí** — 35 casos de contrato + 51 de navegador + smoke funcional (54 comprobaciones). Se lanzan a mano: **no hay CI montado** | [`PRUEBAS.md`](../proceso/PRUEBAS.md) |
| Explicabilidad de los modelos | 🟡 **Si da el tiempo** (TBD-M1) | F4.9 |
| Alertas de gastos elevados | ❌ No - ROADMAP | |
| Exportación de informes | ❌ No - ROADMAP | |

**Además, fuera de la lista del enunciado:**

| Extra | Por qué pesa |
|---|---|
| 🌎 **Trilingüe: español, portugués e inglés** - y **el modelo está entrenado en los 3**, no traducido | **Buena parte del jurado es de Brasil** (Alura es brasileña). Ver [ADR-0009](../adr/0009-multi-idioma.md) |
| **Multi-moneda** (8 monedas, tasas cacheadas con fallback) | El modelo usa ratios, así que la moneda no lo afecta |
| Auth propia: **JWT + refresh rotativo con detección de robo de token** | Es fintech |
| **2FA TOTP** · **bloqueo por fuerza bruta** (5 fallos → 15 min) · **auditoría de eventos** | Idem. ⚠️ Rate limit por IP en los endpoints públicos: **no implementado**, ver [`SEGURIDAD.md`](../seguridad/SEGURIDAD.md) §5 |
| Infra **privada sin puertos abiertos** (Terraform + Ansible + Cloudflare Tunnel) | Diferenciación |

### 🇧🇷 Verificación de portugués (no saltarse)

| | ✅ |
|---|---|
| `IFOOD *PEDIDO` → `alimentacion` (no `otros`) | ⬜ |
| `PIX RECEBIDO SALARIO` → `ingresos` | ⬜ |
| `CONTA DE LUZ ENEL` → `servicios` | ⬜ |
| `MAGAZINE LUIZA` → `compras` | ⬜ |
| **macro-F1 en `pt` ≥ 0.80** (reportado por separado) | ⬜ |
| Las traducciones las **revisó alguien que habla portugués** (D17) | ⬜ |

> **Si el modelo devuelve `Otros` ante `IFOOD` el día de la demo, ante un jurado
> brasileño, eso pesa más que cualquier acierto en español.**

---

## 6. Verificación final (el día de la entrega)

Lo marcado ✅ se comprobó el **2026-08-20 contra producción**, no de memoria.

| # | Comprobación | ✅ |
|---|---|---|
| 1 | El `curl` del enunciado funciona contra la URL pública | ✅ `https://api.fintechvital.com/api/v1/analisis-financiero` |
| 2 | Los **3 ejemplos** de [`EJEMPLOS.md`](EJEMPLOS.md) dan lo documentado | ✅ `ops/ejemplos.mjs` → **54/54** contra producción |
| 3 | Swagger UI carga y se puede probar todo desde ahí | ✅ `/api/v1/docs` responde; `openapi.json` también |
| 4 | El notebook corre de principio a fin **sin errores** | ⬜ |
| 5 | `git clone` + `docker compose up` levanta todo en una máquina limpia | ⬜ falta probarlo en una máquina *limpia* de verdad |
| 6 | **Ni un secreto en el repo** (¡es público!) | ✅ auditado el 2026-08-20: sin llaves, tokens ni OCID reales, tampoco en el historial |
| 7 | El README explica qué es, cómo se corre y cómo se prueba | ✅ |
| 8 | El video está subido y **se ve/oye bien** | ⬜ |
| 9 | El diagrama de arquitectura está en el repo | ✅ [`DIAGRAMAS.md`](../arquitectura/DIAGRAMAS.md) + [`ARQUITECTURA.md`](../ARQUITECTURA.md) |
| 10 | Todos los ⬜ de este doc son ✅ | ⬜ |

**Lo que queda, todo dependiente de personas y no de código**: el notebook de
punta a punta, la prueba en una máquina limpia, el video, y el **revisor nativo
de portugués** (D17) de §5.
