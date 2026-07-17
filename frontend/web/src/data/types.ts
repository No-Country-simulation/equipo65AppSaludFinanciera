/**
 * Tipos 1:1 con docs/arquitectura/CONTRATO_API.md (congelado).
 * snake_case a proposito: es la forma literal del JSON de la API.
 * Los slugs NUNCA se traducen (docs/datos/TAXONOMIA.md).
 */

export const CATEGORIAS = [
  'alimentacion',
  'transporte',
  'vivienda',
  'servicios',
  'salud',
  'educacion',
  'entretenimiento',
  'compras',
  'finanzas',
  'ahorro_inversion',
  'ingresos',
  'otros',
] as const;
export type CategoriaSlug = (typeof CATEGORIAS)[number];

export const PERFILES = ['saludable', 'en_observacion', 'en_riesgo'] as const;
export type PerfilSlug = (typeof PERFILES)[number];

export type Idioma = 'es' | 'pt' | 'en';
export type FrecuenciaAhorro = 'nula' | 'baja' | 'media' | 'alta';
export type Moneda = 'USD' | 'MXN' | 'ARS' | 'COP' | 'CLP' | 'PEN' | 'BRL' | 'EUR';

/** Version vigente de los T&C que acepta el checkbox de registro. */
export const TERMINOS_VERSION = '1.0';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  moneda_principal: Moneda;
  idioma: Idioma;
  ingreso_mensual: number;
  nivel_endeudamiento: number; // 0-100
  frecuencia_ahorro: FrecuenciaAhorro;
  totp_activo: boolean;
  // Prueba de consentimiento (feature de producto - extiende el contrato; ver ROADMAP)
  terminos_version?: string;
  terminos_aceptados_en?: string; // ISO-8601
}

export interface Sesion {
  access_token: string;
  refresh_token: string;
  expira_en: number;
  requiere_2fa: boolean;
  usuario?: Usuario;
}

export interface Categoria {
  slug: CategoriaSlug;
  etiqueta: string; // traducida por la API segun Accept-Language
  tipo: 'gasto' | 'movimiento' | 'ingreso';
}

export interface Transaccion {
  id: string;
  descripcion: string;
  valor: number; // >0 ingreso, <0 gasto (RN4)
  moneda: Moneda;
  fecha: string; // ISO-8601
  categoria: CategoriaSlug;
  confianza: number;
  categoria_origen: 'modelo' | 'usuario';
}

export interface Indicadores {
  tasa_ahorro: number;
  ratio_endeudamiento: number;
  ratio_gasto_ingreso: number;
  ratio_gasto_esencial: number;
  ratio_gasto_discrecional: number;
  concentracion_gasto: number;
  frecuencia_ahorro_num: 0 | 1 | 2 | 3;
  ratio_recurrente: number;
}

export type PrioridadRecomendacion = 'alta' | 'media' | 'baja';

export interface RecomendacionDetalle {
  codigo: string; // REC_*, nunca se traduce
  texto: string; // ya traducido por la API
  parametros: Record<string, string | number>;
  prioridad: PrioridadRecomendacion;
  indicador: keyof Indicadores | string;
}

export interface Analisis {
  id: string;
  perfil_financiero: string; // etiqueta legible traducida
  perfil_codigo: PerfilSlug; // slug estable - el que usa el frontend
  probabilidad: number;
  probabilidades: Record<PerfilSlug, number>;
  resumen_gastos: Partial<Record<CategoriaSlug, number>>;
  indicadores: Indicadores;
  recomendaciones: string[];
  recomendaciones_detalle: RecomendacionDetalle[];
  moneda: Moneda;
  idioma: Idioma;
  modelo_version: string;
  analizado_en: string;
}

export interface PuntoEvolucion {
  fecha: string;
  perfil_codigo: PerfilSlug;
  probabilidad: number;
  tasa_ahorro: number;
  ratio_endeudamiento: number;
}

export interface Evolucion {
  moneda: Moneda;
  puntos: PuntoEvolucion[];
}

export interface ResultadoImport {
  importadas: number;
  rechazadas: number;
  errores: { fila: number; error: string }[];
}

export interface PaginaTransacciones {
  items: Transaccion[];
  pagina: number;
  total: number;
}

export interface ResumenAnalisis {
  id: string;
  perfil_codigo: PerfilSlug;
  probabilidad: number;
  analizado_en: string;
}

/** Meta de ahorro (feature de producto - extiende el contrato; ver ROADMAP). */
export interface MetaAhorro {
  id: string;
  nombre: string;
  objetivo: number;
  ahorrado: number;
  moneda: Moneda;
  fecha_limite?: string; // ISO date
  icono: string; // emoji
  color: string; // token o hex
}

/** Presupuesto mensual por categoría (feature de producto - extiende el contrato). */
export interface Presupuesto {
  categoria: CategoriaSlug;
  limite: number;
  gastado: number; // calculado sobre el mes en curso
  moneda: Moneda;
}

export interface ResumenMensual {
  mes: string; // 'YYYY-MM'
  gasto_total: number;
  ingreso_total: number;
  balance: number;
  por_categoria: Partial<Record<CategoriaSlug, number>>;
}

export interface ComparacionMensual {
  actual: ResumenMensual;
  anterior: ResumenMensual;
}

/** Portabilidad de datos (derechos ARCO/LGPD - feature de producto). */
export interface DatosExportados {
  generado_en: string; // ISO-8601
  usuario: Usuario;
  transacciones: Transaccion[];
  metas: MetaAhorro[];
  presupuestos: Presupuesto[];
  analisis: ResumenAnalisis[];
}

/** Forma uniforme de error de la API (CONTRATO_API §2). */
export interface ErrorApi {
  codigo: string;
  mensaje: string;
  detalles: { campo: string; error: string }[];
  traza_id: string;
}

export class FinanceApiError extends Error {
  constructor(
    public readonly error: ErrorApi,
    public readonly status: number,
  ) {
    super(error.mensaje);
    this.name = 'FinanceApiError';
  }
}
