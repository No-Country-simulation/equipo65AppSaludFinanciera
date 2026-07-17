'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FinanceApiError } from '@/data';
import { Link, useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { Boton, Campo, claseInput } from '@/components/ui';

export default function PaginaLogin() {
  const t = useTranslations('auth');
  const ds = useDataSource();
  const router = useRouter();
  const { iniciarSesion } = useSesion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigoTotp, setCodigoTotp] = useState('');
  const [pide2fa, setPide2fa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const sesion = await ds.login(email, password, codigoTotp || undefined);
      if (sesion.requiere_2fa) {
        setPide2fa(true);
        return;
      }
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
    <form onSubmit={entrar} className="aparece space-y-5">
      <header>
        <h1 className="cifra text-3xl font-semibold text-ink">
          {pide2fa ? t('totpTitulo') : t('loginTitulo')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {pide2fa ? t('totpAyuda') : t('loginSubtitulo')}
        </p>
      </header>

      {pide2fa ? (
        <Campo etiqueta={t('codigo')}>
          <input
            className={`${claseInput} cifra text-center text-2xl tracking-[0.4em]`}
            value={codigoTotp}
            onChange={(evento) => setCodigoTotp(evento.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoFocus
            required
          />
        </Campo>
      ) : (
        <>
          <Campo etiqueta={t('email')}>
            <input
              className={claseInput}
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="demo@financeai.dev"
              autoComplete="email"
              required
            />
          </Campo>
          <Campo etiqueta={t('password')} ayuda={t('demoAyuda')}>
            <input
              className={claseInput}
              type="password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              autoComplete="current-password"
              required
            />
          </Campo>
        </>
      )}

      {error ? <p className="text-sm font-medium text-risk">{error}</p> : null}

      <Boton type="submit" disabled={enviando} className="w-full">
        {enviando ? t('entrando') : pide2fa ? t('verificar') : t('entrar')}
      </Boton>

      {!pide2fa ? (
        <p className="text-center text-sm text-muted">
          {t('sinCuenta')}{' '}
          <Link href="/registro" className="font-semibold text-accent hover:underline">
            {t('crearCuenta')}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
