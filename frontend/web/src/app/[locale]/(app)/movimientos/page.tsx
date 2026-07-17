'use client';

import { useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Categoria, CategoriaSlug, PaginaTransacciones } from '@/data';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { CalendarioPagos } from '@/components/CalendarioPagos';
import { Icono } from '@/components/Icono';
import { Boton, Campo, claseInput, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosMovimientos {
  pagina: PaginaTransacciones;
  categorias: Categoria[];
}

type ColumnaOrden = 'fecha' | 'descripcion' | 'categoria' | 'confianza' | 'monto';

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

export default function PaginaMovimientos() {
  const t = useTranslations('movimientos');
  const tComun = useTranslations('comun');
  const locale = useLocale();
  const ds = useDataSource();

  const [filtro, setFiltro] = useState<CategoriaSlug | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'lista' | 'tabla'>('lista');
  const [ordenCol, setOrdenCol] = useState<ColumnaOrden>('fecha');
  const [ordenAsc, setOrdenAsc] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [mostrandoAlta, setMostrandoAlta] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState(''); // solo interfaz (F9: etiquetas/notas)
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'info' } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const inputCsv = useRef<HTMLInputElement>(null);

  const { datos, cargando, error, recargar } = useDatos<DatosMovimientos>(
    async (fuente) => {
      const [pagina, categorias] = await Promise.all([
        fuente.transacciones({ categoria: filtro || undefined, tam: 100 }),
        fuente.categorias(),
      ]);
      return { pagina, categorias };
    },
    [filtro],
  );

  const etiquetas = useMemo(
    () => new Map(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const visibles = useMemo(() => {
    const items = (datos?.pagina.items ?? []).filter((tx) =>
      busqueda ? tx.descripcion.toLowerCase().includes(busqueda.toLowerCase()) : true,
    );
    const dir = ordenAsc ? 1 : -1;
    return [...items].sort((a, b) => {
      switch (ordenCol) {
        case 'monto':
          return (Math.abs(a.valor) - Math.abs(b.valor)) * dir;
        case 'descripcion':
          return a.descripcion.localeCompare(b.descripcion) * dir;
        case 'categoria':
          return (etiquetas.get(a.categoria) ?? '').localeCompare(etiquetas.get(b.categoria) ?? '') * dir;
        case 'confianza':
          return (a.confianza - b.confianza) * dir;
        default:
          return a.fecha.localeCompare(b.fecha) * dir;
      }
    });
  }, [datos?.pagina.items, busqueda, ordenCol, ordenAsc, etiquetas]);

  const resumen = useMemo(() => {
    let entra = 0;
    let sale = 0;
    for (const tx of visibles) {
      if (tx.valor > 0) entra += tx.valor;
      else sale += Math.abs(tx.valor);
    }
    return { entra, sale, moneda: visibles[0]?.moneda ?? 'USD' };
  }, [visibles]);

  const avisar = (texto: string, tipo: 'ok' | 'info' = 'info') => {
    setAviso({ texto, tipo });
    window.setTimeout(() => setAviso(null), 3500);
  };

  const ordenarPor = (col: ColumnaOrden) => {
    if (ordenCol === col) setOrdenAsc((v) => !v);
    else {
      setOrdenCol(col);
      setOrdenAsc(col === 'descripcion' || col === 'categoria');
    }
  };

  const alternarSeleccion = (id: string) => {
    setSeleccion((prev) => {
      const nueva = new Set(prev);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });
  };

  const alternarTodas = () => {
    setSeleccion((prev) => (prev.size === visibles.length ? new Set() : new Set(visibles.map((v) => v.id))));
  };

  const eliminarSeleccionadas = async () => {
    for (const id of seleccion) await ds.eliminarTransaccion(id);
    setSeleccion(new Set());
    recargar();
  };

  const agregar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    try {
      await ds.crearTransaccion({ descripcion, valor: Number(monto), fecha: fecha || undefined });
      setDescripcion('');
      setMonto('');
      setFecha('');
      setNota('');
      setMostrandoAlta(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const importar = async (archivo: File) => {
    const resultado = await ds.importarCsv(archivo);
    avisar(t('resultadoImport', { importadas: resultado.importadas, rechazadas: resultado.rechazadas }), 'ok');
    recargar();
  };

  const corregir = async (id: string, categoria: CategoriaSlug) => {
    await ds.corregirCategoria(id, categoria);
    setCorrigiendo(null);
    recargar();
  };

  const eliminar = async (id: string) => {
    await ds.eliminarTransaccion(id);
    recargar();
  };

  return (
    <div
      className="relative space-y-5"
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setArrastrando(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        const archivo = e.dataTransfer.files?.[0];
        if (archivo && archivo.name.toLowerCase().endsWith('.csv')) void importar(archivo);
      }}
    >
      {/* Overlay de drag & drop del CSV */}
      {arrastrando ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-accent/10 backdrop-blur-[2px]">
          <div className="rounded-[var(--radio)] border-2 border-dashed border-accent bg-card px-10 py-8 text-center shadow-[var(--sombra-lg)]">
            <p className="cifra text-lg font-semibold text-accent">{t('arrastraCsv')}</p>
            <p className="mt-1 text-xs text-muted">{t('csvFormato')}</p>
          </div>
        </div>
      ) : null}

      <header className="aparece flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
          <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputCsv}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(evento) => {
              const archivo = evento.target.files?.[0];
              if (archivo) void importar(archivo);
              evento.target.value = '';
            }}
          />
          {/* Export solo-UI (F9.15): se activa al conectar el backend */}
          <Boton variante="fantasma" onClick={() => avisar(tComun('proximamente'))}>
            {t('exportPdf')}
          </Boton>
          <Boton variante="fantasma" onClick={() => avisar(tComun('proximamente'))}>
            {t('exportXlsx')}
          </Boton>
          <Boton variante="fantasma" onClick={() => inputCsv.current?.click()} title={t('csvFormato')}>
            {t('importar')}
          </Boton>
          <Boton onClick={() => setMostrandoAlta((valor) => !valor)}>{t('nuevo')}</Boton>
        </div>
      </header>

      {aviso ? (
        <p
          className={`aparece rounded-xl px-4 py-2.5 text-sm font-medium ${
            aviso.tipo === 'ok' ? 'bg-ok/10 text-ok-text' : 'bg-canvas-2 text-ink-soft'
          }`}
        >
          {aviso.texto}
        </p>
      ) : null}

      {mostrandoAlta ? (
        <Tarjeta className="aparece">
          <form onSubmit={agregar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_2fr_auto] lg:items-end">
            <Campo etiqueta={t('descripcion')}>
              <input className={claseInput} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} required autoFocus />
            </Campo>
            <Campo etiqueta={t('monto')} ayuda={t('montoAyuda')}>
              <input className={claseInput} type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </Campo>
            <Campo etiqueta={t('fecha')}>
              <input className={claseInput} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Campo>
            <Campo etiqueta={t('nota')}>
              <input className={claseInput} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} />
            </Campo>
            <div className="flex gap-2 pb-5 lg:pb-0.5">
              <Boton type="submit" disabled={guardando}>
                {guardando ? tComun('guardando') : tComun('guardar')}
              </Boton>
              <Boton type="button" variante="fantasma" onClick={() => setMostrandoAlta(false)}>
                {tComun('cancelar')}
              </Boton>
            </div>
          </form>
        </Tarjeta>
      ) : null}

      {/* Búsqueda + filtros + orden + vista */}
      <div className="aparece aparece-2 flex flex-wrap gap-3">
        <input
          className={`${claseInput} min-w-[200px] flex-1`}
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder={t('buscar')}
          type="search"
        />
        <select
          className={`${claseInput} max-w-[12rem]`}
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value as CategoriaSlug | '')}
        >
          <option value="">{t('todas')}</option>
          {datos?.categorias.map((categoria) => (
            <option key={categoria.slug} value={categoria.slug}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
        <div className="inline-flex rounded-2xl border border-line bg-canvas-2/60 p-0.5 text-sm font-semibold">
          {(['fecha', 'monto'] as const).map((modo) => (
            <button
              key={modo}
              onClick={() => {
                setOrdenCol(modo);
                setOrdenAsc(false);
              }}
              className={`rounded-xl px-3 py-2 transition-colors ${
                ordenCol === modo ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {t(modo === 'fecha' ? 'ordenFecha' : 'ordenMonto')}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-2xl border border-line bg-canvas-2/60 p-0.5 text-sm font-semibold">
          {(['lista', 'tabla'] as const).map((modo) => (
            <button
              key={modo}
              onClick={() => setVista(modo)}
              className={`rounded-xl px-3 py-2 transition-colors ${
                vista === modo ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {t(modo === 'lista' ? 'vistaLista' : 'vistaTabla')}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen entradas/salidas del set visible */}
      <div className="aparece aparece-2 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-ok/[0.06] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('entra')}</p>
          <p className="cifra mt-0.5 text-lg font-semibold text-ok-text">
            +{formatearMoneda(resumen.entra, resumen.moneda, locale)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-risk/[0.05] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('sale')}</p>
          <p className="cifra mt-0.5 text-lg font-semibold text-risk">
            −{formatearMoneda(resumen.sale, resumen.moneda, locale)}
          </p>
        </div>
      </div>

      {/* Barra de acciones en lote (vista tabla) */}
      {vista === 'tabla' && seleccion.size > 0 ? (
        <div className="aparece flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/8 px-4 py-2.5">
          <span className="text-sm font-semibold text-accent">{t('seleccionadas', { n: seleccion.size })}</span>
          <Boton variante="peligro" onClick={() => void eliminarSeleccionadas()}>
            {t('eliminarSel')}
          </Boton>
        </div>
      ) : null}

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        <Tarjeta className="aparece aparece-3 !p-0">
          {visibles.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted">
              {busqueda ? t('sinResultados') : t('vacio')}
            </p>
          ) : vista === 'tabla' ? (
            /* ── Vista tabla: columnas ordenables + selección múltiple ── */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        style={{ accentColor: 'var(--accent)' }}
                        checked={seleccion.size === visibles.length && visibles.length > 0}
                        onChange={alternarTodas}
                      />
                    </th>
                    {(
                      [
                        ['fecha', t('fecha')],
                        ['descripcion', t('descripcion')],
                        ['categoria', t('categoria')],
                        ['confianza', t('confianzaCol')],
                        ['monto', t('monto')],
                      ] as [ColumnaOrden, string][]
                    ).map(([col, etiqueta]) => (
                      <th key={col} className={col === 'monto' ? 'px-4 py-3 text-right' : 'px-4 py-3'}>
                        <button
                          onClick={() => ordenarPor(col)}
                          className={`inline-flex items-center gap-1 font-semibold transition-colors hover:text-ink ${
                            ordenCol === col ? 'text-accent' : ''
                          }`}
                        >
                          {etiqueta}
                          {ordenCol === col ? (
                            <Icono nombre={ordenAsc ? 'arriba' : 'abajo'} className="h-3 w-3" strokeWidth={2.4} />
                          ) : null}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibles.map((tx) => (
                    <tr key={tx.id} className={`transition-colors ${seleccion.has(tx.id) ? 'bg-accent/6' : 'hover:bg-canvas-2/50'}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          style={{ accentColor: 'var(--accent)' }}
                          checked={seleccion.has(tx.id)}
                          onChange={() => alternarSeleccion(tx.id)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                        {formatearFecha(tx.fecha, locale)}
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-3 font-medium text-ink">{tx.descripcion}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-ink/5 px-1.5 py-0.5 text-xs font-medium text-ink-soft">
                          {etiquetas.get(tx.categoria) ?? tx.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {tx.categoria_origen === 'usuario' ? t('origenUsuario') : `${Math.round(tx.confianza * 100)}%`}
                      </td>
                      <td className={`cifra whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${tx.valor > 0 ? 'text-ok-text' : 'text-ink'}`}>
                        {tx.valor > 0 ? '+' : ''}
                        {formatearMoneda(tx.valor, tx.moneda, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Vista lista ── */
            <ul className="divide-y divide-line">
              {visibles.map((transaccion) => (
                <li key={transaccion.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{transaccion.descripcion}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {formatearFecha(transaccion.fecha, locale)}
                      <span className="rounded-md bg-ink/5 px-1.5 py-0.5 font-medium">
                        {etiquetas.get(transaccion.categoria) ?? transaccion.categoria}
                      </span>
                      {transaccion.categoria_origen === 'usuario' ? (
                        <span className="text-accent">{t('origenUsuario')}</span>
                      ) : (
                        <span>{t('confianza', { pct: Math.round(transaccion.confianza * 100) })}</span>
                      )}
                    </p>
                  </div>

                  <p className={`cifra text-base font-semibold tabular-nums ${transaccion.valor > 0 ? 'text-ok-text' : 'text-ink'}`}>
                    {transaccion.valor > 0 ? '+' : ''}
                    {formatearMoneda(transaccion.valor, transaccion.moneda, locale)}
                  </p>

                  {corrigiendo === transaccion.id ? (
                    <select
                      className={`${claseInput} !w-44 !py-1.5 text-xs`}
                      defaultValue={transaccion.categoria}
                      autoFocus
                      onChange={(evento) => void corregir(transaccion.id, evento.target.value as CategoriaSlug)}
                      onBlur={() => setCorrigiendo(null)}
                    >
                      {datos?.categorias.map((categoria) => (
                        <option key={categoria.slug} value={categoria.slug}>
                          {categoria.etiqueta}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCorrigiendo(transaccion.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10"
                      >
                        {t('corregir')}
                      </button>
                      <button
                        onClick={() => void eliminar(transaccion.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-risk hover:bg-risk/10"
                      >
                        {t('eliminar')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {/* Calendario de pagos del mes */}
        <Tarjeta className="aparece aparece-4 max-w-md">
          <TituloTarjeta>{t('calendarioTitulo')}</TituloTarjeta>
          <CalendarioPagos
            transacciones={datos?.pagina.items ?? []}
            mes={MES_ACTUAL}
            moneda={resumen.moneda}
          />
        </Tarjeta>
      </EstadoCarga>
    </div>
  );
}
