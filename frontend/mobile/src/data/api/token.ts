/**
 * El par de tokens de la sesion: en memoria para cada peticion, y persistido
 * para que sobreviva a recargar la pagina (web) o reabrir la app (movil).
 *
 * Antes vivian SOLO en estas dos variables de modulo. El resultado era el peor
 * de los dos mundos: al recargar, la ficha del usuario seguia en el
 * almacenamiento -- el menu se pintaba, el nombre estaba -- pero el JWT se
 * habia perdido, asi que todas las llamadas respondian 401 y las pantallas
 * salian vacias sin mandar a iniciar sesion de nuevo.
 *
 * ⚠️ El access token va en `almacenLocal` y el refresh en `almacenSeguro`.
 * En movil eso es el llavero del sistema (expo-secure-store); en web los dos
 * son `localStorage`, con el riesgo que eso implica y por el motivo que explica
 * la ADR-0015.
 */
import { almacenLocal, almacenSeguro } from '../config';

const CLAVE_ACCESS = 'fintechvital.token.access';
const CLAVE_REFRESH = 'fintechvital.token.refresh';

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Solo memoria. Lo usa el refresco, que persiste aparte con `guardarTokens`. */
export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

/** Memoria + almacenamiento. Es lo que hay que llamar al iniciar sesion y al refrescar. */
export async function guardarTokens(access: string | null, refresh: string | null): Promise<void> {
  setTokens(access, refresh);
  await Promise.all([
    access ? almacenLocal.guardar(CLAVE_ACCESS, access) : almacenLocal.eliminar(CLAVE_ACCESS),
    refresh ? almacenSeguro.guardar(CLAVE_REFRESH, refresh) : almacenSeguro.eliminar(CLAVE_REFRESH),
  ]);
}

/**
 * Recupera el par guardado y lo vuelve a poner en memoria. Devuelve si habia
 * algo que recuperar, para que quien hidrata sepa si sigue habiendo sesion.
 */
export async function cargarTokens(): Promise<boolean> {
  const [access, refresh] = await Promise.all([
    almacenLocal.obtener(CLAVE_ACCESS),
    almacenSeguro.obtener(CLAVE_REFRESH),
  ]);
  setTokens(access, refresh);
  return Boolean(access ?? refresh);
}

export async function limpiarTokens(): Promise<void> {
  setTokens(null, null);
  await Promise.all([
    almacenLocal.eliminar(CLAVE_ACCESS),
    almacenSeguro.eliminar(CLAVE_REFRESH),
  ]);
}
