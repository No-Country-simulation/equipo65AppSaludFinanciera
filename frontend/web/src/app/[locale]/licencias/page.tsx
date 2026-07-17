'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Icono } from '@/components/Icono';

/** Atribucion de dependencias directas (nombre → licencia). Sin traducir: son nombres propios. */
const GRUPOS = [
  {
    clave: 'grupoWeb',
    items: [
      ['Next.js', 'MIT'],
      ['React', 'MIT'],
      ['next-intl', 'MIT'],
      ['Recharts', 'MIT'],
      ['Tailwind CSS', 'MIT'],
    ],
  },
  {
    clave: 'grupoMovil',
    items: [
      ['React Native', 'MIT'],
      ['Expo / Expo Router', 'MIT'],
      ['react-native-svg', 'MIT'],
      ['expo-linear-gradient', 'MIT'],
      ['@react-native-async-storage/async-storage', 'MIT'],
      ['@expo/vector-icons (Ionicons)', 'MIT'],
      ['react-native-safe-area-context', 'MIT'],
    ],
  },
  {
    clave: 'grupoFuentes',
    items: [
      ['Bricolage Grotesque', 'SIL OFL 1.1'],
      ['Hanken Grotesk', 'SIL OFL 1.1'],
    ],
  },
] as const;

export default function PaginaLicencias() {
  const t = useTranslations('licencias');
  const tLegales = useTranslations('legales');
  const tPrivacidad = useTranslations('privacidad');

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
          <p className="mt-5 leading-relaxed text-ink-soft">{t('intro')}</p>

          {GRUPOS.map((grupo, indice) => (
            <section key={grupo.clave} className="entra-x mt-7" style={{ animationDelay: `${indice * 60}ms` }}>
              <h2 className="display text-lg font-semibold text-ink">{t(grupo.clave)}</h2>
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                {grupo.items.map(([nombre, licencia]) => (
                  <li key={nombre} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-sm font-medium text-ink">{nombre}</span>
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-muted">
                      {licencia}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <footer className="mt-9 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tLegales('verTambien')}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              <Link href="/legales" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
                {tLegales('titulo')}
              </Link>
              <Link href="/privacidad" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
                {tPrivacidad('titulo')}
              </Link>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
