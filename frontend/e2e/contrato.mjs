/**
 * E2E de contrato: pantalla por pantalla, contra la API REAL.
 *
 * Por que este test existe y no solo uno de navegador: web y movil comparten
 * `src/data` BYTE A BYTE (frontend/web/src/data == frontend/mobile/src/data).
 * Todo lo que rompe aqui rompe en las DOS interfaces, asi que una sola pasada
 * cubre las dos. El de navegador (navegador.spec.ts) verifica ademas lo que
 * solo se ve pintado: que el desplegable tenga opciones legibles.
 *
 * No comprueba "responde 200". Comprueba que la respuesta trae los campos que
 * la pantalla PINTA. Un /categorias que devuelve 200 sin `etiqueta` deja el
 * desplegable con las opciones en blanco, que es justo el fallo reportado.
 *
 * Sin dependencias: node >= 18 (fetch nativo). Correr con el stack arriba:
 *     node frontend/e2e/contrato.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

const API = process.env.FV_API_URL ?? 'http://localhost:8080/api/v1';
const EMAIL = process.env.FV_E2E_EMAIL ?? 'ana.torres@ejemplo.mx';
const PASSWORD = process.env.FV_E2E_PASSWORD ?? 'Demo1234!';
const IDIOMA = process.env.FV_E2E_IDIOMA ?? 'es';

/** Las 12 de docs/datos/TAXONOMIA.md. El catalogo puede crecer, no encoger. */
const CATEGORIAS_MINIMAS = [
  'alimentacion', 'transporte', 'vivienda', 'servicios', 'salud', 'educacion',
  'entretenimiento', 'compras', 'finanzas', 'ahorro_inversion', 'ingresos', 'otros',
];

const ESTADOS = ['activa', 'bloqueada', 'cancelada'];

let token = null;
const resultados = [];

/** Mismo transporte que src/data/api/apiDataSource.ts: mismas cabeceras, mismo error. */
async function pedir(ruta, opciones = {}) {
  const { method = 'GET', body, auth = true, idioma = IDIOMA } = opciones;
  const headers = { 'Accept-Language': idioma };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(API + ruta, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ mensaje: 'HTTP ' + res.status }));
    const err = new Error(
      (method + ' ' + ruta + ' -> HTTP ' + res.status + ' ' + (e.codigo ?? '') + ' ' + (e.mensaje ?? '')).trim(),
    );
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? undefined : res.json();
}

function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

async function caso(pantallaActual, nombre, fn) {
  try {
    await fn();
    resultados.push({ pantalla: pantallaActual, nombre, estado: 'ok' });
    console.log('  ok    ' + nombre);
  } catch (e) {
    resultados.push({ pantalla: pantallaActual, nombre, estado: 'falla', detalle: e.message });
    console.log('  FALLA ' + nombre + '\n          ' + e.message);
  }
}

