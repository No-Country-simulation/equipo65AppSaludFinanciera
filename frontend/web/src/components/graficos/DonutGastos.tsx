'use client';

import { useLocale } from 'next-intl';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Moneda } from '@/data';
import { formatearMoneda } from '@/lib/formato';
import type { PorcionGasto } from '@/lib/series';

/** Composicion del gasto: dona fina con hueco grande, cifra heroe al centro,
 *  separadores de 2px contra la superficie y leyenda con etiquetas directas. */
export function DonutGastos({
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
  const locale = useLocale();
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={porciones}
              dataKey="monto"
              nameKey="etiqueta"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={2}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive
              animationBegin={150}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {porciones.map((porcion) => (
                <Cell key={porcion.slug} fill={porcion.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(valor) => formatearMoneda(Number(valor), moneda, locale)}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-widest text-muted">
            {etiquetaTotal}
          </span>
          <span className="cifra text-2xl font-semibold text-ink">
            {formatearMoneda(total, moneda, locale)}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-1">
        {porciones.map((porcion, indice) => (
          <li
            key={porcion.slug}
            className="entra-x flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-canvas-2"
            style={{ animationDelay: `${250 + indice * 55}ms` }}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-white/40"
              style={{ background: porcion.color }}
            />
            <span className="flex-1 truncate text-ink-soft">{porcion.etiqueta}</span>
            <span className="cifra font-medium text-ink">
              {formatearMoneda(porcion.monto, moneda, locale)}
            </span>
            <span className="w-11 text-right text-xs tabular-nums text-muted">
              {total > 0 ? `${Math.round((porcion.monto / total) * 100)}%` : '-'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
