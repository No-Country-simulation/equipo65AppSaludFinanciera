/**
 * Punto de entrada de la capa de datos (ADR-0011).
 * Las pantallas SOLO importan de aqui: `import { getDataSource } from '@/data'`.
 *
 * La capa mock se elimino: `ApiDataSource` es la unica implementacion. La
 * indireccion se conserva porque sigue siendo util (cachea una instancia por
 * idioma y aisla a las pantallas del transporte HTTP).
 */
import { API_URL } from './config';
import { ApiDataSource } from './api/apiDataSource';
import { guardarTokens, limpiarTokens } from './api/token';
import type { FinanceDataSource } from './datasource';
import type { Idioma } from './types';

const cache = new Map<Idioma, FinanceDataSource>();

export function getDataSource(idioma: Idioma): FinanceDataSource {
  const existente = cache.get(idioma);
  if (existente) return existente;
  const instancia: FinanceDataSource = new ApiDataSource(API_URL, idioma);
  cache.set(idioma, instancia);
  return instancia;
}

/**
 * La capa de sesion guarda aqui los tokens del login.
 *
 * Ademas de dejarlos en memoria los PERSISTE, que es lo que hace que la sesion
 * sobreviva a un F5 o a cerrar la app. Con `null` los borra (cerrar sesion).
 */
export function setAuthTokens(access: string | null, refresh: string | null): Promise<void> {
  return access === null && refresh === null
    ? limpiarTokens()
    : guardarTokens(access, refresh);
}

export { API_URL } from './config';
export * from './types';
export type {
  FinanceDataSource,
  AltaTransaccion,
  AltaMeta,
  AltaEvento,
  AltaTarjeta,
  AltaUsuario,
  FiltrosTransacciones,
  PatchUsuario,
} from './datasource';
