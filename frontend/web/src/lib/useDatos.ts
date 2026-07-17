'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { getDataSource, type FinanceDataSource, type Idioma } from '@/data';

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
  const locale = useLocale() as Idioma;
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    carga(getDataSource(locale))
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
  }, [locale, version, ...dependencias]);

  return useMemo(
    () => ({ datos, cargando, error, recargar }),
    [datos, cargando, error, recargar],
  );
}

/** Acceso directo al datasource del locale activo (para acciones: crear, corregir…). */
export function useDataSource(): FinanceDataSource {
  const locale = useLocale() as Idioma;
  return getDataSource(locale);
}
