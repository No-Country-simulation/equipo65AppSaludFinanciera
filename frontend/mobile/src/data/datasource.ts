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
  CuentaBancaria,
  DatosExportados,
  EventoCalendario,
  EstadoBancario,
  Evolucion,
  FrecuenciaAhorro,
  Idioma,
  MetaAhorro,
  Moneda,
  PaginaTransacciones,
  Presupuesto,
  RedPago,
  ResultadoImport,
  ResumenAnalisis,
  SaludCrediticia,
  Sesion,
  Tarjeta,
  TipoEvento,
  TipoTarjeta,
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
  tarjeta?: string; // id_tarjeta - filtrar los movimientos de una tarjeta
  pagina?: number;
  tam?: number;
}

export interface PatchUsuario {
  ingreso_mensual?: number;
  nivel_endeudamiento?: number;
  frecuencia_ahorro?: FrecuenciaAhorro;
  moneda_principal?: Moneda;
  idioma?: Idioma; // preferencia de idioma persistida (cross-device)
}

/** Alta de usuario (USUARIOS: nombre/apellido/fecha_nacimiento son NOT NULL en la BD). */
export interface AltaUsuario {
  email: string;
  password: string;
  moneda_principal: Moneda;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // ISO date
  genero?: 'M' | 'F';
  telefono?: string;
  ciudad?: string;
  terminos_version?: string;
}

/** Alta/edicion de un evento del calendario. */
export interface AltaEvento {
  fecha: string;
  titulo: string;
  tipo: TipoEvento;
  monto?: number;
}

/** Alta/edicion de tarjeta (CRUD). `credito` solo cuando tipo === 'credito'. */
export interface AltaTarjeta {
  id_cuenta: string;
  tipo: TipoTarjeta;
  red_pago: RedPago;
  ultimos4: string;
  fecha_vencimiento: string; // 'YYYY-MM'
  etiqueta?: string;
  estado?: EstadoBancario;
  credito?: { limite_credito: number; dia_corte: number; dia_pago: number };
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
  /** Alta con datos personales (los exige USUARIOS). `terminos_version` = prueba de consentimiento. */
  registro(alta: AltaUsuario): Promise<Usuario>;
  logout(): Promise<void>;
  me(): Promise<Usuario>;
  actualizarPerfil(patch: PatchUsuario): Promise<Usuario>;
  iniciar2fa(): Promise<{ secreto: string; otpauth_uri: string }>;
  activar2fa(codigoTotp: string): Promise<{ codigos_respaldo: string[] }>;
  /** Regenera los codigos de respaldo (unica accion 2FA del perfil: es obligatorio, no se desactiva). */
  regenerarCodigos2fa(): Promise<{ codigos_respaldo: string[] }>;
  /** Se conserva por el contrato (DELETE /auth/2fa); la UI ya NO lo expone (2FA obligatorio). */
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

  // Banca (CUENTAS_BANCARIAS, TARJETAS, HISTORIAL_BURO) - el banco YA tiene estos datos
  cuentas(): Promise<CuentaBancaria[]>;
  tarjetas(): Promise<Tarjeta[]>;
  saludCrediticia(): Promise<SaludCrediticia>;
  // CRUD de tarjetas
  crearTarjeta(alta: AltaTarjeta): Promise<Tarjeta>;
  actualizarTarjeta(id: string, cambios: Partial<AltaTarjeta>): Promise<Tarjeta>;
  eliminarTarjeta(id: string): Promise<void>;

  // CRUD de eventos del calendario (recordatorios del usuario)
  eventos(): Promise<EventoCalendario[]>;
  crearEvento(alta: AltaEvento): Promise<EventoCalendario>;
  actualizarEvento(id: string, cambios: Partial<AltaEvento>): Promise<EventoCalendario>;
  eliminarEvento(id: string): Promise<void>;

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
