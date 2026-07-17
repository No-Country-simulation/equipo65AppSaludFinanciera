'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  ComparacionMensual,
  Evolucion,
  MetaAhorro,
  Presupuesto,
} from '@/data';
import { Link } from '@/i18n/navigation';
import { formatearFecha, formatearMoneda, formatearPct } from '@/lib/formato';
import { porcionesGasto } from '@/lib/series';
import { useSesion } from '@/lib/sesion';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { GastosCategoria } from '@/components/graficos/GastosCategoria';
import { EstructuraGasto } from '@/components/graficos/EstructuraGasto';
import { GraficoEvolucion } from '@/components/graficos/Evolucion';
import { FichasIndicadores } from '@/components/graficos/Indicadores';
import { ListaRecomendaciones } from '@/components/Recomendaciones';
import { TarjetaComparacion } from '@/components/ComparacionMensual';
import { progresoMeta, TarjetaMeta } from '@/components/Metas';
import { BarraPresupuesto, estadoPresupuesto } from '@/components/Presupuestos';
import { Boton, ChipPerfil, CifraAnimada, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosPanel {
  analisis: Analisis | null;
  evolucion: Evolucion;
  categorias: Categoria[];
  comparacion: ComparacionMensual;
  metas: MetaAhorro[];
  presupuestos: Presupuesto[];
}

export default function PaginaPanel() {
  const t = useTranslations('panel');
  const locale = useLocale();
  const { usuario } = useSesion();
  const ds = useDataSource();
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);

  const { datos, cargando, error, recargar } = useDatos<DatosPanel>(async (fuente) => {
    const [analisis, evolucion, categorias, comparacion, metas, presupuestos] = await Promise.all([
      fuente.ultimoAnalisis(),
      fuente.evolucion(),
      fuente.categorias(),
      fuente.comparacionMensual(),
      fuente.metas(),
      fuente.presupuestos(),
    ]);
    return { analisis, evolucion, categorias, comparacion, metas, presupuestos };
  });

  const etiquetas = useMemo(
    () => new Map<CategoriaSlug, string>(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const analizar = async () => {
    setAnalizando(true);
    setErrorAnalisis(null);
    try {
      await ds.ejecutarAnalisis();
      recargar();
    } catch (causa) {
      setErrorAnalisis(causa instanceof Error ? causa.message : String(causa));
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
      {datos ? (
        <div className="space-y-5">
          <header className="aparece flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="cifra text-3xl font-semibold text-ink">
                {t('saludo', { nombre: usuario?.nombre.split(' ')[0] ?? '' })}
              </h1>
              <p className="mt-1 text-sm text-muted">{t('resumenMes')}</p>
            </div>
            <Boton onClick={analizar} disabled={analizando}>
              {analizando ? t('analizando') : t('analizar')}
            </Boton>
          </header>

          {errorAnalisis ? (
            <p className="aparece rounded-xl bg-risk/10 px-4 py-2.5 text-sm font-medium text-risk">
              {errorAnalisis}
            </p>
          ) : null}

          {datos.analisis ? (
            <>
              {/* ── Tarjeta heroe: perfil financiero ─────────────────── */}
              <section
                className="aparece aparece-2 relative overflow-hidden rounded-[var(--radio)] p-6 text-white shadow-[var(--sombra-lg)] sm:p-7"
                style={{
                  background:
                    'linear-gradient(140deg, var(--hero-b) 0%, var(--hero-a) 58%, #071a16 100%)',
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(60% 80% at 92% 8%, rgba(22,185,138,0.22), transparent 60%), radial-gradient(50% 60% at 0% 100%, rgba(242,163,13,0.12), transparent 55%)',
                  }}
                />
                <div className="relative flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      {t('perfilTitulo')}
                    </p>
                    <div className="mt-2.5">
                      <ChipPerfil
                        perfil={datos.analisis.perfil_codigo}
                        etiqueta={datos.analisis.perfil_financiero}
                        grande
                      />
                    </div>
                    <p className="mt-3 text-sm text-white/65">
                      {t('confianza', { pct: Math.round(datos.analisis.probabilidad * 100) })}
                      {' · '}
                      {t('ultimoAnalisis', {
                        fecha: formatearFecha(datos.analisis.analizado_en, locale),
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-9 gap-y-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                        {t('ingresoMensual')}
                      </p>
                      <p className="cifra mt-1 text-[1.9rem] font-semibold leading-none">
                        <CifraAnimada
                          valor={usuario?.ingreso_mensual ?? 0}
                          formato={(n) => formatearMoneda(n, datos.analisis!.moneda, locale)}
                        />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                        {t('gastoTotal')}
                      </p>
                      <p className="cifra mt-1 text-[1.9rem] font-semibold leading-none text-warn-bg">
                        <CifraAnimada
                          valor={Object.values(datos.analisis.resumen_gastos).reduce(
                            (suma, monto) => suma + (monto ?? 0),
                            0,
                          )}
                          formato={(n) => formatearMoneda(n, datos.analisis!.moneda, locale)}
                        />
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                        {t('evolucionEje')}
                      </p>
                      <p className="cifra mt-1 text-[1.9rem] font-semibold leading-none text-mint">
                        <CifraAnimada
                          valor={datos.analisis.indicadores.tasa_ahorro}
                          formato={(n) => formatearPct(n, locale)}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="aparece aparece-2">
                <TarjetaComparacion datos={datos.comparacion} moneda={datos.analisis.moneda} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Tarjeta className="aparece aparece-3">
                  <TituloTarjeta>{t('gastosTitulo')}</TituloTarjeta>
                  <GastosCategoria
                    porciones={porcionesGasto(
                      datos.analisis.resumen_gastos,
                      etiquetas,
                      t('otras'),
                    )}
                    total={Object.values(datos.analisis.resumen_gastos).reduce(
                      (suma, monto) => suma + (monto ?? 0),
                      0,
                    )}
                    moneda={datos.analisis.moneda}
                    etiquetaTotal={t('gastoTotal')}
                  />
                </Tarjeta>

                <Tarjeta className="aparece aparece-3">
                  <TituloTarjeta>{t('evolucionTitulo')}</TituloTarjeta>
                  {datos.evolucion.puntos.length > 1 ? (
                    <GraficoEvolucion puntos={datos.evolucion.puntos} />
                  ) : (
                    <p className="py-10 text-center text-sm text-muted">-</p>
                  )}
                </Tarjeta>
              </div>

              <Tarjeta className="aparece aparece-4">
                <TituloTarjeta>{t('estructuraTitulo')}</TituloTarjeta>
                <EstructuraGasto
                  resumen={datos.analisis.resumen_gastos}
                  ingreso={usuario?.ingreso_mensual ?? 0}
                  moneda={datos.analisis.moneda}
                />
              </Tarjeta>

              {/* Widgets de metas y presupuestos */}
              <div className="grid gap-5 lg:grid-cols-2">
                <Tarjeta className="aparece aparece-4">
                  <div className="mb-4 flex items-center justify-between">
                    <TituloTarjeta>{t('metasTitulo')}</TituloTarjeta>
                    <Link href="/metas" className="text-xs font-semibold text-accent hover:underline">
                      {t('verTodo')} →
                    </Link>
                  </div>
                  {datos.metas.length > 0 ? (
                    <div className="space-y-3">
                      {[...datos.metas]
                        .sort((a, b) => progresoMeta(b) - progresoMeta(a))
                        .slice(0, 3)
                        .map((meta) => (
                          <TarjetaMeta key={meta.id} meta={meta} compacta />
                        ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted">{t('sinMetas')}</p>
                  )}
                </Tarjeta>

                <Tarjeta className="aparece aparece-4">
                  <div className="mb-4 flex items-center justify-between">
                    <TituloTarjeta>{t('presupuestosTitulo')}</TituloTarjeta>
                    <Link href="/presupuestos" className="text-xs font-semibold text-accent hover:underline">
                      {t('verTodo')} →
                    </Link>
                  </div>
                  {datos.presupuestos.length > 0 ? (
                    <div className="space-y-4">
                      {[...datos.presupuestos]
                        .sort((a, b) => estadoPresupuesto(b).fraccion - estadoPresupuesto(a).fraccion)
                        .slice(0, 4)
                        .map((presupuesto) => (
                          <BarraPresupuesto
                            key={presupuesto.categoria}
                            presupuesto={presupuesto}
                            etiqueta={etiquetas.get(presupuesto.categoria) ?? presupuesto.categoria}
                            compacta
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted">{t('sinPresupuestos')}</p>
                  )}
                </Tarjeta>
              </div>

              <Tarjeta className="aparece aparece-4">
                <TituloTarjeta>{t('indicadoresTitulo')}</TituloTarjeta>
                <FichasIndicadores indicadores={datos.analisis.indicadores} />
              </Tarjeta>

              <Tarjeta className="aparece aparece-5">
                <TituloTarjeta>{t('recsTitulo')}</TituloTarjeta>
                <ListaRecomendaciones
                  recomendaciones={datos.analisis.recomendaciones_detalle}
                />
              </Tarjeta>
            </>
          ) : (
            <Tarjeta className="aparece aparece-2 flex flex-col items-center gap-3 py-14 text-center">
              <p className="cifra text-xl font-semibold text-ink">{t('sinDatosTitulo')}</p>
              <p className="max-w-sm text-sm text-muted">{t('sinDatosTexto')}</p>
              <Link href="/movimientos">
                <Boton variante="fantasma">{t('irMovimientos')}</Boton>
              </Link>
            </Tarjeta>
          )}
        </div>
      ) : null}
    </EstadoCarga>
  );
}
