/**
 * La UNICA puerta de datos de las pantallas (ADR-0011).
 * Las pantallas importan esta interfaz via `@/data`, jamas `api/` directamente.
 * Gracias a eso, retirar la capa mock no obligo a tocar ni una pantalla.
 */
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  Ciudad,
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
  /**
   * Categoria elegida a mano. OPCIONAL: si no viene, la clasifica el modelo,
   * que es la gracia del producto. Si viene, manda la persona y la API la
   * guarda como correccion suya (`categoria_origen = "usuario"`).
   */
  categoria?: CategoriaSlug;
  /**
   * Tarjeta con la que se pago. OPCIONAL: un movimiento puede no venir de
   * ninguna (efectivo, transferencia).
   *
   * Sin esto, `transaccion.tarjeta_id` quedaba SIEMPRE nulo en todo lo que se
   * daba de alta desde la aplicacion, y como el filtro por tarjeta y el "Ver
   * movimientos" de cada tarjeta leen esa columna, las dos cosas salian vacias
   * para cualquiera que no fuese un usuario de la semilla. La API ya lo
   * aceptaba y ya comprobaba que la tarjeta sea tuya (RN9); lo que faltaba era
   * mandarlo.
   */
  id_tarjeta?: string;
  /** Nombre del comercio. La lista de movimientos ya lo pinta cuando viene. */
  comercio?: string;
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
  /**
   * NOMBRE de una ciudad del catalogo (`ciudades()`), no texto libre: en la BD
   * es una FK. Si no esta en el catalogo, la API responde 422 sobre `ciudad`.
   */
  ciudad?: string;
  /**
   * Idioma con el que la persona se registro. Si no se manda, la cuenta queda
   * en `es` aunque el alta se hiciera en /pt o /en, y el idioma se pierde al
   * entrar desde otro dispositivo.
   */
  idioma?: Idioma;
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
 * endpoint. Es la unica que queda: la capa mock se elimino.
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
   * pagina en web, reapertura de la app en movil). Re-adjunta el par de tokens
   * al cliente HTTP para que las peticiones siguientes vayan autenticadas.
   *
   * Devuelve una promesa porque el almacenamiento es async en las dos
   * plataformas. Hay que ESPERARLA antes de marcar la sesion como lista: si no,
   * las primeras llamadas salen sin token y la pantalla parpadea vacia.
   */
  hidratarSesion(usuario: Usuario): Promise<void>;

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
  /** Catalogo de ciudades del alta. Publico: el registro lo pide sin token. */
  ciudades(): Promise<Ciudad[]>;

  // Banca (CUENTAS_BANCARIAS, TARJETAS, HISTORIAL_BURO) - el banco YA tiene estos datos
  cuentas(): Promise<CuentaBancaria[]>;
  tarjetas(): Promise<Tarjeta[]>;
  saludCrediticia(): Promise<SaludCrediticia>;
  /**
   * Alta de una consulta de buro SIMULADA.
   *
   * Existe porque el proyecto no se conecta a un buro real (esta en el
   * anti-alcance) y sin esto la pantalla de Salud crediticia esta vacia para
   * siempre en cualquier cuenta nueva. El usuario lo toma la API del token.
   */
  simularBuro(datos: { score: number; atraso: number; deuda: number }): Promise<void>;
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
