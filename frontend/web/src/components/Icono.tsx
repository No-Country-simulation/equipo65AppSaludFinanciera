/**
 * Iconos SVG (stroke, estilo Lucide). Reemplazan a los emojis en toda la app.
 * Cada icono es un `d` que puede tener varios subtrazos (M…). fill=none.
 */
export type NombreIcono =
  // navegación
  | 'panel'
  | 'movimientos'
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
  | 'salud';

const TRAZOS: Record<NombreIcono, string> = {
  panel: 'M4 5h7v7H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z',
  movimientos: 'M4 7h16M4 12h16M4 17h10',
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
