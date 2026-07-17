'use client';

/** Sesion del lado del cliente. Con la API real ademas viajan los JWT (setAuthTokens). */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocale } from 'next-intl';
import { getDataSource, setAuthTokens, type Idioma, type Usuario } from '@/data';

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
  const locale = useLocale() as Idioma;
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const crudo = window.localStorage.getItem(CLAVE_SESION);
      if (crudo) {
        const restaurado = JSON.parse(crudo) as Usuario;
        // Re-vincular la sesion con el datasource (el mock perdio su estado al recargar)
        getDataSource(locale).hidratarSesion(restaurado);
        setUsuario(restaurado);
      }
    } catch {
      window.localStorage.removeItem(CLAVE_SESION);
    }
    setListo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarSesion = useCallback(
    (nuevo: Usuario, tokens?: { access: string; refresh: string }) => {
      if (tokens) setAuthTokens(tokens.access, tokens.refresh);
      window.localStorage.setItem(CLAVE_SESION, JSON.stringify(nuevo));
      setUsuario(nuevo);
    },
    [],
  );

  const actualizarUsuario = useCallback((nuevo: Usuario) => {
    window.localStorage.setItem(CLAVE_SESION, JSON.stringify(nuevo));
    setUsuario(nuevo);
  }, []);

  const cerrarSesion = useCallback(() => {
    setAuthTokens(null, null);
    window.localStorage.removeItem(CLAVE_SESION);
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
