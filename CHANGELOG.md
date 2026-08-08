# CHANGELOG — Fintech Vital

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) ·
Versionado: [SemVer](https://semver.org/lang/es/).

> El proyecto esta en `0.x`: la API publica todavia no es estable, asi que los
> cambios de contrato suben la **minor**.
>
> Hasta la `0.3.2` este archivo cubria solo el frontend, que era lo unico que
> habia en el repositorio. Desde la `0.4.0` cubre el proyecto entero: API, base
> de datos, servicio de modelo y operacion.

---

## [0.4.1] — 2026-08-07

### Cambiado

- **Modelos nuevos de Data Science integrados.** M1 pasa a ser un `Pipeline`
  que recibe la descripcion en crudo (TF-IDF word 1-2 + `char_wb` 3-5 sobre
  `LogisticRegression`) y devuelve los 12 slugs del proyecto con
  `predict_proba`. Desaparecen el `LabelEncoder`, los dos `StandardScaler` y
  toda la preparacion de features: ya no hacen falta.
- La clasificacion pasa a ser **modelo primero, baseline si el modelo no esta
  seguro**, en vez de "modelo solo para 18 comercios conocidos". Se ajusta solo:
  cuando M1 se reentrene con mas datos tomara el relevo sin tocar codigo.
- Se retira el campo `contexto` de `POST /interno/v1/perfil`. Existia porque el
  M2 anterior pedia montos absolutos; el nuevo ya no. La peticion ahora rechaza
  campos que no reconoce en vez de ignorarlos en silencio.

### Notas

- **M2 se carga pero NO se conecta**: sus 8 features no son los 8 indicadores
  del contrato, y en su propio reporte la clase `saludable` sale con f1 = 0.00
  (nunca la predice). El perfil lo sigue resolviendo la regla determinista.
  Detalle y que hace falta, en [`ml/README.md`](ml/README.md).

---

## [0.4.0] — 2026-08-07

Primera version con **analisis financiero de punta a punta**: el endpoint del
enunciado responde de verdad, contra PostgreSQL y contra un servicio de modelo.

### Anadido

- **`POST /api/v1/analisis-financiero`** — el endpoint del enunciado, con su
  forma literal. Responde tambien en `/analisis-financiero` (sin prefijo),
  porque es como aparece escrito. Los cuatro primeros campos de la respuesta
  son exactamente los del enunciado; el resto son extensiones aditivas.
- **`POST /api/v1/transacciones/clasificar`** — clasificacion sin diagnostico,
  que el enunciado pide como endpoint aparte.
- **Motor de reglas** determinista (11 reglas, maximo 5 por analisis). Devuelve
  `codigo` + `parametros`, nunca una frase: el texto se arma al leer, con el
  idioma de la peticion. **No es un LLM** — cada consejo se puede rastrear
  hasta la linea que lo produjo (ADR-0007).
- **Los 8 indicadores** de la taxonomia, calculados en la API (no en el modelo)
  y en `BigDecimal`.
- **Servicio de modelo (`ml/`)**: FastAPI que carga los `.pkl` de Data Science.
  Incluye el baseline por palabras clave **trilingue** que el contrato define
  como referencia a batir. Cada prediccion declara su `origen`.
- **2FA TOTP completo**: alta en dos pasos, codigos de respaldo de un solo uso,
  verificacion en el login. Implementacion propia contrastada con los vectores
  de prueba de la RFC 6238, asi que genera los mismos codigos que Google
  Authenticator.
- **Banca**: cuentas, tarjetas (alta, edicion y baja) y salud crediticia.
- **Portabilidad y baja de cuenta**: `GET /usuarios/me/exportacion` y
  `DELETE /usuarios/me` (borrado real, con cascada).
- **Bloqueo por fuerza bruta** sobre `intento_login` (5 fallos → `429` con
  `Retry-After`) y **auditoria** en `evento_auditoria`.
- **Swagger** en `/api/v1/docs` (springdoc-openapi).
- **Textos en tres idiomas** (`mensajes_{es,pt,en}.properties`) resueltos por
  `Accept-Language`.

### Cambiado

- El imagotipo **en negativo ya no se deriva** del positivo sustituyendo
  colores: es arte propia del disenador (blanco v1). Recupera la sombra de la
  "V" y los verdes mas claros, que la sustitucion perdia.
- `backend/README.md`, `docs/ARQUITECTURA.md` y `README.md` puestos al dia.

### Arreglado

- **La baja de cuenta no borraba nada y respondia `204`.** El `delete(entidad)`
  de Spring Data no emitia el `DELETE`; la transaccion hacia commit sin una sola
  sentencia de borrado. Ahora es una consulta explicita que comprueba las filas
  afectadas.
- **`modelo_version` llegaba a `null`** desde el servicio de modelo: el nombre
  no casaba y Jackson dejaba el campo vacio en silencio. Toda la costura entre
  servicios va ahora con `@JsonProperty` explicito.
- La descripcion `"Streaming"` — que esta en el ejemplo del propio enunciado —
  caia en `otros` en vez de `entretenimiento`.

### Retirado

- El antiguo `POST /api/analisis-financiero`, que recibia una lista de
  transacciones y devolvia otra forma. Lo sustituye el del enunciado.

---

## [0.3.2] — 2026-07-30

### Añadido

- **Atajo de login para desarrollo (SOLO en modo mock)**: dejando **email y
  password en blanco** se entra directo como el usuario demo, sin password ni
  2FA. Evita teclear correo + 10 caracteres + 6 digitos en cada recarga.
  - **El 2FA obligatorio NO se toca** (ADR-0013): si escribes un email, el flujo
    sigue exigiendo password de 10+ y codigo TOTP. Es lo que se le enseña al
    jurado y sigue funcionando igual.
  - El atajo vive en `mock/mockDataSource.ts`, asi que **desaparece solo** al
    integrar la API (se borra esa carpeta, ADR-0011). Contra la API real los
    campos vuelven a ser obligatorios (`required={DATA_SOURCE !== 'mock'}`).

### Notas

- Ojo con el correo del usuario demo: es **`demo@fintechvital.dev`** (con
  "vital"). Cualquier otro correo NO coincide con el sembrado y el mock crea una
  cuenta **nueva y vacia** - se ve como "Todavia no hay nada que analizar", que
  es el comportamiento correcto, no un fallo.

---

## [0.3.1] — 2026-07-30

Arreglos en los scripts de desarrollo, a partir de dos fallos reproducidos en
maquina.

### Corregido

- **La opcion `[2]` del menu (web en contenedor) no levantaba nada**, como si no
  existieran ni la imagen ni el contenedor. Causa: en Windows/macOS **Podman
  corre dentro de una VM** ("machine"); si esa VM esta parada, *todos* los
  comandos de Podman fallan con `Cannot connect to Podman` (exit 125). El script
  caia a Podman como alternativa pero **nunca arrancaba la maquina**. Ahora la
  arranca (`podman machine start`) y espera a que responda. Mismo arreglo en
  `macos/web-docker.sh`.
- **Orden de deteccion del motor**: si Docker no responde pero Podman si, ahora
  se usa Podman de inmediato en vez de esperar **2 minutos** a que Docker Desktop
  arranque (en maquinas donde Docker Desktop pide UAC no arranca nunca y ese
  tiempo era pura espera). Docker sigue teniendo prioridad si esta vivo.
- **`web-docker.ps1` no arrancaba por un choque de nombres**: la variable local
  `$motor` y el parametro `$Motor` son la MISMA variable (PowerShell no distingue
  mayusculas), asi que asignarle `$null` reventaba contra su `ValidateSet`.
- **El AVD del emulador estaba cableado a `Small_Phone`**, que solo existia en la
  maquina de quien escribio el script (y el comentario decia `Pixel_9`, con lo
  que ni siquiera coincidian). Los AVD son **locales de cada persona** y no hay
  ninguno "global": ahora, sin argumento, se toma el primero disponible.

### Añadido

- `-Avd` / primer argumento posicional para elegir AVD, variable de entorno
  `FINTECHVITAL_AVD` para fijar el propio, y error explicito con la lista de los
  que hay cuando el nombre no existe.
- **Arranque en frio del emulador**: `-Frio` (Windows) · `--frio` (Linux/macOS),
  que anade `-no-snapshot-load`. Resuelve el caso del emulador que arranca
  congelado (adb responde y `boot_completed=1`, pero la UI no pinta) por un
  *snapshot* sucio de una salida forzada.
- `-Motor docker|podman` en `web-docker.ps1` para forzar un motor y saltarse la
  deteccion.

---

## [0.3.0] — 2026-07-30

Identidad de marca. El equipo entregó el **imagotipo** y con eso quedó decidido el
nombre del producto: **Fintech Vital** (cierra **D4**, que llevaba pendiente desde
la S0). Se retiró el codename `financeAI` de todo el código y la doc, y la paleta
de la app se rederivó del logo.

### Añadido

**Marca**

- Tres variantes en `web/public/marca/`, generadas a partir del SVG del diseñador:
  - `logo.svg` — imagotipo para fondo claro.
  - `logo-negativo.svg` — para fondo oscuro. Hace falta porque sobre oscuro la
    parte pizarra del original **desaparece** contra el fondo y solo sobrevive
    "VITAL".
  - `isotipo.svg` — solo la "V" (check + flecha). Para sidebar colapsada, favicon
    e icono de app; el imagotipo completo es ilegible por debajo de ~90 px.
- Componente `Logo` en web y móvil, con `variante` (completo/isotipo) y `fondo`
  (auto/claro/oscuro). En web el cambio claro↔oscuro se resuelve **por CSS**, no
  por estado de React, para no parpadear en la carga.
- Dos scripts encadenados, para que la marca sea **reproducible** de punta a punta
  (importa: falta que el diseñador mande el arte corregido, y al reemplazarlo no
  se debe rehacer nada a mano):
  - `scripts/marca/derivar-variantes.mjs`: del SVG original a las 3 variantes.
    Quita el texto vivo, aísla el isotipo **por color** (no por índice de capa,
    para que aguante un reordenamiento) y construye el negativo.
  - `scripts/marca/generar-assets.mjs`: de los SVG a los PNG del móvil (1x/2x/3x),
    los iconos de Expo (iOS, adaptativo Android, monocromo, splash) y el favicon.
  Los binarios NO se editan a mano.
- Originales del diseñador archivados en `docs/marca/original/`.

### Cambiado

- **Paleta rederivada del logo**: pizarra `#414c5a` + lima `#88bd24`, reemplazando
  el verde pino + arena anteriores. En web (`globals.css`) y móvil (`tema.ts`),
  en tema claro y oscuro.
  - Se conservan **sin tocar** los colores con significado: `ok`/`warn`/`risk` del
    perfil y las 8 series categóricas de gráficos (están validadas para daltonismo).
- **Regla de uso del lima** (medida, no estética): sobre blanco da 2.25:1 y no
  llega al 4.5:1 de WCAG AA, ni siquiera con texto blanco encima. Por eso en tema
  claro es solo relleno y lo interactivo va en pizarra (8.73:1); en tema oscuro se
  invierte, porque ahí el lima da 7.79:1.
- Renombrado completo de `financeAI` → `Fintech Vital`: textos visibles, `<title>`,
  legales y privacidad en es/pt/en, claves de `localStorage`
  (`financeai.*` → `fintechvital.*`), email de demo, nombres de descarga, emisor
  del QR de 2FA, imagen/contenedor Docker y scripts por SO.
- `app.json` de Expo: nombre, slug, scheme, colores de splash e icono adaptativo.

### Notas

- ⚠️ **Pendiente con el diseñador**: el SVG original trae el claim "Fintech Vital
  By 65" como **texto vivo** en la fuente licenciada `MADE Waffle Soft`, que no
  tenemos. Cualquier navegador la sustituye y el renglón se ve mal, así que el
  imagotipo en uso va **sin** ese renglón. Hay que pedir el SVG con el texto
  convertido a curvas.
- Las claves de `localStorage` cambiaron de prefijo: quien tuviera la app abierta
  verá el estado local reiniciado (sesión, tema, datos del mock). Es intencional.
- Los **ADR no se renombraron**: son registros históricos de decisiones y se dejan
  tal como se escribieron.

---

## [0.2.0] — 2026-07-24

Reconciliacion de las interfaces (web + movil) con el modelo de datos del equipo
(`perfil_financiero.sql`), siguiendo `CAMBIOS_INTERFACES.md` y `CAMBIOS_BASE_DATOS.md`,
mas cuatro rondas de ajustes pedidos por Angel al probar la app.

### Añadido

**Capa de datos (mock desacoplado, ADR-0011 — identica en web y movil salvo `config.ts`)**

- Entidades nuevas: `CuentaBancaria`, `Tarjeta` (+ subtipo `credito` con
  `limite_credito` / `dia_corte` / `dia_pago` / `saldo_utilizado`), `RegistroBuro`
  y `SaludCrediticia`.
- `Transaccion` gana `comercio`, `medio_operacion` y `id_tarjeta`.
- `MetaAhorro` gana `estado` (`activo`/`finalizado`/`cancelado`) y `fecha_inicio`
  (reconciliacion con `PLANES_AHORRO`).
- `Usuario` gana datos personales: `apellido`, `fecha_nacimiento`, `genero`,
  `telefono`, `ciudad`, `estado_region`, `pais`.
- Metodos nuevos: `cuentas()`, `tarjetas()`, `saludCrediticia()`,
  `regenerarCodigos2fa()` y el CRUD `crearTarjeta()` / `actualizarTarjeta()` /
  `eliminarTarjeta()`.
- `FiltrosTransacciones.tarjeta` (filtrar movimientos por tarjeta) y
  `PatchUsuario.idioma` (preferencia persistida).
- `registro()` pasa a recibir un objeto `AltaUsuario` con los datos personales
  (`USUARIOS.nombre` / `apellido` / `fecha_nacimiento` son NOT NULL en la BD).
- Fixtures demo: 2 cuentas, 3 tarjetas (1 debito + 2 credito con corte/pago) e
  historial de buro de 6 meses coherente con la narrativa de `EVOLUCION_DEMO`.

**Pantallas nuevas (web + movil)**

- **Tarjetas y cuentas**: tarjeta visual con red de pago, estado, ultimos 4 y
  vencimiento; medidor de **utilizacion de credito**; lista de cuentas.
- **Salud crediticia**: score de buro con anillo de progreso y banda
  (excelente/bueno/regular/bajo), evolucion historica del score, dias de atraso y
  monto adeudado como senales de alerta.
- **CRUD completo de tarjetas**: crear, editar, cambiar estado y eliminar.
  Web: `/tarjetas/nueva` y `/tarjetas/[id]`. Movil: pantalla `nueva-tarjeta`
  (crear/editar segun parametro `id`) con refresco al volver.

**2FA obligatorio movido al registro (web + movil)**

- Asistente de alta: cuenta -> **QR real** -> verificar codigo -> codigos de
  respaldo -> entra. La cuenta no queda activa hasta completarlo.
- El login **siempre** pide el codigo TOTP.
- El perfil ya no activa/desactiva 2FA: solo **regenera codigos de respaldo**.
- **Generador de QR propio** (`src/lib/qr.ts`): TS puro, sin dependencias, modo
  byte, correccion M, versiones 1-10. Render SVG en web y `react-native-svg` en
  movil. **Verificado bit a bit contra la libreria `qrcode`** en 5 casos,
  incluido el `otpauth://` real (v6, 41x41): 0 diferencias.

**Otros**

- **Modo oscuro en la web** con boton de cambio (sidebar, cabecera movil y
  pantallas de auth), persistido en `localStorage` y con script anti-parpadeo.
  Misma paleta que el tema oscuro de la app movil.
- **Boton de tema en movil** en la pantalla de inicio (login) y en el registro.
- **Importar CSV en movil** (antes solo estaba en web), con selector de archivos.
- **Calendario interactivo con CRUD de eventos**: los dias son pulsables y muestran
  su detalle (gasto, corte/pago, eventos). Entidad `EventoCalendario` nueva en la
  capa de datos (`pago` / `cobro` / `recordatorio`) con crear, editar y eliminar.
- Datos personales en el registro: nombre, apellido, fecha de nacimiento (-> edad),
  genero, telefono y ciudad.
- i18n: **428 claves** en es/pt/en con paridad exacta.

### Cambiado

- **Movimientos** muestra `comercio` y `medio_operacion` (con iconos, sin emojis) y
  permite **filtrar por tarjeta**.
- **UX de filtros en movil**: se reemplazaron las filas de chips con scroll
  horizontal (habia que desplazarse mucho entre 15 categorias) por dos selectores
  compactos que abren una lista vertical, mas "limpiar filtros" y contador de
  resultados.
- **Perfil**: `nivel_endeudamiento` y `frecuencia_ahorro` pasan a **solo lectura**
  (los derivara Data Science) con un fallback de ajuste manual mientras no exista
  la formula; seccion de **datos personales** de solo lectura; **idioma persistido**
  en BD para que viaje entre web y movil.
- **Calendarios unificados**: el calendario de pagos (dia de corte / dia de pago) se
  integro dentro de **"Actividad del mes"**, junto al mapa de calor de gasto, con
  leyenda. Se elimino el calendario suelto de la pantalla de Tarjetas y el
  componente `CalendarioPagosReal`.
- El calendario del panel se renombro de "Calendario de pagos" a **"Actividad del
  mes"**: era un mapa de calor de gasto, no un calendario de pagos.
- Navegacion: entradas de Tarjetas y Credito en la web; pestana de Tarjetas en
  movil (Credito se abre desde ahi, para no saturar la barra inferior).
- El usuario demo (`demo@fintechvital.dev`) ahora tiene 2FA activo, para que el login
  muestre el paso TOTP.
- Clave de persistencia del mock: `fintechvital.mock.estado.v1` -> **`v3`** (el estado
  gano cuentas/tarjetas/buro y despues eventos; el respaldo viejo se descarta y se
  re-siembra en vez de dejar pantallas vacias).

### Corregido

- **Inputs ilegibles en modo oscuro (movil)**: el `Campo` pintaba el fondo con
  `blanco` (casi blanco en oscuro) y el texto con `tinta` (tambien claro). Afectaba
  ingreso mensual, login y registro.
- **"Gasto del mes" invisible en oscuro (movil)**: usaba `alertaFondo`
  (`rgba(242,163,13,0.2)`, casi transparente) como color de texto en vez de
  `alerta`. Mismo fallo en el punto de "Gastos" de la comparacion mensual y en la
  barra de utilizacion de credito.
- **Caja de terminos y condiciones ilegible (movil)**: tenia un fondo crema fijo
  con texto claro encima.
- **Grafica de dona (web)**: la cifra central se salia del hueco; ahora el texto
  esta acotado al interior del anillo.
- Textos de "Apariencia" del perfil movil estaban hardcodeados en espanol: ahora
  van por i18n y usan iconos en vez de emojis.
- Import muerto (`useI18n`) en `mobile/src/components/graficos.tsx`.
- **Recomendaciones sin traducir**: el analisis se guardaba con el texto ya
  renderizado y se reutilizaba, asi que en pt/en seguian leyendose en el idioma
  original. Ahora se re-renderizan desde `codigo` + `parametros` al idioma actual
  (que es justo para lo que existen, ADR-0009).
- **Modo claro roto en el panel movil**: la barra de pestanas y el fondo de las
  pantallas usaban `Colores` (estatico = tema oscuro), y el gradiente del hero
  terminaba en `canvas2` (crema en claro) con texto claro encima. El hero ahora es
  oscuro en ambos temas (como en la web) y las pestanas siguen el tema.
- **Calendario movil mal distribuido**: con `width: 100/7%` el redondeo hacia que
  cupieran 6 celdas por fila; ahora se renderizan semanas explicitas de 7.
- **`<option>` casi transparentes en oscuro (web)**: el desplegable es un widget
  nativo del SO y no hereda el tema; se les fija fondo y color en `globals.css`.

### Verificacion

| Ambito | Comando | Resultado |
|---|---|---|
| Web | `npx tsc --noEmit` | OK |
| Web | `npm run lint` | OK |
| Web | `npm run build` | OK — 49 paginas (es/pt/en) |
| Movil | `npx tsc --noEmit` | OK |
| Movil | `npm run lint` | OK (0 problemas) |
| QR | comparacion vs libreria `qrcode` | 5/5 identicos |
| i18n | paridad de claves es/pt/en | 428 = 428 = 428 |

### Notas y trampas encontradas

- ⚠️ **No correr `npm run build` con `npm run dev` levantado** (web): ambos escriben
  en `.next/` y lo corrompen (`_buildManifest.js.tmp` ENOENT). Parar el dev primero.
- ⚠️ Si el emulador Android se mata de golpe, queda un *snapshot* sucio y el
  dispositivo se queda en `offline`. Solucion: arrancar en frio
  (`emulator -avd <AVD> -no-snapshot-load`).
- Los AVD son **locales de cada maquina** y no hay ninguno estandar del equipo:
  el script ya no cablea ningun nombre (ver `[0.3.1]`).
- Dependencia nueva en movil: **`expo-document-picker`** (~57.0.1), para el import
  CSV. Viene incluida en Expo Go, no requiere dev build.
- El `Blob` de React Native no implementa `.text()`; el import movil lee el archivo
  con `fetch(uri).text()` y pasa un objeto minimo con esa forma. Con la API real
  habra que enviar un archivo RN (`{ uri, name, type }`) en el `FormData`.

### Pendiente / diferido

- Formula de `nivel_endeudamiento` y `frecuencia_ahorro` (la define Data Science).
- Comparacion mensual con `ahorro` y `deuda_total` de `RESUMEN_MENSUAL`.
- Cascada completa de resolucion de idioma por middleware de next-intl (hoy se
  adopta al iniciar sesion y se persiste al cambiarlo).
- El alta extiende el contrato `POST /auth/registro` con los datos personales:
  conviene un ADR cuando se formalice.
- Revision del portugues por un hablante nativo (pendiente D17 del proyecto).
- **Nada se valida de verdad todavia**: el codigo TOTP no se verifica (cualquiera de
  6 digitos entra), ni la contrasena; buro y tarjetas son datos mock. Lo unico real
  es el QR. La validacion llega con el backend (Spring Boot).

---

## [0.1.0] — 2026-07-17

Linea base: interfaces **web y movil completas** contra la capa mock desacoplada
(ADR-0011), en es/pt/en, con panel, movimientos, presupuestos, metas y analisis.
Backend, ML y BD todavia no existen. Subida inicial a GitHub.
