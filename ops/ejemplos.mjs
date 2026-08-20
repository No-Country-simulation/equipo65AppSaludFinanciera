/**
 * Los 3 ejemplos reales de uso del enunciado, ejecutados de verdad.
 *
 * Es el requisito minimo #8 ("Minimo de tres ejemplos reales de uso") y a la vez
 * el smoke test del proyecto: si esto pasa, el endpoint que el jurado va a
 * probar responde lo que documentamos.
 *
 * La fuente de verdad de los numeros es frontend/docs/entrega/EJEMPLOS.md. Si
 * el sistema devuelve otra cosa, o hay un bug, o hay que actualizar ese doc a
 * proposito -- pero nunca en silencio.
 *
 * Que se comprueba y que no:
 *
 *   - ESTRICTO: resumen_gastos, indicadores, categoria de cada transaccion,
 *     perfil_codigo y los codigos de recomendacion. Todo eso es determinista:
 *     sale de las reglas y de la taxonomia, no del azar.
 *   - TOLERANTE: `probabilidad`. La decide M2 y cambia si se reentrena. Se
 *     comprueba que este en [0,1] y que sea la del perfil ganador.
 *
 * Sin dependencias: node >= 18 (fetch nativo). Corre igual en Windows y Linux.
 *
 *     node ops/ejemplos.mjs
 *     FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs
 */

const API = process.env.FV_API_URL ?? 'http://localhost:8080/api/v1';
const IDIOMA = process.env.FV_IDIOMA ?? 'es';

/** Margen para los indicadores: EJEMPLOS.md los documenta con 3 decimales. */
const EPSILON = 0.0005;

const resultados = [];
let fallos = 0;

function comprobar(titulo, condicion, detalle) {
  resultados.push({ titulo, ok: Boolean(condicion), detalle });
  if (!condicion) fallos += 1;
}

/** Compara un objeto {clave: numero} contra lo esperado, clave a clave. */
function comprobarNumeros(prefijo, real, esperado, epsilon = EPSILON) {
  for (const [clave, valor] of Object.entries(esperado)) {
    const obtenido = real?.[clave];
    const ok = typeof obtenido === 'number' && Math.abs(obtenido - valor) <= epsilon;
    comprobar(
      `${prefijo}: ${clave} = ${valor}`,
      ok,
      ok ? null : `esperado ${valor}, obtenido ${JSON.stringify(obtenido)}`,
    );
  }
}

