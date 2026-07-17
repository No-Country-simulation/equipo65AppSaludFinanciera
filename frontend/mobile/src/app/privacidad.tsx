import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { Hero, Tarjeta } from '@/components/ui';

const SECCIONES = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;

export default function PantallaPrivacidad() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.volver}>← {t('privacidad.volver')}</Text>
        </Pressable>
        <Text style={s.titulo}>{t('privacidad.titulo')}</Text>
        <Text style={s.subtitulo}>{t('privacidad.actualizado')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40 }}>
        <Tarjeta style={{ gap: 0 }}>
          <Text style={s.parrafo}>{t('privacidad.intro')}</Text>
          {SECCIONES.map((sec) => (
            <View key={sec} style={{ marginTop: 18 }}>
              <Text style={s.seccionTitulo}>{t(`privacidad.${sec}t`)}</Text>
              <Text style={[s.parrafo, { marginTop: 6 }]}>{t(`privacidad.${sec}p`)}</Text>
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
