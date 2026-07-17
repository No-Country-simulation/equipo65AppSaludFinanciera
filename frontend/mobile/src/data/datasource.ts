/**
 * La UNICA puerta de datos de las pantallas (ADR-0011).
 * Las pantallas importan esta interfaz via `@/data` - jamas `mock/` ni `api/`
 * directamente. Asi, borrar `mock/` + poner DATA_SOURCE=api no toca pantallas.
 */
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  ComparacionMensual,
  DatosExportados,
  Evolucion,
  FrecuenciaAhorro,
  MetaAhorro,
  Moneda,
  PaginaTransacciones,
  Presupuesto,
  ResultadoImport,
  ResumenAnalisis,
  Sesion,
  Transaccion,
  Usuario,
} from './types';

export interface AltaTransaccion {
  descripcion: string;
  valor: number;
  moneda?: Moneda;
  fecha?: string;
}

export interface FiltrosTransacciones {
  desde?: string;
  hasta?: string;
  categoria?: CategoriaSlug;
  pagina?: number;
  tam?: number;
}

export interface PatchUsuario {
  ingreso_mensual?: number;
  nivel_endeudamiento?: number;
  frecuencia_ahorro?: FrecuenciaAhorro;
  moneda_principal?: Moneda;
}

export interface AltaMeta {
  nombre: string;
  objetivo: number;
  ahorrado?: number;
  fecha_limite?: string;
  icono?: string;
  color?: string;
}

/**
 * Espejo de CONTRATO_API.md. La implementacion `api/` traduce cada metodo a su
 * endpoint; la `mock/` (temporal, se borra al integrar) lo simula en memoria.
 */
export interface FinanceDataSource {
  // §4 Auth
  login(email: string, password: string, codigoTotp?: string): Promise<Sesion>;
  /** `terminosVersion` registra la prueba de consentimiento del checkbox de T&C. */
  registro(
    email: string,
    password: string,
    monedaPrincipal: Moneda,
    terminosVersion?: string,
  ): Promise<Usuario>;
  logout(): Promise<void>;
  me(): Promise<Usuario>;
  actualizarPerfil(patch: PatchUsuario): Promise<Usuario>;
  iniciar2fa(): Promise<{ secreto: string; otpauth_uri: string }>;
  activar2fa(codigoTotp: string): Promise<{ codigos_respaldo: string[] }>;
  desactivar2fa(password: string): Promise<void>;
  /**
   * Re-vincula una sesion restaurada del almacenamiento del cliente (recarga de
   * pagina). Con la API real re-adjunta el token; en el mock rehidrata el estado
   * en memoria para que no quede desincronizado con el localStorage.
   */
  hidratarSesion(usuario: Usuario): void;

  // §5 Transacciones
  transacciones(filtros?: FiltrosTransacciones): Promise<PaginaTransacciones>;
  crearTransaccion(alta: AltaTransaccion): Promise<Transaccion>;
  corregirCategoria(id: string, categoria: CategoriaSlug): Promise<Transaccion>;
  eliminarTransaccion(id: string): Promise<void>;
  importarCsv(archivo: Blob): Promise<ResultadoImport>;

  // §6 Analisis
  ejecutarAnalisis(rango?: { desde?: string; hasta?: string }): Promise<Analisis>;
  historialAnalisis(pagina?: number, tam?: number): Promise<ResumenAnalisis[]>;
  obtenerAnalisis(id: string): Promise<Analisis>;
  /** El ultimo analisis persistido, o null si el usuario nunca analizo. */
  ultimoAnalisis(): Promise<Analisis | null>;
  evolucion(rango?: { desde?: string; hasta?: string }): Promise<Evolucion>;

  // §7 Operacion
  categorias(): Promise<Categoria[]>;
  monedas(): Promise<Moneda[]>;

  // Producto - features extra (extienden el contrato; ver ROADMAP)
  comparacionMensual(): Promise<ComparacionMensual>;
  metas(): Promise<MetaAhorro[]>;
  crearMeta(alta: AltaMeta): Promise<MetaAhorro>;
  aportarMeta(id: string, monto: number): Promise<MetaAhorro>;
  eliminarMeta(id: string): Promise<void>;
  presupuestos(): Promise<Presupuesto[]>;
  guardarPresupuesto(categoria: CategoriaSlug, limite: number): Promise<Presupuesto>;
  eliminarPresupuesto(categoria: CategoriaSlug): Promise<void>;

  // Derechos sobre los datos (ARCO/LGPD - extienden el contrato; ver ROADMAP)
  /** Portabilidad: descarga todos los datos del usuario en un JSON. */
  exportarDatos(): Promise<DatosExportados>;
  /** Baja definitiva de la cuenta y sus datos. Requiere confirmar con password. */
  eliminarCuenta(password: string): Promise<void>;
}
