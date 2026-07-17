# ⚠️ Carpeta MOCK - se BORRA al integrar con el backend (ADR-0011)

Simula la API en memoria para desarrollar las interfaces sin backend.
**Fecha de vencimiento: 9 de agosto de 2026** (congelamiento de integracion).

## Como se elimina (mecanico, ~2 minutos)

1. Borrar esta carpeta completa (`src/data/mock/`).
2. En `src/data/index.ts`, quitar las lineas marcadas con `// MOCK:`.
3. Poner `NEXT_PUBLIC_DATA_SOURCE=api` (web) / `EXPO_PUBLIC_DATA_SOURCE=api` (mobile)
   y `*_API_URL` apuntando al backend.
4. Verificar: `grep -ri "data/mock" src/` → 0 resultados.

Las pantallas NUNCA importan esta carpeta: consumen `FinanceDataSource`
via `@/data`. Si un import de `mock/` aparece fuera de `src/data`, es un bug.

## Usuaria demo

`demo@financeai.dev` / cualquier password de 10+ caracteres.
Cualquier otro email crea una cuenta vacia (sirve para probar estados vacios
y el onboarding).

## Persistencia (solo del mock)

La "BD" en memoria se respalda entera en el almacenamiento del cliente
(`localStorage` en web, `AsyncStorage` en movil) bajo la clave
`financeai.mock.estado.v1`. Por eso recargar la pagina o reabrir la app NO
borra lo cargado, y volver a iniciar sesion con el mismo email recupera los
datos. Si cambia la forma de `EstadoMock`, subir la clave a `v2` (el respaldo
viejo se descarta solo). Eliminar cuenta borra tambien el respaldo. Con la API
real nada de esto existe: los datos viven en el backend.
