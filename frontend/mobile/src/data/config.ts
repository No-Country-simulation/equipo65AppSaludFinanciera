/**
 * Unico archivo de la capa de datos que difiere entre mobile y web
 * (alli lee NEXT_PUBLIC_*). Todo lo demas de src/data es identico (ADR-0010/0011).
 * En el emulador Android, 10.0.2.2 es el localhost de la maquina anfitriona.
 *
 * La capa mock se retiro: la unica fuente de datos es la API real (ADR-0011,
 * "CERO datos mock en la demo/entrega"). Ya no hay flag EXPO_PUBLIC_DATA_SOURCE.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api/v1';

/**
 * Almacenamiento clave-valor del cliente (AsyncStorage aqui; localStorage en
 * web). API async para que ambas plataformas compartan el mismo consumidor.
 * Lo usa la capa de sesion para conservar los tokens entre reaperturas.
 */
export const almacenLocal = {
  obtener: (clave: string): Promise<string | null> => AsyncStorage.getItem(clave),
  guardar: (clave: string, valor: string): Promise<void> => AsyncStorage.setItem(clave, valor),
  eliminar: (clave: string): Promise<void> => AsyncStorage.removeItem(clave),
};
