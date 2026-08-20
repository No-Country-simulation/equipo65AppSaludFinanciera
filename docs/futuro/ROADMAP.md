# Roadmap - lo que queda FUERA del hackathon

Todo lo de este doc está **explícitamente fuera de alcance** hasta el 23 de agosto.
Existe para poder decir "sí, lo pensamos, y lo dejamos afuera **a propósito**" -
que es una respuesta mucho mejor que "no se nos ocurrió".

## Si sobra tiempo en la S4 (candidatos reales)

Ordenados por relación valor / esfuerzo:

| # | Qué | Por qué | Esfuerzo |
|---|---|---|---|
| 1 | **Explicabilidad con SHAP** (TBD-M1) | Es un *recurso opcional* del enunciado y ya está el hueco en el contrato (`explicacion`) | Medio |
| 2 | **Alertas de gastos elevados** | *Recurso opcional* del enunciado. Con el motor de reglas ya hecho, es barato | Bajo |
| 3 | **Exportar informe a PDF** | *Recurso opcional* del enunciado. Se ve bien en el video | Bajo |
| 4 | **Detección real de suscripciones** | Hoy `ratio_recurrente` es una heurística simple (misma descripción ≥ 2 veces). Detectarlas de verdad es un problema propio | Medio |
| 5 | **Prueba de carga con k6** | 5 minutos de trabajo y da un número concreto que decir en la presentación | Bajo |
| 6 | **Sumar una fuente pública al set de validación** | Refuerza la defensa contra la objeción del dataset sintético | Medio |

## Post-hackathon (producto de verdad)

### Datos y modelo

- **Reentrenamiento con las correcciones de los usuarios** (RN3). La infraestructura
  ya está: `categoria_origen = 'usuario'` marca cada corrección. Falta el ciclo:
  recolectar → reentrenar → validar → promover. **Es el paso natural nº1.**
- **Datos reales vía Open Banking** (Belvo, Plaid). Cambia el producto entero: se
  acaba la carga manual. Y trae PII de verdad, con todo lo que eso implica
  (LFPDPPP/GDPR, cifrado en reposo, derecho al olvido).
- **Detección de anomalías**: un gasto de 50.000 en alguien que gasta 3.000 no es una
  categoría, es una alerta.
- **Predicción**, no solo diagnóstico: *"a este ritmo, en 3 meses estarás en riesgo"*.
  Es la evolución obvia del gráfico de evolución.

### Producto

- **Metas de ahorro** y seguimiento contra ellas.
- **Presupuestos por categoría** con alertas al acercarse al límite.
- **Comparación con usuarios similares** (mismo rango de ingreso). Cuidado: es
  potente y también es cómo se hace sentir mal a la gente. Requiere criterio.
- ~~**App móvil**~~ → **entró al alcance del hackathon** el 2026-07-15
  ([ADR-0010](../adr/0010-app-movil-react-native.md)). Lo que queda para el
  futuro: publicación en stores (Play/App Store), push notifications, biometría.
- **Multi-idioma** (TBD2).

### Plataforma

- **Load Balancer de OCI**, si aparece tráfico interno que balancear
  ([ADR-0005](../adr/0005-infra-oci-privada.md) lo dejó como decisión reversible).
- **Observabilidad**: métricas, trazas, alertas. Hoy hay logs y `/salud`, y punto.
- **Blue/green deploy**. Hoy es `docker compose pull && up -d` en serie.
- **Reentrenamiento automático** en OCI Functions o Data Science.
- **Caché** (Redis) para el catálogo de categorías y las tasas. Hoy no hace falta ni
  de lejos.

## Rechazado a propósito (no volver sobre esto sin un ADR)

| Idea | Por qué NO |
|---|---|
| **Un LLM generando las recomendaciones** | No es explicable, no es determinista, es una dependencia de red en el camino crítico, puede alucinar consejos financieros, y cuesta. [ADR-0007](../adr/0007-recomendaciones-por-reglas.md) tiene el argumento completo |
| **Modelo exportado a ONNX y cargado en Java** | La conversión de un pipeline con TF-IDF es frágil y depurar discrepancias numéricas se come días. [ADR-0002](../adr/0002-tres-servicios.md) |
| **Postgres en local, Oracle en producción** | Dos dialectos, dos juegos de migraciones, y bugs que solo aparecen en la demo. [ADR-0003](../adr/0003-oracle-autonomous-db.md) |
| **Auth con un proveedor externo** | Dependencia fuera de OCI, y el equipo quiere construirla. [ADR-0004](../adr/0004-auth-propio-jwt.md) |
| **Ramas permanentes por módulo** | Fábrica de conflictos de merge: ramas cortas desde `develop`, una por cambio, y se borran al mergear |
| **Contar `ahorro_inversion` como gasto** | Penalizaría al usuario **por ahorrar**. [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md) §1 |
