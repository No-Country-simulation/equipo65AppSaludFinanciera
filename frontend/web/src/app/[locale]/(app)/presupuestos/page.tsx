'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Categoria, CategoriaSlug, Presupuesto } from '@/data';
import { formatearMoneda, formatearPct } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { BarraPresupuesto, estadoPresupuesto } from '@/components/Presupuestos';
import { Boton, Campo, claseInput, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosPresupuestos {
  presupuestos: Presupuesto[];
  categorias: Categoria[];
}

export default function PaginaPresupuestos() {
  const t = useTranslations('presupuestos');
  const tComun = useTranslations('comun');
  const locale = useLocale();
  const ds = useDataSource();

  // 🚀 Detección automática del modo demo mediante el localStorage
  const [tieneDemo, setTieneDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('demo_saldo') !== null) {
      setTieneDemo(true);
    }
  }, []);

  const { datos: datosBackend, cargando, error, recargar } = useDatos<DatosPresupuestos>(async (fuente) => {
    const [presupuestos, categorias] = await Promise.all([
      fuente.presupuestos(),
      fuente.categorias(),
    ]);
    return { presupuestos, categorias };
  });

  // Datos mock inteligentes para la demo en vivo
  const datosMock: DatosPresupuestos = useMemo(() => ({
    presupuestos: [
      {
        id: 'p-1',
        usuario_id: 'demo-user',
        categoria: 'alimentacion' as CategoriaSlug,
        limite: 6000,
        gastos_mes: 4500,
        gastado: 4500,
        mes: '2026-08',
        moneda: 'MXN',
      },
      {
        id: 'p-2',
        usuario_id: 'demo-user',
        categoria: 'vivienda' as CategoriaSlug,
        limite: 10000,
        gastos_mes: 8500,
        gastado: 8500,
        mes: '2026-08',
        moneda: 'MXN',
      },
      {
        id: 'p-3',
        usuario_id: 'demo-user',
        categoria: 'transporte' as CategoriaSlug,
        limite: 3000,
        gastos_mes: 1800,
        gastado: 1800,
        mes: '2026-08',
        moneda: 'MXN',
      },
    ],
    categorias: datosBackend?.categorias ?? [
      { slug: 'alimentacion', etiqueta: 'Alimentación', tipo: 'gasto' },
      { slug: 'vivienda', etiqueta: 'Vivienda', tipo: 'gasto' },
      { slug: 'transporte', etiqueta: 'Transporte', tipo: 'gasto' },
      { slug: 'servicios', etiqueta: 'Servicios', tipo: 'gasto' },
      { slug: 'compras', etiqueta: 'Compras', tipo: 'gasto' },
    ],
  }), [datosBackend?.categorias]);

  // Si el backend tiene presupuestos o no estamos en modo demo, usamos backend; si no, el mock
  const datos = (datosBackend && datosBackend.presupuestos.length > 0) || !tieneDemo ? datosBackend : datosMock;

  const etiquetas = useMemo(
    () => new Map(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const [editando, setEditando] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaSlug | ''>('');
  const [limite, setLimite] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!categoria) return;
    setGuardando(true);
    try {
      await ds.guardarPresupuesto(categoria, Number(limite));
      setCategoria('');
      setLimite('');
      setEditando(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (cat: CategoriaSlug) => {
    await ds.eliminarPresupuesto(cat);
    recargar();
  };

  const editar = (p: Presupuesto) => {
    setCategoria(p.categoria);
    setLimite(String(p.limite));
    setEditando(true);
  };

  const totalLimite = datos?.presupuestos.reduce((s, p) => s + p.limite, 0) ?? 0;
  const totalGastado = datos?.presupuestos.reduce((s, p) => s + p.gastado, 0) ?? 0;
  const moneda = datos?.presupuestos[0]?.moneda ?? 'USD';
  const enRiesgo = datos?.presupuestos.filter((p) => estadoPresupuesto(p).fraccion >= 0.8).length ?? 0;
  const fraccionTotal = totalLimite > 0 ? totalGastado / totalLimite : 0;

  // categorías de gasto sin presupuesto aún
  const disponibles = (datos?.categorias ?? []).filter(
    (c) => c.tipo === 'gasto' && !datos?.presupuestos.some((p) => p.categoria === c.slug),
  );

  return (
    <div className="space-y-5">
      <header className="aparece flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
          <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
        </div>
        <Boton onClick={() => { setEditando((v) => !v); setCategoria(''); setLimite(''); }}>
          {t('nuevo')}
        </Boton>
      </header>

      {datos && datos.presupuestos.length > 0 ? (
        <Tarjeta className="aparece aparece-2">
          <TituloTarjeta>{t('totalTitulo')}</TituloTarjeta>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="cifra text-2xl font-semibold text-ink">
              {formatearMoneda(totalGastado, moneda, locale)}
              <span className="ml-1.5 text-base font-normal text-muted">
                {t('de')} {formatearMoneda(totalLimite, moneda, locale)}
              </span>
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                enRiesgo > 0 ? 'bg-warn-bg/15 text-warn' : 'bg-ok/12 text-ok-text'
              }`}
            >
              {enRiesgo > 0 ? `${enRiesgo} ${t('enRiesgo')}` : t('sano')}
            </span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-canvas-2">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(100, fraccionTotal * 100)}%`,
                background: fraccionTotal >= 1 ? 'var(--risk)' : fraccionTotal >= 0.8 ? 'var(--warn-bg)' : 'var(--mint)',
              }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-muted">{formatearPct(fraccionTotal, locale, 0)}</p>
        </Tarjeta>
      ) : null}

      {editando ? (
        <Tarjeta className="aparece">
          <TituloTarjeta>{t('nuevo')}</TituloTarjeta>
          <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <Campo etiqueta={t('categoria')}>
              <select className={claseInput} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaSlug)} required>
                <option value="" disabled>-</option>
                {/* la categoría en edición + las disponibles */}
                {[
                  ...(categoria && !disponibles.some((c) => c.slug === categoria)
                    ? [{ slug: categoria, etiqueta: etiquetas.get(categoria) ?? categoria, tipo: 'gasto' as const }]
                    : []),
                  ...disponibles,
                ].map((c) => (
                  <option key={c.slug} value={c.slug}>{c.etiqueta}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta={t('limite')}>
              <input className={claseInput} type="number" min="1" value={limite} onChange={(e) => setLimite(e.target.value)} required />
            </Campo>
            <div className="flex gap-2 pb-0.5">
              <Boton type="submit" disabled={guardando}>{t('guardar')}</Boton>
              <Boton type="button" variante="fantasma" onClick={() => setEditando(false)}>{tComun('cancelar')}</Boton>
            </div>
          </form>
        </Tarjeta>
      ) : null}

      <EstadoCarga cargando={cargando} error={!tieneDemo ? error : null} recargar={recargar}>
        {datos && datos.presupuestos.length === 0 ? (
          <Tarjeta className="aparece aparece-2 py-14 text-center">
            <p className="mx-auto max-w-sm text-sm text-muted">{t('vacio')}</p>
          </Tarjeta>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...(datos?.presupuestos ?? [])]
              .sort((a, b) => estadoPresupuesto(b).fraccion - estadoPresupuesto(a).fraccion)
              .map((presupuesto, indice) => (
                <div key={presupuesto.categoria} className="aparece" style={{ animationDelay: `${indice * 55}ms` }}>
                  <BarraPresupuesto
                    presupuesto={presupuesto}
                    etiqueta={etiquetas.get(presupuesto.categoria) ?? presupuesto.categoria}
                    onEditar={() => editar(presupuesto)}
                    onEliminar={() => void eliminar(presupuesto.categoria)}
                  />
                </div>
              ))}
          </div>
        )}
      </EstadoCarga>
    </div>
  );
}