'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Presupuesto } from '@/data';
import { formatearMoneda } from '@/lib/formato';
import { COLOR_CATEGORIA, COLOR_RESTO } from '@/lib/series';

export function estadoPresupuesto(p: Presupuesto) {
  const fraccion = p.limite > 0 ? p.gastado / p.limite : 0;
  return {
    fraccion,
    excedido: p.gastado > p.limite,
    diferencia: Math.abs(p.limite - p.gastado),
    color:
      fraccion >= 1 ? 'var(--risk)' : fraccion >= 0.8 ? 'var(--warn-bg)' : 'var(--ok)',
  };
}

export function BarraPresupuesto({
  presupuesto,
  etiqueta,
  onEditar,
  onEliminar,
  compacta = false,
}: {
  presupuesto: Presupuesto;
  etiqueta: string;
  onEditar?: () => void;
  onEliminar?: () => void;
  compacta?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('presupuestos');
  const { fraccion, excedido, diferencia, color } = estadoPresupuesto(presupuesto);
  const colorCat = COLOR_CATEGORIA[presupuesto.categoria] ?? COLOR_RESTO;

  return (
    <div className={compacta ? '' : 'rounded-2xl border border-line bg-canvas-2/40 p-4'}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 truncate text-sm font-medium text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorCat }} />
          {etiqueta}
        </span>
        <span className="cifra shrink-0 text-sm text-ink">
          <span className="font-semibold">{formatearMoneda(presupuesto.gastado, presupuesto.moneda, locale)}</span>
          <span className="mx-1 text-muted">{t('de')}</span>
          {formatearMoneda(presupuesto.limite, presupuesto.moneda, locale)}
        </span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-canvas-2">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, fraccion * 100)}%`, background: color }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={excedido ? 'font-semibold text-risk' : 'text-muted'}>
          {excedido
            ? t('excedido', { monto: formatearMoneda(diferencia, presupuesto.moneda, locale) })
            : t('disponible', { monto: formatearMoneda(diferencia, presupuesto.moneda, locale) })}
        </span>
        {!compacta && (onEditar || onEliminar) ? (
          <span className="flex gap-2">
            {onEditar ? (
              <button onClick={onEditar} className="font-semibold text-accent hover:underline">
                {t('editar')}
              </button>
            ) : null}
            {onEliminar ? (
              <button onClick={onEliminar} className="font-semibold text-risk hover:underline">
                {t('eliminar')}
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
