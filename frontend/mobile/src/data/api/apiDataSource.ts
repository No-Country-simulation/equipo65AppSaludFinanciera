/**
 * Implementacion REAL contra la API publica (CONTRATO_API.md).
 * Esta carpeta QUEDA despues de la integracion; la que se borra es ../mock.
 */
import type {
  AltaMeta,
  AltaTransaccion,
  FiltrosTransacciones,
  FinanceDataSource,
  PatchUsuario,
} from '../datasource';
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  ComparacionMensual,
  DatosExportados,
  Evolucion,
  ErrorApi,
  Idioma,
  MetaAhorro,
  Moneda,
  PaginaTransacciones,
  Presupuesto,
  ResultadoImport,
  ResumenAnalisis,
  Sesion,
  Transaccion,
  Usuario,
} from '../types';
import { FinanceApiError } from '../types';
import { getAccessToken, getRefreshToken, setTokens } from './token';

interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
}

export class ApiDataSource implements FinanceDataSource {
  constructor(
    private readonly baseUrl: string,
    private readonly idioma: Idioma,
  ) {}

  private async pedir<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    const { method = 'GET', body, auth = true, formData } = opciones;
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

  async login(email: string, password: string, codigoTotp?: string): Promise<Sesion> {
    const sesion = await this.pedir<Sesion>('/auth/login', {
      method: 'POST',
      body: { email, password, ...(codigoTotp ? { codigo_totp: codigoTotp } : {}) },
      auth: false,
    });
    if (!sesion.requiere_2fa) setTokens(sesion.access_token, sesion.refresh_token);
    return sesion;
  }

  registro(
    email: string,
    password: string,
    monedaPrincipal: Moneda,
    terminosVersion?: string,
  ): Promise<Usuario> {
    return this.pedir<Usuario>('/auth/registro', {
      method: 'POST',
      body: {
        email,
        password,
        moneda_principal: monedaPrincipal,
        // Prueba de consentimiento - campo extra pendiente de ADR (ver ROADMAP)
        ...(terminosVersion ? { terminos_version: terminosVersion } : {}),
      },
      auth: false,
    });
  }

  async logout(): Promise<void> {
    await this.pedir<void>('/auth/logout', {
      method: 'POST',
      body: { refresh_token: getRefreshToken() },
    });
    setTokens(null, null);
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

  desactivar2fa(password: string): Promise<void> {
    return this.pedir<void>('/auth/2fa', { method: 'DELETE', body: { password } });
  }

  hidratarSesion(): void {
    // La API real usa el token (Authorization). Si en el futuro se persiste el
    // refresh token, aqui se re-adjunta; por ahora no-op.
  }

  transacciones(filtros: FiltrosTransacciones = {}): Promise<PaginaTransacciones> {
    const query = new URLSearchParams();
    if (filtros.desde) query.set('desde', filtros.desde);
    if (filtros.hasta) query.set('hasta', filtros.hasta);
    if (filtros.categoria) query.set('categoria', filtros.categoria);
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

  historialAnalisis(pagina = 1, tam = 12): Promise<ResumenAnalisis[]> {
    return this.pedir<ResumenAnalisis[]>(`/analisis?pagina=${pagina}&tam=${tam}`);
  }

  obtenerAnalisis(id: string): Promise<Analisis> {
    return this.pedir<Analisis>(`/analisis/${id}`);
  }

  async ultimoAnalisis(): Promise<Analisis | null> {
    const historial = await this.historialAnalisis(1, 1);
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
    setTokens(null, null);
  }
}
