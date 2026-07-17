'use client';

import { useTranslations } from 'next-intl';
import type { RecomendacionDetalle } from '@/data';

const ESTILO_PRIORIDAD: Record<string, string> = {
  alta: 'bg-risk/10 text-risk',
  media: 'bg-warn-bg/15 text-warn',
  baja: 'bg-ok/10 text-ok-text',
};

/** P11 (explicabilidad): cada recomendacion muestra el indicador que la disparo. */
export function ListaRecomendaciones({
  recomendaciones,
}: {
  recomendaciones: RecomendacionDetalle[];
}) {
  const t = useTranslations('panel');
  const tIndicador = useTranslations('indicadores');
  const tVacio = useTranslations('panel');

  if (recomendaciones.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{tVacio('recVacio')}</p>;
  }

  return (
    <ol className="space-y-2.5">
      {recomendaciones.map((rec, indice) => (
        <li
          key={rec.codigo + JSON.stringify(rec.parametros)}
          className="entra-x flex items-start gap-3 rounded-2xl border border-line bg-canvas-2/40 p-4 transition-colors hover:border-mint/40 hover:bg-canvas-2/70"
          style={{ animationDelay: `${indice * 60}ms` }}
        >
          <span
            className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ESTILO_PRIORIDAD[rec.prioridad]}`}
          >
            {t(`prioridad.${rec.prioridad}`)}
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-snug text-ink">{rec.texto}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1 w-1 rounded-full bg-muted/60" aria-hidden />
              {t('disparadaPor', {
                indicador: tIndicador.has(rec.indicador as never)
                  ? tIndicador(rec.indicador as never)
                  : rec.indicador,
              })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
