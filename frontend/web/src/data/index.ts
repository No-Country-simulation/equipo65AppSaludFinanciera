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
import { setTokens } from './api/token';
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

/** La capa de sesion guarda aqui los tokens del login. */
export function setAuthTokens(access: string | null, refresh: string | null): void {
  setTokens(access, refresh);
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
