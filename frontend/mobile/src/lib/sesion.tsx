/** Sesion persistida en el dispositivo (AsyncStorage): la sesion se mantiene
 *  entre reaperturas de la app, igual que en la web. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDataSource, setAuthTokens, type Usuario } from '@/data';
import { useI18n } from '@/i18n';

const CLAVE_SESION = 'fintechvital.sesion';

interface ContextoSesion {
  usuario: Usuario | null;
  listo: boolean;
  iniciarSesion: (usuario: Usuario, tokens?: { access: string; refresh: string }) => void;
  actualizarUsuario: (usuario: Usuario) => void;
  cerrarSesion: () => void;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const { idioma } = useI18n();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  /**
   * Restaura la sesion al abrir la app.
   *
   * ⚠️ `listo` se pone a true DESPUES de hidratar. El refresh token vive en el
   * llavero del sistema y leerlo es async: marcarlo listo antes haria que las
   * pantallas pidieran datos sin Authorization, se llevaran un 401 y se
   * pintaran vacias con la sesion aparentemente iniciada.
   */
  useEffect(() => {
    let activo = true;

    (async () => {
      let restaurado: Usuario | null = null;
      try {
        const crudo = await AsyncStorage.getItem(CLAVE_SESION);
        if (crudo) {
          restaurado = JSON.parse(crudo) as Usuario;
          await getDataSource(idioma).hidratarSesion(restaurado);
        }
      } catch {
        await AsyncStorage.removeItem(CLAVE_SESION);
        restaurado = null;
      }
      if (!activo) return;
      if (restaurado) setUsuario(restaurado);
      setListo(true);

      // La ficha guardada es una FOTO del momento en que se entro. Si desde
      // entonces la API empezo a devolver campos nuevos -o cambiaron desde otro
      // dispositivo-, el perfil seguiria pintando la copia vieja para siempre.
      // Se refresca en segundo plano: no bloquea el primer pintado y, si la API
      // no responde, la sesion se queda con lo que habia en vez de caerse.
      if (restaurado) {
        try {
          const alDia = await getDataSource(idioma).me();
          if (activo) {
            void AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(alDia));
            setUsuario(alDia);
          }
        } catch {
          /* sin red o token caducado: se conserva la copia local */
        }
      }
    })();

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistir = useCallback((nuevo: Usuario) => {
    void AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(nuevo));
  }, []);

  const iniciarSesion = useCallback(
    (nuevo: Usuario, tokens?: { access: string; refresh: string }) => {
      if (tokens) void setAuthTokens(tokens.access, tokens.refresh);
      persistir(nuevo);
      setUsuario(nuevo);
    },
    [persistir],
  );

  const actualizarUsuario = useCallback(
    (nuevo: Usuario) => {
      persistir(nuevo);
      setUsuario(nuevo);
    },
    [persistir],
  );

  const cerrarSesion = useCallback(() => {
    void setAuthTokens(null, null);
    void AsyncStorage.removeItem(CLAVE_SESION);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, listo, iniciarSesion, actualizarUsuario, cerrarSesion }),
    [usuario, listo, iniciarSesion, actualizarUsuario, cerrarSesion],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion requiere SesionProvider');
  return contexto;
}
