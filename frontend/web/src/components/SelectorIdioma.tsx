'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const NOMBRES: Record<Locale, string> = { es: 'Español', pt: 'Português', en: 'English' };

export function SelectorIdioma({ compacto = false }: { compacto?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      aria-label="Idioma"
      value={locale}
      onChange={(evento) =>
        router.replace(pathname, { locale: evento.target.value as Locale })
      }
      className={`cursor-pointer rounded-xl border border-current/20 bg-white/5 text-sm text-inherit outline-none transition hover:border-current/50 ${
        compacto ? 'px-2 py-1' : 'px-3 py-1.5'
      }`}
    >
      {routing.locales.map((idioma) => (
        <option key={idioma} value={idioma} className="text-ink">
          {compacto ? idioma.toUpperCase() : NOMBRES[idioma]}
        </option>
      ))}
    </select>
  );
}
