/**
 * Tema Fintech Vital - sistema "Meridian" (mismo que la web):
 * pizarra (#414c5a) + lima (#88bd24), derivados del imagotipo.
 * Paleta de series validada. Tipos: Bricolage Grotesque · Hanken Grotesk.
 *
 * REGLA DEL LIMA (medida): sobre blanco da 2.25:1, no llega al 4.5:1 de
 * WCAG AA -> en tema claro es SOLO relleno; para texto va `limaTexto`
 * (5.69:1) y lo interactivo va en `acento` (pizarra, 8.73:1). En tema
 * oscuro se invierte: el lima da 7.79:1 y pasa a ser el acento.
 */

// 1. Guardamos el tema original (Claro) por si el usuario lo quiere después
export const TemaClaro = {
  canvas: '#eef1f4',
  canvas2: '#f7f9fa',
  tarjeta: '#ffffff',
  tinta: '#141d24',        // pizarra casi negra, para máximo contraste
  tintaSuave: '#3c4954',
  apagado: '#64737f',      // oscuro para visibilidad
  linea: '#d4dde3',        // hairline marcada
  blanco: '#ffffff',
  acento: '#3a4550',       // pizarra: lo interactivo (8.73:1 sobre blanco)
  acentoFuerte: '#242e37',
  // Texto que va ENCIMA de `acento`. No es siempre `blanco`: en oscuro el
  // acento es lima y el blanco encima daria 1.9:1. Usar esto, no `blanco`.
  sobreAcento: '#ffffff',  // blanco sobre pizarra

  menta: '#88bd24',        // lima de marca: RELLENO, nunca texto
  limaTexto: '#4a6614',    // lima legible como texto (6.56:1)
  heroA: '#1b262e',
  heroB: '#33414c',
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
  canvas: '#0f1a20',
  canvas2: '#172630',
  tarjeta: '#1b2b35',
  tinta: '#e8edf0',
  tintaSuave: '#b4c2cb',
  apagado: '#8698a4',
  linea: '#2c3d48',
  blanco: '#f0f2f3',
  acento: '#9fc640',       // sobre oscuro el lima sí pasa AA (7.79:1)
  acentoFuerte: '#88bd24',
  sobreAcento: '#0f1a20',  // tinta oscura sobre lima: 8.94:1

  menta: '#9fc640',
  limaTexto: '#9fc640',
  heroA: '#0f1a20',
  heroB: '#1e2f3a',
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

/** Sombra por capas (para tarjetas). */
export const sombra = {
  shadowColor: '#1b262e',
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