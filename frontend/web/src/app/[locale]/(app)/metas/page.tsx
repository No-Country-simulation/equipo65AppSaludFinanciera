'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { MetaAhorro } from '@/data';
import { formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { progresoMeta, TarjetaMeta } from '@/components/Metas';
import { Icono, ICONOS_META, type NombreIcono } from '@/components/Icono';
import { Boton, Campo, claseInput, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

export default function PaginaMetas() {
  const t = useTranslations('metas');
  const tComun = useTranslations('comun');
  const locale = useLocale();
  const ds = useDataSource();

  const { datos, cargando, error, recargar } = useDatos((fuente) => fuente.metas());

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [ahorrado, setAhorrado] = useState('');
  const [fecha, setFecha] = useState('');
  const [icono, setIcono] = useState<NombreIcono>('meta');
  const [guardando, setGuardando] = useState(false);
  const [aportando, setAportando] = useState<MetaAhorro | null>(null);
  const [montoAporte, setMontoAporte] = useState('');

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    try {
      await ds.crearMeta({
        nombre,
        objetivo: Number(objetivo),
        ahorrado: ahorrado ? Number(ahorrado) : 0,
        fecha_limite: fecha || undefined,
        icono,
      });
      setNombre('');
      setObjetivo('');
      setAhorrado('');
      setFecha('');
      setIcono('meta');
      setCreando(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const aportar = async () => {
    if (!aportando) return;
    await ds.aportarMeta(aportando.id, Number(montoAporte));
    setAportando(null);
    setMontoAporte('');
    recargar();
  };

  const eliminar = async (id: string) => {
    await ds.eliminarMeta(id);
    recargar();
  };

  const totalObjetivo = datos?.reduce((s, m) => s + m.objetivo, 0) ?? 0;
  const totalAhorrado = datos?.reduce((s, m) => s + m.ahorrado, 0) ?? 0;

  return (
    <div className="space-y-5">
      <header className="aparece flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
          <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
        </div>
        <Boton onClick={() => setCreando((v) => !v)}>{t('nueva')}</Boton>
      </header>

      {datos && datos.length > 0 ? (
        <section
          className="aparece aparece-2 relative overflow-hidden rounded-[var(--radio)] p-6 text-white shadow-[var(--sombra-lg)]"
          style={{ background: 'linear-gradient(140deg, var(--hero-b), var(--hero-a) 60%, #071a16)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/55">{t('ahorrado')}</p>
              <p className="cifra mt-1 text-3xl font-semibold">
                {datos.length > 0 ? formatearMoneda(totalAhorrado, datos[0].moneda, locale) : '-'}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {t('objetivoCorto')}: {datos.length > 0 ? formatearMoneda(totalObjetivo, datos[0].moneda, locale) : '-'}
              </p>
            </div>
            <div className="cifra text-4xl font-semibold text-mint">
              {totalObjetivo > 0 ? Math.round((totalAhorrado / totalObjetivo) * 100) : 0}%
            </div>
          </div>
        </section>
      ) : null}

      {creando ? (
        <Tarjeta className="aparece">
          <TituloTarjeta>{t('nueva')}</TituloTarjeta>
          <form onSubmit={crear} className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta={t('nombre')}>
              <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
            </Campo>
            <Campo etiqueta={t('objetivo')}>
              <input className={claseInput} type="number" min="1" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} required />
            </Campo>
            <Campo etiqueta={t('ahorradoInicial')}>
              <input className={claseInput} type="number" min="0" value={ahorrado} onChange={(e) => setAhorrado(e.target.value)} />
            </Campo>
            <Campo etiqueta={t('fechaLimite')}>
              <input className={claseInput} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Campo>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('iconoAyuda')}</span>
              <div className="flex flex-wrap gap-2">
                {ICONOS_META.map((clave) => (
                  <button
                    type="button"
                    key={clave}
                    onClick={() => setIcono(clave)}
                    className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                      icono === clave ? 'bg-accent text-white ring-2 ring-accent' : 'bg-canvas-2 text-ink-soft hover:bg-canvas-2/60'
                    }`}
                  >
                    <Icono nombre={clave} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Boton type="submit" disabled={guardando}>
                {guardando ? tComun('guardando') : t('crear')}
              </Boton>
              <Boton type="button" variante="fantasma" onClick={() => setCreando(false)}>
                {tComun('cancelar')}
              </Boton>
            </div>
          </form>
        </Tarjeta>
      ) : null}

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        {datos && datos.length === 0 ? (
          <Tarjeta className="aparece aparece-2 py-14 text-center">
            <p className="mx-auto max-w-sm text-sm text-muted">{t('vacio')}</p>
          </Tarjeta>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...(datos ?? [])]
              .sort((a, b) => progresoMeta(b) - progresoMeta(a))
              .map((meta, indice) => (
                <div key={meta.id} className="aparece" style={{ animationDelay: `${indice * 60}ms` }}>
                  <TarjetaMeta
                    meta={meta}
                    onAportar={() => {
                      setAportando(meta);
                      setMontoAporte('');
                    }}
                    onEliminar={() => void eliminar(meta.id)}
                  />
                </div>
              ))}
          </div>
        )}
      </EstadoCarga>

      {/* Modal aportar */}
      {aportando ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => setAportando(null)}
        >
          <div className="w-full max-w-sm rounded-[var(--radio)] bg-card p-5 shadow-[var(--sombra-lg)]" onClick={(e) => e.stopPropagation()}>
            <p className="cifra mb-1 flex items-center gap-2 text-lg font-semibold text-ink">
              <span style={{ color: aportando.color }}>
                <Icono nombre={aportando.icono as NombreIcono} />
              </span>
              {aportando.nombre}
            </p>
            <p className="mb-4 text-sm text-muted">{t('montoAporte')}</p>
            <input
              className={claseInput}
              type="number"
              min="1"
              value={montoAporte}
              onChange={(e) => setMontoAporte(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <Boton onClick={() => void aportar()} disabled={!montoAporte} className="flex-1">
                {t('aportar')}
              </Boton>
              <Boton variante="fantasma" onClick={() => setAportando(null)}>
                {tComun('cancelar')}
              </Boton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
