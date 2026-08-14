/**
 * Unico archivo de la capa de datos que difiere entre web y mobile
 * (alli lee EXPO_PUBLIC_*). Todo lo demas de src/data es identico (ADR-0010/0011).
 *
 * La capa mock se retiro: la unica fuente de datos es la API real (ADR-0011,
 * "CERO datos mock en la demo/entrega"). Ya no hay flag NEXT_PUBLIC_DATA_SOURCE
 * ni rama alternativa: si la API no responde, la pantalla muestra el error y el
 * boton de reintentar, que es el comportamiento que se quiere.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Almacenamiento clave-valor del cliente (localStorage aqui; AsyncStorage en
 * mobile). API async para que ambas plataformas compartan el mismo consumidor.
 * Lo usa la capa de sesion para conservar los tokens entre recargas.
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

/**
 * Almacenamiento para lo que SI es un secreto (hoy: el refresh token).
 *
 * ⚠️ En el navegador no existe un llavero al que el JavaScript no llegue, asi
 * que aqui es el mismo `localStorage`: cualquier XSS puede leerlo. En movil si
 * es distinto -- alli este export usa `expo-secure-store`, el llavero del
 * sistema -- y por eso son dos exports y no uno.
 *
 * Lo correcto en web seria una cookie `HttpOnly; Secure; SameSite`, que el
 * JavaScript no puede leer, pero eso cambia el contrato de `/auth/login` y
 * `/auth/refresh` y toca CORS. Es una decision consciente y esta escrita:
 * ver `docs/adr/0015-tokens-en-el-cliente.md`.
 */
export const almacenSeguro = almacenLocal;
