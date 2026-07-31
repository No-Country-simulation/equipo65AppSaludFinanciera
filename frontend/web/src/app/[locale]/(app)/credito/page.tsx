'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RegistroBuro, SaludCrediticia } from '@/data';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDatos } from '@/lib/useDatos';
import { EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';
import { Icono } from '@/components/Icono';

const SCORE_MIN = 300;
const SCORE_MAX = 850;

type Banda = 'excelente' | 'bueno' | 'regular' | 'bajo';

function banda(score: number): { clave: Banda; color: string } {
  if (score >= 750) return { clave: 'excelente', color: 'var(--ok)' };
  if (score >= 670) return { clave: 'bueno', color: 'var(--ok)' };
  if (score >= 580) return { clave: 'regular', color: 'var(--warn-bg)' };
  return { clave: 'bajo', color: 'var(--risk)' };
}

function AnilloScore({ score, color }: { score: number; color: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const fraccion = Math.max(0, Math.min(1, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`Score ${score}`}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - fraccion)}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" className="cifra" fontSize="30" fontWeight="700" fill="var(--ink)">
        {score}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill="var(--muted)">
        {SCORE_MIN}–{SCORE_MAX}
      </text>
    </svg>
  );
}

export default function PaginaCredito() {
  const t = useTranslations('credito');
  const locale = useLocale();
  const gradId = useId().replace(/:/g, '');

  const { datos, cargando, error, recargar } = useDatos<SaludCrediticia>((fuente) =>
    fuente.saludCrediticia(),
  );

  return (
    <div className="space-y-5">
      <header className="aparece">
        <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
        <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
      </header>

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        {datos ? (
          <ScoreContenido datos={datos} gradId={gradId} locale={locale} />
        ) : null}
      </EstadoCarga>
    </div>
  );

  function ScoreContenido({
    datos,
    gradId,
    locale,
  }: {
    datos: SaludCrediticia;
    gradId: string;
    locale: string;
  }) {
    const { actual, historial, moneda } = datos;
    const b = banda(actual.score_crediticio);
    const chart = historial.map((r: RegistroBuro) => ({
      ...r,
      etiqueta: formatearFecha(r.fecha, locale),
    }));
    const min = Math.min(...historial.map((r) => r.score_crediticio));
    const max = Math.max(...historial.map((r) => r.score_crediticio));

    return (
      <>
        {/* Score actual */}
        <Tarjeta className="aparece aparece-2">
          <TituloTarjeta>{t('score')}</TituloTarjeta>
          <div className="flex flex-wrap items-center gap-6">
            <AnilloScore score={actual.score_crediticio} color={b.color} />
            <div className="space-y-1">
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                style={{ background: `color-mix(in srgb, ${b.color} 15%, transparent)`, color: b.color }}
              >
                {t(`bandas.${b.clave}`)}
              </span>
              <p className="text-xs text-muted">
                {t('ultimaConsulta', { fecha: formatearFecha(actual.fecha, locale) })}
              </p>
              <p className="max-w-xs pt-1 text-sm text-muted">{t('alimentaPerfil')}</p>
            </div>
          </div>
        </Tarjeta>

        {/* Señales de alerta */}
        <div className="aparece aparece-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Tarjeta>
            <TituloTarjeta>{t('diasAtraso')}</TituloTarjeta>
            <p
              className={`cifra text-2xl font-semibold ${
                actual.dias_atraso > 0 ? 'text-risk' : 'text-ok-text'
              }`}
            >
              {actual.dias_atraso > 0 ? t('diasValor', { dias: actual.dias_atraso }) : t('sinAtraso')}
            </p>
          </Tarjeta>
          <Tarjeta>
            <TituloTarjeta>{t('montoAdeudado')}</TituloTarjeta>
            <p className="cifra text-2xl font-semibold text-ink">
              {actual.monto_adeudado > 0
                ? formatearMoneda(actual.monto_adeudado, moneda, locale)
                : t('sinDeuda')}
            </p>
          </Tarjeta>
        </div>

        {/* Evolución del score */}
        <Tarjeta className="aparece aparece-4">
          <TituloTarjeta>{t('evolucionTitulo')}</TituloTarjeta>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 12, right: 12, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeWidth={1} vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line)' }}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                />
                <YAxis
                  domain={[Math.max(SCORE_MIN, min - 30), Math.min(SCORE_MAX, max + 30)]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const punto = payload[0].payload as RegistroBuro & { etiqueta: string };
                    return (
                      <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-md">
                        <p className="font-semibold text-ink">{punto.etiqueta}</p>
                        <p className="cifra mt-0.5 text-ink">{punto.score_crediticio}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score_crediticio"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill={`url(#${gradId})`}
                  isAnimationActive
                  animationDuration={1100}
                  animationEasing="ease-out"
                  dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--card)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Icono nombre="tendencia-arriba" className="h-4 w-4 text-ok-text" strokeWidth={2} />
            {t('alimentaPerfil')}
          </p>
        </Tarjeta>
      </>
    );
  }
}
