'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  AltaTarjeta,
  CuentaBancaria,
  EstadoBancario,
  RedPago,
  Tarjeta,
  TipoTarjeta,
} from '@/data';
import { useRouter } from '@/i18n/navigation';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { Boton, Campo, claseInput, EstadoCarga, Tarjeta as Panel, TituloTarjeta } from '@/components/ui';

const TIPOS: TipoTarjeta[] = ['debito', 'credito'];
const REDES: RedPago[] = ['visa', 'mastercard', 'amex'];
const ESTADOS: EstadoBancario[] = ['activa', 'bloqueada', 'cancelada'];

interface DatosForm {
  cuentas: CuentaBancaria[];
  tarjeta: Tarjeta | null;
}

export function FormularioTarjeta({ tarjetaId }: { tarjetaId?: string }) {
  const t = useTranslations('tarjetas');

  const { datos, cargando, error, recargar } = useDatos<DatosForm>(
    async (fuente) => {
      const [cuentas, tarjetas] = await Promise.all([
        fuente.cuentas(),
        tarjetaId ? fuente.tarjetas() : Promise.resolve([] as Tarjeta[]),
      ]);
      return {
        cuentas,
        tarjeta: tarjetaId ? tarjetas.find((x) => x.id === tarjetaId) ?? null : null,
      };
    },
    [tarjetaId],
  );

  return (
    <div className="space-y-5">
      <header className="aparece">
        <h1 className="cifra text-3xl font-semibold text-ink">
          {tarjetaId ? t('editarTitulo') : t('nuevaTitulo')}
        </h1>
      </header>
      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        {datos ? (
          <CuerpoTarjeta cuentas={datos.cuentas} tarjeta={datos.tarjeta} tarjetaId={tarjetaId} />
        ) : null}
      </EstadoCarga>
    </div>
  );
}

