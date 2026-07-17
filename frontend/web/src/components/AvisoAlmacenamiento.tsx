'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const CLAVE = 'financeai.avisoAlmacenamiento';

/**
 * Aviso de almacenamiento local (transparencia tipo "banner de cookies").
 * Solo informa: la sesion y las preferencias son estrictamente necesarias,
 * asi que no hay nada que aceptar o rechazar - se descarta y no vuelve.
 */
export function AvisoAlmacenamiento() {
  const t = useTranslations('comun');
  const tPrivacidad = useTranslations('privacidad');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CLAVE)) setVisible(true);
    } catch {
      // sin localStorage no hay nada que avisar
    }
  }, []);

  const descartar = () => {
    try {
      window.localStorage.setItem(CLAVE, '1');
    } catch {
      // ignorar: el banner simplemente reaparecera
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="aparece fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-[var(--sombra-md)]">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink-soft">
          {t('avisoAlmacenamiento')}{' '}
          <Link
            href="/privacidad"
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            {tPrivacidad('titulo')}
          </Link>
        </p>
        <button
          onClick={descartar}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.97]"
        >
          {t('entendido')}
        </button>
      </div>
    </div>
  );
}
