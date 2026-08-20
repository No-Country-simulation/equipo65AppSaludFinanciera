# Tests E2E de Fintech Vital

Dos suites que se complementan. Las dos corren **contra el stack real** (los
contenedores), no contra un `next dev` suelto: la regla del proyecto es que lo
que corre en contenedor se verifica en contenedor.

| Suite | Qué prueba | Cubre |
|---|---|---|
| `contrato.mjs` | La API real, pantalla por pantalla: que cada respuesta traiga **los campos que la interfaz pinta** | web **y** móvil |
| `navegador.spec.ts` | La web en un Chromium de verdad: que eso además **se vea** | web |

## Por qué una sola suite cubre web y móvil

`frontend/web/src/data` y `frontend/mobile/src/data` son **el mismo código**
(todos los archivos idénticos salvo `config.ts`, que lleva la URL base y el
almacenamiento de cada plataforma). Lo que rompe en la capa de datos rompe en
las dos interfaces.

Eso no es un supuesto: `contrato.mjs` lo **comprueba** en el bloque
`CAPA DE DATOS COMPARTIDA`. Si alguien toca una copia y no la otra, ese test
falla y avisa de que la suite ha dejado de cubrir las dos.

## Correrlos

Con el stack arriba (`.\ops\stack.ps1 arriba` desde la raíz):

```bash
# Contrato (sin dependencias, node >= 18). Cubre web y movil.
node frontend/e2e/contrato.mjs

# Navegador (la primera vez: npm install && npx playwright install chromium)
cd frontend/e2e
npm run navegador          # sin ventana
npm run navegador:ver      # viendo el navegador
npx playwright show-report informe
```

## Qué comprueban, y por qué así

**`contrato.mjs` no comprueba "responde 200".** Comprueba la forma. Un
`GET /categorias` que devuelve `200 [{slug, tipo, grupo}]` sin `etiqueta` deja
el desplegable con las opciones **en blanco**: hay `<option>` en el DOM, pero no
se lee nada. Por eso los casos afirman sobre los campos concretos que cada
pantalla pinta, y el mensaje de fallo dice qué se rompe en la interfaz, no solo
qué campo falta.

**El bloque `REGISTRO` de `contrato.mjs` compara campo a campo.** Da de alta un
usuario con el formulario entero relleno y exige que el alta, el login y
`GET /usuarios/me` devuelvan **lo mismo que se mandó**, incluida la ciudad.
Existe por un fallo concreto: `ciudad` viajaba en la petición, la API no tenía
ese campo, Jackson lo descartaba sin avisar y la ciudad no aparecía nunca en el
perfil. Un caso de "el alta responde 201" no lo habría cazado. El usuario de
prueba se da de baja al final del bloque.

El alta tiene **cuatro pasos** (cuenta, finanzas, seguridad, listo) y el de
finanzas guarda contra la API real -- ingreso mensual a `PATCH /usuarios/me` y
la primera meta a `POST /metas`--, no en `localStorage`. `navegador.spec.ts`
vigila que ese paso siga anunciandose en el stepper: si desaparece, el ingreso
mensual deja de pedirse en el alta y el analisis arranca sin base.

**`navegador.spec.ts` navega pulsando el menú, no con `page.goto()`.** No es
estilo: el token de sesión vive solo en memoria (`data/api/token.ts`) y
`hidratarSesion()` es un no-op, así que una carga completa de página lo pierde y
*todo* responde 401. Si los tests entraran por `goto`, fallarían todos por ese
único motivo y taparían lo que cada uno quiere comprobar. Ese fallo tiene su
propio bloque, `Sesion`, que es donde debe saltar.

## Configuración

Todo por variables de entorno, con valores por defecto que funcionan en local:

| Variable | Por defecto |
|---|---|
| `FV_API_URL` | `http://localhost:8080/api/v1` |
| `FV_WEB_URL` | `http://localhost:3000` |
| `FV_E2E_EMAIL` | `ana.torres@ejemplo.mx` |
| `FV_E2E_PASSWORD` | `Demo1234!` (el de `FV_PASSWORD_DEMO` en `ops/.env`) |
| `FV_E2E_IDIOMA` | `es` |

Para apuntar a staging:

```bash
FV_API_URL=https://api-staging.fintechvital.com/api/v1 \
FV_WEB_URL=https://staging.fintechvital.com \
node frontend/e2e/contrato.mjs
```

## Los tests que fallan hoy no son ruido

Un test que falla aquí está describiendo un fallo real de la aplicación. No se
ajusta el test para que pase: se arregla lo que señala, o se anota por qué se
deja.

`retries: 0` a propósito: un test que pasa "a la segunda" esconde justo lo que
buscamos, que es una pantalla que a veces no carga.
