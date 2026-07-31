'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { EventoCalendario, Moneda, Tarjeta, TipoEvento, Transaccion } from '@/data';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource } from '@/lib/useDatos';
import { Boton, claseInput } from '@/components/ui';

const TIPOS: TipoEvento[] = ['pago', 'cobro', 'recordatorio'];

/**
 * Actividad del mes: mapa de calor del gasto diario + fechas de corte/pago de las
 * tarjetas + eventos del usuario. Los dias son interactivos: al elegir uno se ve su
 * detalle y se pueden crear, editar y borrar eventos.
 */
export function CalendarioPagos({
  transacciones,
  tarjetas = [],
  eventos = [],
  mes, // 'YYYY-MM'
  moneda,
  onCambio,
}: {
  transacciones: Transaccion[];
  tarjetas?: Tarjeta[];
  eventos?: EventoCalendario[];
  mes: string;
  moneda: Moneda;
  onCambio?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('tarjetas');
  const tCal = useTranslations('calendario');
  const tComun = useTranslations('comun');
  const tPanel = useTranslations('panel');
  const ds = useDataSource();

  const [diaSel, setDiaSel] = useState<number | null>(null);
  const [editando, setEditando] = useState<EventoCalendario | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('pago');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const { dias, offset, gastoPorDia, maximo, iniciales, pagos, eventosPorDia } = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number);
    const primerDia = new Date(anio, mesNum - 1, 1);
    const dias = new Date(anio, mesNum, 0).getDate();
    const offset = (primerDia.getDay() + 6) % 7; // lunes = 0

    const gastoPorDia = new Map<number, number>();
    for (const tx of transacciones) {
      if (!tx.fecha.startsWith(mes) || tx.valor >= 0) continue;
      const dia = Number(tx.fecha.slice(8, 10));
      gastoPorDia.set(dia, (gastoPorDia.get(dia) ?? 0) + Math.abs(tx.valor));
    }
    const maximo = Math.max(...gastoPorDia.values(), 1);

    const pagos = new Map<number, { corte: string[]; pago: string[] }>();
    const anota = (dia: number, clave: 'corte' | 'pago', nombre: string) => {
      const d = Math.min(dia, dias);
      const actual = pagos.get(d) ?? { corte: [], pago: [] };
      actual[clave].push(nombre);
      pagos.set(d, actual);
    };
    for (const tarjeta of tarjetas) {
      if (!tarjeta.credito) continue;
      const nombre = tarjeta.etiqueta ?? `•••• ${tarjeta.ultimos4}`;
      anota(tarjeta.credito.dia_corte, 'corte', nombre);
      anota(tarjeta.credito.dia_pago, 'pago', nombre);
    }

    const eventosPorDia = new Map<number, EventoCalendario[]>();
    for (const evento of eventos) {
      if (!evento.fecha.startsWith(mes)) continue;
      const dia = Number(evento.fecha.slice(8, 10));
      eventosPorDia.set(dia, [...(eventosPorDia.get(dia) ?? []), evento]);
    }

    const base = new Date(2026, 5, 1); // lunes
    const formato = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const iniciales = Array.from({ length: 7 }, (_, i) =>
      formato.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    );

    return { dias, offset, gastoPorDia, maximo, iniciales, pagos, eventosPorDia };
  }, [transacciones, tarjetas, eventos, mes, locale]);

  const fechaDe = (dia: number) => `${mes}-${String(dia).padStart(2, '0')}`;

  const abrirNuevo = () => {
    setEditando(null);
    setTitulo('');
    setTipo('pago');
    setMonto('');
    setMostrandoForm(true);
  };

  const abrirEdicion = (evento: EventoCalendario) => {
    setEditando(evento);
    setTitulo(evento.titulo);
    setTipo(evento.tipo);
    setMonto(evento.monto !== undefined ? String(evento.monto) : '');
    setMostrandoForm(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (diaSel === null) return;
    setGuardando(true);
    try {
      const datos = {
        fecha: fechaDe(diaSel),
        titulo,
        tipo,
        monto: monto ? Number(monto) : undefined,
      };
      if (editando) await ds.actualizarEvento(editando.id, datos);
      else await ds.crearEvento(datos);
      setMostrandoForm(false);
      setEditando(null);
      onCambio?.();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    await ds.eliminarEvento(id);
    onCambio?.();
  };

  const marcaSel = diaSel !== null ? pagos.get(diaSel) : undefined;
  const eventosSel = diaSel !== null ? (eventosPorDia.get(diaSel) ?? []) : [];
  const gastoSel = diaSel !== null ? gastoPorDia.get(diaSel) : undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center">
        {iniciales.map((inicial, i) => (
          <span key={i} className="pb-1 text-[10px] font-semibold uppercase text-muted">
            {inicial}
          </span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`v-${i}`} />
        ))}
        {Array.from({ length: dias }, (_, i) => i + 1).map((dia) => {
          const gasto = gastoPorDia.get(dia);
          const marca = pagos.get(dia);
          const evs = eventosPorDia.get(dia);
          const intensidad = gasto ? 0.35 + 0.65 * (gasto / maximo) : 0;
          const activo = diaSel === dia;

          return (
            <button
              key={dia}
              type="button"
              onClick={() => {
                setDiaSel(activo ? null : dia);
                setMostrandoForm(false);
              }}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors ${
                activo
                  ? 'bg-accent text-sobre-accent'
                  : gasto || marca || evs
                    ? 'bg-canvas-2/70 font-semibold text-ink hover:bg-canvas-2'
                    : 'text-muted/70 hover:bg-canvas-2/50'
              }`}
            >
              {dia}
              <span aria-hidden className="mt-0.5 flex h-1.5 items-center gap-0.5">
                {gasto ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: activo
                        ? 'rgba(255,255,255,0.9)'
                        : `color-mix(in srgb, var(--accent) ${intensidad * 100}%, transparent)`,
                    }}
                  />
                ) : null}
                {marca?.corte.length ? <span className="h-1.5 w-1.5 rounded-full bg-warn-bg" /> : null}
                {marca?.pago.length ? <span className="h-1.5 w-1.5 rounded-full bg-risk" /> : null}
                {evs?.length ? <span className="h-1.5 w-1.5 rounded-full bg-mint" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> {tPanel('gastos')}
        </span>
        {pagos.size > 0 ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warn-bg" /> {t('corte')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-risk" /> {t('pago')}
            </span>
          </>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-mint" /> {tCal('titulo')}
        </span>
      </div>

      {/* Detalle del dia seleccionado */}
      <div className="rounded-xl border border-line bg-canvas-2/40 p-3">
        {diaSel === null ? (
          <p className="text-xs text-muted">{tCal('diaSeleccionado')}</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{formatearFecha(fechaDe(diaSel), locale)}</p>
              <button
                type="button"
                onClick={abrirNuevo}
                className="text-xs font-semibold text-accent hover:underline"
              >
                + {tCal('agregar')}
              </button>
            </div>

            {gastoSel ? (
              <p className="text-xs text-muted">
                {tCal('gastoDia')}: <span className="font-semibold text-ink">{formatearMoneda(gastoSel, moneda, locale)}</span>
              </p>
            ) : null}
            {marcaSel?.corte.map((n) => (
              <p key={`c-${n}`} className="text-xs text-warn">
                {t('corte')}: {n}
              </p>
            ))}
            {marcaSel?.pago.map((n) => (
              <p key={`p-${n}`} className="text-xs text-risk">
                {t('pago')}: {n}
              </p>
            ))}

            {/* Eventos del dia */}
            {eventosSel.length === 0 && !mostrandoForm ? (
              <p className="text-xs text-muted">{tCal('sinEventos')}</p>
            ) : null}
            <ul className="space-y-1">
              {eventosSel.map((evento) => (
                <li
                  key={evento.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-1.5"
                >
                  <span className="text-sm text-ink">
                    <span className="mr-1.5 rounded bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                      {tCal(`tipos.${evento.tipo}`)}
                    </span>
                    {evento.titulo}
                    {evento.monto !== undefined ? (
                      <span className="ml-2 text-muted">{formatearMoneda(evento.monto, moneda, locale)}</span>
                    ) : null}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(evento)}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      {tCal('editar')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void eliminar(evento.id)}
                      className="text-xs font-semibold text-risk hover:underline"
                    >
                      {tCal('eliminar')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            {/* Alta / edicion */}
            {mostrandoForm ? (
              <form onSubmit={guardar} className="space-y-2 rounded-lg border border-line bg-card p-3">
                <input
                  className={`${claseInput} !py-2 text-sm`}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder={tCal('tituloEvento')}
                  maxLength={60}
                  required
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    className={`${claseInput} !w-auto !py-2 text-sm`}
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoEvento)}
                  >
                    {TIPOS.map((valor) => (
                      <option key={valor} value={valor}>
                        {tCal(`tipos.${valor}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${claseInput} !w-32 !py-2 text-sm`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder={tCal('monto')}
                  />
                </div>
                <div className="flex gap-2">
                  <Boton type="submit" disabled={guardando} className="!px-3 !py-1.5 text-xs">
                    {guardando ? tComun('guardando') : tCal('guardar')}
                  </Boton>
                  <Boton
                    type="button"
                    variante="fantasma"
                    onClick={() => setMostrandoForm(false)}
                    className="!px-3 !py-1.5 text-xs"
                  >
                    {tComun('cancelar')}
                  </Boton>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
