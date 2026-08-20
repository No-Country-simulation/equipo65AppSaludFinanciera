# Requisitos de producto - fuente de verdad

Si algo de este doc contradice al código, **gana este doc** (o se cambia este doc
con un commit explícito). Actualizado: 2026-07-13.

## §1 Problema

Las personas tienen acceso a los datos de sus transacciones pero no logran
convertirlos en decisiones. Ven una lista de movimientos, no un diagnóstico.

La app convierte datos financieros crudos en información accionable:

- Organiza automáticamente gastos e ingresos (sin que el usuario categorice a mano).
- Muestra hacia dónde se va el dinero.
- Identifica hábitos positivos o de riesgo.
- Da recomendaciones simples de mejora.
- Permite seguir la evolución del comportamiento financiero en el tiempo.

## §2 Roles

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Anónimo** | Cualquiera (incluido el jurado) | Llamar el endpoint público `POST /api/v1/analisis-financiero` con un JSON de transacciones y recibir el análisis. Sin persistencia, sin cuenta. |
| **Usuario** | Persona registrada | Todo lo del dashboard: cargar transacciones, ejecutar análisis, ver historial y evolución, corregir categorías, activar 2FA. |
| **Admin** | Miembro del equipo | Ver métricas del sistema y eventos de auditoría. *(Alcance mínimo - no es un panel completo.)* |

> El endpoint anónimo existe porque el enunciado lo exige literalmente y es lo
> que el jurado va a probar con `curl`. **No se toca su forma.**

## §3 Flujo principal (punta a punta)

```
1. Registro / Login        email + password  ->  JWT (access 15min + refresh)
                           (2FA TOTP opcional, se activa desde el perfil)

2. Perfil financiero       El usuario informa:
                             - ingreso mensual + moneda principal
                             - nivel de endeudamiento (0-100)
                             - frecuencia de ahorro (nula|baja|media|alta)

3. Carga de transacciones  a) alta manual (descripcion, monto, moneda, fecha)
                           b) import CSV (procesamiento por lotes)

4. Analisis                El usuario aprieta "Analizar".
                           El backend:
                             i.   pide al ML que clasifique cada transaccion
                                  (descripcion -> categoria)
                             ii.  agrega por categoria -> resumen_gastos
                             iii. calcula los 8 indicadores (ratios)
                             iv.  pide al ML el perfil (indicadores -> perfil + prob.)
                             v.   aplica el motor de reglas -> recomendaciones
                             vi.  persiste el analisis completo

5. Dashboard               Perfil financiero + probabilidad
                           Gastos por categoria (grafico)
                           Indicadores (tasa de ahorro, endeudamiento, ...)
                           Recomendaciones priorizadas
                           Evolucion del perfil en el tiempo (serie)

6. Correccion              El usuario puede corregir la categoria de una
                           transaccion. Queda marcada como categoria_origen =
                           'usuario' y alimenta el reentrenamiento futuro.
```

## §4 Funcionalidades

### Obligatorias (MVP - las exige el enunciado)

