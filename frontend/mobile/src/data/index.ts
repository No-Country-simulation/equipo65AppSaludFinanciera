/**
 * Punto de entrada de la capa de datos (ADR-0011).
 * Las pantallas SOLO importan de aqui: `import { getDataSource } from '@/data'`.
 */
import { DATA_SOURCE, API_URL } from './config';
import { ApiDataSource } from './api/apiDataSource';
import { setTokens } from './api/token';
import type { FinanceDataSource } from './datasource';
import type { Idioma } from './types';
// MOCK: quitar este import al integrar (junto con la carpeta ./mock)
import { crearMockDataSource } from './mock/mockDataSource';

const cache = new Map<Idioma, FinanceDataSource>();

export function getDataSource(idioma: Idioma): FinanceDataSource {
  const existente = cache.get(idioma);
  if (existente) return existente;
  const instancia: FinanceDataSource =
    DATA_SOURCE === 'api'
      ? new ApiDataSource(API_URL, idioma)
      : // MOCK: al integrar, esta rama desaparece - queda solo ApiDataSource
        crearMockDataSource(idioma);
  cache.set(idioma, instancia);
  return instancia;
}

/** La capa de sesion guarda aqui los tokens del login (no-op en modo mock). */
export function setAuthTokens(access: string | null, refresh: string | null): void {
  setTokens(access, refresh);
}

export { DATA_SOURCE } from './config';
export * from './types';
export type { FinanceDataSource, AltaTransaccion, AltaMeta, FiltrosTransacciones, PatchUsuario } from './datasource';
