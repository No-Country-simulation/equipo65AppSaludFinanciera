import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  AltaTarjeta,
  CuentaBancaria,
  EstadoBancario,
  RedPago,
  Tarjeta,
  TipoTarjeta,
} from '@/data';
import { Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { Aparece, Boton, Campo, EstadoCarga, Hero } from '@/components/ui';

const TIPOS: TipoTarjeta[] = ['debito', 'credito'];
const REDES: RedPago[] = ['visa', 'mastercard', 'amex'];
const ESTADOS: EstadoBancario[] = ['activa', 'bloqueada', 'cancelada'];

interface DatosForm {
  cuentas: CuentaBancaria[];
  tarjeta: Tarjeta | null;
}

export default function PantallaNuevaTarjeta() {
  const { t } = useI18n();
  const { temaActivo } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const tarjetaId = typeof params.id === 'string' ? params.id : undefined;

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
    <View style={{ flex: 1, backgroundColor: temaActivo.canvas }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.volver}>← {t('nav.tarjetas')}</Text>
        </Pressable>
        <Text style={[s.titulo, { color: temaActivo.blanco }]}>
          {tarjetaId ? t('tarjetas.editarTitulo') : t('tarjetas.nuevaTitulo')}
        </Text>
      </Hero>
      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40 }}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos ? (
            <CuerpoForm cuentas={datos.cuentas} tarjeta={datos.tarjeta} tarjetaId={tarjetaId} />
          ) : null}
        </EstadoCarga>
      </ScrollView>
    </View>
  );
}

function CuerpoForm({
  cuentas,
  tarjeta,
  tarjetaId,
}: {
  cuentas: CuentaBancaria[];
  tarjeta: Tarjeta | null;
  tarjetaId?: string;
}) {
  const { t } = useI18n();
  const { temaActivo } = useTheme();
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

  if (cuentas.length === 0) {
    return <Text style={[s.aviso, { color: temaActivo.apagado }]}>{t('tarjetas.sinCuentaCrear')}</Text>;
  }

  const guardar = async () => {
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
      router.back();
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
      router.back();
    } catch {
      setEliminando(false);
    }
  };

  return (
    <Aparece style={{ gap: Espacio.m }}>
      <View style={{ gap: 6 }}>
        <Text style={[s.etiqueta, { color: temaActivo.tinta }]}>{t('tarjetas.tipo')}</Text>
        <Segmento valores={TIPOS} valor={tipo} onCambio={setTipo} etiquetaDe={(v) => t(`tarjetas.${v}`)} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[s.etiqueta, { color: temaActivo.tinta }]}>{t('tarjetas.red')}</Text>
        <Segmento valores={REDES} valor={red} onCambio={setRed} etiquetaDe={(v) => v.toUpperCase()} />
      </View>
      <Campo
        etiqueta={t('tarjetas.ultimos4')}
        value={ultimos4}
        onChangeText={(texto) => setUltimos4(texto.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
      />
      <Campo
        etiqueta={t('tarjetas.vencimiento')}
        ayuda={t('tarjetas.vencimientoAyuda')}
        value={vencimiento}
        onChangeText={setVencimiento}
        placeholder="2028-05"
      />
      <Campo etiqueta={t('tarjetas.etiquetaCampo')} value={etiqueta} onChangeText={setEtiqueta} maxLength={40} />
      <View style={{ gap: 6 }}>
        <Text style={[s.etiqueta, { color: temaActivo.tinta }]}>{t('tarjetas.cuenta')}</Text>
        <Segmento valores={cuentas.map((c) => c.id)} valor={cuenta} onCambio={setCuenta} etiquetaDe={(id) => cuentas.find((c) => c.id === id)?.numero ?? id} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[s.etiqueta, { color: temaActivo.tinta }]}>{t('tarjetas.estadoCampo')}</Text>
        <Segmento valores={ESTADOS} valor={estado} onCambio={setEstado} etiquetaDe={(v) => t(`tarjetas.estados.${v}`)} />
      </View>

      {tipo === 'credito' ? (
        <>
          <Campo etiqueta={t('tarjetas.limiteCredito')} value={limite} onChangeText={setLimite} keyboardType="numeric" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta={t('tarjetas.diaCorte')} value={corte} onChangeText={setCorte} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Campo etiqueta={t('tarjetas.diaPago')} value={pago} onChangeText={setPago} keyboardType="number-pad" />
            </View>
          </View>
        </>
      ) : null}

      {errorForm ? <Text style={[s.error, { color: temaActivo.riesgo }]}>{errorForm}</Text> : null}

      <Boton
        texto={guardando ? t('comun.guardando') : t('tarjetas.guardarTarjeta')}
        onPress={() => void guardar()}
        cargando={guardando}
        deshabilitado={ultimos4.length !== 4 || !vencimiento}
      />
      {tarjetaId ? (
        <Boton texto={t('tarjetas.eliminar')} variante="peligro" onPress={() => void eliminar()} cargando={eliminando} />
      ) : null}
    </Aparece>
  );
}

function Segmento<T extends string>({
  valores,
  valor,
  onCambio,
  etiquetaDe,
}: {
  valores: readonly T[];
  valor: T;
  onCambio: (v: T) => void;
  etiquetaDe: (v: T) => string;
}) {
  const { temaActivo } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {valores.map((v) => (
        <Pressable
          key={v}
          onPress={() => onCambio(v)}
          style={[
            s.chip,
            { borderColor: temaActivo.linea },
            valor === v && { backgroundColor: temaActivo.acento, borderColor: 'transparent' },
          ]}
        >
          <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: valor === v ? temaActivo.sobreAcento : temaActivo.apagado }}>
            {etiquetaDe(v)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, letterSpacing: -0.4 },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  aviso: { fontFamily: Fuentes.cuerpo, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  error: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13 },
});
