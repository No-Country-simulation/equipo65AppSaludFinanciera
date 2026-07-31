'use client';

import { useTranslations } from 'next-intl';
import { DATA_SOURCE } from '@/data';
import { Link } from '@/i18n/navigation';
import { BotonTema } from '@/components/BotonTema';
import { Logo } from '@/components/Logo';
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
        style={{ background: 'linear-gradient(155deg, var(--hero-b) 0%, var(--hero-a) 60%, #0a1219 100%)' }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(75% 55% at 12% 108%, rgba(136,189,36,0.30), transparent 60%), radial-gradient(60% 45% at 100% -5%, rgba(159,198,64,0.14), transparent 55%)',
          }}
        />
        {/* El imagotipo lleva letras dentro de letras: por debajo de ~90px de
            alto se empasta y deja de leerse. */}
        <Logo alto={104} fondo="oscuro" className="relative" />

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
                      ? 'linear-gradient(180deg, #9fc640, rgba(136,189,36,0.4))'
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
          {/* Aqui el fondo es el papel de la app: sigue el tema, va en `auto`. */}
          <Logo alto={40} className="lg:hidden" />
          <div className="flex items-center gap-2">
            <SelectorIdioma />
            <BotonTema />
          </div>
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
