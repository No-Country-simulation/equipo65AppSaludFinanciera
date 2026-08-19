'use client';

import { use, useMemo, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Analisis, Categoria, CategoriaSlug } from '@/data';
import { Link } from '@/i18n/navigation';
import { formatearFecha, formatearPct } from '@/lib/formato';
import { porcionesGasto, totalGastos } from '@/lib/series';
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

  const [tieneDemo, setTieneDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('demo_saldo') !== null) {
      setTieneDemo(true);
    }
  }, []);

  const { datos: datosBackend, cargando, error, recargar } = useDatos<Detalle>(
    async (fuente) => {
      const [analisis, categorias] = await Promise.all([
        fuente.obtenerAnalisis(id),
        fuente.categorias(),
      ]);
      return { analisis, categorias };
    },
    [id],
  );

  const datosMock: Detalle = useMemo(() => ({
    analisis: {
      id: 'demo-analisis-id',
      usuario_id: 'demo-user',
      perfil_codigo: 'saludable',
      perfil_financiero: 'Saludable',
      probabilidad: 0.76,
      analizado_en: new Date().toISOString(),
      modelo_version: 'v2.4',
      moneda: 'MXN',
      probabilidades: {
        saludable: 0.76,
        en_observacion: 0.18,
        critico: 0.06,
      },
      indicadores: {
        tasa_ahorro: 0.528,
        cobertura_emergencia_meses: 6.5,
        ratio_endeudamiento: 0.12,
        gastos_fijos_pct: 0.35,
        gastos_discrecionales_pct: 0.12,
        frecuencia_ahorro_num: 1,
        ratio_recurrente: 0.85,
        ratio_gasto_ingreso: 0.45,
      },
      resumen_gastos: {
        vivienda: 8500,
        alimentacion: 4500,
        compras: 2200,
        transporte: 1800,
        servicios: 1200,
      },
      recomendaciones_detalle: [
        {
          id: 'rec-1',
          categoria: 'ahorro',
          prioridad: 'alta',
          titulo: 'Mantén tu fondo de emergencia activo',
          mensaje: 'Tu ratio de ahorro te permite cubrir meses ante contingencias de forma óptima.',
          impacto: 'alto',
          texto: 'Mantén el buen ritmo de ahorro mensual.',
        },
      ],
    },
    categorias: datosBackend?.categorias ?? [],
  }), [datosBackend?.categorias]) as unknown as Detalle;

  const datos = (datosBackend && datosBackend.analisis) || !tieneDemo ? datosBackend : datosMock;

  const etiquetas = useMemo(
    () => new Map<CategoriaSlug, string>(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  return (
    <EstadoCarga cargando={cargando} error={!tieneDemo ? error : null} recargar={recargar}>
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
                total={totalGastos(datos.analisis.resumen_gastos)}
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
                totalGastos(datos.analisis.resumen_gastos) /
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