# Onboarding - de cero a corriendo

**Meta: cualquier persona del equipo levanta todo el stack en menos de 30 minutos,
sin cuenta de OCI, sin wallet y sin bastion.**

Eso es intencional ([ADR-0008](../adr/0008-infra-no-bloquea-app.md)): **nadie
necesita la nube para trabajar.** Si estás bloqueado esperando infra, algo se hizo
mal - avisa.

## §1 Qué necesitas instalado

| Herramienta | Versión | Quién la necesita |
|---|---|---|
| **Docker Desktop** (o Podman) | reciente | **Todos** |
| **Git** | reciente | **Todos** |
| Java (JDK) | **21** | Backend |
| Maven | (usa el `./mvnw` del repo) | Backend |
| Python | **3.11** | Data Science, Data |
| Node.js | **20+** | Fullstack |
| PowerShell 5.1+ / Bash | del sistema | Quien despliegue en OCI |

> **Con Docker alcanza para levantar todo.** El resto es solo si vas a desarrollar
> esa capa concreta.
>
> ¿Solo las interfaces, en una máquina limpia? → [`../FRONTEND_DESDE_CERO.md`](../FRONTEND_DESDE_CERO.md)

## §2 Los 3 comandos

```bash
git clone https://github.com/No-Country-simulation/fintech-vital-equipo65.git
cd fintech-vital-equipo65
./ops/stack.sh arriba          # Windows: .\ops\stack.ps1 arriba
```

No hace falta copiar ningún `.env`: el stack trae valores por defecto que
funcionan en local. Se levantan 5 contenedores:

| Servicio | Puerto | Qué es |
|---|---|---|
| `web` | 3000 | Next.js |
| `api` | 8080 | Spring Boot (API) |
| `ml` | - | FastAPI (interno, sin puerto expuesto a propósito) |
| `db` | 5432 | PostgreSQL 16 |
| `migrador` | - | Aplica las migraciones pendientes y se va |

Verificar:

```bash
curl http://localhost:8080/api/v1/salud     # -> {"estado":"ok",...}
curl http://localhost:8080/api/v1/categorias # -> las 12 categorias
open http://localhost:3000                   # el dashboard
open http://localhost:8080/api/v1/docs       # Swagger UI
```

> ⏳ **El primer arranque tarda**, porque construye las imágenes. Los siguientes
> son rápidos. Para ver el progreso: `./ops/stack.sh logs`. Y para comprobar que
> todo quedó bien — esquema, migraciones, taxonomía, semilla, API y web —:
>
> ```bash
> ./ops/stack.sh probar
> ```

## §3 Cargar datos de demo

```bash
# (los datos de demo se cargan solos en el primer arranque, con FV_CARGAR_DEMO=si)
```

Deja en la BD los 3 usuarios de [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md)
con sus transacciones. Es re-ejecutable (borra e inserta). **Es lo que se usa para
grabar el video** - así que si algo no coincide con el doc, es un bug.

## §4 El stub del modelo (y por qué ya no hace falta)

**Los dos modelos reales están entrenados y en uso**, así que el stack apunta al
servicio de verdad y no hay nada que configurar:

```bash
FV_ML_URL=http://ml:8000      # lo pone ops/compose.yml; no lo toques
```

Se cuenta aquí porque explica cómo se trabajó en paralelo. Mientras data science
entrenaba, el backend hablaba con **`ml-fake`**: un stub de ~30 líneas que
respetaba el [`CONTRATO_MODELO`](../arquitectura/CONTRATO_MODELO.md) y
clasificaba por palabras clave. Backend y frontend construyeron el flujo entero
sin esperar a nadie, y **el día de la integración se cambió esa línea y funcionó
a la primera**, que era exactamente la prueba de que el contrato servía.

Si algún día vuelve a hacer falta desarrollar sin el modelo — para aislar un
fallo, por ejemplo —, el contrato sigue siendo el mismo.

## §5 Por rol - qué hacer el primer día

### Backend

1. Levanta el stack, verifica `/api/v1/salud`.
2. Lee **[`CONTRATO_API.md`](../arquitectura/CONTRATO_API.md)** de punta a punta. Es tu especificación.
3. Lee [`TAXONOMIA.md`](../datos/TAXONOMIA.md) §3 y §4 - los indicadores y las
   reglas los implementas tú, y las fórmulas ya están escritas.
