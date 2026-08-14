/**
 * Unico archivo de la capa de datos que difiere entre mobile y web
 * (alli lee NEXT_PUBLIC_*). Todo lo demas de src/data es identico (ADR-0010/0011).
 * En el emulador Android, 10.0.2.2 es el localhost de la maquina anfitriona.
 *
 * La capa mock se retiro: la unica fuente de datos es la API real (ADR-0011,
 * "CERO datos mock en la demo/entrega"). Ya no hay flag EXPO_PUBLIC_DATA_SOURCE.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

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

/**
 * Almacenamiento para lo que SI es un secreto (hoy: el refresh token).
 *
 * Aqui es el LLAVERO DEL SISTEMA (Keychain en iOS, Keystore en Android) via
 * `expo-secure-store`, no AsyncStorage: AsyncStorage es un archivo en claro
 * dentro del sandbox de la app, legible en un dispositivo con root. En web este
 * mismo export es `localStorage` porque el navegador no ofrece nada mejor;
 * ver `docs/adr/0015-tokens-en-el-cliente.md`.
 *
 * ⚠️ `expo-secure-store` es un modulo NATIVO: hace falta reconstruir el dev
 * build (`npx expo run:android`), no basta con recargar el bundle.
 *
 * Las claves de SecureStore solo admiten [A-Za-z0-9._-], asi que se normalizan:
 * el punto vale, pero se filtra igualmente por si la clave cambia.
 */
const clavesValidas = (clave: string): string => clave.replace(/[^A-Za-z0-9._-]/g, '_');

export const almacenSeguro = {
  obtener: (clave: string): Promise<string | null> =>
    SecureStore.getItemAsync(clavesValidas(clave)),
  guardar: (clave: string, valor: string): Promise<void> =>
    SecureStore.setItemAsync(clavesValidas(clave), valor),
  eliminar: (clave: string): Promise<void> =>
    SecureStore.deleteItemAsync(clavesValidas(clave)),
};
