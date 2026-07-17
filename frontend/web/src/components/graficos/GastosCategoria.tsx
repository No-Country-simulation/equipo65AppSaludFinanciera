'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Moneda } from '@/data';
import { formatearMoneda } from '@/lib/formato';
import type { PorcionGasto } from '@/lib/series';
import { DonutGastos } from './DonutGastos';

/** Barras horizontales: ranking de categorías, con relleno animado. */
function BarrasCategoria({
  porciones,
  total,
  moneda,
}: {
  porciones: PorcionGasto[];
  total: number;
  moneda: Moneda;
}) {
  const locale = useLocale();
  const maximo = Math.max(...porciones.map((p) => p.monto), 1);
  return (
    <ul className="space-y-3 pt-1">
      {porciones.map((porcion, indice) => (
        <li key={porcion.slug} className="entra-x" style={{ animationDelay: `${indice * 55}ms` }}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 truncate text-ink-soft">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: porcion.color }}
              />
              {porcion.etiqueta}
            </span>
            <span className="cifra shrink-0 font-semibold text-ink">
              {formatearMoneda(porcion.monto, moneda, locale)}
              <span className="ml-1.5 text-xs font-normal text-muted">
                {total > 0 ? `${Math.round((porcion.monto / total) * 100)}%` : ''}
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas-2">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(porcion.monto / maximo) * 100}%`, background: porcion.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Card de gastos por categoría con toggle Dona / Barras. */
export function GastosCategoria({
  porciones,
  total,
  moneda,
  etiquetaTotal,
}: {
  porciones: PorcionGasto[];
  total: number;
  moneda: Moneda;
  etiquetaTotal: string;
}) {
  const t = useTranslations('panel');
  const [vista, setVista] = useState<'dona' | 'barras'>('dona');

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-full border border-line bg-canvas-2/60 p-0.5 text-xs font-semibold">
          {(['dona', 'barras'] as const).map((modo) => (
            <button
              key={modo}
              onClick={() => setVista(modo)}
              className={`rounded-full px-3 py-1 transition-colors ${
                vista === modo ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {t(modo === 'dona' ? 'verDona' : 'verBarras')}
            </button>
          ))}
        </div>
      </div>
      {vista === 'dona' ? (
        <DonutGastos
          porciones={porciones}
          total={total}
          moneda={moneda}
          etiquetaTotal={etiquetaTotal}
        />
      ) : (
        <BarrasCategoria porciones={porciones} total={total} moneda={moneda} />
      )}
    </div>
  );
}
