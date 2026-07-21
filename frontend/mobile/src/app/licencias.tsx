import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext'; // 1. Hook de tema
import { useI18n } from '@/i18n';
import { Hero, Tarjeta } from '@/components/ui';

const GRUPOS = [
  // ... (tu lista de grupos se queda igual)
  {
    clave: 'licencias.grupoMovil',
    items: [
      ['React Native', 'MIT'],
      ['Expo / Expo Router', 'MIT'],
      ['react-native-svg', 'MIT'],
      ['expo-linear-gradient', 'MIT'],
      ['@react-native-async-storage/async-storage', 'MIT'],
      ['@expo/vector-icons (Ionicons)', 'MIT'],
      ['react-native-safe-area-context', 'MIT'],
    ],
  },
  {
    clave: 'licencias.grupoWeb',
    items: [
      ['Next.js', 'MIT'],
      ['React', 'MIT'],
      ['next-intl', 'MIT'],
      ['Recharts', 'MIT'],
      ['Tailwind CSS', 'MIT'],
    ],
  },
  {
    clave: 'licencias.grupoFuentes',
    items: [
      ['Bricolage Grotesque', 'SIL OFL 1.1'],
      ['Hanken Grotesk', 'SIL OFL 1.1'],
    ],
  },
] as const;

export default function PantallaLicencias() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { temaActivo } = useTheme(); // 2. Obtenemos colores dinámicos

  return (
    <View style={{ flex: 1, backgroundColor: temaActivo.canvas }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.volver}>← {t('licencias.volver')}</Text>
        </Pressable>
        <Text style={[s.titulo, { color: temaActivo.blanco }]}>{t('licencias.titulo')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40, gap: Espacio.m }}>
        <Tarjeta>
          <Text style={[s.parrafo, { color: temaActivo.tintaSuave }]}>{t('licencias.intro')}</Text>
        </Tarjeta>
        
        {GRUPOS.map((grupo) => (
          <Tarjeta key={grupo.clave} style={{ gap: 0 }}>
            <Text style={[s.seccionTitulo, { color: temaActivo.tinta }]}>{t(grupo.clave)}</Text>
            {grupo.items.map(([nombre, licencia], indice) => (
              <View 
                key={nombre} 
                style={[
                  s.fila, 
                  indice === 0 && { borderTopWidth: 0 },
                  { borderTopColor: temaActivo.linea } // Color dinámico para la línea
                ]}
              >
                <Text style={[s.nombre, { color: temaActivo.tinta }]} numberOfLines={1}>
                  {nombre}
                </Text>
                <Text style={[s.licencia, { color: temaActivo.apagado, backgroundColor: temaActivo.canvas2 }]}>
                  {licencia}
                </Text>
              </View>
            ))}
          </Tarjeta>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, letterSpacing: -0.4 },
  parrafo: { fontFamily: Fuentes.cuerpo, fontSize: 13.5, lineHeight: 20 },
  seccionTitulo: { fontFamily: Fuentes.titulo, fontSize: 16, marginBottom: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  nombre: { flex: 1, fontFamily: Fuentes.cuerpoMedio, fontSize: 13 },
  licencia: {
    fontFamily: Fuentes.cuerpoSemi,
    fontSize: 11,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
});