import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Analisis, Categoria, CategoriaSlug, PerfilSlug } from '@/data';
import { Colores, COLOR_PERFIL, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearFecha, formatearPct } from '@/lib/formato';
import { useDatos } from '@/lib/useDatos';
import { FichasIndicadores, ListaRecomendaciones } from '@/components/analisis';
import { DonaGastos, porcionesGasto } from '@/components/graficos';
import { Aparece, ChipPerfil, EstadoCarga, Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

interface Detalle {
  analisis: Analisis;
  categorias: Categoria[];
}

export default function PantallaDetalleAnalisis() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, idioma } = useI18n();
  const insets = useSafeAreaInsets();

  const { datos, cargando, error, recargar } = useDatos<Detalle>(
    async (fuente) => {
      const [analisis, categorias] = await Promise.all([
        fuente.obtenerAnalisis(String(id)),
        fuente.categorias(),
      ]);
      return { analisis, categorias };
    },
    [id],
  );

  const etiquetas = useMemo(
    () =>
      new Map<CategoriaSlug, string>(
        datos?.categorias.map((categoria) => [categoria.slug, categoria.etiqueta]) ?? [],
      ),
    [datos?.categorias],
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={estilos.volver}>← {t('analisis.volver')}</Text>
        </Pressable>
        {datos ? (
          <>
            <Text style={estilos.titulo}>
              {t('analisis.detalleTitulo', {
                fecha: formatearFecha(datos.analisis.analizado_en, idioma),
              })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <ChipPerfil
                perfil={datos.analisis.perfil_codigo}
                etiqueta={datos.analisis.perfil_financiero}
                grande
              />
              <Text style={estilos.subtitulo}>
                {t('analisis.modelo', { version: datos.analisis.modelo_version })}
              </Text>
            </View>
          </>
        ) : null}
      </Hero>

      <View style={{ padding: Espacio.m, gap: Espacio.m }}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos ? (
            <>
              {/* Explicabilidad (P11): probabilidades del modelo */}
              <Aparece delay={60}>
              <Tarjeta>
                <TituloTarjeta>{t('analisis.indicadoresQueEmpujaron')}</TituloTarjeta>
                <View style={{ gap: 10 }}>
                  {(Object.entries(datos.analisis.probabilidades) as [PerfilSlug, number][]).map(
                    ([slug, probabilidad]) => (
                      <View key={slug} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={estilos.probEtiqueta}>{t(`perfil.${slug}`)}</Text>
                        <View style={estilos.probPista}>
                          <View
                            style={{
                              width: `${Math.max(3, probabilidad * 100)}%`,
                              height: '100%',
                              borderRadius: 999,
                              backgroundColor: COLOR_PERFIL[slug],
                            }}
                          />
                        </View>
                        <Text style={estilos.probValor}>
                          {formatearPct(probabilidad, idioma, 0)}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              </Tarjeta>

              <Tarjeta>
                <TituloTarjeta>{t('panel.gastosTitulo')}</TituloTarjeta>
                <DonaGastos
                  porciones={porcionesGasto(
                    datos.analisis.resumen_gastos,
                    etiquetas,
                    t('panel.otras'),
                  )}
                  total={Object.values(datos.analisis.resumen_gastos).reduce(
                    (suma, monto) => suma + (monto ?? 0),
                    0,
                  )}
                  moneda={datos.analisis.moneda}
                  idioma={idioma}
                  etiquetaTotal={t('panel.gastoTotal')}
                />
              </Tarjeta>

              <Tarjeta>
                <TituloTarjeta>{t('panel.indicadoresTitulo')}</TituloTarjeta>
                <FichasIndicadores indicadores={datos.analisis.indicadores} />
              </Tarjeta>

              <Tarjeta>
                <TituloTarjeta>{t('panel.recsTitulo')}</TituloTarjeta>
                <ListaRecomendaciones recomendaciones={datos.analisis.recomendaciones_detalle} />
              </Tarjeta>
              </Aparece>
            </>
          ) : null}
        </EstadoCarga>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, color: Colores.blanco, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  probEtiqueta: { width: 110, fontFamily: Fuentes.cuerpoMedio, fontSize: 12, color: Colores.apagado },
  probPista: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(25,21,9,0.07)',
    overflow: 'hidden',
  },
  probValor: { width: 42, textAlign: 'right', fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: Colores.tinta },
});
