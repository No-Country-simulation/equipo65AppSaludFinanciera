'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PerfilSlug } from '@/data';
import { Icono, type NombreIcono } from '@/components/Icono';

export function Tarjeta({
  children,
  className = '',
  interactiva = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactiva?: boolean;
}) {
  return (
    <section
      className={`rounded-[var(--radio)] border border-line bg-card p-5 shadow-[var(--sombra-md)] ${
        interactiva ? 'lift cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function TituloTarjeta({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
      <span className="h-1 w-1 rounded-full bg-mint" aria-hidden />
      {children}
    </h2>
  );
}

type VarianteBoton = 'primario' | 'fantasma' | 'peligro';

export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }) {
  const estilos: Record<VarianteBoton, string> = {
    primario:
      'bg-accent text-white hover:bg-accent-strong shadow-[0_1px_2px_rgba(12,42,36,0.35),0_8px_20px_-10px_rgba(18,86,74,0.6)] disabled:opacity-50',
    fantasma:
      'border border-line bg-card/60 text-ink hover:border-accent hover:bg-card disabled:opacity-50',
    peligro: 'bg-risk/10 text-risk hover:bg-risk/20 disabled:opacity-50',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:active:scale-100 ${estilos[variante]} ${className}`}
      {...props}
    />
  );
}

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{etiqueta}</span>
      {children}
      {ayuda ? <span className="mt-1.5 block text-xs text-muted">{ayuda}</span> : null}
    </label>
  );
}

export const claseInput =
  'w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-all duration-200 focus:border-accent focus:ring-4 focus:ring-mint/15 placeholder:text-muted/60';

/** Perfil SIEMPRE con icono + etiqueta, nunca solo color. */
export function ChipPerfil({
  perfil,
  etiqueta,
  grande = false,
}: {
  perfil: PerfilSlug;
  etiqueta: string;
  grande?: boolean;
}) {
  const estilos: Record<PerfilSlug, { fondo: string; texto: string; icono: NombreIcono }> = {
    saludable: { fondo: 'bg-ok/12', texto: 'text-ok-text', icono: 'tendencia-arriba' },
    en_observacion: { fondo: 'bg-warn-bg/18', texto: 'text-warn', icono: 'observar' },
    en_riesgo: { fondo: 'bg-risk/12', texto: 'text-risk', icono: 'tendencia-abajo' },
  };
  const estilo = estilos[perfil];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${estilo.fondo} ${estilo.texto} ${
        grande ? 'px-4 py-1.5 text-base ring-1 ring-inset ring-white/10' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <Icono nombre={estilo.icono} className={grande ? 'h-[18px] w-[18px]' : 'h-3.5 w-3.5'} strokeWidth={2} />
      {etiqueta}
    </span>
  );
}

/** Cifra con conteo animado (respeta prefers-reduced-motion). */
export function CifraAnimada({
  valor,
  formato,
  className = '',
  duracion = 900,
}: {
  valor: number;
  formato: (n: number) => string;
  className?: string;
  duracion?: number;
}) {
  const [mostrado, setMostrado] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setMostrado(valor);
      anterior.current = valor;
      return;
    }
    const desde = anterior.current;
    const inicio = performance.now();
    let raf = 0;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const eased = 1 - Math.pow(1 - t, 3);
      setMostrado(desde + (valor - desde) * eased);
      if (t < 1) raf = requestAnimationFrame(paso);
      else anterior.current = valor;
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracion]);

  return <span className={`tnum ${className}`}>{formato(mostrado)}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Estado cargando / error+Reintentar - el patron F6.7 desde el dia 1. */
export function EstadoCarga({
  cargando,
  error,
  recargar,
  children,
}: {
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations('comun');
  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radio)] border border-line bg-card py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-risk/10 text-risk">
          <Icono nombre="alerta" />
        </span>
        <p className="text-sm text-muted">
          {t('errorApi')}
          <span className="mt-1 block text-xs opacity-70">{error}</span>
        </p>
        <Boton variante="fantasma" onClick={recargar}>
          {t('reintentar')}
        </Boton>
      </div>
    );
  }
  return <>{children}</>;
}
