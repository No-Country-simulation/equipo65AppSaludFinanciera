'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Icono } from '@/components/Icono';

const SECCIONES = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;

export default function PaginaPrivacidad() {
  const t = useTranslations('privacidad');
  const tLegales = useTranslations('legales');
  const tLicencias = useTranslations('licencias');

  return (
    <div className="fondo-papel min-h-screen">
      <header
        className="flex items-center justify-between px-5 py-4 text-white"
        style={{ background: 'linear-gradient(120deg, var(--hero-b), var(--hero-a))' }}
      >
        <Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white">
          <Icono nombre="chevron-izq" className="h-4 w-4" />
          {t('volver')}
        </Link>
        <span className="display text-lg font-bold">
          finance<span className="text-mint">AI</span>
        </span>
        <SelectorIdioma compacto />
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <article className="aparece rounded-[var(--radio)] border border-line bg-card p-7 shadow-[var(--sombra-md)] sm:p-10">
          <h1 className="display text-3xl font-semibold tracking-tight text-ink">{t('titulo')}</h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted">{t('actualizado')}</p>
          <p className="mt-5 leading-relaxed text-ink-soft">{t('intro')}</p>

          {SECCIONES.map((p, indice) => (
            <section key={p} className="entra-x mt-7" style={{ animationDelay: `${indice * 45}ms` }}>
              <h2 className="display text-lg font-semibold text-ink">{t(`${p}t`)}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{t(`${p}p`)}</p>
            </section>
          ))}

          <footer className="mt-9 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tLegales('verTambien')}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              <Link href="/legales" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
                {tLegales('titulo')}
              </Link>
              <Link href="/licencias" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
                {tLicencias('titulo')}
              </Link>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
