'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { CuentaBancaria, EstadoBancario, RedPago, Tarjeta } from '@/data';
import { useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { Boton, EstadoCarga, Tarjeta as Panel, TituloTarjeta } from '@/components/ui';

const RED_ETIQUETA: Record<RedPago, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'AMEX',
};

const ESTADO_CLASE: Record<EstadoBancario, string> = {
  activa: 'bg-ok/12 text-ok-text',
  bloqueada: 'bg-warn-bg/18 text-warn',
  cancelada: 'bg-risk/12 text-risk',
};

interface DatosBanca {
  cuentas: CuentaBancaria[];
  tarjetas: Tarjeta[];
}

function colorUtilizacion(fraccion: number): { barra: string; texto: string } {
  if (fraccion <= 0.3) return { barra: 'bg-ok', texto: 'text-ok-text' };
  if (fraccion <= 0.7) return { barra: 'bg-warn-bg', texto: 'text-warn' };
  return { barra: 'bg-risk', texto: 'text-risk' };
}

function TarjetaVisual({ tarjeta }: { tarjeta: Tarjeta }) {
  const t = useTranslations('tarjetas');
  const locale = useLocale();
  const { usuario } = useSesion();
  const moneda = usuario?.moneda_principal ?? 'MXN';
  const esCredito = tarjeta.tipo === 'credito';

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--sombra-md)]">
      {/* Cara de la tarjeta */}
      <div
        className="relative flex h-44 flex-col justify-between p-5 text-white"
        style={{
          background: esCredito
            ? 'linear-gradient(135deg, #33414c 0%, #1b262e 55%, #0a1219 100%)'
            : 'linear-gradient(135deg, #4a5a68 0%, #333f4b 60%, #1b262e 100%)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">
              {esCredito ? t('credito') : t('debito')}
            </p>
            {tarjeta.etiqueta ? (
              <p className="cifra mt-0.5 text-lg font-semibold">{tarjeta.etiqueta}</p>
            ) : null}
          </div>
          <span className="text-sm font-bold italic tracking-tight text-white/90">
            {RED_ETIQUETA[tarjeta.red_pago]}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <span className="cifra text-lg tracking-[0.2em] tabular-nums">
            •••• {tarjeta.ultimos4}
          </span>
          <span className="text-xs text-white/70">{t('vence', { fecha: tarjeta.fecha_vencimiento })}</span>
        </div>
      </div>

      {/* Pie: estado + credito */}
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_CLASE[tarjeta.estado]}`}
          >
            {t(`estados.${tarjeta.estado}`)}
          </span>
          {esCredito && tarjeta.credito ? (
            <span className="flex gap-2 text-[11px] font-medium text-muted">
              <span>{t('corteDia', { dia: tarjeta.credito.dia_corte })}</span>
              <span>·</span>
              <span>{t('pagoDia', { dia: tarjeta.credito.dia_pago })}</span>
            </span>
          ) : null}
        </div>

        {esCredito && tarjeta.credito ? (
          (() => {
            const { limite_credito, saldo_utilizado } = tarjeta.credito;
            const fraccion = limite_credito > 0 ? Math.min(1, saldo_utilizado / limite_credito) : 0;
            const color = colorUtilizacion(fraccion);
            return (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted">{t('utilizacion')}</span>
                  <span className={`font-semibold ${color.texto}`}>{Math.round(fraccion * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-canvas-2">
                  <div
                    className={`h-full rounded-full ${color.barra}`}
                    style={{ width: `${Math.max(4, fraccion * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                  <span>
                    {t('usado')}: {formatearMoneda(saldo_utilizado, moneda, locale)}
                  </span>
                  <span>
                    {t('disponible')}: {formatearMoneda(Math.max(0, limite_credito - saldo_utilizado), moneda, locale)}
                  </span>
                </div>
              </div>
            );
          })()
        ) : null}
      </div>
    </div>
  );
}