4. Tu trabajo está en F3 (auth), F5 (núcleo) y las transacciones. Ver
   `PENDIENTES_AGENTE.md`.

### Data Science

1. `cd ml && python -m venv .venv && pip install -r requirements.txt`
2. Lee **[`DATASET.md`](../datos/DATASET.md)** - en especial **§1** (la objeción del
   jurado) y **§6** (la fuga de datos en el split). Son las dos cosas que pueden
   invalidar todo tu trabajo.
3. Lee **[`CONTRATO_MODELO.md`](../arquitectura/CONTRATO_MODELO.md)** - es lo que
   tienes que cumplir. **No calculas indicadores; los recibes.**
4. Tu trabajo es F4. Empieza por los **baselines** (F4.1): son el número a batir.

### DBA

1. Lee **[`../../../db/README.md`](../../db/README.md)**, que es la fuente de
   verdad del esquema. `DATOS.md` describe el diseño **original sobre Oracle** y
   se conserva solo como registro.
2. Tu trabajo son las migraciones de `db/migraciones/` (propias, **no Flyway**:
   `V<n>__*.sql` + `aplicar.sh`, con SHA-256 en `esquema_historial`) y las
   semillas, más el ajuste de índices con evidencia (`EXPLAIN ANALYZE`).
3. **Nunca se edita una migración ya aplicada**: `aplicar.sh` compara el SHA-256
   y aborta, que es justo lo que quieres — evita que dos entornos diverjan en
   silencio.

### Fullstack (frontend)

1. `cd frontend/web && npm install && npm run dev` - y para la móvil:
   `cd frontend/mobile && npm install && npx expo start` (emulador Android o Expo Go).
   Menú con todo (doctor, contenedor, emulador): `frontend/INICIAR.bat` / `frontend/iniciar.sh`.
2. Lee **[`CONTRATO_API.md`](../arquitectura/CONTRATO_API.md)**, que está
   congelado y es la forma exacta del JSON. Complemento útil: el **Swagger**
   en `/api/v1/docs`, que se genera desde el código y no se puede desincronizar.
3. **Datos**: de la API real y de ninguna otra parte. La capa mock con la que se
   desarrollaron las interfaces **ya se retiró**
   ([ADR-0011](../adr/0011-mocks-desacoplados-frontend.md), cumplida): no existen
   ni `src/data/mock/` ni los flags `*_DATA_SOURCE`. Las pantallas importan
   **solo** la interfaz `FinanceDataSource` vía `@/data` — eso sí sigue —, que
   hoy tiene una única implementación. **La regla CERO mocks está cumplida**: sin
   API → error + "Reintentar".
4. Las categorías **se piden a `GET /api/v1/categorias`**, no se hardcodean.

### Infra

1. Lee **[`OCI.md`](../arquitectura/OCI.md)** y **[ADR-0005](../adr/0005-infra-oci-privada.md)**.
2. Lee **[ADR-0008](../adr/0008-infra-no-bloquea-app.md)**. Es sobre ti: tu trabajo
   **no puede bloquear a nadie**, y hay un plan B si no llega.
3. **Lo primero, hoy: intentar crear las 4 instancias ARM.** El "Out of host
   capacity" del Always Free puede tardar **días**. Si esperas a la S4, no llega.

## §6 Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La API arranca y muere | PostgreSQL todavía no está listo | Espera. `./ops/stack.sh logs db` |
| `Connection refused` contra `db` | Idem | Idem |
| El migrador sale con error | BD a medio inicializar | `./ops/stack.sh abajo -v && ./ops/stack.sh arriba` (borra el volumen) |
| Hibernate crea tablas raras al lado de las reales | `SPRING_JPA_HIBERNATE_DDL_AUTO` en `update` | Tiene que ser `none`: el esquema lo gobiernan las migraciones |
| El análisis devuelve **503** | El servicio de ML no responde | Verifica `ML_URL` en `.env`. **El 503 es correcto** - nunca inventamos datos |
| El motor de contenedores consume toda la RAM | En Windows es la VM de WSL, no el stack | Limítala en `%UserProfile%\.wslconfig` — ver [`DESPLIEGUE.md`](../DESPLIEGUE.md) §Memoria |
| El front muestra "Reintentar" | El backend está caído | **Es el comportamiento correcto.** Levanta el backend |
