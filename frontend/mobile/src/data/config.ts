/**
 * Unico archivo de la capa de datos que difiere entre mobile y web
 * (alli lee NEXT_PUBLIC_*). Todo lo demas de src/data es identico (ADR-0010/0011).
 * En el emulador Android, 10.0.2.2 es el localhost de la maquina anfitriona.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ModoDatos = 'mock' | 'api';

export const DATA_SOURCE: ModoDatos =
  process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api/v1';

/**
 * Almacenamiento clave-valor del cliente (AsyncStorage aqui; localStorage en
 * web). API async para que ambas plataformas compartan el mismo consumidor.
 * Hoy lo usa el mock para sobrevivir a la reapertura (F6.11); con la API real
 * el dato vive en el backend y este adaptador queda sin uso desde el mock.
 */
export const almacenLocal = {
  obtener: (clave: string): Promise<string | null> => AsyncStorage.getItem(clave),
  guardar: (clave: string, valor: string): Promise<void> => AsyncStorage.setItem(clave, valor),
  eliminar: (clave: string): Promise<void> => AsyncStorage.removeItem(clave),
};