export default function PaginaTarjetas() {
  const t = useTranslations('tarjetas');
  const locale = useLocale();
  const router = useRouter();
  const ds = useDataSource();

  const [tieneDemo, setTieneDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('demo_saldo') !== null) {
      setTieneDemo(true);
    }
  }, []);

  const { datos: datosBackend, cargando, error, recargar } = useDatos<DatosBanca>(async (fuente) => {
    const [cuentas, tarjetas] = await Promise.all([fuente.cuentas(), fuente.tarjetas()]);
    return { cuentas, tarjetas };
  });

  // Datos simulados inteligentes si el usuario viene del registro en vivo
  // Datos simulados inteligentes si el usuario viene del registro en vivo
  const datosMock: DatosBanca = {
    cuentas: [
      {
        id: 'cuenta-demo-principal',
        numero: '**** 4589',
        tipo: 'debito',
        saldo: 50000,
        moneda: 'MXN',
        estado: 'activa',
        fecha_apertura: '2026-01-01',
      },
    ],
    tarjetas: [
      {
        id: 'tarjeta-demo-1',
        cuenta_id: 'cuenta-demo-principal',
        tipo: 'debito',
        red_pago: 'visa',
        ultimos4: '4589',
        fecha_vencimiento: '12/28',
        estado: 'activa',
        etiqueta: 'Cuenta Principal',
      },
    ],
  } as unknown as DatosBanca;

  // Si hay datos en el backend los usamos; si está vacío y viene del registro, usamos la demo automática
  const datos = (datosBackend && datosBackend.cuentas.length > 0) || !tieneDemo ? datosBackend : datosMock;

  const eliminarTarjeta = async (id: string) => {
    if (!window.confirm(t('eliminarConfirmar'))) return;
    await ds.eliminarTarjeta(id);
    recargar();
  };

  return (
    <div className="space-y-5">
      <header className="aparece flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
          <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
        </div>
        <Boton onClick={() => router.push('/tarjetas/nueva')}>{t('agregar')}</Boton>
      </header>

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        {/* Cuentas */}
        <Panel className="aparece aparece-2">
          <TituloTarjeta>{t('cuentasTitulo')}</TituloTarjeta>
          {datos && datos.cuentas.length > 0 ? (
            <ul className="divide-y divide-line">
              {datos.cuentas.map((cuenta) => (
                <li key={cuenta.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="cifra text-sm font-semibold text-ink">
                      {t('cuentaNum', { numero: cuenta.numero })}
                    </p>
                    <p className="text-xs text-muted">
                      {t('apertura', { fecha: formatearFecha(cuenta.fecha_apertura, locale) })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_CLASE[cuenta.estado]}`}
                  >
                    {t(`estados.${cuenta.estado}`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted">{t('sinCuentas')}</p>
          )}
        </Panel>

        {/* Tarjetas */}
        <div className="aparece aparece-3 mt-5">
          <TituloTarjeta>{t('tarjetasTitulo')}</TituloTarjeta>
          {datos && datos.tarjetas.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {datos.tarjetas.map((tarjeta) => (
                <div key={tarjeta.id} className="space-y-2">
                  <TarjetaVisual tarjeta={tarjeta} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/movimientos?tarjeta=${tarjeta.id}`)}
                      className="flex-1 rounded-xl border border-line bg-card/60 py-2 text-xs font-semibold text-accent transition hover:border-accent hover:bg-card"
                    >
                      {t('verMovimientos')}
                    </button>
                    <button
                      onClick={() => router.push(`/tarjetas/${tarjeta.id}`)}
                      className="rounded-xl border border-line bg-card/60 px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
                    >
                      {t('editar')}
                    </button>
                    <button
                      onClick={() => void eliminarTarjeta(tarjeta.id)}
                      className="rounded-xl border border-risk/30 bg-risk/5 px-3 py-2 text-xs font-semibold text-risk transition hover:bg-risk/10"
                    >
                      {t('eliminar')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-muted">{t('vacio')}</p>
          )}
        </div>

      </EstadoCarga>
    </div>
  );
}