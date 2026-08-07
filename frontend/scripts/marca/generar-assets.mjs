/**
 * Genera los assets de marca (PNG) a partir de los SVG de `web/public/marca/`.
 *
 * Por que existe: el movil NO puede consumir SVG. `react-native-svg` esta
 * instalado, pero `react-native-svg-transformer` no, asi que Metro no sabe
 * importar un .svg como componente. La salida son PNG a 1x/2x/3x.
 *
 * Tambien produce los iconos de app (Expo) y el favicon de la web.
 *
 * Uso (sharp vive en las dependencias de la web):
 *   cd frontend/web && node ../scripts/marca/generar-assets.mjs
 *
 * Hay que volver a correrlo cuando el diseno cambie, siempre despues de
 * derivar-variantes.mjs.
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../..');

// ESM resuelve los paquetes desde la carpeta de ESTE archivo, no desde el cwd,
// y sharp vive en las dependencias de la web. Se resuelve explicitamente.
const require = createRequire(resolve(RAIZ, 'web/package.json'));
const sharp = require('sharp');
const SVG = resolve(RAIZ, 'web/public/marca');
const MOVIL = resolve(RAIZ, 'mobile/assets');
const WEB = resolve(RAIZ, 'web/src/app');

/** Pizarra oscura del logo: fondo de los iconos de app. */
const PIZARRA = '#1b262e';

// Los SVG no llevan width/height (solo viewBox), asi que librsvg interpreta sus
// unidades como puntos: el raster sale a viewBox/72*densidad px. Con 150 el
// imagotipo da ~5970px de ancho - de sobra para un icono de 1024 y sin
// dispararse contra el limite de pixeles de sharp.
const densidad = 150;

async function png(svg, { ancho, alto, fondo = null, margen = 0 }) {
  let img = sharp(resolve(SVG, svg), { density: densidad });
  const util = Math.round((ancho ?? alto) * (1 - margen));
  img = img.resize({
    width: ancho ? util : undefined,
    height: alto && !ancho ? Math.round(alto * (1 - margen)) : undefined,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (margen > 0 || fondo) {
    const buf = await img.png().toBuffer();
    const meta = await sharp(buf).metadata();
    const w = ancho ?? meta.width;
    const h = alto ?? meta.height;
    img = sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: fondo ?? { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([{ input: buf, gravity: 'center' }]);
  }
  return img.png();
}

async function escribir(destino, pipeline) {
  await mkdir(dirname(destino), { recursive: true });
  await pipeline.toFile(destino);
  console.log('  ->', destino.replace(RAIZ, ''));
}

/** Un asset del movil en las 3 densidades que resuelve Metro. */
async function tresDensidades(svg, base, altoBase) {
  for (const [suf, mult] of [['', 1], ['@2x', 2], ['@3x', 3]]) {
    await escribir(
      resolve(MOVIL, `marca/${base}${suf}.png`),
      await png(svg, { alto: altoBase * mult }),
    );
  }
}

console.log('Marca para el movil (1x/2x/3x)');
await tresDensidades('logo.svg', 'logo', 40);
await tresDensidades('logo-negativo.svg', 'logo-negativo', 40);
await tresDensidades('isotipo.svg', 'isotipo', 40);
await tresDensidades('isotipo-circular.svg', 'isotipo-circular', 40);

console.log('Iconos de app (Expo)');
// En los iconos va el logotipo CIRCULAR, no el isotipo suelto: trae su propio
// fondo, asi que no hay que inventarle un cuadrado de relleno y se lee igual
// sobre cualquier fondo de escritorio.
//
// iOS enmascara el icono con un squircle, y el disco no llega a las esquinas:
// debajo va fondo opaco o los angulos quedarian transparentes.
await escribir(
  resolve(MOVIL, 'images/icon.png'),
  await png('isotipo-circular.svg', { ancho: 1024, alto: 1024, fondo: PIZARRA, margen: 0.12 }),
);
// Android adaptativo: el sistema aplica su propia mascara, que en la mayoria de
// los lanzadores es un circulo de ~66% del lienzo. El disco se deja algo mas
// chico que esa mascara para que no lo muerda por los bordes; el fondo va en su
// propia capa.
await escribir(
  resolve(MOVIL, 'images/android-icon-foreground.png'),
  await png('isotipo-circular.svg', { ancho: 1024, alto: 1024, margen: 0.36 }),
);
await escribir(
  resolve(MOVIL, 'images/android-icon-background.png'),
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: PIZARRA } }).png(),
);
// Monocromo (Android 13+): el sistema lo tinta de un color plano y solo queda
// la silueta. El disco se volveria un circulo lleno sin ninguna informacion,
// asi que aca SI va el isotipo suelto, que tiene silueta propia.
await escribir(
  resolve(MOVIL, 'images/android-icon-monochrome.png'),
  await png('isotipo.svg', { ancho: 1024, alto: 1024, margen: 0.55 }),
);
// Splash: sobre el fondo oscuro que declara app.json -> variante en negativo.
await escribir(
  resolve(MOVIL, 'images/splash-icon.png'),
  await png('logo-negativo.svg', { ancho: 900 }),
);
await escribir(
  resolve(MOVIL, 'images/favicon.png'),
  await png('isotipo-circular.svg', { ancho: 48, alto: 48 }),
);

console.log('Favicon de la web (convencion de app router: src/app/icon.png)');
// La pestania no enmascara nada: el disco va a sangre y las esquinas quedan
// transparentes, que es como se ve cualquier avatar redondo.
await escribir(
  resolve(WEB, 'icon.png'),
  await png('isotipo-circular.svg', { ancho: 512, alto: 512 }),
);
// apple-icon SI lo enmascara iOS con un squircle -> fondo opaco debajo.
await escribir(
  resolve(WEB, 'apple-icon.png'),
  await png('isotipo-circular.svg', { ancho: 180, alto: 180, fondo: PIZARRA, margen: 0.12 }),
);

console.log('Listo.');
