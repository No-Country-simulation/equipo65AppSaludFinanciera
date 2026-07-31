import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { generarMatrizQr } from '@/lib/qr';

/** QR escaneable renderizado con react-native-svg (sin dependencias nuevas). Ver src/lib/qr.ts. */
export function QrCode({ valor, tam = 200 }: { valor: string; tam?: number }) {
  const { d, total } = useMemo(() => {
    let matriz: boolean[][] | null = null;
    try {
      matriz = generarMatrizQr(valor);
    } catch {
      return { d: '', total: 0 };
    }
    const quiet = 4; // zona de silencio obligatoria
    const n = matriz.length;
    const lado = n + quiet * 2;
    let ruta = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (matriz[y][x]) ruta += `M${x + quiet} ${y + quiet}h1v1h-1z`;
      }
    }
    return { d: ruta, total: lado };
  }, [valor]);

  if (!total) return null;

  return (
    <Svg width={tam} height={tam} viewBox={`0 0 ${total} ${total}`}>
      <Rect width={total} height={total} fill="#ffffff" />
      <Path d={d} fill="#1b262e" />
    </Svg>
  );
}
