import type { Moneda } from '@/data';

export function formatearMoneda(valor: number, moneda: Moneda, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: valor % 1 === 0 ? 0 : 2,
  }).format(valor);
}

export function formatearPct(fraccion: number, locale: string, decimales = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  }).format(fraccion);
}

export function formatearFecha(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00`),
  );
}

export function formatearMes(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00`),
  );
}
