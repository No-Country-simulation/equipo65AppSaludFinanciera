# financeAI - web (dashboard)

Dashboard web del proyecto: login/registro con 2FA, panel financiero,
movimientos (alta manual + import CSV), presupuestos, metas de ahorro,
análisis con recomendaciones y evolución del perfil, perfil de usuario y
páginas legales. **Trilingüe: español · português · english** (rutas
`/es`, `/pt`, `/en` con `next-intl`).

## Versiones

| Dependencia | Versión |
|---|---|
| Next.js (App Router + Turbopack) | **15.5.20** |
| React / React DOM | **19.1.0** |
| TypeScript | **5.x** |
| Tailwind CSS | **4.x** |
| next-intl (i18n) | **4.13** |
| Recharts (gráficos) | **3.9** |
| Node.js requerido | **20+** |

## Cómo correrla

```bash
npm install
npm run dev        # http://localhost:3000 (recarga en vivo)
```

O en contenedor (Docker o Podman, igual que la demo):

```powershell
# Windows
..\scripts\windows\web-docker.ps1          # build + up en http://localhost:3000
..\scripts\windows\web-docker.ps1 -Down    # detener
```

```bash
# Linux / macOS
../scripts/linux/web-docker.sh             # (macos/ para Mac) --down para detener
```

**Usuario demo**: `demo@financeai.dev` + cualquier contraseña de 10+
caracteres. Cualquier otro email crea una cuenta vacía (sirve para probar los
estados vacíos y el onboarding).

> ¿Máquina sin nada instalado? Guía completa paso a paso:
> [`docs/proceso/FRONTEND_DESDE_CERO.md`](../docs/FRONTEND_DESDE_CERO.md)

## De dónde salen los datos (importante)

Hoy la web corre contra una **capa mock desacoplada**
([ADR-0011](../docs/adr/0011-mocks-desacoplados-frontend.md)): no hay backend
todavía. Las pantallas consumen **solo** la interfaz `FinanceDataSource` vía
`@/data` y la implementación se elige por variable de entorno:

```bash
NEXT_PUBLIC_DATA_SOURCE=mock   # default hoy (sin backend)
NEXT_PUBLIC_DATA_SOURCE=api    # al integrar (borra src/data/mock/)
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

El mock respalda su estado en `localStorage` (clave
`financeai.mock.estado.v1`), así que recargar la página **no** borra lo que
cargaste. Receta de eliminación del mock: [`src/data/mock/README.md`](src/data/mock/README.md).

**Regla del proyecto: CERO datos mock en la demo/entrega.** Sin API en
producción → error + "Reintentar", nunca datos inventados.

## Estructura

```text
src/
  app/[locale]/        rutas por idioma (App Router)
    (auth)/            login, registro
    (app)/             panel, movimientos, presupuestos, metas, analisis, perfil
    legales/ privacidad/ licencias/
  components/          UI compartida + graficos (Recharts)
  data/                capa de datos (ADR-0011): types, datasource, api/, mock/
  i18n/                next-intl: routing, request, navigation
  lib/                 sesion (localStorage), useDatos, formato, series
  messages/ (raiz)     es.json · pt.json · en.json
```

Reglas que el código respeta: los **slugs** de categorías/perfiles nunca se
traducen ni se hardcodean (vienen de la capa de datos); las etiquetas legibles
son siempre del catálogo i18n.

## Verificación

```bash
npm run lint    # ESLint
npm run build   # build de produccion (incluye typecheck)
```

Lo que corre en contenedor se verifica en contenedor: `scripts/<so>/web-docker`
levanta la **imagen real** antes de dar algo por bueno.
