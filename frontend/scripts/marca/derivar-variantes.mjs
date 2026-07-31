/**
 * Deriva las 3 variantes SVG de marca a partir del archivo ORIGINAL del
 * disenador (`docs/marca/original/`), y las deja en `web/public/marca/`.
 *
 *   original  ->  logo.svg  ·  logo-negativo.svg  ·  isotipo.svg
 *
 * Existe para que esto sea REPRODUCIBLE: cuando llegue el SVG con el claim
 * convertido a curvas, se reemplaza el original, se corre esto y despues
 * `generar-assets.mjs`, y no hay que rehacer nada a mano.
 *
 * Uso:
 *   cd frontend && node scripts/marca/derivar-variantes.mjs
 */
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../..');
const require = createRequire(resolve(RAIZ, 'web/package.json'));
const sharp = require('sharp');

const ORIGINAL = resolve(RAIZ, 'docs/marca/original/FintechVital_Imagotipo_SVG.svg');
const DESTINO = resolve(RAIZ, 'web/public/marca');

/** Verdes de marca. Todo lo demas que sea relleno se considera "pizarra". */
const VERDES = new Set(['#88bd24', '#9fc640']);

/**
 * Pizarra -> claro, para la variante en negativo. Se mantienen 4 tonos
 * distintos para no aplastar el volumen (el arte usa sombras).
 */
const A_CLARO = {
  '#414c5a': '#eef1f3',
  '#424d5b': '#e3e9ed',
  '#33414c': '#b9c4cb',
  '#405566': '#cbd5db',
};
const TINTA_OSCURA = '#2b3640';
const CLARO_PRINCIPAL = '#eef1f3';

const leerEstilo = (svg) => svg.slice(svg.indexOf('<style>'), svg.indexOf('</style>'));

/** Mapa clase -> color de relleno, leido del <style> del propio archivo. */
function rellenosPorClase(svg) {
  const mapa = new Map();
  for (const bloque of leerEstilo(svg).match(/\.[^{]+\{[^}]*\}/g) ?? []) {
    const fill = bloque.match(/fill:\s*(#[0-9a-fA-F]{3,6})/)?.[1];
    if (!fill) continue;
    for (const cls of bloque.slice(0, bloque.indexOf('{')).match(/\.([\w-]+)/g) ?? []) {
      mapa.set(cls.slice(1), fill.toLowerCase());
    }
  }
  return mapa;
}

/** Grupos <g> de primer nivel del cuerpo (fuera de <defs>). */
function gruposDePrimerNivel(cuerpo) {
  const grupos = [];
  let prof = 0;
  let ini = 0;
  for (const m of cuerpo.matchAll(/<(\/?)g\b[^>]*>/g)) {
    if (m[1] === '') {
      if (prof === 0) ini = m.index;
      prof += 1;
    } else if (--prof === 0) {
      grupos.push([ini, m.index + m[0].length]);
    }
  }
  return grupos;
}

/** Recalcula el viewBox para que ajuste al contenido real (sin margen muerto). */
async function viewBoxAjustado(svg, viewBoxOriginal) {
  const [, , anchoVB] = viewBoxOriginal.split(/\s+/).map(Number);
  const buf = Buffer.from(svg);
  const completo = await sharp(buf, { density: 150 }).metadata();
  const { info } = await sharp(buf, { density: 150 })
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });
  const escala = completo.width / anchoVB;
  const x = (info.trimOffsetLeft ? -info.trimOffsetLeft : 0) / escala;
  const y = (info.trimOffsetTop ? -info.trimOffsetTop : 0) / escala;
  return [x, y, info.width / escala, info.height / escala]
    .map((v) => v.toFixed(2))
    .join(' ');
}

const original = await readFile(ORIGINAL, 'utf8');
const viewBoxOriginal = original.match(/viewBox="([^"]+)"/)[1];

