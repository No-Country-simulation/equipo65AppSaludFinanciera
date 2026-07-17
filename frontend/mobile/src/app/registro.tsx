import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceApiError, TERMINOS_VERSION, type Moneda } from '@/data';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { Boton, Campo } from '@/components/ui';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];

export default function PantallaRegistro() {
  const { t } = useI18n();
  const ds = useDataSource();
  const { iniciarSesion } = useSesion();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    setEnviando(true);
    setError(null);
    try {
      await ds.registro(email.trim(), password, moneda, TERMINOS_VERSION);
      const sesion = await ds.login(email.trim(), password);
      const usuario = sesion.usuario ?? (await ds.me());
      iniciarSesion(usuario, { access: sesion.access_token, refresh: sesion.refresh_token });
      router.replace('/');
    } catch (causa) {
      setError(causa instanceof FinanceApiError ? causa.message : String(causa));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colores.heroA }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[estilos.contenido, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={estilos.logo}>
          finance<Text style={{ color: Colores.menta }}>AI</Text>
        </Text>

        <View style={estilos.tarjetaForm}>
          <Text style={estilos.titulo}>{t('auth.registroTitulo')}</Text>
          <Text style={estilos.subtitulo}>{t('auth.registroSubtitulo')}</Text>

          <Campo
            etiqueta={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Campo
            etiqueta={t('auth.password')}
            ayuda={t('auth.passwordAyuda')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={{ gap: 6 }}>
            <Text style={estilos.etiqueta}>{t('auth.monedaPrincipal')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MONEDAS.map((codigo) => (
                <Pressable
                  key={codigo}
                  onPress={() => setMoneda(codigo)}
                  style={[estilos.chipMoneda, moneda === codigo && { backgroundColor: Colores.acento, borderColor: 'transparent' }]}
                >
                  <Text
                    style={{
                      fontFamily: Fuentes.cuerpoSemi,
                      fontSize: 12,
                      color: moneda === codigo ? Colores.blanco : Colores.apagado,
                    }}
                  >
                    {codigo}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error ? <Text style={estilos.error}>{error}</Text> : null}

          {/* Aceptación de términos (obligatoria) */}
          <View style={estilos.aceptoFila}>
            <Pressable onPress={() => setAceptado((v) => !v)} hitSlop={8}>
              <Ionicons
                name={aceptado ? 'checkbox' : 'square-outline'}
                size={22}
                color={aceptado ? Colores.acento : Colores.apagado}
              />
            </Pressable>
            <Text style={estilos.aceptoTexto}>
              {t('auth.aceptoLabel')}{' '}
              <Text
                onPress={() => router.push('/legales')}
                style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}
              >
                {t('auth.terminos')}
              </Text>{' '}
              {t('auth.aceptoY')}{' '}
              <Text
                onPress={() => router.push('/privacidad' as Href)}
                style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}
              >
                {t('privacidad.titulo')}
              </Text>
            </Text>
          </View>

          <Boton
            texto={enviando ? t('auth.creando') : t('auth.crear')}
            onPress={() => void crear()}
            cargando={enviando}
            deshabilitado={!aceptado}
          />

          <Pressable onPress={() => router.back()}>
            <Text style={estilos.enlace}>
              {t('auth.yaTienes')}{' '}
              <Text style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}>
                {t('auth.entrar')}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { flexGrow: 1, padding: Espacio.l, gap: Espacio.l },
  logo: { fontFamily: Fuentes.titulo, fontSize: 28, color: Colores.blanco },
  tarjetaForm: {
    backgroundColor: Colores.tarjeta,
    borderRadius: 22,
    padding: Espacio.l,
    gap: Espacio.m,
    marginTop: 'auto' as never,
  },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 24, color: Colores.tinta },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, marginTop: -8 },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tinta },
  chipMoneda: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colores.linea,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  error: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.riesgo },
  enlace: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, textAlign: 'center' },
  aceptoFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(242,238,228,0.6)',
    borderWidth: 1,
    borderColor: Colores.linea,
    borderRadius: 14,
    padding: 12,
  },
  aceptoTexto: { flex: 1, fontFamily: Fuentes.cuerpo, fontSize: 12.5, lineHeight: 18, color: Colores.tintaSuave },
});
