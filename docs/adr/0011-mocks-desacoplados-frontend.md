# ADR-0011 - Mocks desacoplados para desarrollar las interfaces (matiza "CERO datos mock")

- **Estado**: **Aceptada y CUMPLIDA** (2026-08-14)
- **Fecha**: 2026-07-15

> ✅ **La parte temporal de esta decisión ya se ejecutó.** La capa mock
> **se retiró**: `src/data/mock/` y los flags `NEXT_PUBLIC_DATA_SOURCE` /
> `EXPO_PUBLIC_DATA_SOURCE` **ya no existen** en el repositorio, y la única
> fuente de datos es la API real. Lo que **sí queda vigente** es el desacople que
> lo hizo posible: las pantallas siguen consumiendo solo la interfaz
> `FinanceDataSource`.
>
> Lo de abajo se lee en presente porque así se escribió en su día. Se conserva
> como registro de la decisión y de que la salida estaba planeada desde el
> principio — que es justo lo que evitó el desastre que temía.
- **Matiza**: la regla "CERO datos mock" de [ADR-0002](0002-tres-servicios.md) /
  F6.7. **No la deroga** - la reformula: cero mocks **en la demo y la entrega**;
  mocks **desacoplados y eliminables** durante el desarrollo de las interfaces.

## Contexto

La regla original decía: *las interfaces hablan SIEMPRE con la API; sin conexión →
error + "Reintentar"*. Su propósito era evitar el clásico desastre de hackathon:
una demo que "funciona" contra datos falsos y explota al conectar el backend real.

Pero el backend no existe todavía (Semana 0-1) y el equipo quiere **desarrollar ya
todas las interfaces** (web y móvil, ver [ADR-0010](0010-app-movil-react-native.md)).
Sin datos, no se puede construir ni evaluar un dashboard con gráficos. Aplicada
literalmente, la regla bloquea al frontend durante ~3 semanas - exactamente el tipo
de bloqueo que [ADR-0008](0008-infra-no-bloquea-app.md) prohíbe.

El backend ya tiene su equivalente aceptado: el stub `ml-fake` que respeta el
contrato. Esto extiende la misma idea al frontend, con reglas para que los mocks
no contaminen la entrega.

## Decisión

Cada frontend (`web/` y `mobile/`) tiene una **capa de datos con dos
implementaciones intercambiables** detrás de una única interfaz (`FinanceDataSource`):

```
src/data/
  types.ts        ← tipos TS 1:1 con CONTRATO_API.md (snake_case, slugs)
  datasource.ts   ← la interfaz que consumen TODAS las pantallas
  api/            ← implementación real (fetch a /api/v1/...) - queda
  mock/           ← implementación falsa + fixtures - SE BORRA al integrar
  index.ts        ← elige implementación por variable de entorno
```

- Selección por **variable de entorno**: `NEXT_PUBLIC_DATA_SOURCE=mock|api` (web)
  y `EXPO_PUBLIC_DATA_SOURCE=mock|api` (móvil). Default hoy: `mock`.
- **Las pantallas importan solo la interfaz** - jamás `mock/` directamente. Ese
  es el desacople que hace la eliminación mecánica: borrar `src/data/mock/`,
  quitar las 2 líneas marcadas `// MOCK:` en `src/data/index.ts` y poner `api`
  en la variable - ninguna pantalla se toca. Receta completa en
  `web/src/data/mock/README.md`.
- Los **fixtures copian los ejemplos literales del contrato** (mismos campos,
  mismos slugs, mismos redondeos). Un fixture con un campo que el contrato no
  tiene es un bug.
- La implementación `api/` se escribe **desde el día 1** (aunque apunte a un
  backend que aún no existe): es la prueba de que la interfaz es realista.

**La regla de oro queda así**: la demo, el video y todo lo que se entrega corren
con `DATA_SOURCE=api` contra el backend real; si la API no responde → error +
"Reintentar" (F6.7 no cambia). El modo `mock` es una herramienta de desarrollo
con fecha de vencimiento: **el congelamiento de integración (9 de agosto)**.

## Alternativas consideradas

- **Esperar al backend** (regla literal): descartada - bloquea todo el frontend
  hasta S3 y concentra el riesgo de integración al final, que es el anti-patrón
  que este proyecto está diseñado para evitar (R2 en SYSTEM_DESIGN §8).
- **MSW (Mock Service Worker)**: mockea a nivel HTTP, más fiel al transporte.
  Descartada - configuración distinta en Next.js y React Native, y el mock queda
  "invisible" en la red, más difícil de garantizar que se eliminó. La interfaz
  explícita hace el borrado verificable con un `grep`.
- **json-server / backend fake en compose**: descartada - otro proceso que
  mantener y sincronizar; el stub de compose ya existe para el ML y el backend
  real llega en S2. Los fixtures en memoria alcanzan para construir UI.

## Consecuencias

- ✅ Web y móvil se construyen completas desde hoy, contra la forma exacta del
  contrato congelado.
- ✅ La integración es un cambio de variable + un `rm -rf src/data/mock/`, no una
  reescritura.
- ❌ **Riesgo de drift**: si el backend se desvía del contrato, los mocks lo
  esconden. Mitigación: los fixtures son copias literales de los ejemplos del
  contrato, y los tests de contrato (`docs/contratos/casos.json`) corren del lado
  del backend.
- ❌ Riesgo de que el mock "se quede" por comodidad. Mitigación: fecha dura
  (9 ago), y F6.7 se verifica apagando el backend - un mock olvidado hace fallar
  esa verificación.
- Se actualizan: `REQUISITOS.md` §6, `GLOSARIO.md` ("Cero datos mock"),
  `ONBOARDING.md` (fullstack), `PENDIENTES_AGENTE.md` (F6) y `CLAUDE.md`.

## Ampliación 2026-07-16 - persistencia del estado del mock

Bug reportado por el equipo: recargar la web dejaba el dashboard vacío - el
mock vivía solo en memoria y `hidratarSesion` re-sembraba vacío a las cuentas
no demo. Decisión: el mock **respalda su estado completo** en el almacenamiento
del cliente (clave `financeai.mock.estado.v1`; localStorage en web,
AsyncStorage en móvil) y lo restaura por email en `hidratarSesion` y `login`.
El adaptador `almacenLocal` vive en `config.ts` - que ya era el único archivo
distinto por plataforma - así que los `mockDataSource.ts` siguen byte-idénticos
y la receta de borrado NO cambia: eliminar `mock/` sigue sin tocar pantallas
(el respaldo huérfano en el cliente es inocuo). Con `DATA_SOURCE=api` nada de
esto existe: los datos viven en el backend.
