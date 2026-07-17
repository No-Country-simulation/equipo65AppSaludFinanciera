/**
 * Unico archivo de la capa de datos que difiere entre web y mobile
 * (alli lee EXPO_PUBLIC_*). Todo lo demas de src/data es identico (ADR-0010/0011).
 */
export type ModoDatos = 'mock' | 'api';

export const DATA_SOURCE: ModoDatos =
  process.env.NEXT_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Almacenamiento clave-valor del cliente (localStorage aqui; AsyncStorage en
 * mobile). API async para que ambas plataformas compartan el mismo consumidor.
 * Hoy lo usa el mock para sobrevivir a la recarga (F6.11); con la API real el
 * dato vive en el backend y este adaptador queda sin uso desde el mock.
 */
export const almacenLocal = {
  async obtener(clave: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(clave);
  },
  async guardar(clave: string, valor: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(clave, valor);
  },
  async eliminar(clave: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(clave);
  },
};
