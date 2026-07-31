/**
 * Generador de codigo QR (modo byte, correccion de errores M, versiones 1-10).
 * TS puro, SIN dependencias: devuelve una matriz booleana (true = modulo oscuro)
 * que web (SVG) y movil (react-native-svg) renderizan igual.
 *
 * Adaptado del "QR Code generator" de Nayuki (dominio publico / MIT). Recortado a
 * lo que necesita el 2FA: codificar un `otpauth://...` (~80-140 chars ASCII).
 * Verificado contra el ejemplo del ISO/IEC 18004 (ver qr.test en la doc de commits).
 */

// Nivel de correccion M: tablas por version (indice = version, 1-based; 0 sin usar).
const ECC_CODEWORDS_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const VERSION_MAX = 10;
const FORMAT_BITS_M = 0; // formatBits del nivel M

/** Multiplicacion en GF(256) con el polinomio 0x11D. */
function mul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/** Modulos de datos crudos (bits) de una version, antes de restar la ECC. */
function numRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(ver: number): number {
  return (
    Math.floor(numRawDataModules(ver) / 8) - ECC_CODEWORDS_M[ver] * NUM_BLOCKS_M[ver]
  );
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = mul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = mul(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= mul(divisor[i], factor);
  }
  return result;
}

function charCountBits(ver: number): number {
  return ver <= 9 ? 8 : 16; // modo byte
}

/** Codifica el texto (UTF-8) en codewords de datos + ECC intercalados. */
function codificar(texto: string): { version: number; codewords: number[] } {
  const bytes = Array.from(new TextEncoder().encode(texto));

  let version = 0;
  for (let v = 1; v <= VERSION_MAX; v++) {
    const capacidadBits = numDataCodewords(v) * 8;
    const usadosBits = 4 + charCountBits(v) + bytes.length * 8;
    if (usadosBits <= capacidadBits) {
      version = v;
      break;
    }
  }
  if (version === 0) throw new Error('QR: texto demasiado largo para v1-10');

  // Buffer de bits
  const bits: number[] = [];
  const anexar = (valor: number, ancho: number) => {
    for (let i = ancho - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };
  anexar(0b0100, 4); // modo byte
  anexar(bytes.length, charCountBits(version));
  for (const b of bytes) anexar(b, 8);

  const capacidadBits = numDataCodewords(version) * 8;
  anexar(0, Math.min(4, capacidadBits - bits.length)); // terminador
  while (bits.length % 8 !== 0) bits.push(0);

  // A bytes + relleno alterno 0xEC / 0x11
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCodewords.push(b);
  }
  for (let pad = 0xec; dataCodewords.length < numDataCodewords(version); pad ^= 0xec ^ 0x11) {
    dataCodewords.push(pad);
  }

  return { version, codewords: anadirEccEIntercalar(version, dataCodewords) };
}

function anadirEccEIntercalar(ver: number, data: number[]): number[] {
  const numBlocks = NUM_BLOCKS_M[ver];
  const blockEccLen = ECC_CODEWORDS_M[ver];
  const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDiv = reedSolomonDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const ecc = reedSolomonRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0); // relleno para igualar longitudes
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      // salta la columna de relleno de los bloques cortos
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

