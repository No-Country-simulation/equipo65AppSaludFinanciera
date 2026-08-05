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
