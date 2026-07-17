'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DATA_SOURCE } from '@/data';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Icono, type NombreIcono } from '@/components/Icono';

const RUTAS: { href: string; clave: string; icono: NombreIcono }[] = [
  { href: '/panel', clave: 'panel', icono: 'panel' },
  { href: '/movimientos', clave: 'movimientos', icono: 'movimientos' },
  { href: '/presupuestos', clave: 'presupuestos', icono: 'presupuestos' },
  { href: '/metas', clave: 'metas', icono: 'metas' },
  { href: '/analisis', clave: 'analisis', icono: 'analisis' },
  { href: '/perfil', clave: 'perfil', icono: 'perfil' },
];

const CLAVE_COLAPSO = 'financeai.sidebar.colapsada';

function Marca({ compacta = false }: { compacta?: boolean }) {
  if (compacta) {
    return (
      <span className="display grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-lg font-bold text-white">
        f<span className="text-mint">A</span>
      </span>
    );
  }
  return (
    <span className="display text-2xl font-bold tracking-tight">
      finance<span className="text-mint">AI</span>
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario, listo, cerrarSesion } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tComun = useTranslations('comun');
  const tPanel = useTranslations('panel');
  const tPerfilU = useTranslations('perfilUsuario');
  const tPrivacidad = useTranslations('privacidad');

  const [colapsada, setColapsada] = useState(false);
  const [abierta, setAbierta] = useState(false); // drawer móvil
  const [buscador, setBuscador] = useState(false); // buscador global (solo interfaz)
  const [cuentas, setCuentas] = useState(false); // selector multi-cuenta (solo interfaz)

  useEffect(() => {
    setColapsada(window.localStorage.getItem(CLAVE_COLAPSO) === '1');
  }, []);

  useEffect(() => {
    if (listo && !usuario) router.replace('/login');
  }, [listo, usuario, router]);

  // cerrar el drawer al navegar
  useEffect(() => {
    setAbierta(false);
  }, [pathname]);

  const alternarColapso = () => {
    setColapsada((prev) => {
      const nuevo = !prev;
      window.localStorage.setItem(CLAVE_COLAPSO, nuevo ? '1' : '0');
      return nuevo;
    });
  };

  if (!listo || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  const salir = () => {
    cerrarSesion();
    router.replace('/login');
  };

  return (
    <div className="fondo-papel min-h-screen">
      {/* ── Overlay del drawer (móvil) ─────────────────────────────── */}
      {abierta ? (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setAbierta(false)}
          aria-hidden
        />
      ) : null}

      {/* ── Sidebar (drawer en móvil, fija y colapsable en escritorio) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden text-white/85 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:z-20 lg:translate-x-0 ${
          abierta ? 'translate-x-0' : '-translate-x-full'
        } ${colapsada ? 'lg:w-[4.75rem]' : 'lg:w-64'}`}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, var(--hero-b) 0%, var(--hero-a) 55%, #081c18 100%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(90% 50% at 15% -5%, rgba(22,185,138,0.16), transparent 60%), radial-gradient(70% 40% at 100% 105%, rgba(242,163,13,0.10), transparent 55%)',
          }}
        />

        <div className="relative flex h-full flex-col">
          {/* Marca + cerrar (móvil) */}
          <div className={`flex items-center justify-between px-5 pb-6 pt-6 ${colapsada ? 'lg:justify-center lg:px-3' : ''}`}>
            <span className={colapsada ? 'lg:hidden' : ''}>
              <Marca />
            </span>
            <span className="hidden lg:block">
              {colapsada ? <Marca compacta /> : null}
            </span>
            <button
              onClick={() => setAbierta(false)}
              className="text-white/70 hover:text-white lg:hidden"
              aria-label={tComun('cerrar')}
            >
              <Icono nombre="cerrar" />
            </button>
          </div>

          {DATA_SOURCE === 'mock' && !colapsada ? (
            <div className="px-5 pb-4 lg:px-5">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint ring-1 ring-inset ring-mint/25 ${colapsada ? 'lg:hidden' : ''}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                {tComun('demo')}
              </span>
            </div>
          ) : null}

          {/* Multi-cuenta (solo interfaz, F9) */}
          <div className={`relative px-3 pb-2 ${colapsada ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => setCuentas((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-2xl bg-white/6 px-4 py-2.5 text-left transition hover:bg-white/10"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mint/20 text-mint">
                <Icono nombre="presupuestos" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{tPanel('cuentaPrincipal')}</span>
                <span className="block text-[10px] text-white/50">{usuario.moneda_principal}</span>
              </span>
              <Icono nombre="chevron-der" className={`h-3.5 w-3.5 text-white/50 transition-transform ${cuentas ? 'rotate-90' : ''}`} />
            </button>
            {cuentas ? (
              <div className="absolute inset-x-3 top-full z-10 mt-1 rounded-2xl border border-white/10 bg-[#0b241e] p-1.5 shadow-xl">
                <div className="rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white">
                  {tPanel('cuentaPrincipal')} · {usuario.moneda_principal}
                </div>
                <button
                  onClick={() => setCuentas(false)}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-white/45"
                  title={tComun('proximamente')}
                >
                  <Icono nombre="mas" className="h-3.5 w-3.5" />
                  {tPanel('agregarCuenta')} · {tComun('proximamente').toLowerCase()}
                </button>
              </div>
            ) : null}
          </div>

          {/* Buscador global (solo interfaz, F9) */}
          <div className="px-3 pb-3">
            <button
              onClick={() => setBuscador(true)}
              className={`flex w-full items-center gap-2.5 rounded-2xl border border-white/10 px-4 py-2.5 text-left text-xs text-white/50 transition hover:border-white/25 hover:text-white/75 ${
                colapsada ? 'lg:justify-center lg:border-0 lg:px-0' : ''
              }`}
              title={tPanel('buscarGlobal')}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span className={colapsada ? 'lg:hidden' : ''}>{tPanel('buscarGlobal')}</span>
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 px-3">
            {RUTAS.map((ruta) => {
              const activa = pathname.startsWith(ruta.href);
              return (
                <Link
                  key={ruta.href}
                  href={ruta.href}
                  title={t(ruta.clave)}
                  className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activa ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/6 hover:text-white'
                  } ${colapsada ? 'lg:justify-center lg:px-0' : ''}`}
                >
                  {activa ? (
                    <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-mint ${colapsada ? 'lg:hidden' : ''}`} />
                  ) : null}
                  <Icono nombre={ruta.icono} className="h-[18px] w-[18px] shrink-0" />
                  <span className={colapsada ? 'lg:hidden' : ''}>{t(ruta.clave)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-white/10 px-4 py-4">
            <div className={colapsada ? 'lg:hidden' : ''}>
              <SelectorIdioma />
            </div>
            <div className={`flex items-center gap-2 ${colapsada ? 'lg:justify-center' : 'justify-between'}`}>
              <span className={`truncate text-xs text-white/55 ${colapsada ? 'lg:hidden' : ''}`}>{usuario.email}</span>
              <button
                onClick={salir}
                title={t('salir')}
                className="shrink-0 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-mint"
                aria-label={t('salir')}
              >
                <Icono nombre="salir" className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className={`flex flex-wrap gap-x-3 gap-y-1 ${colapsada ? 'lg:hidden' : ''}`}>
              <Link
                href="/legales"
                className="text-[11px] font-semibold text-white/45 underline-offset-2 transition hover:text-mint hover:underline"
              >
                {tPerfilU('legales')}
              </Link>
              <Link
                href="/privacidad"
                className="text-[11px] font-semibold text-white/45 underline-offset-2 transition hover:text-mint hover:underline"
              >
                {tPrivacidad('titulo')}
              </Link>
            </div>
          </div>

          {/* Toggle de colapso (solo escritorio) */}
          <button
            onClick={alternarColapso}
            className="hidden items-center justify-center gap-2 border-t border-white/10 py-3 text-white/50 transition hover:bg-white/6 hover:text-white lg:flex"
            aria-label="Colapsar"
          >
            <Icono nombre="colapsar" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      {/* ── Barra superior (móvil) ─────────────────────────────────── */}
      <header
        className="fixed inset-x-0 top-0 z-20 flex items-center gap-3 px-4 py-3 text-white lg:hidden"
        style={{ background: 'linear-gradient(120deg, var(--hero-b), var(--hero-a))' }}
      >
        <button onClick={() => setAbierta(true)} aria-label="Menú" className="text-white/85">
          <Icono nombre="menu" />
        </button>
        <div className="flex-1">
          <Marca />
        </div>
        <SelectorIdioma compacto />
      </header>

      {/* ── Contenido ──────────────────────────────────────────────── */}
      <main
        className={`px-4 pb-12 pt-16 transition-[padding] duration-300 lg:pr-8 lg:pt-8 ${
          colapsada ? 'lg:pl-[6.25rem]' : 'lg:pl-[17rem]'
        }`}
      >
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* ── Buscador global (solo interfaz, F9) ────────────────────── */}
      {buscador ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[18vh] backdrop-blur-[2px]"
          onClick={() => setBuscador(false)}
        >
          <div
            className="aparece w-full max-w-lg rounded-[var(--radio)] bg-card p-2 shadow-[var(--sombra-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                autoFocus
                placeholder={tPanel('buscarGlobal')}
                className="w-full bg-transparent py-2 text-base text-ink outline-none placeholder:text-muted/60"
                onKeyDown={(e) => e.key === 'Escape' && setBuscador(false)}
              />
              <button onClick={() => setBuscador(false)} className="text-muted hover:text-ink" aria-label={tComun('cerrar')}>
                <Icono nombre="cerrar" className="h-4 w-4" />
              </button>
            </div>
            <div className="border-t border-line px-4 py-3 text-xs text-muted">
              {tPanel('buscarPista')}{' '}
              <span className="ml-1 rounded-full bg-warn-bg/15 px-2 py-0.5 font-semibold text-warn">
                {tComun('proximamente')}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