/** Construye la matriz de un QR ya con patrones, datos y la mejor mascara. */
export function generarMatrizQr(texto: string): boolean[][] {
  const { version, codewords } = codificar(texto);
  const size = version * 4 + 17;

  const modulos: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const esFuncion: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFuncion = (x: number, y: number, oscuro: boolean) => {
    modulos[y][x] = oscuro;
    esFuncion[y][x] = true;
  };

  // Patrones de posicion (finder) + separadores en 3 esquinas
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFuncion(x, y, dist !== 2 && dist !== 4);
      }
    }
  };

  // Timing
  for (let i = 0; i < size; i++) {
    setFuncion(6, i, i % 2 === 0);
    setFuncion(i, 6, i % 2 === 0);
  }
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // Patrones de alineacion
  const posAlign = alignmentPositions(version, size);
  const n = posAlign.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      const cx = posAlign[i];
      const cy = posAlign[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFuncion(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Reserva de format info (con placeholder) + version info
  dibujarFormato(modulos, esFuncion, size, 0);
  dibujarVersion(setFuncion, version, size);

  // Datos en zigzag
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const haciaArriba = ((right + 1) & 2) === 0;
        const y = haciaArriba ? size - 1 - vert : vert;
        if (!esFuncion[y][x] && idx < codewords.length * 8) {
          modulos[y][x] = ((codewords[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0;
          idx++;
        }
      }
    }
  }

  // Elegir la mejor mascara por penalizacion
  let mejorMascara = 0;
  let menorPenalizacion = Infinity;
  for (let mascara = 0; mascara < 8; mascara++) {
    aplicarMascara(modulos, esFuncion, size, mascara);
    dibujarFormato(modulos, esFuncion, size, mascara);
    const p = penalizacion(modulos, size);
    if (p < menorPenalizacion) {
      menorPenalizacion = p;
      mejorMascara = mascara;
    }
    aplicarMascara(modulos, esFuncion, size, mascara); // deshacer (XOR)
  }
  aplicarMascara(modulos, esFuncion, size, mejorMascara);
  dibujarFormato(modulos, esFuncion, size, mejorMascara);

  return modulos;
}

function alignmentPositions(ver: number, size: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function dibujarFormato(
  modulos: boolean[][],
  esFuncion: boolean[][],
  size: number,
  mascara: number,
): void {
  const datos = (FORMAT_BITS_M << 3) | mascara;
  let rem = datos;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((datos << 10) | rem) ^ 0x5412;
  const getBit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

  const poner = (x: number, y: number, oscuro: boolean) => {
    modulos[y][x] = oscuro;
    esFuncion[y][x] = true;
  };

  for (let i = 0; i <= 5; i++) poner(8, i, getBit(bits, i));
  poner(8, 7, getBit(bits, 6));
  poner(8, 8, getBit(bits, 7));
  poner(7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i++) poner(14 - i, 8, getBit(bits, i));

  for (let i = 0; i < 8; i++) poner(size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i++) poner(8, size - 15 + i, getBit(bits, i));
  poner(8, size - 8, true); // modulo siempre oscuro
}

function dibujarVersion(
  setFuncion: (x: number, y: number, oscuro: boolean) => void,
  ver: number,
  size: number,
): void {
  if (ver < 7) return;
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (ver << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFuncion(a, b, bit);
    setFuncion(b, a, bit);
  }
}

function aplicarMascara(modulos: boolean[][], esFuncion: boolean[][], size: number, mascara: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (esFuncion[y][x]) continue;
      let invertir = false;
      switch (mascara) {
        case 0: invertir = (x + y) % 2 === 0; break;
        case 1: invertir = y % 2 === 0; break;
        case 2: invertir = x % 3 === 0; break;
        case 3: invertir = (x + y) % 3 === 0; break;
        case 4: invertir = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invertir = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: invertir = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        case 7: invertir = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      }
      if (invertir) modulos[y][x] = !modulos[y][x];
    }
  }
}

/** Penalizacion de la mascara (4 reglas del estandar) para elegir la mas legible. */
function penalizacion(modulos: boolean[][], size: number): number {
  let p = 0;
  // Reglas 1 y 3: filas
  for (let y = 0; y < size; y++) {
    let runColor = false;
    let runLen = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (modulos[y][x] === runColor) {
        runLen++;
        if (runLen === 5) p += 3;
        else if (runLen > 5) p++;
      } else {
        deslizar(history, runLen);
        if (!runColor && buscaPatron(history)) p += 40;
        runColor = modulos[y][x];
        runLen = 1;
      }
    }
    deslizar(history, runLen);
    if (runColor) deslizar(history, 0);
    if (buscaPatron(history)) p += 40;
  }
  // Reglas 1 y 3: columnas
  for (let x = 0; x < size; x++) {
    let runColor = false;
    let runLen = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (modulos[y][x] === runColor) {
        runLen++;
        if (runLen === 5) p += 3;
        else if (runLen > 5) p++;
      } else {
        deslizar(history, runLen);
        if (!runColor && buscaPatron(history)) p += 40;
        runColor = modulos[y][x];
        runLen = 1;
      }
    }
    deslizar(history, runLen);
    if (runColor) deslizar(history, 0);
    if (buscaPatron(history)) p += 40;
  }
  // Regla 2: bloques 2x2
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modulos[y][x];
      if (c === modulos[y][x + 1] && c === modulos[y + 1][x] && c === modulos[y + 1][x + 1]) p += 3;
    }
  }
  // Regla 4: balance de modulos oscuros
  let oscuros = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modulos[y][x]) oscuros++;
  const total = size * size;
  const k = Math.ceil(Math.abs(oscuros * 20 - total * 10) / total) - 1;
  p += k * 10;
  return p;
}

function deslizar(history: number[], n: number): void {
  history.pop();
  history.unshift(n);
}

/** Detecta el patron finder-like 1:1:3:1:1 (con espacio a un lado) para la regla 3. */
function buscaPatron(h: number[]): boolean {
  const n = h[1];
  return (
    n > 0 &&
    h[2] === n &&
    h[3] === n * 3 &&
    h[4] === n &&
    h[5] === n &&
    (h[0] >= n * 4 || h[6] >= n * 4)
  );
}
