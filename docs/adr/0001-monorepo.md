# ADR-0001 - Monorepo

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13

## Contexto

El proyecto tiene 4 artefactos de software (backend Java, servicio ML en Python,
frontend Next.js, infraestructura) más la documentación, y lo desarrollan 8
personas de perfiles distintos (data science, data, DBA, backend, fullstack) en 6
semanas.

Los tres contratos entre capas (API, modelo, taxonomía) son **el mecanismo que
permite trabajar en paralelo**. Si se desincronizan, el proyecto se rompe.

## Decisión

**Un solo repositorio** con `backend/`, `ml/`, `web/`, `db/`, `infra/`, `docs/`.

## Alternativas consideradas

**Un repo por capa** (`<proyecto>-backend`, `<proyecto>-ml`, `<proyecto>-web`).
Descartada: los contratos vivirían duplicados o en un cuarto repo, y se
desincronizarían la primera semana. Además, la entrega del hackathon sería 4 links
en vez de uno, y un cambio que toca API + web (que son la mayoría) requeriría dos
PRs coordinados en dos repos.

**Monorepo con submódulos de git.** Descartada: los submódulos son notoriamente
confusos y con 8 personas de niveles distintos garantizan que alguien commitee el
puntero equivocado.

## Consecuencias

**A favor:**

- Los tres contratos viven en un solo lugar y **es imposible que estén
  desincronizados** con el código que los implementa.
- Un cambio que cruza capas es **un solo PR** con un solo diff que revisar.
- Los tests de contrato (que corren en ambos lados de la costura DS↔Backend)
  pueden compartir el mismo archivo de casos.
- La entrega es **un link**.

**En contra (y cómo lo manejamos):**

- **El CI corre de más**: un cambio en `web/` no debería disparar los tests de
  Java. → Se resuelve con `paths:` filters en GitHub Actions (un workflow por
  carpeta).
- **Más ruido en el historial**: `git log` mezcla commits de las 4 capas. → Se
  resuelve con el ámbito obligatorio en el commit (`feat(ml): …`, `fix(api): …`).
- **Permisos granulares imposibles**: todos pueden tocar todo. Para un hackathon
  de 6 semanas esto es una **ventaja**, no un problema.
