import type { Idioma, Moneda } from '@/data';

const ETIQUETA_LOCALE: Record<Idioma, string> = { es: 'es-MX', pt: 'pt-BR', en: 'en-US' };

export function formatearMoneda(valor: number, moneda: Moneda, idioma: Idioma): string {
  return new Intl.NumberFormat(ETIQUETA_LOCALE[idioma], {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: valor % 1 === 0 ? 0 : 2,
  }).format(valor);
}

export function formatearPct(fraccion: number, idioma: Idioma, decimales = 1): string {
  return new Intl.NumberFormat(ETIQUETA_LOCALE[idioma], {
    style: 'percent',
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  }).format(fraccion);
}

export function formatearFecha(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(ETIQUETA_LOCALE[idioma], { dateStyle: 'medium' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00`),
  );
}

export function formatearMes(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(ETIQUETA_LOCALE[idioma], { month: 'short' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00`),
  );
}
