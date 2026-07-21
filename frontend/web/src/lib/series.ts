/**
 * Asignacion FIJA color→categoria (la paleta validada de la skill dataviz).
 * El color sigue a la entidad, nunca a su ranking. Lo que no tiene slot
 * (educacion, otros, resto) cae al gris "resto" via agrupacion "Otras".
 */
import type { CategoriaSlug, PerfilSlug } from '@/data';

export const COLOR_CATEGORIA: Partial<Record<CategoriaSlug, string>> = {
  alimentacion: 'var(--serie-1)',
  transporte: 'var(--serie-2)',
  vivienda: 'var(--serie-3)',
  servicios: 'var(--serie-4)',
  entretenimiento: 'var(--serie-5)',
  compras: 'var(--serie-6)',
  salud: 'var(--serie-7)',
  finanzas: 'var(--serie-8)',
};

export const COLOR_RESTO = 'var(--serie-resto)';

export const COLOR_PERFIL: Record<PerfilSlug, string> = {
  saludable: 'var(--ok)',
  en_observacion: 'var(--warn-bg)',
  en_riesgo: 'var(--risk)',
};

export interface PorcionGasto {
  slug: CategoriaSlug | 'otras';
  etiqueta: string;
  monto: number;
  color: string;
}

/** Grupos de gasto (TAXONOMIA §1.3) para la estructura del presupuesto. */
export type GrupoGasto = 'esencial' | 'discrecional' | 'financiero' | 'educacion' | 'otros';

const MIEMBROS_GRUPO: Record<GrupoGasto, CategoriaSlug[]> = {
 esencial: ['alimentacion', 'supermercado', 'vivienda', 'servicios', 'salud', 'transporte'],
  discrecional: ['entretenimiento', 'compras', 'comida_rapida', 'taxi'],
  financiero: ['finanzas'],
  educacion: ['educacion'],
   otros: ['otros'],
};

export const COLOR_GRUPO: Record<GrupoGasto, string> = {
  esencial: 'var(--serie-1)',
  discrecional: 'var(--serie-6)',
  financiero: 'var(--serie-8)',
  educacion: 'var(--serie-7)',
  otros: 'var(--serie-resto)',
};

export interface TramoEstructura {
  grupo: GrupoGasto;
  monto: number;
  fraccion: number; // sobre el ingreso
  color: string;
}

/** Descompone el gasto por grupo como fracción del ingreso; el resto es ahorro. */
export function estructuraGasto(
  resumen: Partial<Record<CategoriaSlug, number>>,
  ingreso: number,
): { tramos: TramoEstructura[]; ahorroFraccion: number } {
  const tramos = (Object.keys(MIEMBROS_GRUPO) as GrupoGasto[])
    .map((grupo) => {
      const monto = MIEMBROS_GRUPO[grupo].reduce((suma, slug) => suma + (resumen[slug] ?? 0), 0);
      return { grupo, monto, fraccion: ingreso > 0 ? monto / ingreso : 0, color: COLOR_GRUPO[grupo] };
    })
    .filter((tramo) => tramo.monto > 0);
  const gastoFraccion = tramos.reduce((suma, tramo) => suma + tramo.fraccion, 0);
  return { tramos, ahorroFraccion: Math.max(0, 1 - gastoFraccion) };
}

/** Top 5 categorias con color propio + el resto agregado en "Otras" (gris). */
export function porcionesGasto(
  resumen: Partial<Record<CategoriaSlug, number>>,
  etiquetas: Map<CategoriaSlug, string>,
  etiquetaOtras: string,
): PorcionGasto[] {
  const ordenadas = (Object.entries(resumen) as [CategoriaSlug, number][])
    .filter(([slug, monto]) => monto > 0 && COLOR_CATEGORIA[slug])
    .sort((a, b) => b[1] - a[1]);
  const conSlot: PorcionGasto[] = ordenadas.slice(0, 5).map(([slug, monto]) => ({
    slug,
    etiqueta: etiquetas.get(slug) ?? slug,
    monto,
    color: COLOR_CATEGORIA[slug]!,
  }));
  const resto =
    ordenadas.slice(5).reduce((suma, [, monto]) => suma + monto, 0) +
    (Object.entries(resumen) as [CategoriaSlug, number][])
      .filter(([slug, monto]) => monto > 0 && !COLOR_CATEGORIA[slug])
      .reduce((suma, [, monto]) => suma + monto, 0);
  if (resto > 0) {
    conSlot.push({ slug: 'otras', etiqueta: etiquetaOtras, monto: resto, color: COLOR_RESTO });
  }
  return conSlot;
}
