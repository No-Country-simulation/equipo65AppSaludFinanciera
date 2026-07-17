import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { Hero, Tarjeta } from '@/components/ui';

/** Atribucion de dependencias directas (nombre → licencia). Sin traducir: son nombres propios. */
const GRUPOS = [
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

  return (
    <View style={{ flex: 1 }}>
      <Hero paddingTop={insets.top + 14}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.volver}>← {t('licencias.volver')}</Text>
        </Pressable>
        <Text style={s.titulo}>{t('licencias.titulo')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40, gap: Espacio.m }}>
        <Tarjeta>
          <Text style={s.parrafo}>{t('licencias.intro')}</Text>
        </Tarjeta>
        {GRUPOS.map((grupo) => (
          <Tarjeta key={grupo.clave} style={{ gap: 0 }}>
            <Text style={s.seccionTitulo}>{t(grupo.clave)}</Text>
            {grupo.items.map(([nombre, licencia], indice) => (
              <View key={nombre} style={[s.fila, indice === 0 && { borderTopWidth: 0 }]}>
                <Text style={s.nombre} numberOfLines={1}>
                  {nombre}
                </Text>
                <Text style={s.licencia}>{licencia}</Text>
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
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, color: Colores.blanco, letterSpacing: -0.4 },
  parrafo: { fontFamily: Fuentes.cuerpo, fontSize: 13.5, lineHeight: 20, color: Colores.tintaSuave },
  seccionTitulo: { fontFamily: Fuentes.titulo, fontSize: 16, color: Colores.tinta, marginBottom: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colores.linea,
  },
  nombre: { flex: 1, fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tinta },
  licencia: {
    fontFamily: Fuentes.cuerpoSemi,
    fontSize: 11,
    color: Colores.apagado,
    backgroundColor: 'rgba(15,42,67,0.06)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
});
