/**
 * Implementacion REAL contra la API publica (CONTRATO_API.md).
 * Es la unica implementacion de la capa de datos: la carpeta ../mock se elimino.
 */
import type {
  AltaEvento,
  AltaMeta,
  AltaTarjeta,
  AltaTransaccion,
  AltaUsuario,
  FiltrosTransacciones,
  FinanceDataSource,
  PatchUsuario,
} from '../datasource';
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  ComparacionMensual,
  CuentaBancaria,
  DatosExportados,
  EventoCalendario,
  Evolucion,
  ErrorApi,
  Idioma,
  MetaAhorro,
  Moneda,
  PaginaTransacciones,
  Presupuesto,
  ResultadoImport,
  ResumenAnalisis,
  SaludCrediticia,
  Sesion,
  Tarjeta,
  Transaccion,
  Usuario,
} from '../types';
import { FinanceApiError } from '../types';
import {
  cargarTokens,
  getAccessToken,
  getRefreshToken,
  guardarTokens,
  limpiarTokens,
} from './token';

interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
  /** Uso interno: corta el bucle de reintento tras refrescar. */
  yaReintentada?: boolean;
}

/**
 * Refresco en curso, COMPARTIDO por todas las peticiones.
 *
 * Es una variable de modulo y no de instancia a proposito: hay una
 * `ApiDataSource` por idioma y el par de tokens es uno solo. Movimientos lanza
 * cuatro peticiones a la vez; si el access token acaba de caducar, las cuatro
 * dan 401 a la vez. Sin esto se dispararian cuatro refrescos, y como el refresh
 * es ROTATIVO el primero invalidaria el token de los otros tres: se cerraria la
 * sesion sola justo cuando habia que renovarla.
 */
let refrescoEnCurso: Promise<boolean> | null = null;

export class ApiDataSource implements FinanceDataSource {
  constructor(
    private readonly baseUrl: string,
    private readonly idioma: Idioma,
  ) {}

