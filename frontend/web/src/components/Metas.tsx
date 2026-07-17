'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MetaAhorro } from '@/data';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { Icono, type NombreIcono } from '@/components/Icono';

export function progresoMeta(meta: MetaAhorro): number {
  return meta.objetivo > 0 ? Math.min(1, meta.ahorrado / meta.objetivo) : 0;
}

/** Aporte mensual necesario para llegar al objetivo antes de la fecha límite. */
export function mensualNecesario(meta: MetaAhorro): number | null {
  if (!meta.fecha_limite) return null;
  const restante = Math.max(0, meta.objetivo - meta.ahorrado);
  if (restante === 0) return 0;
  const hoy = new Date();
  const limite = new Date(`${meta.fecha_limite}T12:00:00`);
  const meses = Math.max(
    1,
    (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth()),
  );
  return Math.ceil(restante / meses);
}

export function TarjetaMeta({
  meta,
  onAportar,
  onEliminar,
  compacta = false,
}: {
  meta: MetaAhorro;
  onAportar?: () => void;
  onEliminar?: () => void;
  compacta?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('metas');
  const progreso = progresoMeta(meta);
  const completada = progreso >= 1;
  const restante = Math.max(0, meta.objetivo - meta.ahorrado);
  const mensual = mensualNecesario(meta);

  return (
    <div className="rounded-2xl border border-line bg-canvas-2/40 p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `${meta.color}1a`, color: meta.color }}
        >
          <Icono nombre={meta.icono as NombreIcono} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-semibold text-ink">{meta.nombre}</p>
            <span className="cifra shrink-0 text-sm font-semibold" style={{ color: meta.color }}>
              {Math.round(progreso * 100)}%
            </span>
          </div>
          <p className="cifra mt-0.5 text-xs text-muted">
            {formatearMoneda(meta.ahorrado, meta.moneda, locale)}
            <span className="mx-1 opacity-60">/</span>
            {formatearMoneda(meta.objetivo, meta.moneda, locale)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-canvas-2">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(3, progreso * 100)}%`, background: meta.color }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={completada ? 'font-semibold text-ok-text' : 'text-muted'}>
          {completada
            ? t('completada')
            : mensual
              ? t('mensualNecesario', { monto: formatearMoneda(mensual, meta.moneda, locale) })
              : t('restante', { monto: formatearMoneda(restante, meta.moneda, locale) })}
        </span>
        {meta.fecha_limite && !compacta ? (
          <span className="text-muted">{formatearFecha(meta.fecha_limite, locale)}</span>
        ) : null}
      </div>

      {!compacta && (onAportar || onEliminar) ? (
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          {onAportar ? (
            <button
              onClick={onAportar}
              className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
            >
              + {t('aportar')}
            </button>
          ) : null}
          {onEliminar ? (
            <button
              onClick={onEliminar}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-risk transition hover:bg-risk/10"
            >
              {t('eliminar')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
