/**
 * i18n minimo para la app movil: mismos diccionarios JSON que la web
 * (src/messages), resolucion "a.b.c" e interpolacion {param}.
 * es · pt · en - los slugs NUNCA se traducen (ADR-0009).
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import type { Idioma } from '@/data';
import en from './messages/en.json';
import es from './messages/es.json';
import pt from './messages/pt.json';

const CATALOGOS: Record<Idioma, unknown> = { es, pt, en };
const IDIOMAS: Idioma[] = ['es', 'pt', 'en'];

function idiomaInicial(): Idioma {
  const codigo = getLocales()[0]?.languageCode ?? 'es';
  return (IDIOMAS as string[]).includes(codigo) ? (codigo as Idioma) : 'es';
}

function resolver(catalogo: unknown, clave: string): string {
  let actual: unknown = catalogo;
  for (const parte of clave.split('.')) {
    if (typeof actual !== 'object' || actual === null) return clave;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return typeof actual === 'string' ? actual : clave;
}

interface ContextoI18n {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  t: (clave: string, parametros?: Record<string, string | number>) => string;
}

const Contexto = createContext<ContextoI18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);

  const t = useCallback(
    (clave: string, parametros?: Record<string, string | number>) => {
      let texto = resolver(CATALOGOS[idioma], clave);
      if (parametros) {
        for (const [nombre, valor] of Object.entries(parametros)) {
          texto = texto.replaceAll(`{${nombre}}`, String(valor));
        }
      }
      return texto;
    },
    [idioma],
  );

  const valor = useMemo(() => ({ idioma, setIdioma, t }), [idioma, t]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useI18n(): ContextoI18n {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useI18n requiere I18nProvider');
  return contexto;
}

export const IDIOMAS_DISPONIBLES = IDIOMAS;