| # | Funcionalidad | Detalle |
|---|---|---|
| O1 | Clasificación de transacciones | Descripción de texto → una de las 12 categorías. Ver [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md). |
| O2 | Análisis del perfil financiero | `saludable` \| `en_observacion` \| `en_riesgo` + probabilidad. |
| O3 | Recomendaciones | Simples, objetivas, priorizadas. Motor de reglas determinista. |
| O4 | API REST documentada | OpenAPI/Swagger UI. Endpoint de análisis + endpoint de clasificación. |
| O5 | Validación de entrada | Rechazo con 422 y mensaje claro por campo. Ver [`../operacion/ERRORES.md`](../operacion/ERRORES.md). |
| O6 | Manejo de errores | Respuesta de error uniforme, nunca un stacktrace. |
| O7 | Modelo entrenado y cargado | Serializado con joblib, versionado, cargado por el servicio FastAPI. |
| O8 | Integración con OCI | ✅ **Cumplido** (2026-08-20): Compute ARM + Container Registry + Vault + Bastion. Ver [`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md). |
| O9 | 3 ejemplos reales de uso | Ver [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md). |

### Del producto (nuestro alcance, más allá del mínimo)

| # | Funcionalidad | Por qué |
|---|---|---|
| P1 | Registro/login con JWT propio + refresh rotativo | El dashboard necesita cuentas. |
| P2 | 2FA con TOTP | Es fintech: el jurado espera ver seguridad seria. |
| P3 | Rate limiting + bloqueo por intentos fallidos | Idem. |
| P4 | Auditoría de eventos de seguridad | Idem; y le da trabajo real al DBA. |
| P5 | Dashboard con gráficos | Es lo que se ve en el video. |
| P6 | Historial de análisis | Recurso opcional del enunciado. |
| P7 | Evolución del perfil en el tiempo | Recurso opcional del enunciado; es el diferencial del producto. |
| P8 | Import CSV (procesamiento por lotes) | Recurso opcional del enunciado. |
| P9 | Corrección de categoría por el usuario | Cierra el ciclo de datos y se ve muy bien en la demo. |
| P10 | Multi-moneda | Elección del equipo. El modelo usa ratios, así que la moneda no lo afecta; solo importa para agregar y mostrar. |
| P11 | Explicabilidad del modelo | Mostrar qué indicadores empujaron el perfil. Recurso opcional del enunciado. |
| P12 | 🌎 **Trilingüe: español, portugués e inglés** | **Buena parte del jurado es de Brasil** (Alura es brasileña). No es solo la UI: el clasificador M1 tiene que entender `IFOOD *PEDIDO` y `PIX RECEBIDO`. [ADR-0009](../adr/0009-multi-idioma.md) |
| P13 | 📱 **App móvil (React Native + Expo)** | Decisión del equipo (2026-07-15). Mismo contrato de API que la web; referencia visual: app de banca tipo BBVA. Best-effort: **nunca bloquea la entrega**. [ADR-0010](../adr/0010-app-movil-react-native.md) |
| P14 | 💡 **Beta ampliada** (metas de ahorro, presupuestos, comparación mensual, detalle de categoría, recurrentes, proyección, export solo-UI, modo oscuro, a11y…) | Decisión de Angel (2026-07-16) para que la beta se sienta completa. Extendían el contrato original, así que se añadieron sus endpoints. ✅ **Implementadas** (2026-08-14): metas, presupuestos, comparación mensual y modo oscuro están en producción, contra la API real. |

### Deseables (solo si sobra tiempo - no comprometidas)

Alertas de gastos elevados · exportación de informes (PDF) · detección de gastos
recurrentes/suscripciones · comparación con usuarios similares.

## §5 Reglas de negocio

| # | Regla |
|---|---|
| RN1 | Un análisis es una **foto inmutable**: se guarda con el `modelo_version` que lo produjo. Reentrenar el modelo NO reescribe análisis viejos. |
| RN2 | La **probabilidad** que devuelve el análisis es la del perfil ganador (`max(predict_proba)`), redondeada a 2 decimales. |
| RN3 | Si el usuario **corrige** una categoría, esa corrección gana sobre el modelo para siempre en esa transacción (`categoria_origen = 'usuario'`). |
| RN4 | Una transacción con `monto > 0` es **ingreso**; con `monto < 0` es **gasto**. El endpoint público del enunciado recibe montos positivos y los interpreta como gastos (compatibilidad literal con el ejemplo). |
| RN5 | Los indicadores se calculan sobre **montos normalizados a la moneda principal del usuario** usando la tasa vigente a la fecha de la transacción. |
| RN6 | Si el modelo clasifica con **confianza < 0.40**, la categoría es `otros` y se marca para revisión. |
| RN7 | El análisis requiere **mínimo 3 transacciones** e `ingreso_mensual > 0`. Si no, 422. |
| RN8 | Las recomendaciones se devuelven **ordenadas por prioridad** (alta → baja), máximo 5. |
| RN9 | Un usuario solo puede ver **sus propias** transacciones y análisis. Sin excepciones. |

## §6 Anti-alcance (lo que NO hacemos)

- **No conectamos con bancos reales** ni Open Banking / Plaid / Belvo. Los datos
  los carga el usuario a mano o por CSV.
- **No movemos dinero.** No hay pagos, transferencias ni custodia.
- **No damos asesoría financiera regulada.** Las recomendaciones son educativas;
  la UI lo dice explícitamente.
- **No usamos un LLM para las recomendaciones.** Son reglas deterministas y
  auditables. (Un LLM sería más "impresionante" y menos defendible: no se puede
  explicar por qué dijo lo que dijo, y el jurado pide explicabilidad.)
- **No es multi-tenant** ni tiene organizaciones/equipos.
- ~~**No hay app móvil.** Web responsive.~~ → **CAMBIÓ (2026-07-15)**: el equipo
  decidió sumar una app móvil React Native (P13, [ADR-0010](../adr/0010-app-movil-react-native.md)).
  Sigue sin haber publicación en stores: corre en emulador/APK de desarrollo.
- **No procesamos PII real.** El dataset es sintético; las cuentas son de prueba.

## §7 Pendiente de decidir (TBD)

| # | Qué | Bloquea a |
|---|---|---|
| ~~TBD1~~ | ~~Nombre del proyecto~~ → **RESUELTO** (2026-07-30): **Fintech Vital**, fijado por el logo del equipo. Repo, dominio (`fintechvital.com`) y branding, hechos. Ver [`../BRANDING.md`](../BRANDING.md). | - |
| ~~TBD2~~ | ~~Idioma de la UI~~ → **RESUELTO**: trilingüe `es`/`pt`/`en` ([ADR-0009](../adr/0009-multi-idioma.md)). | - |
| TBD3 | ¿El admin necesita panel o alcanza con consultas SQL? | Backend (alcance). |
| ~~TBD4~~ | ~~Qué API externa de tipo de cambio se usa~~ → **RESUELTO**: **ExchangeRate-API**, cacheada en `tasa_cambio` con fallback a la última tasa conocida. Se configura con `EXCHANGERATE_*` en `ops/.env`. | - |
