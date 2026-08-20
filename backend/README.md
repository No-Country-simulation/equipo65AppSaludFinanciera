# API — Fintech Vital

API REST en **Java 21 + Spring Boot 3**. Es la única pieza que habla con la base
de datos y con el servicio de inferencia; toda la lógica de negocio vive aquí.

> ✅ **Estado (2026-08-20)**: **completa para todo lo que consumen la web y la
> app móvil**, contra PostgreSQL real, verificada en contenedor y **desplegada en
> producción** en <https://api.fintechvital.com>.
>
> | Bloque | |
> |---|---|
> | Análisis financiero (los 2 endpoints del enunciado) | ✅ |
> | Autenticación y sesión (JWT + refresh rotativo) | ✅ |
> | 2FA TOTP (alta, códigos de respaldo, login) | ✅ |
> | Perfil, exportación de datos y baja de cuenta | ✅ |
> | Banca (cuentas, tarjetas, buró) | ✅ |
> | Transacciones (CRUD + importar CSV) | ✅ |
> | Análisis persistido, historial y evolución | ✅ |
> | Catálogos (`/categorias`, `/monedas`, `/ciudades`) | ✅ |
> | Metas, presupuestos, eventos y `/resumen/comparacion` | ✅ |
>
> **Ninguna pantalla de la web o del móvil recibe ya un 404.** Del contrato queda
> sin implementar solo `GET /auditoria` (🔒 admin), que ninguna interfaz usa.
>
> La forma exacta del JSON está en
> [`CONTRATO_API.md`](../docs/arquitectura/CONTRATO_API.md) y en el
> Swagger de `/api/v1/docs`. **Léelos antes de escribir código**, o acabarás
> inventándote la forma de la respuesta.

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

```text
src/main/java/com/fintechvital/api/
├── controller/    AnalisisFinanciero · Auth · DosFactores · Usuario · Banca · Transaccion · Salud
│                  Categoria · Evento · Analisis · Resumen · Metas · Presupuesto
├── service/       AnalisisFinanciero · Indicadores · MotorReglas · ClienteMl
│                  Categoria · Transaccion · Evento · Analisis · Meta · Presupuesto
│                  Auth · Jwt · Totp · Cifrado · DosFactores · LimitadorLogin
│                  Usuario · Exportacion · Auditoria · Banca
├── dominio/       Taxonomia (los 12+3 slugs) · Indicadores · TransaccionClasificada
├── repository/    Spring Data JPA
├── model/         Entidades JPA (⚠️ el esquema lo gobiernan las migraciones de db/)
├── dto/           Entrada y salida de la API. Las entidades NUNCA salen por HTTP
├── security/      JwtFiltro · UsuarioActual (el id sale del token, RN9)
├── error/         ErrorNegocio · ManejadorErrores (la forma de error del contrato)
└── config/        Security · Cors · I18n · OpenApi

src/main/resources/
└── mensajes_{es,pt,en}.properties   Perfiles, categorías y recomendaciones
```

`dominio/` no tiene dependencias de Spring: son los slugs, las agrupaciones y
los value objects. Están en un solo sitio porque los mismos 12 slugs viven en
cuatro capas a la vez (modelo, API, base de datos y frontend), y repartidos por
el código siempre queda alguno viejo al cambiarlos.

---

## Los endpoints del enunciado

Son **públicos** (sin token): es lo que el jurado prueba con un `curl`.

```bash
curl -X POST http://localhost:8080/analisis-financiero \
  -H 'Content-Type: application/json' \
  -d '{
    "ingreso_mensual": 4500,
    "nivel_endeudamiento": 25,
    "frecuencia_ahorro": "Media",
    "transacciones": [
      { "descripcion": "Supermercado", "valor": 420 },
      { "descripcion": "Combustible",  "valor": 300 },
      { "descripcion": "Streaming",    "valor": 40 }
    ]
  }'
```

Responde igual en `/api/v1/analisis-financiero` y en `/analisis-financiero`
(sin prefijo), porque el enunciado lo escribe sin él.

Los **cuatro primeros campos** de la respuesta son literales del enunciado
(`perfil_financiero`, `probabilidad`, `resumen_gastos`, `recomendaciones`); el
resto son extensiones aditivas: `perfil_codigo` (el slug estable),
`indicadores`, `transacciones_clasificadas` y `recomendaciones_detalle`.

El otro es `POST /api/v1/transacciones/clasificar`, que clasifica sin
diagnosticar.

> Cabecera `Accept-Language: es | pt | en` para el idioma de los textos (por
> defecto `es`). **Los slugs no se traducen nunca**; las etiquetas, siempre.

---

## Cómo se produce un análisis

```text
1. ML   POST /interno/v1/clasificar   -> categoría de cada transacción
2. API  agrega los montos por categoría        -> resumen_gastos
3. API  calcula los 8 indicadores               -> ratios
4. ML   POST /interno/v1/perfil        -> perfil + probabilidades
5. API  motor de reglas sobre los indicadores   -> recomendaciones
6. API  responde
```

Los pasos **3 y 5 viven aquí a propósito**: el servicio de ML es inferencia
pura. Si calculara indicadores, la misma fórmula existiría en Java y en Python y
algún día divergirían.

El motor de reglas (`MotorReglasService`) es **determinista y auditable, no un
LLM**: se puede señalar la línea exacta que produjo cada consejo. Devuelve
`codigo` + `parametros`, nunca una frase; el texto se arma al final con el
idioma de la petición, así que el historial guardado se puede releer en otro
idioma.

Si el servicio de ML no responde, la API devuelve **503**. Nunca una predicción
inventada ni un valor por defecto.

---

## Documentación de la API

Swagger UI en **<http://localhost:8080/api/v1/docs>** · especificación OpenAPI
en `/api/v1/openapi.json`. Se genera desde los controladores y los DTO, así que
no se puede desincronizar del código.

---

## Lo que falta

Poco, y nada que bloquee a las interfaces ni a la entrega:

- **`GET /auditoria`** (🔒 admin). Los eventos **sí se registran** — cada login,
  cambio de contraseña y baja de cuenta escribe en `evento_auditoria` — pero no
  hay endpoint para leerlos. Ninguna pantalla lo pide.
- **Umbrales por categoría**: hoy viven en `dominio/Taxonomia.java`. La columna
  `categoria.umbral_ingreso` ya existe en la base y sería el sitio correcto;
  moverlos evitaría recompilar para ajustar un umbral.

La forma exacta de cada ruta está en
[`CONTRATO_API.md`](../docs/arquitectura/CONTRATO_API.md) y, generada
desde el código, en el Swagger de `/api/v1/docs`.

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
