'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { MetaAhorro, Transaccion } from '@/data';
import { useRouter } from '@/i18n/navigation';
import { formatearMoneda } from '@/lib/formato';
import { useDataSource } from '@/lib/useDatos';
import { Icono } from '@/components/Icono';

/** Cuantos movimientos se traen para buscar sobre ellos. */
const MOVIMIENTOS_A_CARGAR = 300;

/** Sin acentos y en minusculas: buscar "cafe" tiene que encontrar "Café". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Buscador global sobre los datos de la persona.
 *
 * Busca en el CLIENTE a proposito: la API no tiene busqueda por texto
 * (`FiltrosTransacciones` filtra por fecha, categoria y tarjeta, no por
 * descripcion), y añadirla al backend es un cambio de contrato. Con traerse
 * los ultimos movimientos y las metas se cubre lo que la gente busca de
 * verdad, sin prometer lo que no hay.
 *
 * Antes esto era una caja de texto que no hacia nada, con una etiqueta de
 * "proximamente".
 */
export function BuscadorGlobal({ onCerrar }: { onCerrar: () => void }) {
  const t = useTranslations('panel');
  const tComun = useTranslations('comun');
  const locale = useLocale();
  const ds = useDataSource();
  const router = useRouter();

  const [texto, setTexto] = useState('');
  const [movimientos, setMovimientos] = useState<Transaccion[]>([]);
  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  // Se carga UNA vez al abrir y se filtra en memoria: asi teclear no dispara
  // una peticion por pulsacion.
  useEffect(() => {
    let activo = true;
    Promise.all([ds.transacciones({ pagina: 0, tam: MOVIMIENTOS_A_CARGAR }), ds.metas()])
      .then(([pagina, listaMetas]) => {
        if (!activo) return;
        setMovimientos(pagina.items ?? []);
        setMetas(listaMetas ?? []);
      })
      .catch(() => {
        if (activo) setFallo(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [ds]);

  const consulta = normalizar(texto.trim());

  const resultados = useMemo(() => {
    if (consulta.length < 2) return { movimientos: [], metas: [] };
    return {
      movimientos: movimientos
        .filter((m) => normalizar(`${m.descripcion} ${m.comercio ?? ''}`).includes(consulta))
        .slice(0, 6),
      metas: metas.filter((m) => normalizar(m.nombre).includes(consulta)).slice(0, 4),
    };
  }, [consulta, movimientos, metas]);

  const irA = (ruta: string) => {
    onCerrar();
    router.push(ruta);
  };

  const hayResultados = resultados.movimientos.length > 0 || resultados.metas.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[18vh] backdrop-blur-[2px]"
      onClick={onCerrar}
    >
      <div
        className="aparece w-full max-w-lg rounded-[var(--radio)] bg-card p-2 shadow-[var(--sombra-lg)]"
        onClick={(evento) => evento.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <Icono nombre="buscar" className="h-5 w-5 shrink-0 text-muted" />
          <input
            autoFocus
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder={t('buscarGlobal')}
            className="w-full bg-transparent py-2 text-base text-ink outline-none placeholder:text-muted/60"
            onKeyDown={(evento) => evento.key === 'Escape' && onCerrar()}
          />
          <button onClick={onCerrar} className="text-muted hover:text-ink" aria-label={tComun('cerrar')}>
            <Icono nombre="cerrar" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[45vh] overflow-y-auto border-t border-line">
          {fallo ? (
            <p className="px-4 py-6 text-center text-xs text-risk">{t('buscarFallo')}</p>
          ) : cargando ? (
            <p className="px-4 py-6 text-center text-xs text-muted">{t('buscarCargando')}</p>
          ) : consulta.length < 2 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">{t('buscarEscribe')}</p>
          ) : !hayResultados ? (
            <p className="px-4 py-6 text-center text-xs text-muted">{t('buscarSinResultados')}</p>
          ) : (
            <>
              {resultados.movimientos.length > 0 ? (
                <section className="p-1.5">
                  <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {t('buscarMovimientos')}
                  </p>
                  {resultados.movimientos.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => irA(`/movimientos?buscar=${encodeURIComponent(texto.trim())}`)}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-canvas-2"
                    >
                      <Icono nombre="movimientos" className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{m.descripcion}</span>
                        <span className="block text-xs text-muted">{m.fecha}</span>
                      </span>
                      <span
                        className={`cifra shrink-0 text-sm font-semibold ${
                          m.valor < 0 ? 'text-ink' : 'text-ok-text'
                        }`}
                      >
                        {formatearMoneda(m.valor, m.moneda, locale)}
                      </span>
                    </button>
                  ))}
                </section>
              ) : null}

              {resultados.metas.length > 0 ? (
                <section className="border-t border-line p-1.5">
                  <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {t('buscarMetas')}
                  </p>
                  {resultados.metas.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => irA('/metas')}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-canvas-2"
                    >
                      <Icono nombre="metas" className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{m.nombre}</span>
                      <span className="cifra shrink-0 text-sm font-semibold text-ink">
                        {formatearMoneda(m.objetivo, m.moneda, locale)}
                      </span>
                    </button>
                  ))}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
