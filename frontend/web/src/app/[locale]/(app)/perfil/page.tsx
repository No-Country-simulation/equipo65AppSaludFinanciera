'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { FrecuenciaAhorro, Moneda } from '@/data';
import { useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Boton, Campo, claseInput, Tarjeta, TituloTarjeta } from '@/components/ui';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];
const FRECUENCIAS: FrecuenciaAhorro[] = ['nula', 'baja', 'media', 'alta'];

export default function PaginaPerfil() {
  const t = useTranslations('perfilUsuario');
  const tComun = useTranslations('comun');
  const locale = useLocale();
  const router = useRouter();
  const ds = useDataSource();
  const { usuario, actualizarUsuario, cerrarSesion } = useSesion();

  const [ingreso, setIngreso] = useState(String(usuario?.ingreso_mensual ?? 0));
  const [deuda, setDeuda] = useState(String(usuario?.nivel_endeudamiento ?? 0));
  const [frecuencia, setFrecuencia] = useState<FrecuenciaAhorro>(
    usuario?.frecuencia_ahorro ?? 'nula',
  );
  const [moneda, setMoneda] = useState<Moneda>(usuario?.moneda_principal ?? 'USD');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // 2FA
  const [paso2fa, setPaso2fa] = useState<'inactivo' | 'secreto' | 'respaldo'>('inactivo');
  const [secreto, setSecreto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);
  const [passwordBaja, setPasswordBaja] = useState('');
  const [error2fa, setError2fa] = useState<string | null>(null);

  // Tus datos (derechos ARCO/LGPD)
  const [exportando, setExportando] = useState(false);
  const [exportado, setExportado] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [passwordCuenta, setPasswordCuenta] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  if (!usuario) return null;

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    setGuardado(false);
    try {
      const actualizado = await ds.actualizarPerfil({
        ingreso_mensual: Number(ingreso),
        nivel_endeudamiento: Number(deuda),
        frecuencia_ahorro: frecuencia,
        moneda_principal: moneda,
      });
      actualizarUsuario(actualizado);
      setGuardado(true);
    } finally {
      setGuardando(false);
    }
  };

  const iniciar2fa = async () => {
    setError2fa(null);
    const datos = await ds.iniciar2fa();
    setSecreto(datos.secreto);
    setPaso2fa('secreto');
  };

  const confirmar2fa = async () => {
    setError2fa(null);
    try {
      const resultado = await ds.activar2fa(codigo);
      setRespaldo(resultado.codigos_respaldo);
      setPaso2fa('respaldo');
      actualizarUsuario({ ...usuario, totp_activo: true });
    } catch (causa) {
      setError2fa(causa instanceof Error ? causa.message : String(causa));
    }
  };

  const desactivar2fa = async () => {
    setError2fa(null);
    try {
      await ds.desactivar2fa(passwordBaja);
      actualizarUsuario({ ...usuario, totp_activo: false });
      setPasswordBaja('');
      setPaso2fa('inactivo');
      setRespaldo([]);
    } catch (causa) {
      setError2fa(causa instanceof Error ? causa.message : String(causa));
    }
  };

  const exportar = async () => {
    setExportando(true);
    setExportado(false);
    try {
      const datos = await ds.exportarDatos();
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `financeai-datos-${datos.generado_en.slice(0, 10)}.json`;
      enlace.click();
      URL.revokeObjectURL(url);
      setExportado(true);
    } finally {
      setExportando(false);
    }
  };

  const eliminarCuenta = async () => {
    setErrorBaja(null);
    setEliminando(true);
    try {
      await ds.eliminarCuenta(passwordCuenta);
      cerrarSesion();
      router.replace('/login');
    } catch (causa) {
      setErrorBaja(causa instanceof Error ? causa.message : String(causa));
      setEliminando(false);
    }
  };

  const fechaTerminos = usuario.terminos_aceptados_en
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
        new Date(usuario.terminos_aceptados_en),
      )
    : null;

  return (
    <div className="space-y-5">
      <header className="aparece">
        <h1 className="cifra text-3xl font-semibold text-ink">{t('titulo')}</h1>
        <p className="mt-1 text-sm text-muted">{t('subtitulo')}</p>
      </header>

      <Tarjeta className="aparece aparece-2">
        <TituloTarjeta>{t('cuenta')}</TituloTarjeta>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="cifra text-lg font-semibold text-ink">{usuario.nombre}</p>
            <p className="text-sm text-muted">{usuario.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{t('idioma')}</span>
            <SelectorIdioma />
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="aparece aparece-3">
        <TituloTarjeta>{t('datosFinancieros')}</TituloTarjeta>
        <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta={`${t('ingresoMensual')} (${moneda})`}>
            <input
              className={claseInput}
              type="number"
              min="0"
              step="0.01"
              value={ingreso}
              onChange={(evento) => setIngreso(evento.target.value)}
            />
          </Campo>
          <Campo etiqueta={t('endeudamiento')}>
            <input
              className={claseInput}
              type="number"
              min="0"
              max="100"
              value={deuda}
              onChange={(evento) => setDeuda(evento.target.value)}
            />
          </Campo>
          <Campo etiqueta={t('frecuencia')}>
            <select
              className={claseInput}
              value={frecuencia}
              onChange={(evento) => setFrecuencia(evento.target.value as FrecuenciaAhorro)}
            >
              {FRECUENCIAS.map((valor) => (
                <option key={valor} value={valor}>
                  {t(`frecuencias.${valor}`)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta={t('moneda')}>
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
          <div className="flex items-center gap-3 sm:col-span-2">
            <Boton type="submit" disabled={guardando}>
              {guardando ? tComun('guardando') : tComun('guardar')}
            </Boton>
            {guardado ? (
              <span className="text-sm font-medium text-ok-text">{t('guardado')}</span>
            ) : null}
          </div>
        </form>
      </Tarjeta>

      <Tarjeta className="aparece aparece-4">
        <TituloTarjeta>{t('seguridad')}</TituloTarjeta>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{t('dosfa')}</p>
            <p className={`text-xs font-medium ${usuario.totp_activo ? 'text-ok-text' : 'text-muted'}`}>
              {usuario.totp_activo ? t('dosfaActiva') : t('dosfaInactiva')}
            </p>
          </div>
          {!usuario.totp_activo && paso2fa === 'inactivo' ? (
            <Boton variante="fantasma" onClick={() => void iniciar2fa()}>
              {t('activar')}
            </Boton>
          ) : null}
        </div>

        {paso2fa === 'secreto' ? (
          <div className="mt-4 space-y-3 rounded-xl border border-line bg-white/60 p-4">
            <p className="text-sm text-muted">{t('escaneaQr')}</p>
            <code className="block break-all rounded-lg bg-ink/5 px-3 py-2 text-sm font-semibold tracking-wider text-ink">
              {secreto}
            </code>
            <div className="flex gap-2">
              <input
                className={`${claseInput} !w-40 text-center tracking-[0.3em]`}
                value={codigo}
                inputMode="numeric"
                onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Boton onClick={() => void confirmar2fa()}>{t('activar')}</Boton>
            </div>
          </div>
        ) : null}

        {paso2fa === 'respaldo' && respaldo.length > 0 ? (
          <div className="mt-4 space-y-2 rounded-xl border border-ok/40 bg-ok/5 p-4">
            <p className="text-sm font-medium text-ok-text">{t('codigosRespaldo')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {respaldo.map((codigoRespaldo) => (
                <code key={codigoRespaldo} className="rounded-lg bg-white px-2 py-1.5 text-center text-sm font-semibold text-ink">
                  {codigoRespaldo}
                </code>
              ))}
            </div>
          </div>
        ) : null}

        {usuario.totp_activo ? (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Campo etiqueta={t('passwordConfirmar')}>
              <input
                className={`${claseInput} !w-56`}
                type="password"
                value={passwordBaja}
                onChange={(evento) => setPasswordBaja(evento.target.value)}
              />
            </Campo>
            <Boton variante="peligro" onClick={() => void desactivar2fa()}>
              {t('desactivar')}
            </Boton>
          </div>
        ) : null}

        {error2fa ? <p className="mt-3 text-sm font-medium text-risk">{error2fa}</p> : null}
      </Tarjeta>

      <Tarjeta className="aparece aparece-5">
        <TituloTarjeta>{t('misDatos')}</TituloTarjeta>
        <p className="text-sm text-muted">{t('misDatosAyuda')}</p>
        {fechaTerminos && usuario.terminos_version ? (
          <p className="mt-2 text-xs font-medium text-muted">
            {t('terminosAceptados', { version: usuario.terminos_version, fecha: fechaTerminos })}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/60 p-4">
          <div>
            <p className="text-sm font-semibold text-ink">{t('exportar')}</p>
            <p className="text-xs text-muted">{t('exportarAyuda')}</p>
          </div>
          <div className="flex items-center gap-3">
            {exportado ? (
              <span className="text-sm font-medium text-ok-text">{t('exportado')}</span>
            ) : null}
            <Boton variante="fantasma" onClick={() => void exportar()} disabled={exportando}>
              {exportando ? tComun('cargando') : t('exportar')}
            </Boton>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-risk/30 bg-risk/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-risk">{t('eliminarCuenta')}</p>
              <p className="text-xs text-muted">{t('eliminarAyuda')}</p>
            </div>
            {!confirmandoBaja ? (
              <Boton variante="peligro" onClick={() => setConfirmandoBaja(true)}>
                {t('eliminarCuenta')}
              </Boton>
            ) : null}
          </div>

          {confirmandoBaja ? (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <Campo etiqueta={t('eliminarConfirma')}>
                <input
                  className={`${claseInput} !w-56`}
                  type="password"
                  value={passwordCuenta}
                  onChange={(evento) => setPasswordCuenta(evento.target.value)}
                />
              </Campo>
              <Boton
                variante="peligro"
                onClick={() => void eliminarCuenta()}
                disabled={eliminando || passwordCuenta.length === 0}
              >
                {eliminando ? tComun('cargando') : t('eliminarDefinitivo')}
              </Boton>
              <Boton
                variante="fantasma"
                onClick={() => {
                  setConfirmandoBaja(false);
                  setPasswordCuenta('');
                  setErrorBaja(null);
                }}
              >
                {tComun('cancelar')}
              </Boton>
            </div>
          ) : null}

          {errorBaja ? <p className="mt-3 text-sm font-medium text-risk">{errorBaja}</p> : null}
        </div>
      </Tarjeta>
    </div>
  );
}