function CuerpoTarjeta({
  cuentas,
  tarjeta,
  tarjetaId,
}: {
  cuentas: CuentaBancaria[];
  tarjeta: Tarjeta | null;
  tarjetaId?: string;
}) {
  const t = useTranslations('tarjetas');
  const tComun = useTranslations('comun');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const ds = useDataSource();

  const [tipo, setTipo] = useState<TipoTarjeta>(tarjeta?.tipo ?? 'debito');
  const [red, setRed] = useState<RedPago>(tarjeta?.red_pago ?? 'visa');
  const [ultimos4, setUltimos4] = useState(tarjeta?.ultimos4 ?? '');
  const [vencimiento, setVencimiento] = useState(tarjeta?.fecha_vencimiento ?? '');
  const [etiqueta, setEtiqueta] = useState(tarjeta?.etiqueta ?? '');
  const [cuenta, setCuenta] = useState(tarjeta?.id_cuenta ?? cuentas[0]?.id ?? '');
  const [estado, setEstado] = useState<EstadoBancario>(tarjeta?.estado ?? 'activa');
  const [limite, setLimite] = useState(String(tarjeta?.credito?.limite_credito ?? ''));
  const [corte, setCorte] = useState(String(tarjeta?.credito?.dia_corte ?? ''));
  const [pago, setPago] = useState(String(tarjeta?.credito?.dia_pago ?? ''));
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    if (!tarjeta) return;
    setTipo(tarjeta.tipo);
    setRed(tarjeta.red_pago);
    setUltimos4(tarjeta.ultimos4);
    setVencimiento(tarjeta.fecha_vencimiento);
    setEtiqueta(tarjeta.etiqueta ?? '');
    setCuenta(tarjeta.id_cuenta);
    setEstado(tarjeta.estado);
    setLimite(String(tarjeta.credito?.limite_credito ?? ''));
    setCorte(String(tarjeta.credito?.dia_corte ?? ''));
    setPago(String(tarjeta.credito?.dia_pago ?? ''));
  }, [tarjeta]);

  if (cuentas.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-card p-5 text-sm text-muted">
        {t('sinCuentaCrear')}
      </p>
    );
  }

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorForm(null);
    setGuardando(true);
    try {
      const alta: AltaTarjeta = {
        id_cuenta: cuenta,
        tipo,
        red_pago: red,
        ultimos4,
        fecha_vencimiento: vencimiento,
        etiqueta: etiqueta || undefined,
        estado,
        credito:
          tipo === 'credito'
            ? { limite_credito: Number(limite), dia_corte: Number(corte), dia_pago: Number(pago) }
            : undefined,
      };
      if (tarjetaId) await ds.actualizarTarjeta(tarjetaId, alta);
      else await ds.crearTarjeta(alta);
      router.push('/tarjetas');
    } catch (causa) {
      setErrorForm(causa instanceof Error ? causa.message : String(causa));
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!tarjetaId) return;
    setEliminando(true);
    try {
      await ds.eliminarTarjeta(tarjetaId);
      router.push('/tarjetas');
    } catch {
      setEliminando(false);
    }
  };

  return (
    <Panel className="aparece aparece-2">
      <TituloTarjeta>{t('gestionar')}</TituloTarjeta>
      <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta={t('tipo')}>
          <div className="inline-flex w-full rounded-2xl border border-line bg-canvas-2/60 p-0.5 text-sm font-semibold">
            {TIPOS.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTipo(valor)}
                className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
                  tipo === valor ? 'bg-accent text-sobre-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {t(valor)}
              </button>
            ))}
          </div>
        </Campo>
        <Campo etiqueta={t('red')}>
          <select className={claseInput} value={red} onChange={(e) => setRed(e.target.value as RedPago)}>
            {REDES.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta={t('ultimos4')}>
          <input
            className={claseInput}
            value={ultimos4}
            inputMode="numeric"
            onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            required
          />
        </Campo>
        <Campo etiqueta={t('vencimiento')} ayuda={t('vencimientoAyuda')}>
          <input
            className={claseInput}
            type="month"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
            required
          />
        </Campo>
        <Campo etiqueta={`${t('etiquetaCampo')} (${tAuth('opcional')})`}>
          <input className={claseInput} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} maxLength={40} />
        </Campo>
        <Campo etiqueta={t('cuenta')}>
          <select className={claseInput} value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta={t('estadoCampo')}>
          <select
            className={claseInput}
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoBancario)}
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {t(`estados.${s}`)}
              </option>
            ))}
          </select>
        </Campo>

        {tipo === 'credito' ? (
          <>
            <Campo etiqueta={t('limiteCredito')}>
              <input
                className={claseInput}
                type="number"
                min="0"
                step="0.01"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                required
              />
            </Campo>
            <div className="grid grid-cols-2 gap-4">
              <Campo etiqueta={t('diaCorte')}>
                <input
                  className={claseInput}
                  type="number"
                  min="1"
                  max="31"
                  value={corte}
                  onChange={(e) => setCorte(e.target.value)}
                  required
                />
              </Campo>
              <Campo etiqueta={t('diaPago')}>
                <input
                  className={claseInput}
                  type="number"
                  min="1"
                  max="31"
                  value={pago}
                  onChange={(e) => setPago(e.target.value)}
                  required
                />
              </Campo>
            </div>
          </>
        ) : null}

        {errorForm ? <p className="text-sm font-medium text-risk sm:col-span-2">{errorForm}</p> : null}

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Boton type="submit" disabled={guardando}>
            {guardando ? tComun('guardando') : t('guardarTarjeta')}
          </Boton>
          <Boton type="button" variante="fantasma" onClick={() => router.push('/tarjetas')}>
            {tComun('cancelar')}
          </Boton>
          {tarjetaId ? (
            <Boton
              type="button"
              variante="peligro"
              onClick={() => void eliminar()}
              disabled={eliminando}
              className="ml-auto"
            >
              {t('eliminar')}
            </Boton>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
