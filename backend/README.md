# API — Fintech Vital

API REST en **Java 21 + Spring Boot 3**. Es la única pieza que habla con la base
de datos y con el servicio de inferencia; toda la lógica de negocio vive aquí.

> 🚧 **Estado**: **autenticación y sesión funcionando** (registro, login con
> BCrypt, JWT con refresh, perfil del usuario) contra PostgreSQL real y
> verificado desde la web y desde el móvil. **La mayoría de los endpoints que el
> frontend necesita todavía no existen**: de los 44 del contrato, 6 están hechos.
>
> El inventario endpoint por endpoint (`ENDPOINTS.md`) y la revisión con el orden
> sugerido para atacarlo (`REVISION_API.md`) **no están en el repositorio**: son
> documentos de trabajo del equipo. **Pídelos antes de escribir código**, o
> acabarás inventándote la forma del JSON.

---

## Arrancar

Lo normal es levantarla con el stack entero (trae la base de datos ya migrada y
con datos de ejemplo):

```bash
./ops/stack.sh arriba
./ops/stack.sh logs api
```

Suelta, contra H2 en memoria, sin nada montado:

```bash
cd backend
./mvnw spring-boot:run
```

Solo la imagen:

```bash
docker build -t fintechvital/api:local backend/
```

---

## Configuración

Todo se puede sobrescribir por entorno, así que **la misma imagen sirve para
local, staging y producción** sin recompilar.

| Variable | Por defecto | Nota |
|---|---|---|
| `SERVER_PORT` | `8080` | |
| `SPRING_DATASOURCE_URL` | `jdbc:h2:mem:testdb` | En contenedor: `jdbc:postgresql://db:5432/fintechvital` |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | `sa` / `password` | |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | `org.h2.Driver` | `org.postgresql.Driver` |
| `SPRING_JPA_DATABASE_PLATFORM` | `H2Dialect` | `PostgreSQLDialect` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | **`none` contra PostgreSQL** ⚠️ |

### ⚠️ Por qué `ddl-auto=none` contra PostgreSQL

El esquema lo gobiernan las migraciones de [`../db/`](../db/), no Hibernate.

- `update` → Hibernate crearía **sus propias tablas** (`usuarios`,
  `banco_transacciones`, `categorias`…) **al lado** de las reales, porque las
  entidades JPA todavía no coinciden con el modelo de datos. Dos esquemas
  conviviendo, y ningún error.
- `validate` → la API **no arrancaría**, por esa misma discrepancia.
- `none` → se conecta y no toca nada. Es lo correcto **hasta que las entidades
  se reconcilien con el esquema**; a partir de ahí, `validate`.

---

## Estructura

```
src/main/java/com/hackathon/analisis/
├── controller/    AnalisisController · AuthController · TransaccionController · UserController
├── service/       AuthService · TransaccionService
├── repository/    Spring Data JPA
├── model/         Entidades: Usuario, UsuarioSeguridad, Transaccion, Categoria, PlanAhorro
└── dto/           LoginRequestDTO · RegisterRequestDTO · UserProfileDTO · ResumenFinancieroDTO
```

---

## Lo que ya está resuelto (infraestructura)

- ✅ `Dockerfile` multi-etapa: Maven + JDK 21 para compilar, JRE 21 Alpine para
  ejecutar. Usuario sin privilegios, `MaxRAMPercentage=75`, healthcheck.
- ✅ **Codificación UTF-8.** `application.properties` estaba en Windows-1252 y
  Maven abortaba en Linux con `MalformedInputException`: compilaba en las
  máquinas del equipo y fallaba en **cualquier** contenedor. Corregido, y el pom
  fija `project.build.sourceEncoding`.
- ✅ **Driver de PostgreSQL** añadido; `ojdbc11` de Oracle retirado (ADR-0014).
- ✅ **Configuración por entorno** en lugar de valores fijos.
- ✅ **Conexión verificada** en contenedor:
  `HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection`.

**No se tocó ningún endpoint, servicio ni lógica de negocio.**

---

## Lo que falta

Resumen. El detalle endpoint por endpoint está en los documentos de trabajo del
equipo (`ENDPOINTS.md`, `REVISION_API.md`), que no se publican: pídelos.

**Bloqueantes**

1. `POST /api/v1/analisis-financiero` — el endpoint del enunciado, el que el
   jurado va a probar. Hoy está en otra ruta, con otra entrada y otra salida.
2. Los controladores devuelven **entidades**, no DTOs: `AuthController` responde
   con el objeto `Usuario`, que incluye el campo `password`.
3. No hay autenticación real: `AuthService` compara contra credenciales escritas
   en el código y nada se persiste. Sin JWT no hay aislamiento por usuario.
4. `UserController` devuelve un usuario fijo escrito en el controlador.

**Pendiente de construir**

- ~30 endpoints del contrato (transacciones, análisis, catálogos, banca, metas,
  presupuestos, eventos, 2FA).
- Motor de reglas → recomendaciones (`codigo` + `parametros`, nunca frases fijas).
- Cliente del servicio de ML.
- `@ControllerAdvice` con la forma de error uniforme.
- `MessageSource` para `Accept-Language` (es · pt · en).
- CORS acotado a los dominios reales — hoy `AuthController` **no tiene**
  `@CrossOrigin`, así que el login fallará desde el navegador en staging.
- springdoc-openapi para Swagger en `/api/v1/docs`.

**La buena noticia**: la base de datos ya está migrada y **con datos dentro**.
Endpoints como `/categorias`, `/monedas`, `/cuentas`, `/tarjetas` o `/buro/salud`
son leer una tabla y devolverla.

---

## Convenciones

- **Dinero**: `BigDecimal`. Nunca `double` ni `float`.
- **JSON**: `snake_case` (`@JsonNaming(SnakeCaseStrategy.class)`).
- **Slugs**: en minúscula y sin acentos (`en_observacion`, `ahorro_inversion`).
  Nunca se traducen.
- **Fechas**: ISO-8601, UTC.
- **Entidades**: no salen por HTTP. Nunca.
- **Lombok**: en entidades JPA, `@Getter`/`@Setter` +
  `@EqualsAndHashCode(of = "id")`. `@Data` genera `equals`/`hashCode` sobre todos
  los campos, relaciones incluidas, y eso trae `LazyInitializationException` y
  bucles infinitos.

---

## Verificar

```bash
cd backend && ./mvnw verify
```

Y en contenedor, que es donde cuenta:

```bash
./ops/stack.sh rebuild
./ops/stack.sh probar
```