async function analizar(cuerpo) {
  const respuesta = await fetch(`${API}/analisis-financiero`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': IDIOMA },
    body: JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status} - ${(await respuesta.text()).slice(0, 300)}`);
  }
  return respuesta.json();
}

// ---------------------------------------------------------------- ejemplo 1 ---
// El caso literal del enunciado. El que el jurado copia y pega.
async function ejemplo1() {
  const d = await analizar({
    ingreso_mensual: 4500,
    nivel_endeudamiento: 25,
    frecuencia_ahorro: 'Media',
    transacciones: [
      { descripcion: 'Supermercado', valor: 420 },
      { descripcion: 'Combustible', valor: 300 },
      { descripcion: 'Streaming', valor: 40 },
    ],
  });

  // Los 4 campos que el enunciado exige, con estos nombres exactos.
  for (const campo of ['perfil_financiero', 'probabilidad', 'resumen_gastos', 'recomendaciones']) {
    comprobar(`E1: el enunciado exige "${campo}"`, d[campo] !== undefined);
  }

  comprobar('E1: perfil_codigo = saludable', d.perfil_codigo === 'saludable',
    `obtenido ${d.perfil_codigo}`);
  comprobar('E1: probabilidad valida y es la del perfil ganador',
    d.probabilidad >= 0 && d.probabilidad <= 1
    && Math.abs(d.probabilidad - d.probabilidades[d.perfil_codigo]) <= EPSILON);

  comprobarNumeros('E1: resumen_gastos', d.resumen_gastos,
    { alimentacion: 420, transporte: 300, entretenimiento: 40 });

  comprobarNumeros('E1: indicadores', d.indicadores, {
    tasa_ahorro: 0.831, ratio_endeudamiento: 0.25, ratio_gasto_ingreso: 0.169,
    ratio_gasto_esencial: 0.16, ratio_gasto_discrecional: 0.009,
    concentracion_gasto: 0.553, frecuencia_ahorro_num: 2, ratio_recurrente: 0.0,
  });

  const cats = Object.fromEntries(
    d.transacciones_clasificadas.map((t) => [t.descripcion, t.categoria]));
  comprobar('E1: Supermercado -> alimentacion', cats.Supermercado === 'alimentacion');
  comprobar('E1: Combustible -> transporte', cats.Combustible === 'transporte');
  comprobar('E1: Streaming -> entretenimiento', cats.Streaming === 'entretenimiento');

  const codigos = d.recomendaciones_detalle.map((r) => r.codigo);
  comprobar('E1: avisa de que los datos son parciales (REC_DATOS_PARCIALES)',
    codigos.includes('REC_DATOS_PARCIALES'), `obtenidos: ${codigos.join(', ')}`);
  comprobar('E1: detecta la concentracion en una categoria (REC_CONCENTRACION)',
    codigos.includes('REC_CONCENTRACION'), `obtenidos: ${codigos.join(', ')}`);
}

// ---------------------------------------------------------------- ejemplo 2 ---
// Mes completo con descripciones de extracto real. Demuestra que M1 funciona.
async function ejemplo2() {
  const d = await analizar({
    ingreso_mensual: 28000,
    nivel_endeudamiento: 55,
    frecuencia_ahorro: 'Nula',
    moneda: 'MXN',
    transacciones: [
      { descripcion: 'COMPRA SORIANA HIPER 4821', valor: 6200 },
      { descripcion: 'OXXO TIENDA 1832', valor: 900 },
      { descripcion: 'UBER *TRIP HELP.UBER.COM', valor: 1800 },
      { descripcion: 'GASOLINERA PEMEX 7781', valor: 2400 },
      { descripcion: 'RENTA DEPTO JUL', valor: 9000 },
      { descripcion: 'DOM. CFE SUMINISTRO', valor: 1100 },
      { descripcion: 'TELMEX INTERNET', valor: 600 },
      { descripcion: 'FCIA GUADALAJARA SUC 112', valor: 800 },
      { descripcion: 'NETFLIX.COM AMSTERDAM', valor: 219 },
      { descripcion: 'MERPAGO*SPOTIFY', valor: 129 },
      { descripcion: 'CINEPOLIS VIP', valor: 450 },
      { descripcion: 'LIVERPOOL DEPTO 22', valor: 3200 },
      { descripcion: 'PAGO TC VISA INTERESES', valor: 4800 },
    ],
  });

  comprobar('E2: perfil_codigo = en_riesgo', d.perfil_codigo === 'en_riesgo',
    `obtenido ${d.perfil_codigo}`);

  comprobarNumeros('E2: resumen_gastos', d.resumen_gastos, {
    vivienda: 9000, alimentacion: 7100, finanzas: 4800, transporte: 4200,
    compras: 3200, servicios: 1700, entretenimiento: 798, salud: 800,
  });

  comprobarNumeros('E2: indicadores', d.indicadores, {
    tasa_ahorro: -0.129, ratio_endeudamiento: 0.55, ratio_gasto_ingreso: 1.129,
    ratio_gasto_esencial: 0.814, ratio_gasto_discrecional: 0.143,
    concentracion_gasto: 0.285, frecuencia_ahorro_num: 0, ratio_recurrente: 0.0,
  });

  const codigos = d.recomendaciones_detalle.map((r) => r.codigo);
  for (const esperado of ['REC_DEFICIT', 'REC_DEUDA_ALTA', 'REC_SIN_AHORRO', 'REC_ESENCIAL_ALTO']) {
    comprobar(`E2: dispara ${esperado}`, codigos.includes(esperado),
      `obtenidos: ${codigos.join(', ')}`);
  }
}

// ---------------------------------------------------------------- ejemplo 3 ---
// Usuario ordenado. Demuestra que ahorro_inversion NO cuenta como gasto: si
// contara, castigariamos a esta persona justamente por invertir.
async function ejemplo3() {
  const d = await analizar({
    ingreso_mensual: 45000,
    nivel_endeudamiento: 10,
    frecuencia_ahorro: 'Alta',
    moneda: 'MXN',
    transacciones: [
      { descripcion: 'COMPRA SORIANA HIPER 4821', valor: 5500 },
      { descripcion: 'RESTAURANTE LA CASA DE TONO', valor: 1800 },
      { descripcion: 'UBER *TRIP HELP.UBER.COM', valor: 900 },
      { descripcion: 'GASOLINERA PEMEX 7781', valor: 1600 },
      { descripcion: 'RENTA DEPTO JUL', valor: 11000 },
      { descripcion: 'DOM. CFE SUMINISTRO', valor: 900 },
      { descripcion: 'TELMEX INTERNET', valor: 700 },
      { descripcion: 'FCIA GUADALAJARA SUC 112', valor: 400 },
      { descripcion: 'NETFLIX.COM AMSTERDAM', valor: 219 },
      { descripcion: 'MERPAGO*SPOTIFY', valor: 129 },
      { descripcion: 'SMART FIT MENSUALIDAD', valor: 700 },
      { descripcion: 'AMAZON MX MARKETPLACE', valor: 1500 },
      { descripcion: 'PLATZI SUSCRIPCION ANUAL', valor: 500 },
      { descripcion: 'TRANSF. A INVERSION GBM', valor: 9000 },
    ],
  });

  comprobar('E3: perfil_codigo = saludable', d.perfil_codigo === 'saludable',
    `obtenido ${d.perfil_codigo}`);

  const inversion = d.transacciones_clasificadas
    .find((t) => t.descripcion === 'TRANSF. A INVERSION GBM');
  comprobar('E3: la transferencia a inversion es ahorro_inversion',
    inversion?.categoria === 'ahorro_inversion', `obtenido ${inversion?.categoria}`);

  // El punto de diseno que defiende la taxonomia: invertir no es gastar.
  comprobarNumeros('E3: indicadores (la inversion NO entra en el gasto)', d.indicadores, {
    tasa_ahorro: 0.426, ratio_endeudamiento: 0.1, ratio_gasto_ingreso: 0.574,
    ratio_gasto_esencial: 0.507, ratio_gasto_discrecional: 0.057,
    concentracion_gasto: 0.426, frecuencia_ahorro_num: 3, ratio_recurrente: 0.0,
  });

  const codigos = d.recomendaciones_detalle.map((r) => r.codigo);
  comprobar('E3: una sola recomendacion, y es REC_CONSOLIDA',
    codigos.length === 1 && codigos[0] === 'REC_CONSOLIDA',
    `obtenidos: ${codigos.join(', ') || '(ninguno)'}`);
}

// -------------------------------------------------------------------- correr ---
const EJEMPLOS = [
  ['Ejemplo 1 - el caso literal del enunciado', ejemplo1],
  ['Ejemplo 2 - mes completo, sobreendeudado', ejemplo2],
  ['Ejemplo 3 - ordenado, con ahorro e inversion', ejemplo3],
];

console.log(`\nLos 3 ejemplos de EJEMPLOS.md contra ${API}\n`);

for (const [titulo, fn] of EJEMPLOS) {
  console.log(`== ${titulo} ==`);
  const desde = resultados.length;
  try {
    await fn();
  } catch (e) {
    comprobar(`${titulo}: la peticion falla`, false, e.message);
  }
  for (const r of resultados.slice(desde)) {
    console.log(`  ${r.ok ? 'ok   ' : 'FALLA'} ${r.titulo}${r.detalle ? `  <- ${r.detalle}` : ''}`);
  }
  console.log('');
}

const total = resultados.length;
console.log('='.repeat(72));
console.log(`RESULTADO: ${total - fallos}/${total} comprobaciones pasan`);
console.log('='.repeat(72));

if (fallos > 0) {
  console.log('\nUna comprobacion en rojo significa una de dos cosas: hay un bug, o');
  console.log('EJEMPLOS.md quedo desactualizado. Las dos hay que resolverlas a mano.\n');
}

process.exit(fallos > 0 ? 1 : 0);
