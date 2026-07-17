'use client';

import { useTranslations } from 'next-intl';
import { DATA_SOURCE } from '@/data';
import { Link } from '@/i18n/navigation';
import { SelectorIdioma } from '@/components/SelectorIdioma';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('comun');
  const tLegales = useTranslations('legales');
  const tPrivacidad = useTranslations('privacidad');
  return (
    <div className="flex min-h-screen">
      {/* Panel de marca */}
      <aside
        className="relative hidden w-[46%] flex-col justify-between overflow-hidden p-11 text-white lg:flex"
        style={{ background: 'linear-gradient(155deg, var(--hero-b) 0%, var(--hero-a) 60%, #071a16 100%)' }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(75% 55% at 12% 108%, rgba(22,185,138,0.28), transparent 60%), radial-gradient(60% 45% at 100% -5%, rgba(242,163,13,0.18), transparent 55%)',
          }}
        />
        <p className="display relative text-3xl font-bold tracking-tight">
          finance<span className="text-mint">AI</span>
        </p>

        <div className="relative">
          <p className="display max-w-md text-[2.7rem] font-semibold leading-[1.05] tracking-tight">
            {t('lema')}
          </p>
          {/* Barras decorativas animadas */}
          <div aria-hidden className="mt-12 flex items-end gap-2.5">
            {[34, 52, 41, 66, 58, 84, 73, 48].map((altura, indice) => (
              <div
                key={indice}
                className="aparece w-7 rounded-t-lg"
                style={{
                  height: altura,
                  animationDelay: `${indice * 70}ms`,
                  background:
                    indice === 5
                      ? 'linear-gradient(180deg, var(--mint), rgba(22,185,138,0.4))'
                      : 'rgba(255,255,255,0.14)',
                }}
              />
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/45">{t('educativo')}</p>
      </aside>

      {/* Formulario */}
      <main className="fondo-papel flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <p className="display text-xl font-bold text-ink lg:hidden">
            finance<span className="text-accent">AI</span>
          </p>
          <SelectorIdioma />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-md">
            {children}
            {DATA_SOURCE === 'mock' ? (
              <p className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-warn-bg/50 bg-warn-bg/10 px-4 py-3 text-center text-xs text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn-bg" />
                {t('demo')}
              </p>
            ) : null}
            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
              <Link
                href="/legales"
                className="text-xs font-semibold text-muted underline-offset-2 transition hover:text-accent hover:underline"
              >
                {tLegales('titulo')}
              </Link>
              <Link
                href="/privacidad"
                className="text-xs font-semibold text-muted underline-offset-2 transition hover:text-accent hover:underline"
              >
                {tPrivacidad('titulo')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
