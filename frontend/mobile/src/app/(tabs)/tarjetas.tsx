import { useCallback, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CuentaBancaria, EstadoBancario, RedPago, Tarjeta } from '@/data';
import { Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { Aparece, Boton, EstadoCarga, Hero, Tarjeta as Panel, TituloTarjeta } from '@/components/ui';

const RED_ETIQUETA: Record<RedPago, string> = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX' };

interface DatosBanca {
  cuentas: CuentaBancaria[];
  tarjetas: Tarjeta[];
}

function utilColor(fraccion: number, tema: ReturnType<typeof useTheme>['temaActivo']): string {
  if (fraccion <= 0.3) return tema.ok;
  // `alerta` (no `alertaFondo`): en oscuro el "fondo" es casi transparente.
  if (fraccion <= 0.7) return tema.alerta;
  return tema.riesgo;
}

function TarjetaVisual({ tarjeta }: { tarjeta: Tarjeta }) {
  const { t, idioma } = useI18n();
  const { temaActivo } = useTheme();
  const { usuario } = useSesion();
  const moneda = usuario?.moneda_principal ?? 'USD';
  const esCredito = tarjeta.tipo === 'credito';

  const estadoColor: Record<EstadoBancario, { fondo: string; texto: string }> = {
    activa: { fondo: temaActivo.okFondo, texto: temaActivo.okTexto },
    bloqueada: { fondo: temaActivo.alertaSuave, texto: temaActivo.alerta },
    cancelada: { fondo: temaActivo.riesgoFondo, texto: temaActivo.riesgo },
  };

  return (
    <View style={[s.card, { backgroundColor: temaActivo.tarjeta, borderColor: temaActivo.linea }]}>
      <LinearGradient
        colors={esCredito ? ['#33414c', '#1b262e'] : ['#4a5a68', '#333f4b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardCara}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={s.cardTipo}>{esCredito ? t('tarjetas.credito') : t('tarjetas.debito')}</Text>
            {tarjeta.etiqueta ? <Text style={s.cardEtiqueta}>{tarjeta.etiqueta}</Text> : null}
          </View>
          <Text style={s.cardRed}>{RED_ETIQUETA[tarjeta.red_pago]}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={s.cardNumero}>•••• {tarjeta.ultimos4}</Text>
          <Text style={s.cardVence}>{t('tarjetas.vence', { fecha: tarjeta.fecha_vencimiento })}</Text>
        </View>
      </LinearGradient>

      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={[s.estado, { backgroundColor: estadoColor[tarjeta.estado].fondo, color: estadoColor[tarjeta.estado].texto }]}
          >
            {t(`tarjetas.estados.${tarjeta.estado}`)}
          </Text>
          {esCredito && tarjeta.credito ? (
            <Text style={[s.corte, { color: temaActivo.apagado }]}>
              {t('tarjetas.corteDia', { dia: tarjeta.credito.dia_corte })} ·{' '}
              {t('tarjetas.pagoDia', { dia: tarjeta.credito.dia_pago })}
            </Text>
          ) : null}
        </View>

        {esCredito && tarjeta.credito
          ? (() => {
              const { limite_credito, saldo_utilizado } = tarjeta.credito;
              const fraccion = limite_credito > 0 ? Math.min(1, saldo_utilizado / limite_credito) : 0;
              const color = utilColor(fraccion, temaActivo);
              return (
                <View style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[s.utilTexto, { color: temaActivo.apagado }]}>{t('tarjetas.utilizacion')}</Text>
                    <Text style={[s.utilTexto, { color, fontFamily: Fuentes.cuerpoSemi }]}>
                      {Math.round(fraccion * 100)}%
                    </Text>
                  </View>
                  <View style={[s.barra, { backgroundColor: temaActivo.canvas2 }]}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: `${Math.max(4, fraccion * 100)}%` }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[s.utilPie, { color: temaActivo.apagado }]}>
                      {t('tarjetas.usado')}: {formatearMoneda(saldo_utilizado, moneda, idioma)}
                    </Text>
                    <Text style={[s.utilPie, { color: temaActivo.apagado }]}>
                      {t('tarjetas.disponible')}: {formatearMoneda(Math.max(0, limite_credito - saldo_utilizado), moneda, idioma)}
                    </Text>
                  </View>
                </View>
              );
            })()
          : null}
      </View>
    </View>
  );
}

