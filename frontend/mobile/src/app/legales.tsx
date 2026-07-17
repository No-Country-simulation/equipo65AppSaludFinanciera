import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { Hero, Tarjeta } from '@/components/ui';

const SECCIONES = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'] as const;

export default function PantallaLegales() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.volver}>← {t('legales.volver')}</Text>
        </Pressable>
        <Text style={s.titulo}>{t('legales.titulo')}</Text>
        <Text style={s.subtitulo}>{t('legales.actualizado')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40 }}>
        <Tarjeta style={{ gap: 0 }}>
          <Text style={s.parrafo}>{t('legales.intro')}</Text>
          {SECCIONES.map((sec) => (
            <View key={sec} style={{ marginTop: 18 }}>
              <Text style={s.seccionTitulo}>{t(`legales.${sec}t`)}</Text>
              <Text style={[s.parrafo, { marginTop: 6 }]}>{t(`legales.${sec}p`)}</Text>
            </View>
          ))}
        </Tarjeta>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, color: Colores.blanco, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  seccionTitulo: { fontFamily: Fuentes.titulo, fontSize: 16, color: Colores.tinta },
  parrafo: { fontFamily: Fuentes.cuerpo, fontSize: 13.5, lineHeight: 20, color: Colores.tintaSuave },
});
