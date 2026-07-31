# CHANGELOG — Fintech Vital (frontend)

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) ·
Versionado: [SemVer](https://semver.org/lang/es/).

> El proyecto esta en `0.x`: la API publica todavia no es estable, asi que los
> cambios de contrato suben la **minor**.
>
> Estado de `0.2.0`: **sin commitear**. Todo esta en el arbol de trabajo; el plan
> de commits (archivos y comandos) esta en `COMMITS_PENDIENTES.md`.

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
- El AVD disponible en la maquina se llama `Pixel_9`; el script
  `scripts/windows/movil-emulador.ps1` trae `Small_Phone` por defecto, hay que
  pasarle `-Avd Pixel_9`.
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
