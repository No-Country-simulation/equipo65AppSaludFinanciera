'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Moneda } from '@/data';
import { formatearMoneda, formatearPct } from '@/lib/formato';
import { estructuraGasto } from '@/lib/series';
import type { CategoriaSlug } from '@/data';

/** Barra apilada: el ingreso repartido en grupos de gasto + ahorro.
 *  Una sola barra al 100%; cada tramo lleva su etiqueta directa. */
export function EstructuraGasto({
  resumen,
  ingreso,
  moneda,
}: {
  resumen: Partial<Record<CategoriaSlug, number>>;
  ingreso: number;
  moneda: Moneda;
}) {
  const locale = useLocale();
  const t = useTranslations('panel');
  const { tramos, ahorroFraccion } = estructuraGasto(resumen, ingreso);

  const segmentos = [
    ...tramos.map((tramo) => ({
      clave: tramo.grupo,
      etiqueta: t(`grupos.${tramo.grupo}`),
      fraccion: tramo.fraccion,
      monto: tramo.monto,
      color: tramo.color,
    })),
    {
      clave: 'ahorro',
      etiqueta: t('ahorro'),
      fraccion: ahorroFraccion,
      monto: ingreso * ahorroFraccion,
      color: 'var(--mint)',
    },
  ].filter((seg) => seg.fraccion > 0.001);

  return (
    <div className="space-y-4">
      {/* Barra apilada */}
      <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-xl">
        {segmentos.map((seg) => (
          <div
            key={seg.clave}
            className="group relative h-full min-w-[3px] transition-all"
            style={{ width: `${seg.fraccion * 100}%`, background: seg.color }}
            title={`${seg.etiqueta} · ${formatearPct(seg.fraccion, locale, 0)}`}
          >
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/95 opacity-0 transition-opacity group-hover:opacity-100">
              {Math.round(seg.fraccion * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Leyenda con montos */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {segmentos.map((seg) => (
          <li key={seg.clave} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: seg.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink-soft">{seg.etiqueta}</span>
              <span className="cifra block text-xs text-muted">
                {formatearMoneda(seg.monto, moneda, locale)}
              </span>
            </span>
            <span className="cifra text-sm font-semibold text-ink">
              {formatearPct(seg.fraccion, locale, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
