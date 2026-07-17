import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Evolucion, ResumenAnalisis } from '@/data';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearFecha, formatearPct } from '@/lib/formato';
import { useDatos } from '@/lib/useDatos';
import { LineaEvolucion } from '@/components/graficos';
import { Aparece, ChipPerfil, EstadoCarga, Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosAnalisis {
  historial: ResumenAnalisis[];
  evolucion: Evolucion;
}

export default function PantallaAnalisis() {
  const { t, idioma } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { datos, cargando, error, recargar } = useDatos<DatosAnalisis>(async (fuente) => {
    const [historial, evolucion] = await Promise.all([
      fuente.historialAnalisis(1, 24),
      fuente.evolucion(),
    ]);
    return { historial, evolucion };
  });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Hero paddingTop={insets.top + 14} redondeado={false}>
        <Pressable onPress={() => router.back()}>
          <Text style={estilos.volver}>← {t('nav.panel')}</Text>
        </Pressable>
        <Text style={estilos.titulo}>{t('analisis.titulo')}</Text>
        <Text style={estilos.subtitulo}>{t('analisis.subtitulo')}</Text>
      </Hero>

      <View style={{ padding: Espacio.m, gap: Espacio.m }}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos ? (
            <>
              <Aparece delay={60}>
              <Tarjeta>
                <TituloTarjeta>{t('panel.evolucionTitulo')}</TituloTarjeta>
                {datos.evolucion.puntos.length > 1 ? (
                  <LineaEvolucion
                    puntos={datos.evolucion.puntos}
                    idioma={idioma}
                    ancho={width - Espacio.m * 2 - 32}
                  />
                ) : (
                  <Text style={estilos.vacio}>{t('analisis.vacio')}</Text>
                )}
              </Tarjeta>
              </Aparece>

              <Aparece delay={140}>
              <Tarjeta style={{ padding: 0 }}>
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                  <TituloTarjeta>{t('analisis.historial')}</TituloTarjeta>
                </View>
                {datos.historial.length === 0 ? (
                  <Text style={estilos.vacio}>{t('analisis.vacio')}</Text>
                ) : (
                  datos.historial.map((resumen, indice) => (
                    <Pressable
                      key={resumen.id}
                      onPress={() => router.push(`/analisis/${resumen.id}`)}
                      style={[estilos.filaHistorial, indice === 0 && { borderTopWidth: 0 }]}
                    >
                      <Text style={estilos.filaFecha}>
                        {formatearFecha(resumen.analizado_en, idioma)}
                      </Text>
                      <ChipPerfil
                        perfil={resumen.perfil_codigo}
                        etiqueta={t(`perfil.${resumen.perfil_codigo}`)}
                      />
                      <Text style={estilos.filaProb}>
                        {formatearPct(resumen.probabilidad, idioma, 0)}
                      </Text>
                      <Text style={{ color: Colores.acento, fontSize: 16 }}>›</Text>
                    </Pressable>
                  ))
                )}
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
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 25, color: Colores.blanco, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  vacio: {
    fontFamily: Fuentes.cuerpo,
    fontSize: 13,
    color: Colores.apagado,
    textAlign: 'center',
    paddingVertical: 32,
  },
  filaHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Colores.linea,
  },
  filaFecha: { flex: 1, fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tinta },
  filaProb: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: Colores.apagado },
});
