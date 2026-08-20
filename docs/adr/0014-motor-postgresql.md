# ADR-0014 - El motor de base de datos es PostgreSQL 16

- **Estado**: Aceptada
- **Fecha**: 2026-08-03
- **Reemplaza a**: [ADR-0012](0012-motor-mysql.md) (MySQL 8), que a su vez reemplazó a [ADR-0003](0003-oracle-autonomous-db.md) (Oracle)

## Contexto

Este es el **tercer** motor que se decide, así que conviene ser explícito sobre
por qué, y por qué esta vez se para de cambiar.

- **ADR-0003** eligió Oracle por alineación con el sponsor del hackathon.
- **ADR-0012** cambió a MySQL 8 porque el modelo de datos del equipo
  (`perfil_financiero.sql`) ya venía escrito en MySQL y forzar Oracle habría
  bloqueado a quien estaba avanzando. Esa ADR consideró Postgres y lo descartó
  con un argumento razonable en su momento: *"nadie del equipo lo pidió y
  significaba reescribir igual el script del compañero. Cambiar por cambiar."*

Lo que cambió desde entonces:

1. **Ese script hay que reescribirlo de todas formas.** Al llevar el modelo del
   equipo a un esquema que aguante lo que el proyecto necesita aparecieron
   problemas de fondo que obligan a tocar casi todas las tablas: las
   transacciones colgaban solo de la tarjeta (un pago en efectivo quedaba sin
   dueño y las vistas lo descartaban en silencio), faltaban el nivel de
   endeudamiento y la frecuencia de ahorro —dos de las tres entradas del
   endpoint del enunciado—, no había tabla de recomendaciones ni de
   traducciones, y el análisis no guardaba sus indicadores. El coste de
   "reescribir el script" ya estaba pagado.

2. **La responsable de la decisión pidió PostgreSQL.** El argumento *"nadie lo
   pidió"* dejó de aplicar.

3. **La aplicación se apoya en cosas que en PostgreSQL son de serie**:
   `JSONB` con índices y operadores de contención (los indicadores del análisis
   se consultan, no solo se leen), columnas generadas, índices parciales,
   `DISTINCT ON`, `FILTER` en agregados, tipos `inet` y `uuid` nativos. En MySQL
   varias de esas se emulan con más SQL y peor rendimiento.

4. **La infraestructura es OCI ARM.** PostgreSQL 16 en ARM64 es terreno muy
   trillado y las imágenes oficiales son multi-arquitectura.

## Decisión

**El motor es PostgreSQL 16.** El esquema vive en `db/migraciones/` como
migraciones numeradas y versionadas, y es la única fuente de verdad. Ni el
script suelto ni `ddl-auto` de Hibernate generan el esquema.

Consecuencias directas:

- `ENUM` de MySQL → `TEXT` + `CHECK (col IN (...))`, con los valores en los
  **mismos slugs en minúscula que ya usa el frontend** (`activa`, `credito`,
  `app_movil`). Se acabó el `toLowerCase()` en cada capa.
- `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`. `CHAR(36)` para UUID →
  tipo `uuid` nativo (16 bytes en vez de 36, y validado por el motor).
- `TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP` no existe: se resuelve con un
  único trigger reutilizable, `fn_marcar_actualizado()`.
- `JSON` → `JSONB`, que permite `?&` para exigir que un análisis traiga los 8
  indicadores. Esa comprobación **no era expresable** en el modelo anterior.
- `TIMESTAMP` → `TIMESTAMPTZ`, todo en UTC.
- El dinero pasa a `NUMERIC(14,2)` (antes `DECIMAL(12,2)`): 12 dígitos se
  quedan cortos para COP o CLP, donde un sueldo mensual son 8 cifras.

## Alternativas consideradas

- **Quedarse en MySQL 8** (ADR-0012): la opción de menor fricción social. Se
  descarta porque el argumento que la sostenía —no reescribir el trabajo de
  quien hizo el modelo— ya no aplica: el modelo se reescribió igual por razones
  de corrección, no de motor.
- **SQLite**: suficiente para la demo, pero no se parece a producción y no
  soporta concurrencia real. La regla del proyecto es que local y producción
  usen **el mismo motor**.
- **Un servicio gestionado (Supabase, Neon)**: gratis y cómodo, pero mete una
  dependencia externa en la ruta crítica de la demo. Contradice
  [ADR-0008](0008-infra-no-bloquea-app.md).

## Consecuencias

- ✅ El esquema entero está en migraciones versionadas, con suma de verificación:
  editar una migración ya aplicada **falla de forma explícita** en vez de dejar
  dos entornos distintos en silencio.
- ✅ La base de datos viaja **dentro de una imagen** (`db/Dockerfile`) con su
  esquema y su semilla. Local, staging y producción arrancan igual; lo único que
  cambia es si se cargan los datos de ejemplo.
- ✅ Los valores de los `CHECK` coinciden exactamente con los tipos de TypeScript
  del frontend. Una capa menos donde equivocarse.
- ❌ **Quien escribió el modelo en MySQL tiene que revisar el nuevo esquema.** Es
  una conversación pendiente y hay que tenerla pronto, no darla por hecha.
- ❌ La documentación que menciona MySQL u Oracle queda desactualizada
  (`docs/arquitectura/STACK.md`, `DATOS.md`, `OCI.md`). Pendiente.
- ❌ El backend tuvo que sumar el driver `org.postgresql:postgresql` y retirar
  `ojdbc11`. Ya hecho y verificado en contenedor.

## Nota sobre cambiar de motor tres veces

No es una señal de buen diseño y conviene decirlo. Lo que lo hace asumible es
que **ninguna de las tres decisiones llegó a producción**: no hubo datos que
migrar ni usuarios afectados. A partir de aquí sí los hay, así que **este ADR
cierra el tema**: cambiar de motor otra vez requiere una razón de peso y migrar
datos reales.
