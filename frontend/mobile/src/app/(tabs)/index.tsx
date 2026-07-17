import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Analisis, Categoria, CategoriaSlug, ComparacionMensual, MetaAhorro, Presupuesto, Transaccion } from '@/data';
import { CalendarioPagos } from '@/components/calendario';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearFecha, formatearMoneda, formatearPct } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { ListaRecomendaciones, FichasIndicadores } from '@/components/analisis';
import { DonaGastos, EstructuraGasto, porcionesGasto, tramosEstructura } from '@/components/graficos';
import { TarjetaComparacion } from '@/components/comparacion';
import { progresoMeta, TarjetaMeta } from '@/components/metas';
import { BarraPresupuesto, estadoPresupuesto } from '@/components/presupuestos';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Aparece, Boton, ChipPerfil, CifraAnimada, EstadoCarga, Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosInicio {
  analisis: Analisis | null;
  categorias: Categoria[];
  comparacion: ComparacionMensual;
  metas: MetaAhorro[];
  presupuestos: Presupuesto[];
  transacciones: Transaccion[];
}

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

export default function PantallaInicio() {
  const { t, idioma } = useI18n();
  const { usuario } = useSesion();
  const ds = useDataSource();
  const insets = useSafeAreaInsets();
  const [analizando, setAnalizando] = useState(false);

  const [buscador, setBuscador] = useState(false); // solo interfaz (F9)

  const { datos, cargando, error, recargar } = useDatos<DatosInicio>(async (fuente) => {
    const [analisis, categorias, comparacion, metas, presupuestos, pagina] = await Promise.all([
      fuente.ultimoAnalisis(),
      fuente.categorias(),
      fuente.comparacionMensual(),
      fuente.metas(),
      fuente.presupuestos(),
      fuente.transacciones({ tam: 100 }),
    ]);
    return { analisis, categorias, comparacion, metas, presupuestos, transacciones: pagina.items };
  });

  const etiquetas = useMemo(
    () =>
      new Map<CategoriaSlug, string>(
        datos?.categorias.map((categoria) => [categoria.slug, categoria.etiqueta]) ?? [],
      ),
    [datos?.categorias],
  );

  const gastoTotal = datos?.analisis
    ? Object.values(datos.analisis.resumen_gastos).reduce((suma, monto) => suma + (monto ?? 0), 0)
    : 0;

  const analizar = async () => {
    setAnalizando(true);
    try {
      await ds.ejecutarAnalisis();
      recargar();
    } catch (causa) {
      Alert.alert(t('comun.app'), causa instanceof Error ? causa.message : String(causa));
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} />}
    >
      {/* ── Cabecera con gradiente (estilo app de banca) ──────────────── */}
      <Hero paddingTop={insets.top + 18}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={estilos.logo}>
            finance<Text style={{ color: Colores.menta }}>AI</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => setBuscador(true)} hitSlop={8}>
              <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.85)" />
            </Pressable>
            <SelectorIdioma claro />
          </View>
        </View>
        <Text style={estilos.saludo}>
          {t('panel.saludo', { nombre: usuario?.nombre.split(' ')[0] ?? '' })}
        </Text>
        {/* Multi-cuenta (solo interfaz, F9) */}
        <Pressable
          onPress={() =>
            Alert.alert(
              t('panel.cuentaPrincipal'),
              `${t('panel.agregarCuenta')} · ${t('comun.proximamente')}`,
            )
          }
          style={estilos.chipCuenta}
        >
          <Ionicons name="wallet-outline" size={13} color={Colores.menta} />
          <Text style={estilos.chipCuentaTexto}>
            {t('panel.cuentaPrincipal')} · {usuario?.moneda_principal ?? ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.55)" />
        </Pressable>

        {datos?.analisis ? (
          <>
            <View style={{ marginTop: 10 }}>
              <ChipPerfil
                perfil={datos.analisis.perfil_codigo}
                etiqueta={datos.analisis.perfil_financiero}
                grande
              />
              <Text style={estilos.subtexto}>
                {t('panel.confianza', { pct: Math.round(datos.analisis.probabilidad * 100) })}
                {'  ·  '}
                {t('panel.ultimoAnalisis', {
                  fecha: formatearFecha(datos.analisis.analizado_en, idioma),
                })}
              </Text>
            </View>

            <View style={estilos.filaCifras}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.cifraEtiqueta}>{t('panel.ingresoMensual').toUpperCase()}</Text>
                <CifraAnimada
                  valor={usuario?.ingreso_mensual ?? 0}
                  formato={(n) => formatearMoneda(n, datos.analisis!.moneda, idioma)}
                  style={estilos.cifra}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.cifraEtiqueta}>{t('panel.gastoTotal').toUpperCase()}</Text>
                <CifraAnimada
                  valor={gastoTotal}
                  formato={(n) => formatearMoneda(n, datos.analisis!.moneda, idioma)}
                  style={[estilos.cifra, { color: Colores.alertaFondo }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.cifraEtiqueta}>{t('panel.evolucionEje').toUpperCase()}</Text>
                <CifraAnimada
                  valor={datos.analisis.indicadores.tasa_ahorro}
                  formato={(n) => formatearPct(n, idioma)}
                  style={[estilos.cifra, { color: Colores.menta }]}
                />
              </View>
            </View>
          </>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Boton
            texto={analizando ? t('panel.analizando') : t('panel.analizar')}
            onPress={() => void analizar()}
            variante="claro"
            cargando={analizando}
          />
        </View>
      </Hero>

      {/* ── Contenido ────────────────────────────────────────────────── */}
      <View style={estilos.contenido}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos?.analisis ? (
            <>
              <Aparece delay={40}>
                <Tarjeta>
                  <TituloTarjeta>{t('panel.comparacionTitulo')}</TituloTarjeta>
                  <TarjetaComparacion datos={datos.comparacion} moneda={datos.analisis.moneda} />
                </Tarjeta>
              </Aparece>

              <Aparece delay={90}>
                <Tarjeta>
                  <TituloTarjeta>{t('panel.gastosTitulo')}</TituloTarjeta>
                  <DonaGastos
                    porciones={porcionesGasto(
                      datos.analisis.resumen_gastos,
                      etiquetas,
                      t('panel.otras'),
                    )}
                    total={gastoTotal}
                    moneda={datos.analisis.moneda}
                    idioma={idioma}
                    etiquetaTotal={t('panel.gastoTotal')}
                  />
                </Tarjeta>
              </Aparece>

              <Aparece delay={140}>
                <Tarjeta>
                  <TituloTarjeta>{t('panel.estructuraTitulo')}</TituloTarjeta>
                  <EstructuraGasto
                    tramos={tramosEstructura(
                      datos.analisis.resumen_gastos,
                      usuario?.ingreso_mensual ?? 0,
                      (g) => t(`panel.grupos.${g}`),
                      t('panel.ahorro'),
                    )}
                    moneda={datos.analisis.moneda}
                    idioma={idioma}
                  />
                </Tarjeta>
              </Aparece>

              {datos.metas.length > 0 ? (
                <Aparece delay={180}>
                  <Tarjeta>
                    <Pressable style={estilos.widgetHead} onPress={() => router.push('/metas' as Href)}>
                      <TituloTarjeta>{t('panel.metasTitulo')}</TituloTarjeta>
                      <Text style={estilos.verTodo}>{t('panel.verTodo')} →</Text>
                    </Pressable>
                    <View style={{ gap: 14 }}>
                      {[...datos.metas].sort((a, b) => progresoMeta(b) - progresoMeta(a)).slice(0, 2).map((meta) => (
                        <TarjetaMeta key={meta.id} meta={meta} compacta />
                      ))}
                    </View>
                  </Tarjeta>
                </Aparece>
              ) : null}

              {datos.presupuestos.length > 0 ? (
                <Aparece delay={220}>
                  <Tarjeta>
                    <Pressable style={estilos.widgetHead} onPress={() => router.push('/presupuestos' as Href)}>
                      <TituloTarjeta>{t('panel.presupuestosTitulo')}</TituloTarjeta>
                      <Text style={estilos.verTodo}>{t('panel.verTodo')} →</Text>
                    </Pressable>
                    <View style={{ gap: 16 }}>
                      {[...datos.presupuestos]
                        .sort((a, b) => estadoPresupuesto(b).fraccion - estadoPresupuesto(a).fraccion)
                        .slice(0, 3)
                        .map((p) => (
                          <BarraPresupuesto
                            key={p.categoria}
                            presupuesto={p}
                            etiqueta={etiquetas.get(p.categoria) ?? p.categoria}
                            compacta
                          />
                        ))}
                    </View>
                  </Tarjeta>
                </Aparece>
              ) : null}

              <Aparece delay={240}>
                <Tarjeta>
                  <TituloTarjeta>{t('movimientos.calendarioTitulo')}</TituloTarjeta>
                  <CalendarioPagos
                    transacciones={datos.transacciones}
                    mes={MES_ACTUAL}
                    idioma={idioma}
                  />
                </Tarjeta>
              </Aparece>

              <Aparece delay={260}>
                <Tarjeta>
                  <TituloTarjeta>{t('panel.indicadoresTitulo')}</TituloTarjeta>
                  <FichasIndicadores indicadores={datos.analisis.indicadores} />
                </Tarjeta>
              </Aparece>

              <Aparece delay={300}>
                <Tarjeta>
                  <TituloTarjeta>{t('panel.recsTitulo')}</TituloTarjeta>
                  <ListaRecomendaciones recomendaciones={datos.analisis.recomendaciones_detalle} />
                </Tarjeta>
              </Aparece>

              <Aparece delay={340}>
                <Pressable onPress={() => router.push('/analisis' as Href)}>
                  <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={estilos.verAnalisisIcono}>
                      <Ionicons name="trending-up-outline" size={20} color={Colores.acento} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.verAnalisisTitulo}>{t('analisis.titulo')}</Text>
                      <Text style={estilos.verAnalisisSub}>{t('analisis.subtitulo')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colores.apagado} />
                  </Tarjeta>
                </Pressable>
              </Aparece>

              <Text style={estilos.avisoEducativo}>{t('comun.educativo')}</Text>
            </>
          ) : (
            <Tarjeta style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
              <Text style={{ fontFamily: Fuentes.titulo, fontSize: 19, color: Colores.tinta }}>
                {t('panel.sinDatosTitulo')}
              </Text>
              <Text
                style={{
                  fontFamily: Fuentes.cuerpo,
                  fontSize: 13,
                  color: Colores.apagado,
                  textAlign: 'center',
                }}
              >
                {t('panel.sinDatosTexto')}
              </Text>
            </Tarjeta>
          )}
        </EstadoCarga>
      </View>

      {/* Buscador global (solo interfaz, F9) */}
      <Modal visible={buscador} animationType="fade" transparent>
        <Pressable style={estilos.buscadorFondo} onPress={() => setBuscador(false)}>
          <Pressable style={estilos.buscadorCaja} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="search-outline" size={18} color={Colores.apagado} />
              <TextInput
                autoFocus
                placeholder={t('panel.buscarGlobal')}
                placeholderTextColor={`${Colores.apagado}99`}
                style={estilos.buscadorInput}
              />
              <Pressable onPress={() => setBuscador(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={Colores.apagado} />
              </Pressable>
            </View>
            <View style={estilos.buscadorPie}>
              <Text style={estilos.buscadorPista}>{t('panel.buscarPista')}</Text>
              <Text style={estilos.buscadorProx}>{t('comun.proximamente')}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  logo: { fontFamily: Fuentes.titulo, fontSize: 22, color: Colores.blanco },
  saludo: { fontFamily: Fuentes.titulo, fontSize: 27, color: Colores.blanco, marginTop: 14, letterSpacing: -0.5 },
  subtexto: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 8 },
  filaCifras: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cifraEtiqueta: {
    fontFamily: Fuentes.cuerpoMedio,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  cifra: { fontFamily: Fuentes.titulo, fontSize: 19, color: Colores.blanco, marginTop: 3 },
  contenido: { padding: Espacio.m, gap: Espacio.m },
  widgetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  verTodo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: Colores.acento },
  verAnalisisIcono: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: `${Colores.acento}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verAnalisisTitulo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 15, color: Colores.tinta },
  verAnalisisSub: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: Colores.apagado, marginTop: 1 },
  chipCuenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  chipCuentaTexto: { fontFamily: Fuentes.cuerpoMedio, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  buscadorFondo: {
    flex: 1,
    backgroundColor: 'rgba(9,26,22,0.55)',
    paddingTop: 110,
    paddingHorizontal: 18,
  },
  buscadorCaja: {
    backgroundColor: Colores.tarjeta,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  buscadorInput: { flex: 1, paddingVertical: 12, fontFamily: Fuentes.cuerpo, fontSize: 15, color: Colores.tinta },
  buscadorPie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colores.linea,
    paddingVertical: 10,
  },
  buscadorPista: { flex: 1, fontFamily: Fuentes.cuerpo, fontSize: 11.5, color: Colores.apagado },
  buscadorProx: {
    fontFamily: Fuentes.cuerpoSemi,
    fontSize: 10,
    color: Colores.alerta,
    backgroundColor: Colores.alertaSuave,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  avisoEducativo: {
    fontFamily: Fuentes.cuerpo,
    fontSize: 11,
    color: Colores.apagado,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
