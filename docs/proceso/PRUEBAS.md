# Estrategia de pruebas

En 6 semanas no se testea todo. **Se testea lo que, si se rompe, hunde el
proyecto.** Este doc dice exactamente qué es eso.

## §1 Los tests que NO pueden faltar

Si el tiempo aprieta, se recorta cualquier cosa **menos** estos.

| # | Test | Por qué es innegociable |
|---|---|---|
| **T1** | **Aislamiento por usuario** (RN9): A no ve nada de B | Es la falla de seguridad más grave posible en fintech |
| **T2** | **Paridad de indicadores** Python ↔ Java | Si divergen, el modelo se entrena con features distintas a las que recibe en producción. **Bug silencioso, caro, y descubierto tarde** |
| **T3** | **Tests de contrato** del servicio de ML (stub y real, mismos casos) | Es lo que garantiza que la integración DS↔Backend funcione a la primera |
| **T4** | **Sin fuga de datos** en el split (por usuario, no por transacción) | Sin esto, todas las métricas del notebook son mentira |
| **T5** | **Los 3 ejemplos** de [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md) | Es el entregable que el jurado va a ejecutar |
| **T6** | **503 si el ML no responde** (nunca un mock) | Es la regla de cero datos falsos |
| **T7** | **Reúso de refresh token** → revoca la familia | Si no está probado, la "detección de robo" es decorativa |
| **T8** | **Migraciones limpias** sobre BD vacía | Si no corren, no hay despliegue |

## §2 Por capa

### Backend (JUnit 5 + Testcontainers)

| Tipo | Qué se prueba |
|---|---|
| **Unitarios** | Los 8 indicadores **con todos los casos borde**: ingreso 0 (→422), gasto 0, `tasa_ahorro` negativa, outliers acotados a [-2, 1], redondeo a 3 decimales |
| **Unitarios** | **El motor de reglas: un test por regla**, con su caso que dispara y su caso que no |
| **Integración** | Endpoints contra **PostgreSQL real** (el del compose, o Testcontainers), **no H2** |
| **Integración** | Auth completa: registro, login, 2FA, refresh, rotación, **reúso (T7)**, bloqueo |
| **Integración** | **Aislamiento (T1)** |
| **Integración** | Import de CSV: válido, parcial, corrupto, gigante, bomba |
| **Contrato** | Contra el stub **y** contra el ML real: **los mismos casos** (T3) |

> ⚠️ **PostgreSQL real, no H2.** H2 en modo de compatibilidad **no** reproduce
> `JSONB`, ni `TIMESTAMPTZ`, ni los `CHECK`, ni `DISTINCT ON`, ni `pgcrypto` —
> todo lo cual usa el esquema. Un test que pasa en H2 y falla en PostgreSQL es
> peor que no tener test.
>
> H2 sigue siendo el **valor por defecto de `application.properties`**, y a
> propósito: permite `mvn spring-boot:run` sin nada montado. Pero no es contra lo
> que se prueba.

### ML (pytest)

| Tipo | Qué se prueba |
|---|---|
| Unitarios | `indicadores.py` - **paridad con Java (T2)**, con casos compartidos |
| Unitarios | Generador de dataset: balance de clases, ruido, semilla reproducible |
| Datos | **Sin fuga en el split (T4)**: ningún `usuario_id` en train y test a la vez |
| Modelo | El `.joblib` se carga en un **proceso limpio** y predice |
| Modelo | El modelo **le gana al baseline** (o el test falla ruidosamente) |
| Contrato | El servicio respeta el [`CONTRATO_MODELO`](../arquitectura/CONTRATO_MODELO.md): categorías siempre de las 12, probabilidades suman 1, 422 si >500 |

### Web (Vitest + Playwright, si da el tiempo)

| Tipo | Qué se prueba |
|---|---|
| Unitarios | Formateo de moneda, cálculo de porcentajes del gráfico |
| E2E | Login → cargar CSV → analizar → ver dashboard |
| E2E | **Backend caído → error + "Reintentar", NUNCA datos falsos** |

### E2E (`frontend/e2e/` + `ops/ejemplos.mjs`)

Contra el stack de compose completo:

1. Levanta todo, espera a que `/api/v1/salud` esté ok.
2. Corre **los 3 ejemplos (T5)** y compara con lo documentado.
3. Registro → login → CSV → análisis → historial.
4. **Apaga el ML** → verifica **503 (T6)**, no un resultado inventado.

## §3 CI (GitHub Actions) - ⚠️ DISEÑADO, NO MONTADO

> **No existe.** No hay ningún workflow en `.github/` de este repositorio. Esta
> sección es el diseño acordado, no una descripción de lo que corre hoy.
>
> **Mientras tanto, la verificación es manual y sí se ejecuta**: `ops/stack.ps1
> probar`, las dos suites de `frontend/e2e/` (contrato y navegador) y
> `ops/ejemplos.mjs`, que además corre contra producción. Lo que falta no son
> las pruebas — están escritas y pasan — sino que alguien las dispare sola en
> cada push.

Tres workflows con filtro de `paths:` (monorepo - un cambio en `web/` no dispara
los tests de Java).

| Workflow | Dispara con | Corre |
|---|---|---|
| `backend.yml` | `backend/**`, `db/**` | `mvn verify` + Testcontainers |
| `ml.yml` | `ml/**` | `ruff` + `pytest` + tests de contrato |
| `web.yml` | `web/**` | `lint` + `build` + Vitest |
| `seguridad.yml` | **todo** | **`gitleaks`** + auditoría de dependencias |
| `e2e.yml` | `develop` | Compose completo + `smoke.sh` |

**`gitleaks` correría en todo PR.** El repo es público. Hoy, sin CI, el escaneo
de secretos se hace **a mano antes de publicar** (última auditoría: 2026-08-20).

## §4 Lo que NO vamos a testear (decidido a propósito)

Decirlo por escrito evita discusiones sobre "falta cobertura".

- **Cobertura por porcentaje.** No perseguimos un número. Perseguimos los 8 tests
  de §1. Un 80% de cobertura con los tests equivocados no vale nada.
- **Tests de UI píxel a píxel.** Cero valor aquí.
- **Tests de carga.** No hay usuarios reales. *(Si sobra tiempo: un `k6` de 5
  minutos contra el endpoint público, para tener un número que decir en la
  presentación.)*
- **Tests de Terraform/Ansible.** Se verifican aplicándolos.
