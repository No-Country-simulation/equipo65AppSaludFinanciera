/**
 * Tema financeAI - sistema "Meridian" (mismo que la web):
 * verde pino profundo + arena cálida + menta viva. Paleta de series validada.
 * Tipos: Bricolage Grotesque (display/cifras) · Hanken Grotesk (UI).
 */

// 1. Guardamos el tema original (Claro) por si el usuario lo quiere después
export const TemaClaro = {
  canvas: '#e9e3d7',
  canvas2: '#f2eee4',
  tarjeta: '#fffefb',
  tinta: '#0F0D06',        // Aumentamos la oscuridad para mayor contraste
  tintaSuave: '#3D382B',   // Más oscuro para que no se pierda
  apagado: '#756E5A',      // Más oscuro para visibilidad
  linea: '#D1C9B3',        // Un poco más marcada
  blanco: '#ffffff',
  acento: '#0E453B',       // Pino más oscuro para mejor lectura
  acentoFuerte: '#082E26',
  menta: '#129670',        // Un poco más saturado
  heroA: '#0c2a24',
  heroB: '#14453a',
  ok: '#12a566',
  okTexto: '#085735',      // Más oscuro
  okFondo: 'rgba(18,165,102,0.13)',
  alerta: '#855800',       // Más oscuro
  alertaFondo: '#f2a30d',
  alertaSuave: 'rgba(242,163,13,0.16)',
  riesgo: '#B33C30',       // Más saturado
  riesgoFondo: 'rgba(209,72,58,0.12)',
  series: ['#1E62B5', '#007000', '#D66B92', '#D18F00', '#16966A', '#D1582E', '#3D2F8A', '#C73D3D'],
  serieResto: '#7A7464',
} as const;
// 2. Guardamos el tema nuevo (Oscuro / Fintech)
export const TemaOscuro = {
  canvas: '#0B1519',      
  canvas2: '#112026',     
  tarjeta: '#16282E',     
  tinta: '#E6E9EA',       
  tintaSuave: '#8B9DA5',  
  apagado: '#546A76',     
  linea: '#2A3C44',       
  blanco: '#F0F2F3',
  acento: '#16b98a',      
  acentoFuerte: '#0c3c33',
  menta: '#16b98a',
  heroA: '#0B1519',
  heroB: '#112026',
  ok: '#12a566',
  okTexto: '#20D68A',     
  okFondo: 'rgba(18,165,102,0.2)',
  alerta: '#F2A30D',
  alertaFondo: 'rgba(242,163,13,0.2)',
  alertaSuave: 'rgba(242,163,13,0.1)',
  riesgo: '#E55C4F',
  riesgoFondo: 'rgba(209,72,58,0.2)',
  series: ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'],
  serieResto: '#98917d',
} as const;

// 3. EL TRUCO ARQUITECTÓNICO: 
// Exportamos "Colores" apuntando al tema oscuro para evitar que la app colapse.
export const Colores = TemaOscuro;

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