'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { FinanceApiError, getDataSource, type FinanceDataSource, type Idioma } from '@/data';

interface EstadoDatos<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  /**
   * Codigo de negocio del error (`SIN_HISTORIAL_BURO`, `NO_ENCONTRADO`...), o
   * null si el fallo no viene de la API.
   *
   * Sin esto toda pantalla trata cualquier fallo como "no pudimos conectar con
   * el servicio", incluidos los 404 que en realidad significan "aun no hay
   * nada que enseñar". Es lo que hacia que Salud crediticia pareciera rota
   * recien creada la cuenta.
   */
  codigo: string | null;
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
  const [codigo, setCodigo] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    setCodigo(null);
    carga(getDataSource(locale))
      .then((resultado) => {
        if (activo) setDatos(resultado);
      })
      .catch((causa: unknown) => {
        if (!activo) return;
        setError(causa instanceof Error ? causa.message : String(causa));
        setCodigo(causa instanceof FinanceApiError ? causa.error.codigo : null);
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
    () => ({ datos, cargando, error, codigo, recargar }),
    [datos, cargando, error, codigo, recargar],
  );
}

/** Acceso directo al datasource del locale activo (para acciones: crear, corregir…). */
export function useDataSource(): FinanceDataSource {
  const locale = useLocale() as Idioma;
  return getDataSource(locale);
}
