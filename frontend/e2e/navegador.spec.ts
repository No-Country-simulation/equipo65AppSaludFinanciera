import { test, expect, type Page } from '@playwright/test';

/**
 * E2E de navegador de la web, con el stack real detras.
 *
 * Lo que aporta sobre contrato.mjs: comprueba lo que solo existe PINTADO. Un
 * desplegable puede tener sus <option> en el DOM y aun asi verse vacio si la
 * API no manda `etiqueta`. Eso no lo caza una prueba de API.
 *
 * Correr con el stack arriba:
 *     cd frontend/e2e && npm run navegador
 */

const EMAIL = process.env.FV_E2E_EMAIL ?? 'ana.torres@ejemplo.mx';
const PASSWORD = process.env.FV_E2E_PASSWORD ?? 'Demo1234!';

/** Texto del estado de error de EstadoCarga ("No pudimos conectar con el servicio"). */
const ERROR_CARGA = /No pudimos conectar|Reintentar/i;

async function entrar(page: Page) {
  await page.goto('/es/login');
  await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^Entrar$/ }).click();
  // El login redirige a /<idioma>/panel con el idioma preferido del usuario.
  //
  // 30 s y no 15: recien reconstruida la imagen, Next compila la ruta /panel en
  // la primera visita y el redirect puede pasar de 15 s. Con el margen corto,
  // cada primera pasada dejaba 2-4 tests en rojo por algo que no esta roto.
  await page.waitForURL(/\/(es|pt|en)\/panel/, { timeout: 30_000 });
}

/**
 * Navega COMO NAVEGA UNA PERSONA: pulsando el menu, sin recargar.
 *
 * No es un capricho: el token de sesion vive solo en memoria (data/api/token.ts)
 * y `hidratarSesion()` es un no-op, asi que un `page.goto()` -- que es una carga
 * completa, igual que un F5 -- lo pierde y TODO responde 401. Si estos tests
 * entraran por `goto`, fallarian todos por ese unico motivo y taparian lo que
 * cada uno quiere comprobar. Ese fallo tiene su propio test en "Sesion".
 */
async function irA(page: Page, enlace: RegExp) {
  // En pantalla de telefono el menu lateral es un drawer fuera de pantalla
  // (`lg:translate-x-0`): los enlaces estan en el DOM pero no se pueden pulsar
  // hasta abrirlo con el boton "Menu". En escritorio ese boton no se ve.
  const menu = page.getByRole('button', { name: 'Menú' });
  if (await menu.isVisible().catch(() => false)) await menu.click();

  await page.getByRole('link', { name: enlace }).first().click();
  await page.waitForLoadState('networkidle');
}

/**
 * Silencia el aviso de almacenamiento ANTES de que se pinte.
 *
 * Esta fijo abajo y, en viewport de telefono, tapa el boton de enviar del
 * formulario. Se marca su clave en localStorage en vez de pulsar "Entendido":
 * el banner entra con animacion y Playwright lo rechaza por inestable mientras
 * se mueve, asi que el clic se agotaba esperando.
 */
async function silenciarAviso(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('fintechvital.avisoAlmacenamiento', '1');
  });
}

/**
 * Recoge las llamadas a la API que falla la pagina. Sirve para que, cuando un
 * test falle, el motivo salga en el mensaje y no haya que abrir devtools.
 */
function vigilarApi(page: Page) {
  const fallos: string[] = [];
  page.on('response', (r) => {
    const url = r.url();
    if (url.includes('/api/v1/') && !r.ok()) {
      fallos.push(`${r.status()} ${r.request().method()} ${url.split('/api/v1')[1]}`);
    }
  });
  return fallos;
}

/**
 * El filtro de categoria de Movimientos.
 *
 * No vale `page.locator('select').first()`: el layout monta el selector de
 * idioma (es/pt/en), que va antes en el DOM. Se ancla por su opcion fija
 * "Todas las categorias", que es la unica que no depende de la API.
 *
 * (Ese <select> no tiene `aria-label`, al contrario que el de tarjeta; con uno
 * este ancla seria un `getByRole('combobox', { name: ... })` y de paso lo
 * anunciaria un lector de pantalla.)
 */
