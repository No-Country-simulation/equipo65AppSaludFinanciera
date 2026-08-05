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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceApiError } from '@/data';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { BotonTema } from '@/components/BotonTema';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Boton, Campo } from '@/components/ui';
import { Logo } from '@/components/Logo';

export default function PantallaLogin() {
  const { t, setIdioma } = useI18n();
  const ds = useDataSource();
  const { iniciarSesion } = useSesion();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigoTotp, setCodigoTotp] = useState('');
  const [pide2fa, setPide2fa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const sesion = await ds.login(email.trim(), password, codigoTotp || undefined);
      if (sesion.requiere_2fa) {
        setPide2fa(true);
        return;
      }
      const usuario = sesion.usuario ?? (await ds.me());
      iniciarSesion(usuario, { access: sesion.access_token, refresh: sesion.refresh_token });
      setIdioma(usuario.idioma); // adopta el idioma preferido (cross-device)
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo alto={44} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SelectorIdioma claro />
            <BotonTema claro />
          </View>
        </View>

        <Text style={estilos.lema}>{t('comun.lema')}</Text>

        <View style={estilos.tarjetaForm}>
          <Text style={estilos.titulo}>{pide2fa ? t('auth.totpTitulo') : t('auth.loginTitulo')}</Text>
          <Text style={estilos.subtitulo}>
            {pide2fa ? t('auth.totpAyuda') : t('auth.loginSubtitulo')}
          </Text>

          {pide2fa ? (
            <Campo
              etiqueta={t('auth.codigo')}
              value={codigoTotp}
              onChangeText={(texto) => setCodigoTotp(texto.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
            />
          ) : (
            <>
              <Campo
                etiqueta={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Campo
                etiqueta={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          {error ? <Text style={estilos.error}>{error}</Text> : null}

          <Boton
            texto={pide2fa ? t('auth.verificar') : enviando ? t('auth.entrando') : t('auth.entrar')}
            onPress={() => void entrar()}
            cargando={enviando}
          />

          {!pide2fa ? (
            <Pressable onPress={() => router.push('/registro')}>
              <Text style={estilos.enlace}>
                {t('auth.sinCuenta')}{' '}
                <Text style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}>
                  {t('auth.crearCuenta')}
                </Text>
              </Text>
            </Pressable>
          ) : null}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { flexGrow: 1, padding: Espacio.l, gap: Espacio.l },
  lema: {
    fontFamily: Fuentes.titulo,
    fontSize: 30,
    lineHeight: 38,
    color: Colores.blanco,
    marginTop: Espacio.m,
  },
  tarjetaForm: {
    backgroundColor: Colores.tarjeta,
    borderRadius: 22,
    padding: Espacio.l,
    gap: Espacio.m,
    marginTop: 'auto' as never,
  },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 24, color: Colores.tinta },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, marginTop: -8 },
  error: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.riesgo },
  enlace: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, textAlign: 'center' },
  avisoDemo: {
    fontFamily: Fuentes.cuerpoNegrita,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colores.menta,
    textAlign: 'center',
  },
});
