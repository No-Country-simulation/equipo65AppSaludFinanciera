'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import type { Moneda, Transaccion } from '@/data';
import { formatearMoneda } from '@/lib/formato';

/** Calendario del mes con un punto en los días que tienen gastos.
 *  Intensidad del punto según el monto del día (suave → fuerte). */
export function CalendarioPagos({
  transacciones,
  mes, // 'YYYY-MM'
  moneda,
}: {
  transacciones: Transaccion[];
  mes: string;
  moneda: Moneda;
}) {
  const locale = useLocale();

  const { dias, offset, gastoPorDia, maximo, iniciales } = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number);
    const primerDia = new Date(anio, mesNum - 1, 1);
    const dias = new Date(anio, mesNum, 0).getDate();
    // lunes = 0 … domingo = 6
    const offset = (primerDia.getDay() + 6) % 7;

    const gastoPorDia = new Map<number, number>();
    for (const tx of transacciones) {
      if (!tx.fecha.startsWith(mes) || tx.valor >= 0) continue;
      const dia = Number(tx.fecha.slice(8, 10));
      gastoPorDia.set(dia, (gastoPorDia.get(dia) ?? 0) + Math.abs(tx.valor));
    }
    const maximo = Math.max(...gastoPorDia.values(), 1);

    const base = new Date(2026, 5, 1); // lunes
    const formato = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const iniciales = Array.from({ length: 7 }, (_, i) =>
      formato.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    );

    return { dias, offset, gastoPorDia, maximo, iniciales };
  }, [transacciones, mes, locale]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {iniciales.map((inicial, i) => (
          <span key={i} className="pb-1 text-[10px] font-semibold uppercase text-muted">
            {inicial}
          </span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`v-${i}`} />
        ))}
        {Array.from({ length: dias }, (_, i) => i + 1).map((dia) => {
          const gasto = gastoPorDia.get(dia);
          const intensidad = gasto ? 0.35 + 0.65 * (gasto / maximo) : 0;
          return (
            <div
              key={dia}
              title={gasto ? `${formatearMoneda(gasto, moneda, locale)}` : undefined}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors ${
                gasto ? 'cursor-default bg-canvas-2/70 font-semibold text-ink hover:bg-canvas-2' : 'text-muted/70'
              }`}
            >
              {dia}
              <span
                aria-hidden
                className="mt-0.5 h-1.5 w-1.5 rounded-full"
                style={{ background: gasto ? `rgba(18,86,74,${intensidad})` : 'transparent' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