function filtroCategoria(page: Page) {
  return page.locator('select').filter({ has: page.locator('option', { hasText: /^Todas las categor/ }) });
}

test.beforeEach(async ({ page }) => {
  await entrar(page);
});

// ---------------------------------------------------------------- movimientos

test.describe('Movimientos', () => {
  test('la pantalla carga sin quedarse en el estado de error', async ({ page }) => {
    const fallos = vigilarApi(page);
    await irA(page, /^Movimientos$/);
    await expect(page.getByRole('heading', { name: 'Movimientos' })).toBeVisible();

    await expect(
      page.getByText(ERROR_CARGA),
      `La pantalla se quedo en error. Llamadas fallidas: ${fallos.join(' | ') || 'ninguna'}`,
    ).toHaveCount(0);
  });

  test('el filtro de categoria tiene opciones y se ven (fallo reportado)', async ({ page }) => {
    const fallos = vigilarApi(page);
    await irA(page, /^Movimientos$/);

    const filtro = filtroCategoria(page);
    await expect(filtro).toBeVisible();

    const opciones = filtro.locator('option');
    // El <select> se pinta con "Todas" ANTES de que responda /categorias, y
    // `count()` no espera: contar de inmediato daba 1 y el test fallaba por
    // carrera, no porque el catalogo estuviera roto. Se espera a la segunda
    // opcion; si no llega, las afirmaciones de abajo dan el mensaje bueno.
    await opciones.nth(1).waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
    const total = await opciones.count();

    // "Todas" existe siempre porque esta hardcodeada; las demas vienen de
    // GET /categorias. Si solo hay una, el catalogo no llego.
    expect(
      total,
      `El desplegable de categoria solo tiene ${total} opcion(es): llega "Todas" y nada mas. ` +
        `Llamadas fallidas: ${fallos.join(' | ') || 'ninguna'}`,
    ).toBeGreaterThan(1);

    // Y las opciones tienen que tener texto legible: un <option> con `etiqueta`
    // vacia esta en el DOM pero se ve en blanco, que es como se reporto el fallo.
    const textos = await opciones.allTextContents();
    const vacias = textos.filter((t) => t.trim().length === 0);
    expect(
      vacias.length,
      `${vacias.length} de ${total} opciones se pintan en blanco: la API no manda "etiqueta"`,
    ).toBe(0);
  });

  test('el desplegable de categoria trae las 12 de la taxonomia', async ({ page }) => {
    await irA(page, /^Movimientos$/);
    const filtro = filtroCategoria(page);
    await expect(filtro).toBeVisible();

    // Misma carrera que el test de arriba: el <select> se pinta con "Todas"
    // ANTES de que responda /categorias, y `evaluateAll` no espera. Sin esto el
    // test leia 0 categorias y fallaba por timing, no porque el catalogo
    // estuviera roto -- y solo en movil-web, que es mas lento, lo que lo hacia
    // parecer un fallo de esa vista.
    await expect
      .poll(
        async () =>
          filtro.locator('option').evaluateAll((os) =>
            os.map((o) => (o as HTMLOptionElement).value).filter(Boolean).length,
          ),
        {
          timeout: 15_000,
          message: 'el catalogo de categorias no llego al desplegable',
        },
      )
      .toBeGreaterThanOrEqual(12);
  });

  test('filtrar por una categoria recarga la lista', async ({ page }) => {
    await irA(page, /^Movimientos$/);
    const filtro = filtroCategoria(page);
    await expect(filtro).toBeVisible();
    const valores = await filtro.locator('option').evaluateAll((os) =>
      os.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
    test.skip(valores.length === 0, 'sin catalogo no hay nada que filtrar');

    await filtro.selectOption(valores[0]);
    await expect(page.getByText(ERROR_CARGA)).toHaveCount(0);
  });

  test('la lista muestra movimientos con su categoria traducida, no el slug', async ({ page }) => {
    await irA(page, /^Movimientos$/);
    await expect(page.getByRole('heading', { name: 'Movimientos' })).toBeVisible();

    // `count()` NO espera: contaba antes de que resolviera el fetch y daba 0 en
    // cuanto la maquina iba cargada (suite completa con varios workers).
    const filas = page.locator('ul > li');
    await expect(filas.first()).toBeVisible();
    const n = await filas.count();
    expect(n, 'la lista de movimientos llega vacia').toBeGreaterThan(0);

    // Si se pinta el slug crudo (`ahorro_inversion`) es que la etiqueta no llego.
    const texto = await filas.first().innerText();
    expect(texto, `la fila pinta el slug crudo en vez de la etiqueta: "${texto}"`).not.toMatch(/_/);
  });

  test('"Corregir" abre el selector de categoria con opciones', async ({ page }) => {
    await irA(page, /^Movimientos$/);
    const corregir = page.getByRole('button', { name: 'Corregir' }).first();
    await expect(corregir).toBeVisible();
    await corregir.click();

    // Al corregir, el boton de la fila se sustituye por un <select> de categorias.
    const selector = page.locator('li select');
    const opciones = await selector.locator('option').allTextContents();
    expect(opciones.length, 'el selector de correccion abre sin opciones').toBeGreaterThan(0);
    expect(
      opciones.filter((t) => t.trim().length === 0).length,
      'el selector de correccion tiene opciones en blanco',
    ).toBe(0);
  });

  test('el alta de movimiento deja elegir la categoria', async ({ page }) => {
    await irA(page, /^Movimientos$/);
    await page.getByRole('button', { name: 'Agregar movimiento' }).click();

    const formulario = page.locator('form');
    await expect(formulario).toBeVisible();

    // Quien da de alta un movimiento tiene que poder decir de que es.
    //
    // Se busca EL SELECTOR DE CATEGORIA por su etiqueta, no `toHaveCount(1)`
    // sobre todos los <select> del formulario: eso valia cuando la categoria era
    // el unico desplegable, pero el alta gano el de tarjeta y el test empezo a
    // fallar por un cambio que no rompia nada. Se afirma la intencion -- "se
    // puede elegir la categoria" -- en vez de cuantos controles hay al lado.
    const categoria = formulario.getByLabel(/^Categor/);
    await expect(
      categoria,
      'el formulario de alta no tiene ningun campo para elegir la categoria',
    ).toBeVisible();

    // Y que traiga el catalogo, no solo la opcion "Automatica".
    await expect
      .poll(
        async () =>
          categoria.locator('option').evaluateAll((os) =>
            os.map((o) => (o as HTMLOptionElement).value).filter(Boolean).length,
          ),
        { timeout: 15_000, message: 'el selector de categoria del alta llego vacio' },
      )
      .toBeGreaterThanOrEqual(12);
  });
});

// -------------------------------------------------------------------- tarjetas

test.describe('Tarjetas', () => {
  test('la pantalla carga sin quedarse en el estado de error', async ({ page }) => {
    const fallos = vigilarApi(page);
    await irA(page, /^Tarjetas$/);
    await expect(page.getByRole('heading', { name: 'Tarjetas y cuentas' })).toBeVisible();
    await expect(
      page.getByText(ERROR_CARGA),
      `La pantalla se quedo en error. Llamadas fallidas: ${fallos.join(' | ') || 'ninguna'}`,
    ).toHaveCount(0);
  });

  test('se pintan las cuentas con el numero enmascarado', async ({ page }) => {
    await irA(page, /^Tarjetas$/);
    await expect(page.getByText(/Cuenta \*+/)).not.toHaveCount(0);
  });

  test('se pintan las tarjetas con red, ultimos 4 y estado', async ({ page }) => {
    await irA(page, /^Tarjetas$/);
    await expect(page.getByText(/VISA|Mastercard|AMEX/)).not.toHaveCount(0);
    await expect(page.getByText(/•{4} \d{4}/)).not.toHaveCount(0);
    // El estado sale de un diccionario: si llegara en mayusculas o con otro
    // slug, next-intl pintaria la clave cruda en vez de "Activa".
    await expect(page.getByText(/^(Activa|Bloqueada|Cancelada)$/)).not.toHaveCount(0);
    await expect(page.getByText(/estados\./)).toHaveCount(0);
  });

  test('la tarjeta de credito muestra su barra de utilizacion', async ({ page }) => {
    await irA(page, /^Tarjetas$/);
    await expect(page.getByText('Utilización de crédito')).not.toHaveCount(0);
    await expect(page.getByText(/Corte día \d+/)).not.toHaveCount(0);
  });

  test('"Ver movimientos" de una tarjeta lleva a una pantalla que carga', async ({ page }) => {
    const fallos = vigilarApi(page);
    await irA(page, /^Tarjetas$/);
    await page.getByRole('button', { name: 'Ver movimientos' }).first().click();
    await page.waitForURL(/\/movimientos\?tarjeta=/);
    await expect(
      page.getByText(ERROR_CARGA),
      `Desde tarjetas se llega a movimientos y revienta. Llamadas fallidas: ${fallos.join(' | ') || 'ninguna'}`,
    ).toHaveCount(0);
  });

  test('"Agregar" abre el formulario con la cuenta a elegir', async ({ page }) => {
    await irA(page, /^Tarjetas$/);
    await page.getByRole('button', { name: 'Agregar' }).click();
    await page.waitForURL(/\/tarjetas\/nueva/);
    // red_pago, cuenta y estado son desplegables: los tres tienen que traer opciones.
    const selects = page.locator('select');
    await expect(selects).not.toHaveCount(0);
    const n = await selects.count();
    for (let i = 0; i < n; i++) {
      const textos = await selects.nth(i).locator('option').allTextContents();
      expect(textos.length, `el desplegable ${i} del alta de tarjeta esta vacio`).toBeGreaterThan(0);
      expect(
        textos.filter((t) => t.trim().length === 0).length,
        `el desplegable ${i} del alta de tarjeta tiene opciones en blanco`,
      ).toBe(0);
    }
  });
});

// ----------------------------------------------------- el resto de la navegacion

test.describe('Resto de pantallas', () => {
  for (const [nombre, enlace, encabezado] of [
    ['Panel', /^Panel$/, /Hola|Panel/i],
    ['Analisis', /^Análisis$/, /Análisis/i],
    ['Credito', /^Crédito$/, /Crédito|Salud/i],
    ['Metas', /^Metas$/, /Metas/i],
    ['Presupuestos', /^Presupuestos$/, /Presupuestos/i],
    ['Perfil', /^Perfil$/, /Perfil/i],
  ] as [string, RegExp, RegExp][]) {
    test(`${nombre} carga sin quedarse en el estado de error`, async ({ page }) => {
      const fallos = vigilarApi(page);
      await irA(page, enlace);
      await expect(page.getByRole('heading', { name: encabezado }).first()).toBeVisible();
      await expect(
        page.getByText(ERROR_CARGA),
        `${nombre} se quedo en error. Llamadas fallidas: ${fallos.join(' | ') || 'ninguna'}`,
      ).toHaveCount(0);
    });
  }
});

// --------------------------------------------------------------------- sesion

test.describe('Sesion', () => {
  test('la sesion sobrevive a una recarga (F5)', async ({ page }) => {
    const fallos = vigilarApi(page);
    await irA(page, /^Tarjetas$/);
    await expect(page.getByText(/Cuenta \*+/)).not.toHaveCount(0);

    fallos.length = 0;
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Sigue "dentro" -- el menu esta, el usuario esta en localStorage -- pero
    // el token solo vivia en memoria, asi que la API rechaza todo. La pantalla
    // se ve iniciada y vacia a la vez, que es lo peor de los dos mundos.
    const noAutorizadas = fallos.filter((f) => f.startsWith('401'));
    expect(
      noAutorizadas,
      `tras F5 la API responde 401: ${noAutorizadas.join(', ')}. ` +
        'El token no se persiste (data/api/token.ts) y hidratarSesion() es un no-op.',
    ).toHaveLength(0);
  });

  test('entrar por una URL directa (enlace compartido, marcador) carga los datos', async ({ page }) => {
    const fallos = vigilarApi(page);
    await page.goto('/es/tarjetas');
    await page.waitForLoadState('networkidle');
    const noAutorizadas = fallos.filter((f) => f.startsWith('401'));
    expect(
      noAutorizadas,
      `abrir la URL directa da 401: ${noAutorizadas.join(', ')}`,
    ).toHaveLength(0);
  });
});

/**
 * Formulario de registro. Es la primera pantalla que ve alguien que no tiene
 * cuenta, y la unica que se rellena entera de una vez: lo que aqui no se
 * guarda no se ve nunca mas.
 */
test.describe('Registro', () => {
  test('el selector de ciudad se llena del catalogo, no es texto libre', async ({ page }) => {
    // La ciudad es una FK en la BD (`usuario.ciudad_id`). Escrita a mano no se
    // podia guardar: se rellenaba y desaparecia sin que nadie avisara.
    await page.goto('/es/registro');
    const ciudad = page.locator('select').filter({ hasText: 'Selecciona tu ciudad' });
    await expect(ciudad).toBeVisible();

    const opciones = ciudad.locator('option[value]:not([value=""])');
    await expect(opciones.first()).toBeAttached({ timeout: 15_000 });
    const textos = await opciones.allTextContents();
    expect(textos.length, 'el catalogo de ciudades llega vacio').toBeGreaterThan(0);
    expect(
      textos.filter((t) => t.trim().length === 0).length,
      'hay ciudades que se pintan en blanco',
    ).toBe(0);
  });

  test('enviar el formulario vacio señala los campos, no falla en silencio', async ({ page }) => {
    await silenciarAviso(page);
    await page.goto('/es/registro');
    await page.getByRole('button', { name: /^Continuar$/ }).click();

    // Un `required` de HTML solo enseña un globo del navegador en el primer
    // campo. Aqui cada campo dice lo suyo y el aviso queda en la pagina.
    const avisos = page.getByRole('alert');
    await expect(avisos.first()).toBeVisible();
    expect(await avisos.count(), 'solo se marca un campo').toBeGreaterThan(1);
  });

  test('avisa de la contrasena corta y del correo mal escrito al salir del campo', async ({ page }) => {
    await page.goto('/es/registro');
    await page.getByRole('textbox', { name: /email/i }).fill('esto-no-es-un-correo');
    // .first(): el segundo input de tipo password es el de confirmacion.
    await page.locator('input[type="password"]').first().fill('corta');
    await page.getByRole('textbox', { name: /^Nombre/ }).click();

    await expect(page.getByText('Ingresa un correo electrónico válido.')).toBeVisible();
    await expect(
      page.getByText('La contraseña debe tener al menos 10 caracteres.'),
    ).toBeVisible();
  });

  test('avisa cuando las dos contrasenas no coinciden', async ({ page }) => {
    // Sin esto, una errata al teclear deja a la persona fuera de la cuenta que
    // acaba de crear, y con 2FA de por medio recuperarla no es trivial.
    await page.goto('/es/registro');
    const passwords = page.locator('input[type="password"]');
    await passwords.first().fill('contrasena-larga-1');
    await passwords.nth(1).fill('contrasena-larga-2');
    await page.getByRole('textbox', { name: /^Nombre/ }).click();

    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
  });

  test('el alta anuncia sus cuatro pasos', async ({ page }) => {
    // Cuenta, Finanzas, Seguridad y Listo. Si el paso de finanzas desaparece,
    // el ingreso mensual deja de pedirse y el analisis arranca sin base.
    await page.goto('/es/registro');
    const pasos = page.locator('ol > li');
    await expect(pasos).toHaveCount(4);
    await expect(pasos.nth(1)).toContainText('Finanzas');
  });
});