export default function PantallaTarjetas() {
  const { t, idioma } = useI18n();
  const { temaActivo } = useTheme();
  const insets = useSafeAreaInsets();
  const ds = useDataSource();

  const { datos, cargando, error, recargar } = useDatos<DatosBanca>(async (fuente) => {
    const [cuentas, tarjetas] = await Promise.all([fuente.cuentas(), fuente.tarjetas()]);
    return { cuentas, tarjetas };
  });

  // Al volver del formulario (crear/editar/eliminar), refresca la lista.
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      recargar();
    }, [recargar]),
  );

  const eliminarTarjeta = (id: string) => {
    Alert.alert(t('tarjetas.eliminar'), t('tarjetas.eliminarConfirmar'), [
      { text: t('comun.cancelar'), style: 'cancel' },
      {
        text: t('tarjetas.eliminar'),
        style: 'destructive',
        onPress: async () => {
          await ds.eliminarTarjeta(id);
          recargar();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: temaActivo.canvas }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Hero paddingTop={insets.top + 14}>
        <Text style={[s.heroTitulo, { color: temaActivo.blanco }]}>{t('tarjetas.titulo')}</Text>
        <Text style={[s.heroSub, { color: temaActivo.blanco }]}>{t('tarjetas.subtitulo')}</Text>
      </Hero>

      <Aparece delay={60} style={{ padding: Espacio.m, gap: Espacio.m }}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {/* Acciones: agregar tarjeta + salud crediticia */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Boton texto={t('tarjetas.agregar')} onPress={() => router.push('/nueva-tarjeta' as Href)} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton texto={t('nav.credito')} variante="fantasma" onPress={() => router.push('/credito' as Href)} />
            </View>
          </View>

          {/* Cuentas */}
          <Panel>
            <TituloTarjeta>{t('tarjetas.cuentasTitulo')}</TituloTarjeta>
            {datos && datos.cuentas.length > 0 ? (
              datos.cuentas.map((cuenta, i) => (
                <View
                  key={cuenta.id}
                  style={[s.cuentaFila, { borderTopColor: temaActivo.linea }, i === 0 && { borderTopWidth: 0 }]}
                >
                  <View>
                    <Text style={[s.cuentaNum, { color: temaActivo.tinta }]}>
                      {t('tarjetas.cuentaNum', { numero: cuenta.numero })}
                    </Text>
                    <Text style={[s.cuentaSub, { color: temaActivo.apagado }]}>
                      {t('tarjetas.apertura', { fecha: formatearFecha(cuenta.fecha_apertura, idioma) })}
                    </Text>
                  </View>
                  <Ionicons name="wallet-outline" size={18} color={temaActivo.apagado} />
                </View>
              ))
            ) : (
              <Text style={[s.vacio, { color: temaActivo.apagado }]}>{t('tarjetas.sinCuentas')}</Text>
            )}
          </Panel>

          {/* Tarjetas */}
          <TituloTarjeta>{t('tarjetas.tarjetasTitulo')}</TituloTarjeta>
          {datos && datos.tarjetas.length > 0 ? (
            datos.tarjetas.map((tarjeta) => (
              <View key={tarjeta.id} style={{ gap: 8 }}>
                <TarjetaVisual tarjeta={tarjeta} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Boton
                      texto={t('tarjetas.editar')}
                      variante="fantasma"
                      onPress={() => router.push(`/nueva-tarjeta?id=${tarjeta.id}` as Href)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton texto={t('tarjetas.eliminar')} variante="peligro" onPress={() => eliminarTarjeta(tarjeta.id)} />
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[s.vacio, { color: temaActivo.apagado }]}>{t('tarjetas.vacio')}</Text>
          )}

        </EstadoCarga>
      </Aparece>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  heroTitulo: { fontFamily: Fuentes.titulo, fontSize: 25 },
  heroSub: { fontFamily: Fuentes.cuerpo, fontSize: 12, opacity: 0.65 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardCara: { height: 168, padding: 18, justifyContent: 'space-between' },
  cardTipo: { fontFamily: Fuentes.cuerpoMedio, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  cardEtiqueta: { fontFamily: Fuentes.titulo, fontSize: 18, color: '#fff', marginTop: 2 },
  cardRed: { fontFamily: Fuentes.cuerpoNegrita, fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)' },
  cardNumero: { fontFamily: Fuentes.cuerpoSemi, fontSize: 16, letterSpacing: 2, color: '#fff' },
  cardVence: { fontFamily: Fuentes.cuerpo, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  estado: { fontFamily: Fuentes.cuerpoSemi, fontSize: 11, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  corte: { fontFamily: Fuentes.cuerpoMedio, fontSize: 11 },
  utilTexto: { fontFamily: Fuentes.cuerpo, fontSize: 12 },
  utilPie: { fontFamily: Fuentes.cuerpo, fontSize: 11 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  cuentaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1 },
  cuentaNum: { fontFamily: Fuentes.cuerpoSemi, fontSize: 14 },
  cuentaSub: { fontFamily: Fuentes.cuerpo, fontSize: 11 },
  vacio: { fontFamily: Fuentes.cuerpo, fontSize: 13, paddingVertical: 12 },
  ayuda: { fontFamily: Fuentes.cuerpo, fontSize: 11.5, marginBottom: 6 },
});