function pantalla(nombre) {
  console.log('\n== ' + nombre + ' ==');
  return nombre;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('E2E de contrato contra ' + API + '  (idioma ' + IDIOMA + ')');

  // --- Sesion: sin esto no hay nada mas que probar --------------------------
  let p = pantalla('SESION');
  await caso(p, 'login devuelve access_token y refresh_token', async () => {
    const sesion = await pedir('/auth/login', {
      method: 'POST', auth: false, body: { email: EMAIL, password: PASSWORD },
    });
    afirmar(typeof sesion.access_token === 'string' && sesion.access_token.length > 0,
      'la sesion no trae access_token');
    afirmar(typeof sesion.refresh_token === 'string', 'la sesion no trae refresh_token');
    token = sesion.access_token;
  });

  if (!token) {
    console.log('\nSin sesion no se puede seguir. Abortado.');
    return resumen();
  }

  // --- Movimientos: la pantalla del fallo reportado -------------------------
  // Carga 4 recursos en un solo Promise.all. Si UNO falla, la pantalla entera
  // se queda en el estado de error: no se ve a medias, no se ve nada.
  p = pantalla('MOVIMIENTOS');

  await caso(p, 'el catalogo de categorias responde', async () => {
    await pedir('/categorias', { auth: false });
  });

  await caso(p, 'cada categoria trae slug + etiqueta legible (llena el desplegable)', async () => {
    const cats = await pedir('/categorias', { auth: false });
    afirmar(Array.isArray(cats), 'la respuesta no es una lista');
    afirmar(cats.length > 0, 'el catalogo llega vacio: el desplegable no tendria opciones');
    for (const c of cats) {
      afirmar(typeof c.slug === 'string' && c.slug.length > 0,
        'una categoria no trae slug: ' + JSON.stringify(c));
      // Esta es LA comprobacion del fallo: sin `etiqueta` el <option> se pinta vacio.
      afirmar(typeof c.etiqueta === 'string' && c.etiqueta.trim().length > 0,
        'la categoria "' + c.slug + '" no trae etiqueta: el desplegable la pinta en blanco');
      afirmar(['gasto', 'movimiento', 'ingreso'].includes(c.tipo),
        'la categoria "' + c.slug + '" trae tipo "' + c.tipo + '", que no es gasto|movimiento|ingreso');
    }
  });

  await caso(p, 'el catalogo cubre las 12 categorias de la taxonomia', async () => {
    const cats = await pedir('/categorias', { auth: false });
    const slugs = new Set(cats.map((c) => c.slug));
    const faltan = CATEGORIAS_MINIMAS.filter((s) => !slugs.has(s));
    afirmar(faltan.length === 0, 'faltan en el catalogo: ' + faltan.join(', '));
  });

  await caso(p, 'la etiqueta viene traducida (Accept-Language, ADR-0009)', async () => {
    const es = await pedir('/categorias', { auth: false, idioma: 'es' });
    const pt = await pedir('/categorias', { auth: false, idioma: 'pt' });
    const mapaEs = new Map(es.map((c) => [c.slug, c.etiqueta]));
    const distintas = pt.filter((c) => mapaEs.get(c.slug) !== c.etiqueta);
    afirmar(distintas.length > 0,
      'es y pt devuelven las MISMAS etiquetas: el catalogo no esta traducido');
  });

  await caso(p, 'la lista de transacciones responde y viene paginada', async () => {
    const pagina = await pedir('/transacciones?tam=100');
    afirmar(Array.isArray(pagina.items), 'la pagina no trae `items`');
    afirmar(typeof pagina.total === 'number', 'la pagina no trae `total`');
  });

  await caso(p, 'cada transaccion trae lo que la fila pinta', async () => {
    const pagina = await pedir('/transacciones?tam=100');
    afirmar(pagina.items.length > 0, 'no hay transacciones que comprobar');
    for (const tx of pagina.items.slice(0, 20)) {
      afirmar(typeof tx.id === 'string', 'transaccion sin id');
      afirmar(typeof tx.descripcion === 'string', 'transaccion ' + tx.id + ' sin descripcion');
      afirmar(typeof tx.valor === 'number', 'transaccion ' + tx.id + ' sin valor numerico');
      afirmar(typeof tx.moneda === 'string', 'transaccion ' + tx.id + ' sin moneda');
      afirmar(typeof tx.fecha === 'string', 'transaccion ' + tx.id + ' sin fecha');
      afirmar(typeof tx.categoria === 'string', 'transaccion ' + tx.id + ' sin categoria');
      afirmar(typeof tx.confianza === 'number', 'transaccion ' + tx.id + ' sin confianza');
    }
  });

  await caso(p, 'la categoria de cada transaccion existe en el catalogo', async () => {
    const [pagina, cats] = await Promise.all([
      pedir('/transacciones?tam=100'), pedir('/categorias', { auth: false }),
    ]);
    const slugs = new Set(cats.map((c) => c.slug));
    const huerfanas = [...new Set(pagina.items.map((t) => t.categoria))].filter((s) => !slugs.has(s));
    afirmar(huerfanas.length === 0,
      'transacciones con categorias fuera del catalogo: ' + huerfanas.join(', ') +
      ' (la fila pinta el slug crudo en vez de la etiqueta)');
  });

  await caso(p, 'se puede filtrar por categoria (el desplegable de filtro)', async () => {
    const cats = await pedir('/categorias', { auth: false });
    const slug = cats[0] && cats[0].slug;
    afirmar(slug, 'sin catalogo no se puede probar el filtro');
    const pagina = await pedir('/transacciones?categoria=' + slug + '&tam=100');
    const ajenas = pagina.items.filter((t) => t.categoria !== slug);
    afirmar(ajenas.length === 0,
      'el filtro por "' + slug + '" devuelve ' + ajenas.length + ' de otras categorias');
  });

  await caso(p, 'corregir la categoria de una transaccion (accion "Corregir")', async () => {
    const [pagina, cats] = await Promise.all([
      pedir('/transacciones?tam=1'), pedir('/categorias', { auth: false }),
    ]);
    const tx = pagina.items[0];
    afirmar(tx, 'no hay transacciones que corregir');
    const destino = cats.find((c) => c.slug !== tx.categoria).slug;
    const actualizada = await pedir('/transacciones/' + tx.id, {
      method: 'PATCH', body: { categoria: destino },
    });
    afirmar(actualizada.categoria === destino,
      'se pidio "' + destino + '" y quedo "' + actualizada.categoria + '"');
    afirmar(actualizada.categoria_origen === 'usuario',
      'tras corregir a mano, categoria_origen deberia ser "usuario"');
    // Se deja como estaba: el test no ensucia los datos de demo.
    await pedir('/transacciones/' + tx.id, { method: 'PATCH', body: { categoria: tx.categoria } });
  });

  await caso(p, 'el calendario del mes carga sus eventos', async () => {
    const eventos = await pedir('/eventos');
    afirmar(Array.isArray(eventos), 'la respuesta de eventos no es una lista');
  });

  // --- Tarjetas ------------------------------------------------------------
  p = pantalla('TARJETAS');

  await caso(p, 'las cuentas traen numero enmascarado y estado valido', async () => {
    const cuentas = await pedir('/cuentas');
    afirmar(Array.isArray(cuentas) && cuentas.length > 0, 'no llega ninguna cuenta');
    for (const c of cuentas) {
      afirmar(typeof c.id === 'string', 'cuenta sin id');
      afirmar(typeof c.numero === 'string' && c.numero.includes('*'),
        'la cuenta ' + c.id + ' expone el numero sin enmascarar: "' + c.numero + '"');
      // La pantalla indexa ESTADO_CLASE[estado] y traduce estados.<estado>: un
      // valor fuera de la lista deja la etiqueta sin estilo y sin traducir.
      afirmar(ESTADOS.includes(c.estado),
        'la cuenta ' + c.id + ' trae estado "' + c.estado + '", que la interfaz no sabe pintar');
      afirmar(typeof c.fecha_apertura === 'string',
        'la cuenta ' + c.id + ' no trae fecha_apertura (la pantalla pinta "Apertura: ...")');
    }
  });

  await caso(p, 'cada tarjeta trae lo que se pinta en el plastico', async () => {
    const tarjetas = await pedir('/tarjetas');
    afirmar(Array.isArray(tarjetas) && tarjetas.length > 0, 'no llega ninguna tarjeta');
    for (const t of tarjetas) {
      afirmar(typeof t.id === 'string', 'tarjeta sin id');
      afirmar(typeof t.id_cuenta === 'string', 'la tarjeta ' + t.id + ' no trae id_cuenta');
      afirmar(/^\d{4}$/.test(t.ultimos4 ?? ''),
        'la tarjeta ' + t.id + ' trae ultimos4 = "' + t.ultimos4 + '"');
      afirmar(['debito', 'credito'].includes(t.tipo),
        'la tarjeta ' + t.id + ' trae tipo "' + t.tipo + '": si no es debito|credito la cara se pinta mal');
      afirmar(['visa', 'mastercard', 'amex'].includes(t.red_pago),
        'la tarjeta ' + t.id + ' trae red_pago "' + t.red_pago + '": RED_ETIQUETA lo dejaria vacio');
      afirmar(/^\d{4}-\d{2}$/.test(t.fecha_vencimiento ?? ''),
        'la tarjeta ' + t.id + ' trae fecha_vencimiento "' + t.fecha_vencimiento + '", se espera YYYY-MM');
      afirmar(ESTADOS.includes(t.estado),
        'la tarjeta ' + t.id + ' trae estado "' + t.estado + '", que la interfaz no sabe pintar');
    }
  });

  await caso(p, 'toda tarjeta de credito trae su bloque credito (barra de utilizacion)', async () => {
    const tarjetas = await pedir('/tarjetas');
    const credito = tarjetas.filter((t) => t.tipo === 'credito');
    afirmar(credito.length > 0, 'no hay ninguna tarjeta de credito que comprobar');
    for (const t of credito) {
      afirmar(t.credito,
        'la tarjeta de credito ' + t.id + ' no trae el bloque "credito": no se pinta la utilizacion');
      afirmar(typeof t.credito.limite_credito === 'number', t.id + ': limite_credito no es numero');
      afirmar(typeof t.credito.saldo_utilizado === 'number', t.id + ': saldo_utilizado no es numero');
      afirmar(t.credito.dia_corte >= 1 && t.credito.dia_corte <= 31, t.id + ': dia_corte fuera de rango');
      afirmar(t.credito.dia_pago >= 1 && t.credito.dia_pago <= 31, t.id + ': dia_pago fuera de rango');
    }
  });

  await caso(p, 'las de debito NO traen bloque credito', async () => {
    const tarjetas = await pedir('/tarjetas');
    const sucias = tarjetas.filter((t) => t.tipo === 'debito' && t.credito);
    afirmar(sucias.length === 0,
      'tarjetas de debito con datos de credito: ' + sucias.map((t) => t.id).join(', '));
  });

  await caso(p, 'cada tarjeta cuelga de una cuenta que existe', async () => {
    const [cuentas, tarjetas] = await Promise.all([pedir('/cuentas'), pedir('/tarjetas')]);
    const ids = new Set(cuentas.map((c) => c.id));
    const huerfanas = tarjetas.filter((t) => !ids.has(t.id_cuenta));
    afirmar(huerfanas.length === 0,
      'tarjetas que apuntan a una cuenta inexistente: ' + huerfanas.map((t) => t.id).join(', '));
  });

  await caso(p, '"Ver movimientos" de una tarjeta devuelve solo los suyos', async () => {
    const tarjetas = await pedir('/tarjetas');
    const id = tarjetas[0].id;
    const pagina = await pedir('/transacciones?tarjeta=' + id + '&tam=100');
    const ajenas = pagina.items.filter((t) => t.id_tarjeta && t.id_tarjeta !== id);
    afirmar(ajenas.length === 0,
      'el filtro por tarjeta devuelve ' + ajenas.length + ' movimientos de otra');
  });

  await caso(p, 'la salud crediticia trae score e historico', async () => {
    const salud = await pedir('/buro/salud');
    afirmar(salud.actual, 'no trae el registro `actual`');
    afirmar(typeof salud.actual.score_crediticio === 'number', 'el score no es numero');
    afirmar(Array.isArray(salud.historial), 'no trae `historial` (la grafica de evolucion queda vacia)');
  });

  // --- Panel / analisis ----------------------------------------------------
  p = pantalla('PANEL Y ANALISIS');

  await caso(p, 'el analisis persistido responde', async () => {
    const lista = await pedir('/analisis?pagina=0&tam=10');
    afirmar(Array.isArray(lista), 'la lista de analisis no es una lista');
  });

  await caso(p, 'la evolucion en el tiempo responde', async () => {
    const evo = await pedir('/analisis/evolucion');
    afirmar(evo, 'la evolucion llega vacia');
  });

  await caso(p, 'la comparacion mensual responde', async () => {
    await pedir('/resumen/comparacion');
  });

  await caso(p, 'el endpoint del enunciado sigue funcionando (publico, sin auth)', async () => {
    const r = await pedir('/analisis-financiero', {
      method: 'POST', auth: false,
      body: {
        ingreso_mensual: 30000, nivel_endeudamiento: 20, frecuencia_ahorro: 'media',
        transacciones: [
          { descripcion: 'OXXO COMPRA', valor: 250 },
          { descripcion: 'UBER TRIP', valor: 120 },
          { descripcion: 'RENTA DEPTO', valor: 9000 },
        ],
      },
    });
    afirmar(r.perfil ?? r.perfil_financiero, 'la respuesta del enunciado no trae perfil');
  });

  // --- Metas y presupuestos ------------------------------------------------
  p = pantalla('METAS Y PRESUPUESTOS');

  await caso(p, 'las metas de ahorro responden', async () => {
    const metas = await pedir('/metas');
    afirmar(Array.isArray(metas), 'la respuesta de metas no es una lista');
  });

  await caso(p, 'los presupuestos responden y su categoria existe', async () => {
    const [presupuestos, cats] = await Promise.all([
      pedir('/presupuestos'), pedir('/categorias', { auth: false }),
    ]);
    afirmar(Array.isArray(presupuestos), 'la respuesta de presupuestos no es una lista');
    const slugs = new Set(cats.map((c) => c.slug));
    const huerfanos = presupuestos.filter((x) => !slugs.has(x.categoria));
    afirmar(huerfanos.length === 0,
      'presupuestos sobre categorias fuera del catalogo: ' + huerfanos.map((x) => x.categoria).join(', '));
  });

  // --- Perfil --------------------------------------------------------------
  p = pantalla('PERFIL');

  await caso(p, 'el usuario trae los campos que pinta la cabecera', async () => {
    const u = await pedir('/usuarios/me');
    afirmar(typeof u.email === 'string', 'el usuario no trae email');
    afirmar(typeof u.nombre === 'string', 'el usuario no trae nombre');
    afirmar(typeof u.moneda_principal === 'string', 'el usuario no trae moneda_principal');
    afirmar(['es', 'pt', 'en'].includes(u.idioma), 'idioma "' + u.idioma + '" fuera de es|pt|en');
    afirmar(typeof u.totp_activo === 'boolean', 'el usuario no trae totp_activo');
  });

  await caso(p, 'la exportacion de datos responde', async () => {
    const datos = await pedir('/usuarios/me/exportacion');
    afirmar(datos.usuario, 'la exportacion no trae al usuario');
  });

  // --- Catalogos / operacion -----------------------------------------------
  p = pantalla('CATALOGOS Y OPERACION');

  await caso(p, '/salud reporta bd y ml', async () => {
    const s = await pedir('/salud', { auth: false });
    afirmar(s.estado === 'ok', 'la API se reporta "' + s.estado + '"');
    afirmar(s.bd && s.bd.estado === 'ok', 'la base se reporta "' + (s.bd && s.bd.estado) + '"');
    afirmar(s.ml && s.ml.estado === 'ok',
      'el ML se reporta "' + (s.ml && s.ml.estado) + '": sin el no hay clasificacion ni perfil');
  });

  await caso(p, 'el catalogo de monedas responde', async () => {
    const r = await pedir('/monedas', { auth: false });
    afirmar(Array.isArray(r.monedas) && r.monedas.length > 0, 'no llega ninguna moneda');
  });

  // --- Capa de datos compartida ---------------------------------------------
  // Todo lo de arriba vale para el movil SOLO mientras las dos apps compartan
  // el mismo cliente de API. Si alguien toca una copia y no la otra, este test
  // avisa y deja de ser cierto que una pasada cubre las dos interfaces.
  p = pantalla('CAPA DE DATOS COMPARTIDA (web == movil)');

  await caso(p, 'web/src/data y mobile/src/data son el mismo codigo', async () => {
    const web = join(AQUI, '..', 'web', 'src', 'data');
    const movil = join(AQUI, '..', 'mobile', 'src', 'data');

    // config.ts es el UNICO que puede diferir: lleva la URL base y el
    // almacenamiento de cada plataforma (localStorage / AsyncStorage).
    const EXCEPCIONES = new Set(['config.ts']);

    const listar = (raiz, base = '') => {
      const salida = [];
      for (const entrada of readdirSync(join(raiz, base))) {
        const rel = base ? base + '/' + entrada : entrada;
        if (statSync(join(raiz, rel)).isDirectory()) salida.push(...listar(raiz, rel));
        else salida.push(rel);
      }
      return salida.sort();
    };

    const archivosWeb = listar(web);
    const archivosMovil = listar(movil);
    const soloWeb = archivosWeb.filter((f) => !archivosMovil.includes(f));
    const soloMovil = archivosMovil.filter((f) => !archivosWeb.includes(f));
    afirmar(soloWeb.length === 0, 'solo en la web: ' + soloWeb.join(', '));
    afirmar(soloMovil.length === 0, 'solo en el movil: ' + soloMovil.join(', '));

    const distintos = archivosWeb.filter(
      (f) => !EXCEPCIONES.has(f) &&
        readFileSync(join(web, f), 'utf8') !== readFileSync(join(movil, f), 'utf8'),
    );
    afirmar(distintos.length === 0,
      'la web y el movil ya NO comparten la capa de datos: ' + distintos.join(', ') +
      '. Este test deja de cubrir las dos interfaces hasta que se reconcilien.');
  });

  await caso(p, 'el token de sesion se persiste (sobrevive a recargar / reabrir la app)', async () => {
    // Sintoma: el usuario sigue "dentro" -- su ficha esta en localStorage /
    // AsyncStorage y el menu se pinta -- pero el JWT vivia solo en una variable
    // de modulo, asi que toda llamada responde 401 y las pantallas salen vacias.
    const fuente = readFileSync(join(AQUI, '..', 'web', 'src', 'data', 'api', 'apiDataSource.ts'), 'utf8');
    const cuerpo = fuente.slice(fuente.indexOf('hidratarSesion'), fuente.indexOf('hidratarSesion') + 400);
    afirmar(!/no-op/i.test(cuerpo),
      'hidratarSesion() sigue siendo un no-op: tras recargar (web) o reabrir la app (movil) ' +
      'el token no se recupera y todo responde 401');
  });

  resumen();
}

function resumen() {
  const fallan = resultados.filter((r) => r.estado === 'falla');
  const ok = resultados.length - fallan.length;
  console.log('\n' + '='.repeat(72));
  console.log('RESULTADO: ' + ok + '/' + resultados.length + ' casos pasan');
  if (fallan.length > 0) {
    console.log('\n' + fallan.length + ' fallan:');
    let ultima = '';
    for (const f of fallan) {
      if (f.pantalla !== ultima) { console.log('\n  [' + f.pantalla + ']'); ultima = f.pantalla; }
      console.log('    - ' + f.nombre);
      console.log('      ' + f.detalle);
    }
  }
  console.log('='.repeat(72));
  process.exit(fallan.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error('\nEl test se cayo: ' + e.message); process.exit(1); });
