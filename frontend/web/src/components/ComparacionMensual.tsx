'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ComparacionMensual, Moneda } from '@/data';
import { formatearMoneda } from '@/lib/formato';
import { Icono } from '@/components/Icono';

function Delta({ actual, anterior, invertir = false }: { actual: number; anterior: number; invertir?: boolean }) {
  if (anterior === 0) return null;
  const cambio = (actual - anterior) / Math.abs(anterior);
  const plano = Math.abs(cambio) < 0.005;
  const sube = cambio > 0;
  // invertir: para gastos, subir es "malo" (rojo); para balance/ingreso, subir es "bueno"
  const bueno = invertir ? !sube : sube;
  const color = plano ? 'text-muted' : bueno ? 'text-ok-text' : 'text-risk';
  return (
    <span className={`cifra inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icono nombre={plano ? 'plano' : sube ? 'arriba' : 'abajo'} className="h-3.5 w-3.5" strokeWidth={2.2} />
      {Math.abs(Math.round(cambio * 100))}%
    </span>
  );
}

export function TarjetaComparacion({
  datos,
  moneda,
}: {
  datos: ComparacionMensual;
  moneda: Moneda;
}) {
  const locale = useLocale();
  const t = useTranslations('panel');
  const filas = [
    { clave: 'ingresos', actual: datos.actual.ingreso_total, anterior: datos.anterior.ingreso_total, invertir: false, color: 'var(--ok)' },
    { clave: 'gastos', actual: datos.actual.gasto_total, anterior: datos.anterior.gasto_total, invertir: true, color: 'var(--warn-bg)' },
    { clave: 'balance', actual: datos.actual.balance, anterior: datos.anterior.balance, invertir: false, color: 'var(--accent)' },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {filas.map((fila) => (
        <div key={fila.clave} className="rounded-2xl border border-line bg-canvas-2/40 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: fila.color }} />
              {t(fila.clave)}
            </span>
            <Delta actual={fila.actual} anterior={fila.anterior} invertir={fila.invertir} />
          </div>
          <p className="cifra mt-1.5 text-xl font-semibold text-ink">
            {formatearMoneda(fila.actual, moneda, locale)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {t('vsMesAnterior')}: {formatearMoneda(fila.anterior, moneda, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}
