import { ActivityIndicator, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';


export default function TabsLayout() {
  const { usuario, listo } = useSesion();
  const { t } = useI18n();
  // Antes usaba `Colores` (estatico = tema oscuro): en modo claro la barra de
  // pestanas y el fondo de las pantallas se quedaban oscuros.
  const { temaActivo } = useTheme();

  if (!listo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: temaActivo.canvas }}>
        <ActivityIndicator size="large" color={temaActivo.acento} />
      </View>
    );
  }
  if (!usuario) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: temaActivo.acento,
        tabBarInactiveTintColor: temaActivo.apagado,
        tabBarStyle: {
          backgroundColor: temaActivo.tarjeta,
          borderTopColor: temaActivo.linea,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: Fuentes.cuerpoSemi, fontSize: 9.5 },
        sceneStyle: { backgroundColor: temaActivo.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.panel'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: t('nav.movimientos'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-vertical-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tarjetas"
        options={{
          title: t('nav.tarjetas'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="presupuestos"
        options={{
          title: t('nav.presupuestos'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="metas"
        options={{
          title: t('nav.metas'),
          tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('nav.perfil'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
