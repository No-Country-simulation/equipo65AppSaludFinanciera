/**
 * Deriva las variantes SVG de marca a partir de los ORIGINALES del disenador
 * (`docs/marca/original/`), y las deja en `web/public/marca/`.
 *
 *   imagotipo croma v2  ->  logo.svg  ·  isotipo.svg
 *   imagotipo blanco v1 ->  logo-negativo.svg
 *   logotipo circular   ->  isotipo-circular.svg
 *
 * Existe para que esto sea REPRODUCIBLE: cuando el disenador entregue arte
 * nueva se reemplaza el original, se corre esto y despues `generar-assets.mjs`,
 * y no hay que rehacer nada a mano.
 *
 * Arte vigente:
 *  - croma v2 (2026-08-06). Cambios respecto de la v1: la tinta pasa de azul
 *    pizarra a gris neutro, el arte se aplana (la v1 traia sombras) y
 *    desaparece el renglon del claim, con lo que ya no hace falta la fuente
 *    licenciada MADE Waffle Soft.
 *  - blanco v1 (2026-08-07). El negativo REAL, entregado por el disenador.
 *    Hasta ahora se fabricaba aqui sustituyendo colores sobre el positivo; ver
 *    la nota en el bloque de logo-negativo.svg.
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

const ORIGINAL = resolve(RAIZ, 'docs/marca/original/FintechVital_Imagotipo_cromav2.svg');
const NEGATIVO = resolve(RAIZ, 'docs/marca/original/FintechVital_Imagotipo_blancov1.svg');
const CIRCULAR = resolve(RAIZ, 'docs/marca/original/FintechVital_Logotipo_circular.svg');
const DESTINO = resolve(RAIZ, 'web/public/marca');

/** Verdes de marca del positivo. Todo lo demas que sea relleno se considera tinta. */
const VERDES = new Set(['#8fbf21', '#90bf21']);

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

/**
 * Normaliza un original de Illustrator:
 *
 *  1. Fuera el <text>: si el arte trae texto vivo viene en `MADE Waffle Soft`,
 *     una fuente licenciada que no tenemos, y el navegador la sustituye por
 *     otra. Hoy ningun original trae claim; se deja como red de seguridad por
 *     si el renglon vuelve en una entrega futura.
 *  2. `.cls-N` es el nombre generico que exporta Illustrator, igual en los tres
 *     archivos. Se renombra con un prefijo POR ARCHIVO: si dos SVG se insertan
 *     inline en la misma pagina, sus estilos caen al scope global y el ultimo
 *     que cargue le repinta las letras al otro.
 *  3. Los ids de <clipPath> tambien vienen genericos ("clippath", "clippath-1")
 *     y son globales al documento, con el mismo problema.
 */
function normalizar(svg, prefijo, capa) {
  let salida = svg;
  if (salida.includes('<text')) {
    salida = salida.slice(0, salida.indexOf('<text')) + salida.slice(salida.indexOf('</text>') + 7);
    salida = salida.replace(/\s*\.[\w-]+\s*\{[^}]*font-family[^}]*\}/g, '');
  }
  salida = salida.replace(/\.cls-(\d+)/g, `.${prefijo}-$1`);
  salida = salida.replace(
    /class="([^"]*)"/g,
    (_, v) => `class="${v.replace(/\bcls-(\d+)\b/g, `${prefijo}-$1`)}"`,
  );
  for (const id of salida.match(/id="(clippath[\w-]*)"/g) ?? []) {
    const generico = id.slice(4, -1);
    salida = salida
      .replaceAll(`"${generico}"`, `"${prefijo}-${generico}"`)
      .replaceAll(`url(#${generico})`, `url(#${prefijo}-${generico})`);
  }
  return salida.replace(
    `id="${capa}" data-name="${capa.replace('_', ' ')}"`,
    'role="img" aria-label="Fintech Vital"',
  );
}

