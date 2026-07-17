'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Indicadores } from '@/data';
import { formatearPct } from '@/lib/formato';
import { Icono } from '@/components/Icono';

const FRECUENCIAS = ['nula', 'baja', 'media', 'alta'] as const;

/** Los 8 indicadores como fichas de cifra (stat tiles). */
export function FichasIndicadores({ indicadores }: { indicadores: Indicadores }) {
  const locale = useLocale();
  const t = useTranslations('indicadores');
  const tFrec = useTranslations('perfilUsuario.frecuencias');

  const fichas: { clave: keyof Indicadores; valor: string; alerta?: boolean }[] = [
    {
      clave: 'tasa_ahorro',
      valor: formatearPct(indicadores.tasa_ahorro, locale),
      alerta: indicadores.tasa_ahorro < 0.1,
    },
    {
      clave: 'ratio_endeudamiento',
      valor: formatearPct(indicadores.ratio_endeudamiento, locale),
      alerta: indicadores.ratio_endeudamiento > 0.4,
    },
    { clave: 'ratio_gasto_ingreso', valor: formatearPct(indicadores.ratio_gasto_ingreso, locale) },
    {
      clave: 'ratio_gasto_esencial',
      valor: formatearPct(indicadores.ratio_gasto_esencial, locale),
      alerta: indicadores.ratio_gasto_esencial > 0.6,
    },
    {
      clave: 'ratio_gasto_discrecional',
      valor: formatearPct(indicadores.ratio_gasto_discrecional, locale),
      alerta: indicadores.ratio_gasto_discrecional > 0.3,
    },
    { clave: 'concentracion_gasto', valor: formatearPct(indicadores.concentracion_gasto, locale) },
    {
      clave: 'frecuencia_ahorro_num',
      valor: tFrec(FRECUENCIAS[indicadores.frecuencia_ahorro_num]),
    },
    { clave: 'ratio_recurrente', valor: formatearPct(indicadores.ratio_recurrente, locale) },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {fichas.map((ficha, indice) => (
        <div
          key={ficha.clave}
          className="entra-x group relative overflow-hidden rounded-2xl border border-line bg-canvas-2/50 px-4 py-3.5 transition-colors hover:border-mint/40"
          style={{ animationDelay: `${indice * 45}ms` }}
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            {t(ficha.clave)}
          </dt>
          <dd className="cifra mt-1.5 flex items-center gap-1.5 text-[1.35rem] font-semibold text-ink">
            {ficha.valor}
            {ficha.alerta ? <Icono nombre="alerta" className="h-3.5 w-3.5 text-risk" strokeWidth={2.2} /> : null}
          </dd>
          <span
            aria-hidden
            className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${
              ficha.alerta ? 'bg-risk/60' : 'bg-mint/60'
            }`}
          />
        </div>
      ))}
    </dl>
  );
}
