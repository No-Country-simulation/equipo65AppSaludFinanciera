'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Evolucion, ResumenAnalisis } from '@/data';
import { Link } from '@/i18n/navigation';
import { formatearFecha, formatearMes, formatearPct } from '@/lib/formato';
import { useDatos } from '@/lib/useDatos';
import { GraficoEvolucion } from '@/components/graficos/Evolucion';
import { Boton, ChipPerfil, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosAnalisis {
  historial: ResumenAnalisis[];
  evolucion: Evolucion;
}

export default function PaginaAnalisis() {
  const t = useTranslations('analisis');
  const tPanel = useTranslations('panel');
  const tPerfil = useTranslations('perfil');
  const tMov = useTranslations('movimientos');
  const tComun = useTranslations('comun');
  const locale = useLocale();

  const { datos, cargando, error, recargar } = useDatos<DatosAnalisis>(async (fuente) => {
    const [historial, evolucion] = await Promise.all([
      fuente.historialAnalisis(1, 24),
      fuente.evolucion(),
    ]);
    return { historial, evolucion };
  });

  const [aviso, setAviso] = useState<string | null>(null);
  const avisar = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 3500);
  };

  return (
    <div className="space-y-5">
      <header className="aparece flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
          <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
        </div>
        {/* Export solo-UI (F9.15) */}
        <div className="flex gap-2">
          <Boton variante="fantasma" onClick={() => avisar(tComun('proximamente'))}>
            {tMov('exportPdf')}
          </Boton>
          <Boton variante="fantasma" onClick={() => avisar(tComun('proximamente'))}>
            {tMov('exportXlsx')}
          </Boton>
        </div>
      </header>

      {aviso ? (
        <p className="aparece rounded-xl bg-canvas-2 px-4 py-2.5 text-sm font-medium text-ink-soft">{aviso}</p>
      ) : null}

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        {datos ? (
          <>
            <Tarjeta className="aparece aparece-2">
              <TituloTarjeta>{tPanel('evolucionTitulo')}</TituloTarjeta>
              {datos.evolucion.puntos.length > 1 ? (
                <GraficoEvolucion puntos={datos.evolucion.puntos} />
              ) : (
                <p className="py-10 text-center text-sm text-muted">{t('vacio')}</p>
              )}
            </Tarjeta>

            {/* Comparativa multi-mes (grilla) */}
            {datos.evolucion.puntos.length > 1 ? (
              <Tarjeta className="aparece aparece-3">
                <TituloTarjeta>{t('comparativaTitulo')}</TituloTarjeta>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {datos.evolucion.puntos.map((punto, indice) => (
                    <div
                      key={punto.fecha}
                      className="entra-x rounded-2xl border border-line bg-canvas-2/40 p-3 text-center"
                      style={{ animationDelay: `${indice * 45}ms` }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {formatearMes(punto.fecha, locale)}
                      </p>
                      <p className="cifra mt-1 text-lg font-semibold text-ink">
                        {formatearPct(punto.tasa_ahorro, locale)}
                      </p>
                      <div className="mt-1.5 flex justify-center">
                        <ChipPerfil perfil={punto.perfil_codigo} etiqueta={tPerfil(punto.perfil_codigo)} />
                      </div>
                    </div>
                  ))}
                </div>
              </Tarjeta>
            ) : null}

            <Tarjeta className="aparece aparece-3 !p-0">
              <div className="px-5 pt-5">
                <TituloTarjeta>{t('historial')}</TituloTarjeta>
              </div>
              {datos.historial.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">{t('vacio')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {datos.historial.map((resumen) => (
                    <li key={resumen.id}>
                      <Link
                        href={`/analisis/${resumen.id}`}
                        className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-ink/[0.03]"
                      >
                        <span className="w-28 text-sm font-medium text-ink">
                          {formatearFecha(resumen.analizado_en, locale)}
                        </span>
                        <ChipPerfil
                          perfil={resumen.perfil_codigo}
                          etiqueta={tPerfil(resumen.perfil_codigo)}
                        />
                        <span className="flex-1 text-right text-sm tabular-nums text-muted">
                          {formatearPct(resumen.probabilidad, locale, 0)}
                        </span>
                        <span className="text-xs font-semibold text-accent">{t('ver')} →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </>
        ) : null}
      </EstadoCarga>
    </div>
  );
}
