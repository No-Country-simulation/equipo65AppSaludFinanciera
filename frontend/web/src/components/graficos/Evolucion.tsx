'use client';

import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PuntoEvolucion } from '@/data';
import { formatearMes, formatearPct } from '@/lib/formato';
import { COLOR_PERFIL } from '@/lib/series';

interface PuntoGrafico extends PuntoEvolucion {
  mes: string;
}

/** Área de la tasa de ahorro con degradado; el perfil colorea cada punto
 *  (siempre acompañado de su etiqueta en el tooltip, nunca color solo). */
export function GraficoEvolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  const locale = useLocale();
  const tPerfil = useTranslations('perfil');
  const gradId = useId().replace(/:/g, '');
  const datos: PuntoGrafico[] = puntos.map((punto) => ({
    ...punto,
    mes: formatearMes(punto.fecha, locale),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(valor) => formatearPct(Number(valor), locale, 0)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            width={58}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const punto = payload[0].payload as PuntoGrafico;
              return (
                <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-ink">{punto.mes}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-ink">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ background: COLOR_PERFIL[punto.perfil_codigo] }}
                    />
                    {tPerfil(punto.perfil_codigo)}
                  </p>
                  <p className="cifra mt-0.5 text-muted">{formatearPct(punto.tasa_ahorro, locale)}</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="tasa_ahorro"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            isAnimationActive
            animationDuration={1100}
            animationEasing="ease-out"
            dot={({ cx, cy, payload }) => {
              const punto = payload as PuntoGrafico;
              return (
                <circle
                  key={punto.fecha}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={COLOR_PERFIL[punto.perfil_codigo]}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--card)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
