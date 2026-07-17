/**
 * Tema financeAI - sistema "Meridian" (mismo que la web):
 * verde pino profundo + arena cálida + menta viva. Paleta de series validada.
 * Tipos: Bricolage Grotesque (display/cifras) · Hanken Grotesk (UI).
 */
export const Colores = {
  // Neutrales cálidos
  canvas: '#e9e3d7',
  canvas2: '#f2eee4',
  tarjeta: '#fffefb',
  tinta: '#191509',
  tintaSuave: '#4b463a',
  apagado: '#8b8571',
  linea: '#e2dccb',
  blanco: '#ffffff',

  // Marca - pino + menta
  acento: '#12564a',
  acentoFuerte: '#0c3c33',
  menta: '#16b98a',
  heroA: '#0c2a24',
  heroB: '#14453a',

  // Estatus de perfil (icono + etiqueta SIEMPRE, nunca solo color)
  ok: '#12a566',
  okTexto: '#0a6b41',
  okFondo: 'rgba(18,165,102,0.13)',
  alerta: '#a06a00',
  alertaFondo: '#f2a30d',
  alertaSuave: 'rgba(242,163,13,0.16)',
  riesgo: '#d1483a',
  riesgoFondo: 'rgba(209,72,58,0.12)',

  // Series categóricas (orden fijo, validado CVD)
  series: ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'],
  serieResto: '#98917d',
} as const;

export const Fuentes = {
  titulo: 'Bricolage_700Bold',
  tituloSemi: 'Bricolage_600SemiBold',
  cuerpo: 'Hanken_400Regular',
  cuerpoMedio: 'Hanken_500Medium',
  cuerpoSemi: 'Hanken_600SemiBold',
  cuerpoNegrita: 'Hanken_700Bold',
} as const;

export const Espacio = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

export const Radio = {
  s: 12,
  m: 18,
  l: 24,
  pill: 999,
} as const;

/** Sombra cálida por capas (para tarjetas). */
export const sombra = {
  shadowColor: '#0c2a24',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 3,
} as const;

export const COLOR_PERFIL: Record<string, string> = {
  saludable: Colores.ok,
  en_observacion: Colores.alertaFondo,
  en_riesgo: Colores.riesgo,
};

/** Asignación FIJA color→categoría (el color sigue a la entidad, no al ranking). */
export const COLOR_CATEGORIA: Record<string, string> = {
  alimentacion: Colores.series[0],
  transporte: Colores.series[1],
  vivienda: Colores.series[2],
  servicios: Colores.series[3],
  entretenimiento: Colores.series[4],
  compras: Colores.series[5],
  salud: Colores.series[6],
  finanzas: Colores.series[7],
};

/** Grupos de gasto (estructura del presupuesto). */
export const MIEMBROS_GRUPO: Record<string, string[]> = {
  esencial: ['alimentacion', 'vivienda', 'servicios', 'salud', 'transporte'],
  discrecional: ['entretenimiento', 'compras'],
  financiero: ['finanzas'],
  educacion: ['educacion'],
  otros: ['otros'],
};

export const COLOR_GRUPO: Record<string, string> = {
  esencial: Colores.series[0],
  discrecional: Colores.series[5],
  financiero: Colores.series[7],
  educacion: Colores.series[6],
  otros: Colores.serieResto,
  ahorro: Colores.menta,
};

/** Clave de icono de meta → nombre de Ionicons (reemplaza a los emojis). */
export const ICONO_META: Record<string, string> = {
  meta: 'locate-outline',
  escudo: 'shield-checkmark-outline',
  avion: 'airplane-outline',
  casa: 'home-outline',
  auto: 'car-outline',
  educacion: 'school-outline',
  anillo: 'diamond-outline',
  playa: 'umbrella-outline',
  telefono: 'phone-portrait-outline',
  laptop: 'laptop-outline',
  regalo: 'gift-outline',
  salud: 'heart-outline',
};

export const ICONOS_META = Object.keys(ICONO_META);

