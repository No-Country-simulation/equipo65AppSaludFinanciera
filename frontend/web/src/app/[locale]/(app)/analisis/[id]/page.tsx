'use client';

import { use, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Analisis, Categoria, CategoriaSlug } from '@/data';
import { Link } from '@/i18n/navigation';
import { formatearFecha, formatearPct } from '@/lib/formato';
import { porcionesGasto } from '@/lib/series';
import { useDatos } from '@/lib/useDatos';
import { GastosCategoria } from '@/components/graficos/GastosCategoria';
import { EstructuraGasto } from '@/components/graficos/EstructuraGasto';
import { FichasIndicadores } from '@/components/graficos/Indicadores';
import { ListaRecomendaciones } from '@/components/Recomendaciones';
import { ChipPerfil, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

interface Detalle {
  analisis: Analisis;
  categorias: Categoria[];
}

export default function PaginaDetalleAnalisis({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('analisis');
  const tPanel = useTranslations('panel');
  const tPerfil = useTranslations('perfil');
  const locale = useLocale();

  const { datos, cargando, error, recargar } = useDatos<Detalle>(
    async (fuente) => {
      const [analisis, categorias] = await Promise.all([
        fuente.obtenerAnalisis(id),
        fuente.categorias(),
      ]);
      return { analisis, categorias };
    },
    [id],
  );

  const etiquetas = useMemo(
    () => new Map<CategoriaSlug, string>(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  return (
    <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
      {datos ? (
        <div className="space-y-5">
          <header className="aparece">
            <Link href="/analisis" className="text-sm font-semibold text-accent hover:underline">
              ← {t('volver')}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <h1 className="cifra text-3xl font-semibold text-ink">
                {t('detalleTitulo', {
                  fecha: formatearFecha(datos.analisis.analizado_en, locale),
                })}
              </h1>
              <ChipPerfil
                perfil={datos.analisis.perfil_codigo}
                etiqueta={datos.analisis.perfil_financiero}
                grande
              />
            </div>
            <p className="mt-1 text-sm text-muted">
              {tPanel('confianza', { pct: Math.round(datos.analisis.probabilidad * 100) })}
              {' · '}
              {t('modelo', { version: datos.analisis.modelo_version })}
            </p>
          </header>

          {/* Explicabilidad (P11): distribucion de probabilidades del modelo */}
          <Tarjeta className="aparece aparece-2">
            <TituloTarjeta>{t('indicadoresQueEmpujaron')}</TituloTarjeta>
            <div className="space-y-2">
              {(Object.entries(datos.analisis.probabilidades) as [string, number][]).map(
                ([slug, probabilidad]) => (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-xs font-medium text-muted">
                      {tPerfil.has(slug as never) ? tPerfil(slug as never) : slug}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, probabilidad * 100)}%`,
                          background:
                            slug === 'saludable'
                              ? 'var(--ok)'
                              : slug === 'en_observacion'
                                ? 'var(--warn-bg)'
                                : 'var(--risk)',
                        }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm tabular-nums text-ink">
                      {formatearPct(probabilidad, locale, 0)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </Tarjeta>

          <div className="grid gap-5 lg:grid-cols-2">
            <Tarjeta className="aparece aparece-3">
              <TituloTarjeta>{tPanel('gastosTitulo')}</TituloTarjeta>
              <GastosCategoria
                porciones={porcionesGasto(datos.analisis.resumen_gastos, etiquetas, tPanel('otras'))}
                total={Object.values(datos.analisis.resumen_gastos).reduce(
                  (suma, monto) => suma + (monto ?? 0),
                  0,
                )}
                moneda={datos.analisis.moneda}
                etiquetaTotal={tPanel('gastoTotal')}
              />
            </Tarjeta>

            <Tarjeta className="aparece aparece-3">
              <TituloTarjeta>{tPanel('recsTitulo')}</TituloTarjeta>
              <ListaRecomendaciones recomendaciones={datos.analisis.recomendaciones_detalle} />
            </Tarjeta>
          </div>

          <Tarjeta className="aparece aparece-4">
            <TituloTarjeta>{tPanel('estructuraTitulo')}</TituloTarjeta>
            <EstructuraGasto
              resumen={datos.analisis.resumen_gastos}
              ingreso={
                Object.values(datos.analisis.resumen_gastos).reduce((s, m) => s + (m ?? 0), 0) /
                Math.max(datos.analisis.indicadores.ratio_gasto_ingreso, 0.001)
              }
              moneda={datos.analisis.moneda}
            />
          </Tarjeta>

          <Tarjeta className="aparece aparece-4">
            <TituloTarjeta>{tPanel('indicadoresTitulo')}</TituloTarjeta>
            <FichasIndicadores indicadores={datos.analisis.indicadores} />
          </Tarjeta>
        </div>
      ) : null}
    </EstadoCarga>
  );
}
