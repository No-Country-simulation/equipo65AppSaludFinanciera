import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDataSource, type FinanceDataSource } from '@/data';
import { useI18n } from '@/i18n';

interface EstadoDatos<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

/** Carga datos del FinanceDataSource con el patron cargando/error+Reintentar (F6.7). */
export function useDatos<T>(
  carga: (ds: FinanceDataSource) => Promise<T>,
  dependencias: unknown[] = [],
): EstadoDatos<T> {
  const { idioma } = useI18n();
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let activo = true;
    // Patron fetch-en-efecto deliberado: el "cargando" debe reiniciarse al
    // cambiar idioma/version. Se reemplaza por TanStack Query si crece.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    setError(null);
    carga(getDataSource(idioma))
      .then((resultado) => {
        if (activo) setDatos(resultado);
      })
      .catch((causa: unknown) => {
        if (activo) setError(causa instanceof Error ? causa.message : String(causa));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idioma, version, ...dependencias]);

  return useMemo(
    () => ({ datos, cargando, error, recargar }),
    [datos, cargando, error, recargar],
  );
}

export function useDataSource(): FinanceDataSource {
  const { idioma } = useI18n();
  return getDataSource(idioma);
}
