/**
 * Tipos 1:1 con docs/arquitectura/CONTRATO_API.md (congelado).
 * snake_case a proposito: es la forma literal del JSON de la API.
 * Los slugs NUNCA se traducen (docs/datos/TAXONOMIA.md).
 */

/**
 * Catalogo de categorias CONOCIDO por el frontend.
 *
 * ⚠️ Ya NO es una lista cerrada. La taxonomia la manda la base de datos y, en
 * ultima instancia, data science: `GET /api/v1/categorias` es la fuente de
 * verdad y puede devolver categorias que no esten aqui.
 *
 * Esta lista sigue existiendo para lo que SI depende de conocer la categoria de
 * antemano - color, icono y orden - y como respaldo si la API no responde. Para
 * cualquier slug que no este, hay que usar el aspecto generico: ver
 * `esCategoriaConocida()` mas abajo.
 *
 * Antes tenia ademas `comida_rapida`, `supermercado` y `taxi`, que no son
 * categorias sino SUBcategorias del extracto (tabla `subcategoria`, 34 filas
 * que cuelgan de estas 12).
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

/** Slug de una de las categorias que el frontend conoce de antemano. */
export type CategoriaConocida = (typeof CATEGORIAS)[number];

/**
 * Slug de categoria tal como llega de la API.
 *
 * Es `string` a proposito: si data science entrega un modelo que predice `ocio`
 * o `mascotas`, la aplicacion tiene que mostrarlo, no dejar de compilar. Lo que
 * se pierde -que un slug mal escrito ya no se detecte al compilar- se compensa
 * leyendo el catalogo de `GET /api/v1/categorias` y teniendo respaldo para lo
 * desconocido.
 */
export type CategoriaSlug = string;

/** ¿Tenemos color, icono y etiqueta propios para este slug? */
export function esCategoriaConocida(slug: string): slug is CategoriaConocida {
  return (CATEGORIAS as readonly string[]).includes(slug);
}

/**
 * Detalle opcional que trae el extracto ("Barberia", "Metrobus"). Es texto
 * libre a proposito: el catalogo lo manda la BD y crece sin tocar el frontend.
 */
export type SubcategoriaSlug = string;

export const PERFILES = ['saludable', 'en_observacion', 'en_riesgo'] as const;
export type PerfilSlug = (typeof PERFILES)[number];

export type Idioma = 'es' | 'pt' | 'en';
export type FrecuenciaAhorro = 'nula' | 'baja' | 'media' | 'alta';
export type Moneda = 'USD' | 'MXN' | 'ARS' | 'COP' | 'CLP' | 'PEN' | 'BRL' | 'EUR';

/**
 * Medio por el que se hizo la operacion (TRANSACCIONES.medio_operacion, MySQL).
 * Slugs snake_case: la etiqueta legible la pone el frontend por idioma.
 */
export type MedioOperacion = 'app_movil' | 'portal_web' | 'cajero' | 'sucursal' | 'pos';

/** Red de pago de la tarjeta (TARJETAS.red_pago). */
export type RedPago = 'visa' | 'mastercard' | 'amex';
export type TipoTarjeta = 'debito' | 'credito';
/** Estado de cuenta o tarjeta (ACTIVA/BLOQUEADA/CANCELADA en la BD). */
export type EstadoBancario = 'activa' | 'bloqueada' | 'cancelada';
/** Estado del plan de ahorro (PLANES_AHORRO.estado_plan). */
export type EstadoPlan = 'activo' | 'finalizado' | 'cancelado';

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
  // Datos personales (USUARIOS: apellido, fecha_nacimiento, genero, telefono, ciudad_id).
  // Se rellenan en el alta y despues son de solo lectura. Opcionales: la API los
  // omite cuando estan vacios (`default-property-inclusion=non_null`).
  apellido?: string;
  fecha_nacimiento?: string; // ISO date - la edad se calcula, no se guarda
  genero?: 'M' | 'F';
  telefono?: string;
  ciudad?: string;
  estado_region?: string; // 'estado' en CIUDADES
  pais?: string;
  // Prueba de consentimiento (feature de producto - extiende el contrato; ver ROADMAP)
  terminos_version?: string;
  terminos_aceptados_en?: string; // ISO-8601
}

