# Runbook - operación día a día

Los comandos que se usan de verdad, en local y en producción.

> Guía completa del stack local: [`../../../ops/README.md`](../../ops/README.md) ·
> Despliegue en OCI: [`../../../ops/DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md)

## Local

Todo pasa por `ops/stack.sh` (Linux/macOS) o `ops/stack.ps1` (Windows). No hace
falta invocar `docker compose` a mano.

```bash
./ops/stack.sh arriba          # levantar todo (db + ml + api + web)
./ops/stack.sh probar          # esquema, migraciones, taxonomia, semilla, API y web
./ops/stack.sh logs api        # logs de un servicio: api | web | ml | db
./ops/stack.sh psql            # consola SQL, sin tener psql instalado
./ops/stack.sh migrar          # aplicar migraciones nuevas sobre una BD con datos
./ops/stack.sh abajo           # apagar (conserva el volumen)
./ops/stack.sh abajo -v        # apagar y BORRAR la base
./ops/stack.sh efimero         # primer plano; Ctrl+C borra contenedores, red y volumen
```

En Windows es lo mismo con `.\ops\stack.ps1 <accion>`.

Verificar que vive:

```bash
curl http://localhost:8080/api/v1/salud     # -> {"estado":"ok","bd":{...},"ml":{...}}
```

Los datos de demo se cargan solos en el primer arranque cuando `FV_CARGAR_DEMO=si`
(el valor por defecto en local). Solo tiene efecto sobre un volumen vacío: para
recargarlos hay que bajar con `-v` y volver a subir.

## Producción (OCI)

**No hay IP pública. No hay SSH abierto.** Todo acceso administrativo es por
**OCI Bastion**, y los scripts lo abren y lo cierran solos.

```powershell
.\ops\oci\publicar-imagenes.ps1              # construir arm64 y subir a OCIR
.\ops\oci\publicar-imagenes.ps1 -Solo web,api  # solo lo que cambio

.\ops\oci\desplegar.ps1                      # desplegar
.\ops\oci\desplegar.ps1 -Accion estado       # que corre, cuanto consume, si responde
.\ops\oci\desplegar.ps1 -Accion logs         # ultimas lineas de cada servicio
.\ops\oci\desplegar.ps1 -Accion bajar        # apagar (CONSERVA el volumen)
```

Y la comprobación que importa, que es funcional y no de "está encendido":

```bash
FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs
```

> ⚠️ **Un contenedor "arriba" no significa que la aplicación funcione.** Por eso
> el despliegue termina con este smoke test y con un gate que verifica que los
> contenedores son **realmente nuevos**: `podman-compose` puede reportar éxito
> sin haber recreado nada.

## Diagnóstico rápido

| Síntoma | Primero mira | Causa habitual |
|---|---|---|
| El sitio no carga | ¿El túnel está vivo? `desplegar.ps1 -Accion logs` | Token vencido, o la instancia sin salida a internet |
| La web carga pero no trae datos | La consola del navegador | `FV_CORS_ORIGINS` sin `www`. Ver [`DESPLIEGUE.md`](../DESPLIEGUE.md) |
| El análisis devuelve **503** | `GET /api/v1/salud` → bloque `ml` | El servicio de ML no responde o no cargó el modelo. **El 503 es correcto**: nunca se inventan datos |
| Todo devuelve 503 | `GET /api/v1/salud` → bloque `bd` | PostgreSQL caído o sin arrancar |
| Login siempre falla | Logs de la API | `FV_JWT_SECRETO` cambió y los tokens viejos ya no validan |
| 429 sin motivo | `intento_login` / rate limit | Alguien (o un test) disparó el bloqueo por fuerza bruta |
| `exec format error` al arrancar | La arquitectura de la imagen | Imagen x86 en una VM arm64: reconstruir con `--platform linux/arm64` |
| El despliegue "funciona" pero con código viejo | `desplegar.ps1 -Accion estado` | Faltó el `pull` o el `--force-recreate` |
| Los montos salen raros | Tabla `tasa_cambio` | El job de tasas no corrió; se usa una tasa vieja *(no es un error: es el fallback funcionando)* |

Más síntomas y su causa real, todos vistos de verdad durante el despliegue:
[`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md) §8 y §9.

## Antes de la demo (obligatorio)

```bash
# 1. Respaldo de la base
podman exec fintechvital-prod-db pg_dump -U fintechvital -Fc fintechvital \
  > respaldo-$(date +%F).dump

# 2. Los 3 ejemplos, contra la URL real
FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs

# 3. Las dos suites, contra el stack local levantado
node frontend/e2e/contrato.mjs
cd frontend/e2e && npm run navegador
```

Si el paso 2 no da **exactamente** lo que dice
[`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md), **no se graba** hasta entender
por qué.

## Rotar un secreto

1. Cambiarlo en **OCI Vault** (o en `ops/.env.prod`, según cuál sea).
2. Volver a desplegar: `.\ops\oci\desplegar.ps1`.
3. Verificar `GET /api/v1/salud` y correr `ops/ejemplos.mjs`.

> ⚠️ **Rotar `FV_JWT_SECRETO` invalida todas las sesiones activas.** Todo el
> mundo tiene que volver a entrar. **No hacerlo justo antes de grabar el video.**

## Si algo se rompe el día de la entrega

**No improvises. Ve al plan B.**

Se graba en **local** con `./ops/stack.sh arriba`. La semilla es **determinista**
— los mismos datos siempre, en cualquier máquina —, así que la grabación es
reproducible. El requisito de OCI ya está cumplido y documentado; el video se ve
igual. Ver [ADR-0008](../adr/0008-infra-no-bloquea-app.md).
