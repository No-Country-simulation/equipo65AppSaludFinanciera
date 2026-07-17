/** Sesion persistida en el dispositivo (AsyncStorage): la sesion se mantiene
 *  entre reaperturas de la app, igual que en la web. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDataSource, setAuthTokens, type Usuario } from '@/data';
import { useI18n } from '@/i18n';

const CLAVE_SESION = 'financeai.sesion';

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

  useEffect(() => {
    let activo = true;
    AsyncStorage.getItem(CLAVE_SESION)
      .then((crudo) => {
        if (!activo) return;
        if (crudo) {
          const restaurado = JSON.parse(crudo) as Usuario;
          // rehidratar el datasource (el mock pierde su estado al reabrir)
          getDataSource(idioma).hidratarSesion(restaurado);
          setUsuario(restaurado);
        }
      })
      .catch(() => AsyncStorage.removeItem(CLAVE_SESION))
      .finally(() => {
        if (activo) setListo(true);
      });
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
      if (tokens) setAuthTokens(tokens.access, tokens.refresh);
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
    setAuthTokens(null, null);
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
