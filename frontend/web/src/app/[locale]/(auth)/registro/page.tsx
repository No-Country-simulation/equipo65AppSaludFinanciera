'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FinanceApiError, TERMINOS_VERSION, type Moneda } from '@/data';
import { Link, useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { Boton, Campo, claseInput } from '@/components/ui';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];

export default function PaginaRegistro() {
  const t = useTranslations('auth');
  const tPrivacidad = useTranslations('privacidad');
  const ds = useDataSource();
  const router = useRouter();
  const { iniciarSesion } = useSesion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await ds.registro(email, password, moneda, TERMINOS_VERSION);
      const sesion = await ds.login(email, password);
      const usuario = sesion.usuario ?? (await ds.me());
      iniciarSesion(usuario, {
        access: sesion.access_token,
        refresh: sesion.refresh_token,
      });
      router.replace('/panel');
    } catch (causa) {
      setError(causa instanceof FinanceApiError ? causa.message : String(causa));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={crear} className="aparece space-y-5">
      <header>
        <h1 className="cifra text-3xl font-semibold text-ink">{t('registroTitulo')}</h1>
        <p className="mt-1 text-sm text-muted">{t('registroSubtitulo')}</p>
      </header>

      <Campo etiqueta={t('email')}>
        <input
          className={claseInput}
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          autoComplete="email"
          required
        />
      </Campo>
      <Campo etiqueta={t('password')} ayuda={t('passwordAyuda')}>
        <input
          className={claseInput}
          type="password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Campo>
      <Campo etiqueta={t('monedaPrincipal')}>
        <select
          className={claseInput}
          value={moneda}
          onChange={(evento) => setMoneda(evento.target.value as Moneda)}
        >
          {MONEDAS.map((codigo) => (
            <option key={codigo} value={codigo}>
              {codigo}
            </option>
          ))}
        </select>
      </Campo>

      {error ? <p className="text-sm font-medium text-risk">{error}</p> : null}

      {/* Aceptación de términos (obligatoria) */}
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-canvas-2/50 p-3.5 transition-colors hover:border-accent/40">
        <input
          type="checkbox"
          checked={aceptado}
          onChange={(evento) => setAceptado(evento.target.checked)}
          required
          className="mt-0.5 h-4.5 w-4.5 shrink-0"
          style={{ accentColor: 'var(--accent)' }}
        />
        <span className="text-sm leading-snug text-ink-soft">
          {t('aceptoLabel')}{' '}
          <Link href="/legales" className="font-semibold text-accent hover:underline">
            {t('terminos')}
          </Link>{' '}
          {t('aceptoY')}{' '}
          <Link href="/privacidad" className="font-semibold text-accent hover:underline">
            {tPrivacidad('titulo')}
          </Link>
        </span>
      </label>

      <Boton type="submit" disabled={enviando || !aceptado} className="w-full">
        {enviando ? t('creando') : t('crear')}
      </Boton>

      <p className="text-center text-sm text-muted">
        {t('yaTienes')}{' '}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          {t('entrar')}
        </Link>
      </p>
    </form>
  );
}