// 1. Fuera el <text>: el claim va en `MADE Waffle Soft`, una fuente licenciada
//    que no tenemos. Sin ella el navegador la sustituye y el renglon se ve mal.
//    Cuando el disenador lo entregue en curvas, dejara de haber <text> y este
//    paso se volvera un no-op solo.
let base = original;
if (base.includes('<text')) {
  base = base.slice(0, base.indexOf('<text')) + base.slice(base.indexOf('</text>') + 7);
  base = base.replace(/\s*\.[\w-]+\s*\{[^}]*font-family[^}]*\}/g, '');
}

// 2. `.cls-N` es el nombre generico que exporta Illustrator. Se renombra a
//    `.fv-N` por si el SVG se inserta inline y sus estilos caen al scope global.
base = base.replace(/\.cls-(\d+)/g, '.fv-$1');
base = base.replace(/class="([^"]*)"/g, (_, v) => `class="${v.replace(/\bcls-(\d+)\b/g, 'fv-$1')}"`);
base = base.replace('id="Capa_2" data-name="Capa 2"', 'role="img" aria-label="Fintech Vital"');

const limpiar = (svg, viewBox) =>
  svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`).replace(/\s(width|height)="[^"]*"/g, '');

// ---- logo.svg (positivo) -------------------------------------------------
const vbLogo = await viewBoxAjustado(base, viewBoxOriginal);
const positivo = limpiar(base, vbLogo);

// ---- logo-negativo.svg ---------------------------------------------------
// OJO con la "i" de VITAL: es el UNICO elemento con relleno blanco del arte.
// No es un hueco recortado del fondo, es una LETRA clara a proposito. Invertirla
// a oscuro junto con el resto la convierte en un agujero sobre fondo oscuro
// (bug real, detectado en pantalla). Debe seguir siendo clara y separarse por
// el contorno, igual que las demas letras.
let negativo = positivo;
for (const [de, a] of Object.entries(A_CLARO)) {
  negativo = negativo.replaceAll(`fill: ${de}`, `fill: ${a}`);
}
negativo = negativo.replaceAll('fill: #fff', `fill: ${CLARO_PRINCIPAL}`);
// Los separadores blancos del positivo se oscurecen para leerse sobre oscuro.
negativo = negativo.replaceAll('stroke: #fff', `stroke: ${TINTA_OSCURA}`);
negativo = negativo.replace(/stroke:\s*#414c5a/g, `stroke: ${TINTA_OSCURA}`);

// ---- isotipo.svg ---------------------------------------------------------
// La "V" (check + flecha) y las barras: los grupos cuyo relleno es SOLO verde.
// Se clasifica por color real y no por indice, para que siga funcionando si el
// disenador reordena las capas.
const rellenos = rellenosPorClase(base);
const finDefs = base.indexOf('</defs>') + 7;
const cabecera = base.slice(0, finDefs);
const cuerpo = base.slice(finDefs, base.lastIndexOf('</svg>'));

const soloVerdes = gruposDePrimerNivel(cuerpo)
  .map(([a, b]) => cuerpo.slice(a, b))
  .filter((frag) => {
    const colores = [...frag.matchAll(/class="([^"]*)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .map((c) => rellenos.get(c))
      .filter(Boolean);
    return colores.length > 0 && colores.every((c) => VERDES.has(c));
  });

if (soloVerdes.length === 0) throw new Error('No se aislo el isotipo: ningun grupo es solo verde.');

const isoBruto = cabecera + soloVerdes.join('') + '</svg>';
const isotipo = limpiar(isoBruto, await viewBoxAjustado(isoBruto, viewBoxOriginal));

await mkdir(DESTINO, { recursive: true });
for (const [nombre, contenido] of [
  ['logo.svg', positivo],
  ['logo-negativo.svg', negativo],
  ['isotipo.svg', isotipo],
]) {
  await writeFile(resolve(DESTINO, nombre), contenido, 'utf8');
  console.log('  ->', nombre, `(${contenido.length} bytes)`);
}
console.log(`Isotipo armado con ${soloVerdes.length} grupos verdes.`);
console.log('Ahora: node scripts/marca/generar-assets.mjs');
