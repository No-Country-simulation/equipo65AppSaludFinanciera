'use client';

import { useMemo } from 'react';
import { generarMatrizQr } from '@/lib/qr';

/** QR escaneable renderizado como SVG (sin dependencias). Ver src/lib/qr.ts. */
export function QrCode({
  valor,
  tam = 200,
  className = '',
}: {
  valor: string;
  tam?: number;
  className?: string;
}) {
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
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={tam}
      height={tam}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Código QR"
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={d} fill="#1b262e" />
    </svg>
  );
}