  private async pedir<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    const { method = 'GET', body, auth = true, formData, yaReintentada = false } = opciones;
    const headers: Record<string, string> = { 'Accept-Language': this.idioma };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const respuesta = await fetch(`${this.baseUrl}${ruta}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });

    // El access token dura 15 min: en cualquier sesion normal caduca mientras
    // se usa la app. Se renueva y se reintenta UNA vez; si el refresco tampoco
    // vale, el 401 se propaga y la pantalla manda a iniciar sesion.
    if (respuesta.status === 401 && auth && !yaReintentada && getRefreshToken()) {
      if (await this.refrescar()) {
        return this.pedir<T>(ruta, { ...opciones, yaReintentada: true });
      }
    }

    if (!respuesta.ok) {
      const error: ErrorApi = await respuesta.json().catch(() => ({
        codigo: 'ERROR_DESCONOCIDO',
        mensaje: `HTTP ${respuesta.status}`,
        detalles: [],
        traza_id: '',
      }));
      throw new FinanceApiError(error, respuesta.status);
    }
    if (respuesta.status === 204) return undefined as T;
    return (await respuesta.json()) as T;
  }

  /**
   * Renueva el par de tokens. Si ya hay un refresco en marcha, se espera a ese
   * en vez de lanzar otro.
   *
   * No usa `pedir()` para evitar la recursion: un refresco que respondiera 401
   * intentaria refrescarse a si mismo.
   */
  private async refrescar(): Promise<boolean> {
    if (refrescoEnCurso) return refrescoEnCurso;

    refrescoEnCurso = (async () => {
      try {
        const respuesta = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept-Language': this.idioma },
          body: JSON.stringify({ refresh_token: getRefreshToken() }),
        });
        if (!respuesta.ok) {
          // El refresh caduco o ya se uso: la sesion se acabo de verdad.
          await limpiarTokens();
          return false;
        }
        const sesion = (await respuesta.json()) as Sesion;
        await guardarTokens(sesion.access_token, sesion.refresh_token);
        return true;
      } catch {
        // Un fallo de red no es una sesion invalida: se conservan los tokens
        // para que el siguiente intento pueda funcionar.
        return false;
      } finally {
        refrescoEnCurso = null;
      }
    })();

    return refrescoEnCurso;
  }

  async login(email: string, password: string, codigoTotp?: string): Promise<Sesion> {
    const sesion = await this.pedir<Sesion>('/auth/login', {
      method: 'POST',
      body: { email, password, ...(codigoTotp ? { codigo_totp: codigoTotp } : {}) },
      auth: false,
    });
    if (!sesion.requiere_2fa) await guardarTokens(sesion.access_token, sesion.refresh_token);
    return sesion;
  }

  registro(alta: AltaUsuario): Promise<Usuario> {
    // Cuerpo ya en snake_case (email, password, moneda_principal, nombre, apellido,
    // fecha_nacimiento, genero?, telefono?, ciudad?, terminos_version?).
    return this.pedir<Usuario>('/auth/registro', { method: 'POST', body: alta, auth: false });
  }

  async logout(): Promise<void> {
    try {
      await this.pedir<void>('/auth/logout', {
        method: 'POST',
        body: { refresh_token: getRefreshToken() },
      });
    } finally {
      // Los tokens se borran del dispositivo pase lo que pase: si la llamada
      // falla y se conservaran, la sesion seguiria viva en el cliente despues
      // de que la persona pulsara "Cerrar sesion".
      await limpiarTokens();
    }
  }

  me(): Promise<Usuario> {
    return this.pedir<Usuario>('/usuarios/me');
  }

  actualizarPerfil(patch: PatchUsuario): Promise<Usuario> {
    return this.pedir<Usuario>('/usuarios/me', { method: 'PATCH', body: patch });
  }

  iniciar2fa(): Promise<{ secreto: string; otpauth_uri: string }> {
    return this.pedir('/auth/2fa/iniciar', { method: 'POST' });
  }

  activar2fa(codigoTotp: string): Promise<{ codigos_respaldo: string[] }> {
    return this.pedir('/auth/2fa/activar', {
      method: 'POST',
      body: { codigo_totp: codigoTotp },
    });
  }

  regenerarCodigos2fa(): Promise<{ codigos_respaldo: string[] }> {
    // Endpoint TBD (2FA obligatorio; regenerar codigos de respaldo). Ver ROADMAP.
    return this.pedir('/auth/2fa/codigos-respaldo', { method: 'POST' });
  }

  desactivar2fa(password: string): Promise<void> {
    return this.pedir<void>('/auth/2fa', { method: 'DELETE', body: { password } });
  }

  /**
   * Re-adjunta el par de tokens guardado tras recargar la pagina (web) o
   * reabrir la app (movil).
   *
   * Es async porque el almacenamiento lo es en las dos plataformas
   * (AsyncStorage / SecureStore en movil). Quien la llama tiene que ESPERARLA
   * antes de dar la sesion por lista: si no, las primeras peticiones salen sin
   * Authorization y la pantalla se pinta vacia antes de tener token.
   */
  async hidratarSesion(): Promise<void> {
    await cargarTokens();
  }

  transacciones(filtros: FiltrosTransacciones = {}): Promise<PaginaTransacciones> {
    const query = new URLSearchParams();
    if (filtros.desde) query.set('desde', filtros.desde);
    if (filtros.hasta) query.set('hasta', filtros.hasta);
    if (filtros.categoria) query.set('categoria', filtros.categoria);
    if (filtros.tarjeta) query.set('tarjeta', filtros.tarjeta);
    if (filtros.pagina !== undefined) query.set('pagina', String(filtros.pagina));
    if (filtros.tam !== undefined) query.set('tam', String(filtros.tam));
    const sufijo = query.size > 0 ? `?${query}` : '';
    return this.pedir<PaginaTransacciones>(`/transacciones${sufijo}`);
  }

  crearTransaccion(alta: AltaTransaccion): Promise<Transaccion> {
    return this.pedir<Transaccion>('/transacciones', { method: 'POST', body: alta });
  }

  corregirCategoria(id: string, categoria: CategoriaSlug): Promise<Transaccion> {
    return this.pedir<Transaccion>(`/transacciones/${id}`, {
      method: 'PATCH',
      body: { categoria },
    });
  }

  eliminarTransaccion(id: string): Promise<void> {
    return this.pedir<void>(`/transacciones/${id}`, { method: 'DELETE' });
  }

  importarCsv(archivo: Blob): Promise<ResultadoImport> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.pedir<ResultadoImport>('/transacciones/importar', {
      method: 'POST',
      formData,
    });
  }

  ejecutarAnalisis(rango: { desde?: string; hasta?: string } = {}): Promise<Analisis> {
    return this.pedir<Analisis>('/analisis', { method: 'POST', body: rango });
  }

  /** `pagina` es 0-based, como en la API (Spring). La primera es la 0, no la 1. */
  historialAnalisis(pagina = 0, tam = 12): Promise<ResumenAnalisis[]> {
    return this.pedir<ResumenAnalisis[]>(`/analisis?pagina=${pagina}&tam=${tam}`);
  }

  obtenerAnalisis(id: string): Promise<Analisis> {
    return this.pedir<Analisis>(`/analisis/${id}`);
  }

  async ultimoAnalisis(): Promise<Analisis | null> {
    const historial = await this.historialAnalisis(0, 1);
    if (historial.length === 0) return null;
    return this.obtenerAnalisis(historial[0].id);
  }

  evolucion(rango: { desde?: string; hasta?: string } = {}): Promise<Evolucion> {
    const query = new URLSearchParams();
    if (rango.desde) query.set('desde', rango.desde);
    if (rango.hasta) query.set('hasta', rango.hasta);
    const sufijo = query.size > 0 ? `?${query}` : '';
    return this.pedir<Evolucion>(`/analisis/evolucion${sufijo}`);
  }

  categorias(): Promise<Categoria[]> {
    return this.pedir<Categoria[]>('/categorias', { auth: false });
  }

  async monedas(): Promise<Moneda[]> {
    const respuesta = await this.pedir<{ monedas: { codigo: Moneda }[] }>('/monedas', {
      auth: false,
    });
    return respuesta.monedas.map((moneda) => moneda.codigo);
  }

  // Banca (endpoints TBD, ver ROADMAP: CUENTAS_BANCARIAS, TARJETAS, HISTORIAL_BURO)
  cuentas(): Promise<CuentaBancaria[]> {
    return this.pedir<CuentaBancaria[]>('/cuentas');
  }

  tarjetas(): Promise<Tarjeta[]> {
    return this.pedir<Tarjeta[]>('/tarjetas');
  }

  saludCrediticia(): Promise<SaludCrediticia> {
    return this.pedir<SaludCrediticia>('/buro/salud');
  }

  crearTarjeta(alta: AltaTarjeta): Promise<Tarjeta> {
    return this.pedir<Tarjeta>('/tarjetas', { method: 'POST', body: alta });
  }

  actualizarTarjeta(id: string, cambios: Partial<AltaTarjeta>): Promise<Tarjeta> {
    return this.pedir<Tarjeta>(`/tarjetas/${id}`, { method: 'PATCH', body: cambios });
  }

  eliminarTarjeta(id: string): Promise<void> {
    return this.pedir<void>(`/tarjetas/${id}`, { method: 'DELETE' });
  }

  // Eventos del calendario (endpoints TBD, ver ROADMAP)
  eventos(): Promise<EventoCalendario[]> {
    return this.pedir<EventoCalendario[]>('/eventos');
  }

  crearEvento(alta: AltaEvento): Promise<EventoCalendario> {
    return this.pedir<EventoCalendario>('/eventos', { method: 'POST', body: alta });
  }

  actualizarEvento(id: string, cambios: Partial<AltaEvento>): Promise<EventoCalendario> {
    return this.pedir<EventoCalendario>(`/eventos/${id}`, { method: 'PATCH', body: cambios });
  }

  eliminarEvento(id: string): Promise<void> {
    return this.pedir<void>(`/eventos/${id}`, { method: 'DELETE' });
  }

  // Producto - features extra (endpoints TBD, ver ROADMAP)
  comparacionMensual(): Promise<ComparacionMensual> {
    return this.pedir<ComparacionMensual>('/resumen/comparacion');
  }

  metas(): Promise<MetaAhorro[]> {
    return this.pedir<MetaAhorro[]>('/metas');
  }

  crearMeta(alta: AltaMeta): Promise<MetaAhorro> {
    return this.pedir<MetaAhorro>('/metas', { method: 'POST', body: alta });
  }

  aportarMeta(id: string, monto: number): Promise<MetaAhorro> {
    return this.pedir<MetaAhorro>(`/metas/${id}/aportes`, { method: 'POST', body: { monto } });
  }

  eliminarMeta(id: string): Promise<void> {
    return this.pedir<void>(`/metas/${id}`, { method: 'DELETE' });
  }

  presupuestos(): Promise<Presupuesto[]> {
    return this.pedir<Presupuesto[]>('/presupuestos');
  }

  guardarPresupuesto(categoria: CategoriaSlug, limite: number): Promise<Presupuesto> {
    return this.pedir<Presupuesto>('/presupuestos', {
      method: 'POST',
      body: { categoria, limite },
    });
  }

  eliminarPresupuesto(categoria: CategoriaSlug): Promise<void> {
    return this.pedir<void>(`/presupuestos/${categoria}`, { method: 'DELETE' });
  }

  // Derechos sobre los datos (endpoints TBD, ver ROADMAP)
  exportarDatos(): Promise<DatosExportados> {
    return this.pedir<DatosExportados>('/usuarios/me/exportacion');
  }

  async eliminarCuenta(password: string): Promise<void> {
    await this.pedir<void>('/usuarios/me', { method: 'DELETE', body: { password } });
    await limpiarTokens();
  }
}
