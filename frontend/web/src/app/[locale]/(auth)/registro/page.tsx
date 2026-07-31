'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FinanceApiError, TERMINOS_VERSION, type Moneda, type Usuario } from '@/data';
import { Link, useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { QrCode } from '@/components/QrCode';
import { Boton, Campo, claseInput } from '@/components/ui';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];

type Paso = 'cuenta' | 'qr' | 'verificar' | 'respaldo';

/** Indice de paso para el stepper (cuenta=0, seguridad=1, listo=2). */
const INDICE_PASO: Record<Paso, number> = { cuenta: 0, qr: 1, verificar: 1, respaldo: 2 };

export default function PaginaRegistro() {
  const t = useTranslations('auth');
  const tComun = useTranslations('comun');
  const tPrivacidad = useTranslations('privacidad');
  const locale = useLocale();
  const ds = useDataSource();
  const router = useRouter();
  const { iniciarSesion, actualizarUsuario } = useSesion();

  const [paso, setPaso] = useState<Paso>('cuenta');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | ''>('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [secreto, setSecreto] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);

  const fallar = (causa: unknown) =>
    setError(causa instanceof FinanceApiError ? causa.message : String(causa));

  // Paso 1: crear la cuenta, iniciar sesion (2FA aun inactivo) y preparar el QR.
  const crearCuenta = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await ds.registro({
        email,
        password,
        moneda_principal: moneda,
        nombre,
        apellido,
        fecha_nacimiento: nacimiento,
        genero: genero || undefined,
        telefono: telefono || undefined,
        ciudad: ciudad || undefined,
        terminos_version: TERMINOS_VERSION,
      });
      const sesion = await ds.login(email, password);
      const creado = sesion.usuario ?? (await ds.me());
      iniciarSesion(creado, { access: sesion.access_token, refresh: sesion.refresh_token });
      setUsuario(creado);
      const datos = await ds.iniciar2fa();
      setSecreto(datos.secreto);
      setOtpauth(datos.otpauth_uri);
      setPaso('qr');
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  // Paso 3: confirmar el codigo TOTP y recibir los codigos de respaldo.
  const verificar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const resultado = await ds.activar2fa(codigo);
      setRespaldo(resultado.codigos_respaldo);
      if (usuario) actualizarUsuario({ ...usuario, totp_activo: true });
      setPaso('respaldo');
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  const descargarCodigos = () => {
    const blob = new Blob([respaldo.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'fintechvital-codigos-respaldo.txt';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const finalizar = () => {
    // Al entrar se adopta el idioma preferido del usuario (cross-device).
    router.replace('/panel', { locale: (usuario?.idioma ?? locale) as 'es' | 'pt' | 'en' });
  };

  const pasoActual = INDICE_PASO[paso];

  return (
    <div className="aparece space-y-5">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-xs font-semibold">
        {[t('pasoCuenta'), t('pasoSeguridad'), t('pasoListo')].map((etiqueta, i) => (
          <li key={etiqueta} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ${
                i <= pasoActual ? 'bg-accent text-sobre-accent' : 'bg-canvas-2 text-muted'
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= pasoActual ? 'text-ink' : 'text-muted'}>{etiqueta}</span>
            {i < 2 ? <span className="mx-1 h-px w-5 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {/* Paso 1: cuenta */}
      {paso === 'cuenta' ? (
        <form onSubmit={crearCuenta} className="space-y-5">
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
              {MONEDAS.map((codigoMoneda) => (
                <option key={codigoMoneda} value={codigoMoneda}>
                  {codigoMoneda}
                </option>
              ))}
            </select>
          </Campo>

          {/* Datos personales (USUARIOS: nombre/apellido/fecha_nacimiento son NOT NULL) */}
          <div className="rounded-xl border border-line bg-canvas-2/40 p-4">
            <p className="mb-3 text-sm font-semibold text-ink">{t('datosPersonalesTitulo')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta={t('nombre')}>
                <input
                  className={claseInput}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </Campo>
              <Campo etiqueta={t('apellido')}>
                <input
                  className={claseInput}
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </Campo>
              <Campo etiqueta={t('fechaNacimiento')}>
                <input
                  className={claseInput}
                  type="date"
                  value={nacimiento}
                  onChange={(e) => setNacimiento(e.target.value)}
                  required
                />
              </Campo>
              <Campo etiqueta={`${t('genero')} (${t('opcional')})`}>
                <select
                  className={claseInput}
                  value={genero}
                  onChange={(e) => setGenero(e.target.value as 'M' | 'F' | '')}
                >
                  <option value="">—</option>
                  <option value="M">{t('generos.M')}</option>
                  <option value="F">{t('generos.F')}</option>
                </select>
              </Campo>
              <Campo etiqueta={`${t('telefono')} (${t('opcional')})`}>
                <input
                  className={claseInput}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  autoComplete="tel"
                />
              </Campo>
              <Campo etiqueta={`${t('ciudad')} (${t('opcional')})`}>
                <input
                  className={claseInput}
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  autoComplete="address-level2"
                />
              </Campo>
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-risk">{error}</p> : null}

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
            {enviando ? t('creando') : t('continuar')}
          </Boton>

          <p className="text-center text-sm text-muted">
            {t('yaTienes')}{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              {t('entrar')}
            </Link>
          </p>
        </form>
      ) : null}

      {/* Paso 2: QR */}
      {paso === 'qr' ? (
        <div className="space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('dosfaTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('dosfaObligatoriaAyuda')}</p>
          </header>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-6">
            <p className="text-sm font-medium text-ink-soft">{t('escaneaConApp')}</p>
            <div className="rounded-xl bg-white p-3 shadow-[var(--sombra-md)]">
              <QrCode valor={otpauth} tam={196} />
            </div>
            <div className="w-full text-center">
              <p className="text-xs text-muted">{t('oIngresaManual')}</p>
              <code className="mt-1 block break-all rounded-lg bg-ink/5 px-3 py-2 text-sm font-semibold tracking-wider text-ink">
                {secreto}
              </code>
            </div>
          </div>

          <Boton onClick={() => setPaso('verificar')} className="w-full">
            {tComun('siguiente')}
          </Boton>
        </div>
      ) : null}

      {/* Paso 3: verificar */}
      {paso === 'verificar' ? (
        <form onSubmit={verificar} className="space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('verificaTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('verificaAyuda')}</p>
          </header>

          <Campo etiqueta={t('codigo')}>
            <input
              className={`${claseInput} cifra text-center text-2xl tracking-[0.4em]`}
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              required
            />
          </Campo>

          {error ? <p className="text-sm font-medium text-risk">{error}</p> : null}

          <div className="flex gap-2">
            <Boton type="button" variante="fantasma" onClick={() => setPaso('qr')}>
              {tComun('atras')}
            </Boton>
            <Boton type="submit" disabled={enviando || codigo.length !== 6} className="flex-1">
              {enviando ? t('creando') : t('verificar')}
            </Boton>
          </div>
        </form>
      ) : null}

      {/* Paso 4: códigos de respaldo */}
      {paso === 'respaldo' ? (
        <div className="space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('respaldoTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('respaldoAyuda')}</p>
          </header>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-ok/40 bg-ok/5 p-4 sm:grid-cols-4">
            {respaldo.map((codigoRespaldo) => (
              <code
                key={codigoRespaldo}
                className="rounded-lg bg-card px-2 py-1.5 text-center text-sm font-semibold text-ink"
              >
                {codigoRespaldo}
              </code>
            ))}
          </div>

          <div className="flex gap-2">
            <Boton type="button" variante="fantasma" onClick={descargarCodigos}>
              {t('descargarCodigos')}
            </Boton>
            <Boton onClick={finalizar} className="flex-1">
              {t('guardadosEntrar')}
            </Boton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