/**
 * Una ciudad del catalogo (`GET /api/v1/ciudades`, tabla `ciudad`).
 *
 * `usuario.ciudad_id` es una FK a esta tabla, asi que el alta NO admite texto
 * libre: hay que mandar uno de estos `nombre`. Por eso el formulario de
 * registro ofrece un selector y no un input.
 */
export interface Ciudad {
  id: string;
  nombre: string;
  /** Estado/provincia/departamento (columna `region` en la BD). */
  estado_region: string;
  /** ISO-3166-1 alfa-2. */
  pais: string;
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
  // Datos que trae la tabla transaccion en la BD (opcionales: no todos los movimientos los tienen)
  comercio?: string; // TRANSACCIONES.comercio - el establecimiento
  medio_operacion?: MedioOperacion; // TRANSACCIONES.medio_operacion
  id_tarjeta?: string; // TRANSACCIONES.id_tarjeta - para filtrar por tarjeta
}

/** Cuenta bancaria (CUENTAS_BANCARIAS). No guarda saldo: se calcula. */
export interface CuentaBancaria {
  id: string;
  numero: string; // enmascarado ('**** 4821'); nunca el numero completo
  estado: EstadoBancario;
  fecha_apertura: string; // ISO date
}

/** Datos exclusivos de una tarjeta de credito (TARJETAS_CREDITO). */
export interface CreditoTarjeta {
  limite_credito: number;
  dia_corte: number; // 1-31
  dia_pago: number; // 1-31
  /** Monto usado del limite. En la BD es derivado (no se almacena); aqui lo trae la vista. */
  saldo_utilizado: number;
}

/** Tarjeta (TARJETAS + subtipo TARJETAS_CREDITO cuando tipo === 'credito'). */
export interface Tarjeta {
  id: string;
  id_cuenta: string;
  ultimos4: string; // los 4 ultimos digitos, nunca el PAN completo
  tipo: TipoTarjeta;
  red_pago: RedPago;
  fecha_vencimiento: string; // 'YYYY-MM'
  estado: EstadoBancario;
  etiqueta?: string; // apodo de UI ("Nomina", "Oro") - solo presentacion, no va a la BD
  credito?: CreditoTarjeta; // presente solo si tipo === 'credito'
}

/** Tipo de evento del calendario (recordatorios del usuario). */
export type TipoEvento = 'pago' | 'cobro' | 'recordatorio';

/**
 * Evento del calendario: recordatorio que crea el usuario (un pago que viene, un
 * cobro esperado). Feature de producto: extiende el contrato, ver ROADMAP.
 */
export interface EventoCalendario {
  id: string;
  fecha: string; // ISO date
  titulo: string;
  tipo: TipoEvento;
  monto?: number;
}

/** Un registro del buro de credito (HISTORIAL_BURO, historico por usuario). */
export interface RegistroBuro {
  fecha: string; // ISO date (fecha_consulta)
  score_crediticio: number; // 0-999
  dias_atraso: number;
  monto_adeudado: number;
}

/** Salud crediticia = ultimo registro + su evolucion (HISTORIAL_BURO). */
export interface SaludCrediticia {
  moneda: Moneda;
  actual: RegistroBuro;
  historial: RegistroBuro[]; // orden cronologico ascendente
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

/** Meta de ahorro (PLANES_AHORRO; icono/color son solo presentacion, no van a la BD). */
export interface MetaAhorro {
  id: string;
  nombre: string; // nombre_meta
  objetivo: number; // monto_meta
  ahorrado: number; // calculado (no se guarda): suma de aportes/transacciones
  moneda: Moneda;
  fecha_inicio?: string; // ISO date (fecha_inicio)
  fecha_limite?: string; // ISO date (fecha_fin)
  estado?: EstadoPlan; // estado_plan (ACTIVO/FINALIZADO/CANCELADO)
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
