import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Espacio, Fuentes } from '@/constants/tema'; // Quitamos Colores de aquí
import { useTheme } from '@/context/ThemeContext'; // 1. Importamos el contexto
import { useI18n } from '@/i18n';
import { Hero, Tarjeta } from '@/components/ui';

const SECCIONES = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'] as const;

export default function PantallaLegales() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { temaActivo } = useTheme(); // 2. Obtenemos el tema activo

  return (
   <View style={{ flex: 1, backgroundColor: temaActivo.canvas }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.volver}>← {t('legales.volver')}</Text>
        </Pressable>
        <Text style={[s.titulo, { color: temaActivo.blanco }]}>{t('legales.titulo')}</Text>
        <Text style={s.subtitulo}>{t('legales.actualizado')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40 }}>
        <Tarjeta>
          <Text style={[s.parrafo, { color: temaActivo.tintaSuave }]}>{t('legales.intro')}</Text>
          {SECCIONES.map((sec) => (
            <View key={sec} style={{ marginTop: 18 }}>
              {/* 3. Inyectamos los colores dinámicos aquí */}
              <Text style={[s.seccionTitulo, { color: temaActivo.tinta }]}>{t(`legales.${sec}t`)}</Text>
              <Text style={[s.parrafo, { marginTop: 6, color: temaActivo.tintaSuave }]}>{t(`legales.${sec}p`)}</Text>
            </View>
          ))}
        </Tarjeta>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  seccionTitulo: { fontFamily: Fuentes.titulo, fontSize: 16 },
  parrafo: { fontFamily: Fuentes.cuerpo, fontSize: 13.5, lineHeight: 20 },
});