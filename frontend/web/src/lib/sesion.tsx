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
  const locale = useLocale() as Idioma;
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  /**
   * Restaura la sesion al cargar la pagina (tambien tras un F5).
   *
   * ⚠️ `listo` se pone a true DESPUES de hidratar, no antes. El token vive en
   * localStorage y leerlo es async: si se marcara listo primero, las pantallas
   * lanzarian sus peticiones sin Authorization, recibirian 401 y se pintarian
   * vacias -- con el menu y el nombre puestos, que es lo peor de los dos mundos.
   */
  useEffect(() => {
    let activo = true;

    (async () => {
      let restaurado: Usuario | null = null;
      try {
        const crudo = window.localStorage.getItem(CLAVE_SESION);
        if (crudo) {
          restaurado = JSON.parse(crudo) as Usuario;
          await getDataSource(locale).hidratarSesion(restaurado);
        }
      } catch {
        window.localStorage.removeItem(CLAVE_SESION);
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
          const alDia = await getDataSource(locale).me();
          if (activo) {
            window.localStorage.setItem(CLAVE_SESION, JSON.stringify(alDia));
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

  const iniciarSesion = useCallback(
    (nuevo: Usuario, tokens?: { access: string; refresh: string }) => {
      if (tokens) void setAuthTokens(tokens.access, tokens.refresh);
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
    void setAuthTokens(null, null);
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
