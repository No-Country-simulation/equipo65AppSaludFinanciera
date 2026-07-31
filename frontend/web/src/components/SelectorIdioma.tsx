'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';

const NOMBRES: Record<Locale, string> = { es: 'Español', pt: 'Português', en: 'English' };

export function SelectorIdioma({ compacto = false }: { compacto?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, actualizarUsuario } = useSesion();
  const ds = useDataSource();

  const cambiar = (nuevo: Locale) => {
    router.replace(pathname, { locale: nuevo });
    // Con sesion, la preferencia se persiste en BD para que viaje entre dispositivos
    // (web <-> movil). Optimista + PATCH en segundo plano. Ver CAMBIOS_INTERFACES.md 4.
    if (usuario && usuario.idioma !== nuevo) {
      actualizarUsuario({ ...usuario, idioma: nuevo });
      void ds
        .actualizarPerfil({ idioma: nuevo })
        .then(actualizarUsuario)
        .catch(() => {});
    }
  };

  return (
    <select
      aria-label="Idioma"
      value={locale}
      onChange={(evento) => cambiar(evento.target.value as Locale)}
      className={`cursor-pointer rounded-xl border border-current/20 bg-white/5 text-sm text-inherit outline-none transition hover:border-current/50 ${
        compacto ? 'px-2 py-1' : 'px-3 py-1.5'
      }`}
    >
      {/* El color de las <option> lo fija globals.css (widget nativo del SO). */}
      {routing.locales.map((idioma) => (
        <option key={idioma} value={idioma}>
          {compacto ? idioma.toUpperCase() : NOMBRES[idioma]}
        </option>
      ))}
    </select>
  );
}
