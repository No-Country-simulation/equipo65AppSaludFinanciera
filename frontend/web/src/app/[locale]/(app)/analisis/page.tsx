'use client';

import { useState, useEffect, useMemo } from 'react';
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

  const [tieneDemo, setTieneDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('demo_saldo') !== null) {
      setTieneDemo(true);
    }
  }, []);

  const { datos: datosBackend, cargando, error, recargar } = useDatos<DatosAnalisis>(async (fuente) => {
    const [historial, evolucion] = await Promise.all([
      fuente.historialAnalisis(1, 24),
      fuente.evolucion(),
    ]);
    return { historial, evolucion };
  });

  const datosMock: DatosAnalisis = useMemo(() => ({
    historial: [
      {
        id: 'demo-analisis-id',
        usuario_id: 'demo-user',
        perfil_codigo: 'saludable',
        perfil_financiero: 'Saludable',
        probabilidad: 0.76,
        analizado_en: new Date().toISOString(),
        modelo_version: 'v2.4',
        moneda: 'MXN',
      },
    ],
    evolucion: {
      puntos: [
        { fecha: '2026-03-01', score: 680, probabilidad: 0.65, perfil: 'en_observacion', tasa_ahorro: 0.40, perfil_codigo: 'en_observacion' },
        { fecha: '2026-04-01', score: 695, probabilidad: 0.68, perfil: 'en_observacion', tasa_ahorro: 0.43, perfil_codigo: 'en_observacion' },
        { fecha: '2026-05-01', score: 710, probabilidad: 0.71, perfil: 'saludable', tasa_ahorro: 0.46, perfil_codigo: 'saludable' },
        { fecha: '2026-06-01', score: 720, probabilidad: 0.73, perfil: 'saludable', tasa_ahorro: 0.48, perfil_codigo: 'saludable' },
        { fecha: '2026-07-01', score: 735, probabilidad: 0.74, perfil: 'saludable', tasa_ahorro: 0.50, perfil_codigo: 'saludable' },
        { fecha: '2026-08-01', score: 750, probabilidad: 0.76, perfil: 'saludable', tasa_ahorro: 0.528, perfil_codigo: 'saludable' },
      ],
    },
  }), []) as unknown as DatosAnalisis;

  const datos = (datosBackend && datosBackend.historial.length > 0) || !tieneDemo ? datosBackend : datosMock;

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

      <EstadoCarga cargando={cargando} error={!tieneDemo ? error : null} recargar={recargar}>
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