const limpiar = (svg, viewBox) =>
  svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`).replace(/\s(width|height)="[^"]*"/g, '');

// ---- logo.svg (positivo) -------------------------------------------------
const original = await readFile(ORIGINAL, 'utf8');
const viewBoxOriginal = original.match(/viewBox="([^"]+)"/)[1];
const base = normalizar(original, 'fv', 'Capa_2');
const positivo = limpiar(base, await viewBoxAjustado(base, viewBoxOriginal));

// ---- logo-negativo.svg ---------------------------------------------------
// Es ARTE PROPIA del disenador, no una derivacion. Hasta la entrega del blanco
// v1 se fabricaba aqui mapeando los grises del positivo a un claro unico, y esa
// aproximacion perdia dos cosas que el original si tiene:
//
//  - La SOMBRA de la "V" (#393a3c). Al ser gris entraba en el mapa de tinta y
//    se aclaraba junto con las letras, con lo que el logo perdia profundidad.
//  - Los verdes del negativo son mas claros que los del positivo (#abc925 /
//    #aac920 / #acca2a contra #8fbf21 / #90bf21). Es lo correcto: el mismo lima
//    sobre fondo oscuro se apaga, y el disenador lo compensa subiendole luz.
//
// De paso desaparece el caso especial de la "i" de VITAL: en el positivo era el
// unico relleno blanco del arte y habia que protegerla de la inversion para que
// no quedara un agujero sobre fondo oscuro. En el negativo real es blanca como
// todas las demas letras, y no hay nada que proteger.
const negativoOriginal = await readFile(NEGATIVO, 'utf8');
const negativoBase = normalizar(negativoOriginal, 'fvn', 'Capa_2');
const negativo = limpiar(
  negativoBase,
  await viewBoxAjustado(negativoBase, negativoOriginal.match(/viewBox="([^"]+)"/)[1]),
);

// ---- isotipo.svg ---------------------------------------------------------
// La "V" (check + flecha) y las barras: los grupos cuyo relleno es SOLO verde.
// Se clasifica por color real y no por indice, para que siga funcionando si el
// disenador reordena las capas.
//
// Sale del POSITIVO a proposito: el isotipo es integramente lima y se usa igual
// sobre claro y sobre oscuro, asi que no necesita una version en negativo.
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

// ---- isotipo-circular.svg ------------------------------------------------
// Monograma "FV" dentro de un disco, entregado aparte por el disenador. No se
// deriva del imagotipo: es arte propia. Vale la pena tenerlo porque, a
// diferencia del isotipo suelto, trae SU PROPIO fondo: se lee igual sobre
// claro y sobre oscuro, y no hay que inventarle un cuadrado de relleno para
// los iconos de app.
const circularOriginal = await readFile(CIRCULAR, 'utf8');
const circularBase = normalizar(circularOriginal, 'fvc', 'Capa_1');
// El viewBox que exporta Illustrator deja aire muerto a la derecha del disco.
// Recortado contra el contenido real queda cuadrado solo, que es justo lo que
// necesitan un favicon y un avatar.
const circular = limpiar(
  circularBase,
  await viewBoxAjustado(circularBase, circularOriginal.match(/viewBox="([^"]+)"/)[1]),
);

await mkdir(DESTINO, { recursive: true });
for (const [nombre, contenido] of [
  ['logo.svg', positivo],
  ['logo-negativo.svg', negativo],
  ['isotipo.svg', isotipo],
  ['isotipo-circular.svg', circular],
]) {
  await writeFile(resolve(DESTINO, nombre), contenido, 'utf8');
  console.log('  ->', nombre, `(${contenido.length} bytes)  viewBox="${contenido.match(/viewBox="([^"]+)"/)[1]}"`);
}
console.log(`Isotipo armado con ${soloVerdes.length} grupos verdes.`);
console.log('Ahora: node scripts/marca/generar-assets.mjs');
