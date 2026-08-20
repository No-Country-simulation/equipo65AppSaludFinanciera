/**
 * Iconos SVG (stroke, estilo Lucide). Reemplazan a los emojis en toda la app.
 * Cada icono es un `d` que puede tener varios subtrazos (M…). fill=none.
 */
export type NombreIcono =
  // navegación
  | 'panel'
  | 'movimientos'
  | 'tarjeta'
  | 'credito'
  | 'presupuestos'
  | 'metas'
  | 'analisis'
  | 'perfil'
  // ui
  | 'menu'
  | 'cerrar'
  | 'chevron-izq'
  | 'chevron-der'
  | 'colapsar'
  | 'mas'
  | 'salir'
  | 'alerta'
  | 'arriba'
  | 'abajo'
  | 'plano'
  | 'ojo'
  | 'ojo-cerrado'
  | 'buscar'
  | 'android'
  | 'descargar'
  // perfil financiero
  | 'tendencia-arriba'
  | 'tendencia-abajo'
  | 'observar'
  // metas de ahorro
  | 'meta'
  | 'escudo'
  | 'avion'
  | 'casa'
  | 'auto'
  | 'educacion'
  | 'anillo'
  | 'playa'
  | 'telefono'
  | 'laptop'
  | 'regalo'
  | 'salud'
  // medios de operacion (TRANSACCIONES.medio_operacion)
  | 'web'
  | 'cajero'
  | 'sucursal'
  | 'transferencia'
  | 'efectivo'
  // tema claro/oscuro
  | 'sol'
  | 'luna';

const TRAZOS: Record<NombreIcono, string> = {
  panel: 'M4 5h7v7H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z',
  movimientos: 'M4 7h16M4 12h16M4 17h10',
  tarjeta: 'M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zM2 10h20M6 15h4',
  credito: 'M4 14a8 8 0 0116 0M12 14l3.5-3.5M12 14h.01M7 19h10',
  presupuestos: 'M3 10h18M3 10l2-5h14l2 5M4 10v9h16v-9M8 14h.01M12 14h4',
  metas: 'M12 3v9m0 0l3-3m-3 3L9 9M5 21h14a1 1 0 001-1v-5a8 8 0 10-16 0v5a1 1 0 001 1z',
  analisis: 'M4 19l5-6 4 3 7-9M4 19h16',
  perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  'chevron-izq': 'M15 18l-6-6 6-6',
  'chevron-der': 'M9 18l6-6-6-6',
  colapsar: 'M3 5h18v14H3zM10 5v14',
  mas: 'M12 5v14M5 12h14',
  salir: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  alerta: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  arriba: 'M12 19V5M6 11l6-6 6 6',
  abajo: 'M12 5v14M6 13l6 6 6-6',
  plano: 'M5 12h14',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
  android: 'M5 11h14v7a1 1 0 01-1 1H6a1 1 0 01-1-1zM7.5 11a4.5 4.5 0 019 0M9.2 6.3L7.8 4.4M14.8 6.3l1.4-1.9M9.8 8.5h.01M14.2 8.5h.01M3 12.5v4M21 12.5v4M9 19v2M15 19v2',
  descargar: 'M12 4v11m0 0l4-4m-4 4l-4-4M5 19h14',
  buscar: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
  'ojo-cerrado':
    'M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.2A9.9 9.9 0 0112 5c6.5 0 10 7 10 7a17.9 17.9 0 01-3.1 4M6.5 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1',
  'tendencia-arriba': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  'tendencia-abajo': 'M3 7l6 6 4-4 8 8M15 17h6v-6',
  observar: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
  meta: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 13a1 1 0 100-2 1 1 0 000 2z',
  escudo: 'M12 3l8 3v6c0 4.2-3.4 6.7-8 8-4.6-1.3-8-3.8-8-8V6zM9 12l2 2 4-4',
  avion: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  casa: 'M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5M10 20v-6h4v6',
  auto: 'M5 13l1.6-4.6A2 2 0 018.5 7h7a2 2 0 011.9 1.4L19 13M4 13h16v4H4zM7.5 17v2M16.5 17v2',
  educacion: 'M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5',
  anillo: 'M6 3h12l3 6-9 12L3 9zM3 9h18M12 3 8 9l4 12 4-12-4-6',
  playa: 'M12 3a9 9 0 019 9H3a9 9 0 019-9zM12 12v7M12 19a2 2 0 004 0',
  telefono: 'M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2',
  laptop: 'M4 5.5h16v10H4zM2 19.5h20',
  regalo: 'M20 12v9H4v-9M2 8h20v4H2zM12 8v13M12 8S9.5 3.5 7 5.5 8 8 12 8zM12 8s2.5-4.5 5-2.5S16 8 12 8z',
  salud: 'M12 20.5s-7-4.3-9.3-8.4C1.2 9.3 3 6 6.2 6c2 0 3.4 1.3 5.3 3.3C13.4 7.3 14.8 6 16.8 6 20 6 21.8 9.3 20.3 12.1 18 16.2 12 20.5 12 20.5z',
  web: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18',
  cajero: 'M6 3h12a1 1 0 011 1v13H5V4a1 1 0 011-1zM9 8h6M8 13h8M8 20h8',
  sucursal: 'M3 21h18M4 9l8-4 8 4M6 9v12M18 9v12M10 9v12M14 9v12',
  transferencia: 'M4 9h13m0 0l-4-4m4 4l-4 4M20 15H7m0 0l4-4m-4 4l4 4',
  efectivo: 'M2 7h20v10H2zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5M5.5 10h.01M18.5 14h.01',
  sol: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  luna: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
};

export function Icono({
  nombre,
  className = 'h-5 w-5',
  strokeWidth = 1.8,
}: {
  nombre: NombreIcono;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

/** Iconos disponibles para el selector de meta. */
export const ICONOS_META: NombreIcono[] = [
  'meta',
  'escudo',
  'avion',
  'casa',
  'auto',
  'educacion',
  'anillo',
  'playa',
  'telefono',
  'laptop',
  'regalo',
  'salud',
];
