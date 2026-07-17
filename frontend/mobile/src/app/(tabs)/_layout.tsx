import { ActivityIndicator, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { Colores, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';

export default function TabsLayout() {
  const { usuario, listo } = useSesion();
  const { t } = useI18n();

  if (!listo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.canvas }}>
        <ActivityIndicator size="large" color={Colores.acento} />
      </View>
    );
  }
  if (!usuario) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colores.acento,
        tabBarInactiveTintColor: Colores.apagado,
        tabBarStyle: {
          backgroundColor: Colores.tarjeta,
          borderTopColor: Colores.linea,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: Fuentes.cuerpoSemi, fontSize: 9.5 },
        sceneStyle: { backgroundColor: Colores.canvas },
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
