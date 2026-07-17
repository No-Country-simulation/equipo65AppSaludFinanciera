import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Colores } from '@/constants/tema';
import { I18nProvider } from '@/i18n';
import { SesionProvider } from '@/lib/sesion';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Las claves son los fontFamily usados en los estilos (ver constants/tema.ts)
  const [fuentesListas] = useFonts({
    Bricolage_600SemiBold: BricolageGrotesque_600SemiBold,
    Bricolage_700Bold: BricolageGrotesque_700Bold,
    Hanken_400Regular: HankenGrotesk_400Regular,
    Hanken_500Medium: HankenGrotesk_500Medium,
    Hanken_600SemiBold: HankenGrotesk_600SemiBold,
    Hanken_700Bold: HankenGrotesk_700Bold,
  });

  useEffect(() => {
    if (fuentesListas) SplashScreen.hideAsync();
  }, [fuentesListas]);

  if (!fuentesListas) return null;

  return (
    <I18nProvider>
      <SesionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colores.canvas },
          }}
        />
      </SesionProvider>
    </I18nProvider>
  );
}
