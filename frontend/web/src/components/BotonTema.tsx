'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icono } from '@/components/Icono';

export const CLAVE_TEMA = 'financeai.tema';
type Tema = 'claro' | 'oscuro';

/** Aplica el tema al <html>; el CSS reacciona a data-theme="dark". */
function aplicar(tema: Tema): void {
  document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light';
}

/**
 * Alterna claro/oscuro y lo persiste. El valor inicial lo pinta el script
 * anti-parpadeo del layout, asi que aqui solo se sincroniza el estado.
 * `claro` = variante para fondos de tinta (sidebar, hero).
 */
export function BotonTema({ claro = false }: { claro?: boolean }) {
  const t = useTranslations('comun');
  const [tema, setTema] = useState<Tema>('claro');

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE_TEMA);
    setTema(guardado === 'oscuro' ? 'oscuro' : 'claro');
  }, []);

  const alternar = () => {
    const nuevo: Tema = tema === 'oscuro' ? 'claro' : 'oscuro';
    setTema(nuevo);
    try {
      window.localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      // almacenamiento no disponible: el tema dura la sesion
    }
    aplicar(nuevo);
  };

  const etiqueta = tema === 'oscuro' ? t('temaClaro') : t('temaOscuro');

  return (
    <button
      type="button"
      onClick={alternar}
      title={etiqueta}
      aria-label={`${t('cambiarTema')}: ${etiqueta}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border p-2 transition ${
        claro
          ? 'border-white/25 text-white/75 hover:border-white/50 hover:text-white'
          : 'border-line text-ink-soft hover:border-accent hover:text-accent'
      }`}
    >
      <Icono nombre={tema === 'oscuro' ? 'sol' : 'luna'} className="h-[18px] w-[18px]" />
    </button>
  );
}
