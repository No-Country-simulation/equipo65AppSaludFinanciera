import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceApiError, TERMINOS_VERSION, type Moneda, type Usuario } from '@/data';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { BotonTema } from '@/components/BotonTema';
import { QrCode } from '@/components/QrCode';
import { Boton, Campo } from '@/components/ui';
import { Logo } from '@/components/Logo';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];

type Paso = 'cuenta' | 'qr' | 'verificar' | 'respaldo';
const INDICE_PASO: Record<Paso, number> = { cuenta: 0, qr: 1, verificar: 1, respaldo: 2 };

export default function PantallaRegistro() {
  const { t, setIdioma } = useI18n();
  const ds = useDataSource();
  const { iniciarSesion, actualizarUsuario } = useSesion();
  const insets = useSafeAreaInsets();

  const [paso, setPaso] = useState<Paso>('cuenta');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | ''>('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [secreto, setSecreto] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);

  const fallar = (causa: unknown) =>
    setError(causa instanceof FinanceApiError ? causa.message : String(causa));

  const crearCuenta = async () => {
    setEnviando(true);
    setError(null);
    try {
      await ds.registro({
        email: email.trim(),
        password,
        moneda_principal: moneda,
        nombre,
        apellido,
        fecha_nacimiento: nacimiento,
        genero: genero || undefined,
        telefono: telefono || undefined,
        ciudad: ciudad || undefined,
        terminos_version: TERMINOS_VERSION,
      });
      const sesion = await ds.login(email.trim(), password);
      const creado = sesion.usuario ?? (await ds.me());
      iniciarSesion(creado, { access: sesion.access_token, refresh: sesion.refresh_token });
      setUsuario(creado);
      const datos = await ds.iniciar2fa();
      setSecreto(datos.secreto);
      setOtpauth(datos.otpauth_uri);
      setPaso('qr');
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await ds.activar2fa(codigo);
      setRespaldo(resultado.codigos_respaldo);
      if (usuario) actualizarUsuario({ ...usuario, totp_activo: true });
      setPaso('respaldo');
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  const compartirCodigos = () =>
    Share.share({ title: 'Fintech Vital', message: respaldo.join('\n') }).catch(() => {});

  const finalizar = () => {
    if (usuario) setIdioma(usuario.idioma);
    router.replace('/');
  };

  const pasoActual = INDICE_PASO[paso];

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
          <BotonTema claro />
        </View>

        {/* Stepper */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {[t('auth.pasoCuenta'), t('auth.pasoSeguridad'), t('auth.pasoListo')].map((etiqueta, i) => (
            <View key={etiqueta} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[estilos.pasoNum, { backgroundColor: i <= pasoActual ? Colores.menta : 'rgba(255,255,255,0.15)' }]}>
                <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 11, color: Colores.blanco }}>{i + 1}</Text>
              </View>
              <Text style={{ fontFamily: Fuentes.cuerpoMedio, fontSize: 11, color: i <= pasoActual ? Colores.blanco : 'rgba(255,255,255,0.5)' }}>
                {etiqueta}
              </Text>
            </View>
          ))}
        </View>

        <View style={estilos.tarjetaForm}>
          {/* Paso 1: cuenta */}
          {paso === 'cuenta' ? (
            <>
              <Text style={estilos.titulo}>{t('auth.registroTitulo')}</Text>
              <Text style={estilos.subtitulo}>{t('auth.registroSubtitulo')}</Text>

              <Campo etiqueta={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Campo etiqueta={t('auth.password')} ayuda={t('auth.passwordAyuda')} value={password} onChangeText={setPassword} secureTextEntry />

              <View style={{ gap: 6 }}>
                <Text style={estilos.etiqueta}>{t('auth.monedaPrincipal')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {MONEDAS.map((codigoMoneda) => (
                    <Pressable
                      key={codigoMoneda}
                      onPress={() => setMoneda(codigoMoneda)}
                      style={[estilos.chipMoneda, moneda === codigoMoneda && { backgroundColor: Colores.acento, borderColor: 'transparent' }]}
                    >
                      <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: moneda === codigoMoneda ? Colores.sobreAcento : Colores.apagado }}>
                        {codigoMoneda}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Datos personales (USUARIOS: nombre/apellido/fecha_nacimiento NOT NULL) */}
              <Text style={[estilos.subtitulo, { marginTop: 2 }]}>{t('auth.datosPersonalesTitulo')}</Text>
              <Campo etiqueta={t('auth.nombre')} value={nombre} onChangeText={setNombre} autoCapitalize="words" />
              <Campo etiqueta={t('auth.apellido')} value={apellido} onChangeText={setApellido} autoCapitalize="words" />
              <Campo
                etiqueta={t('auth.fechaNacimiento')}
                ayuda={t('auth.fechaNacimientoAyuda')}
                value={nacimiento}
                onChangeText={setNacimiento}
                placeholder="1990-01-31"
                keyboardType="numbers-and-punctuation"
              />
              <View style={{ gap: 6 }}>
                <Text style={estilos.etiqueta}>
                  {t('auth.genero')} ({t('auth.opcional')})
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['M', 'F'] as const).map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGenero(genero === g ? '' : g)}
                      style={[estilos.chipMoneda, genero === g && { backgroundColor: Colores.acento, borderColor: 'transparent' }]}
                    >
                      <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: genero === g ? Colores.sobreAcento : Colores.apagado }}>
                        {t(`auth.generos.${g}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Campo etiqueta={`${t('auth.telefono')} (${t('auth.opcional')})`} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
              <Campo etiqueta={`${t('auth.ciudad')} (${t('auth.opcional')})`} value={ciudad} onChangeText={setCiudad} autoCapitalize="words" />

              {error ? <Text style={estilos.error}>{error}</Text> : null}

              <View style={estilos.aceptoFila}>
                <Pressable onPress={() => setAceptado((v) => !v)} hitSlop={8}>
                  <Ionicons name={aceptado ? 'checkbox' : 'square-outline'} size={22} color={aceptado ? Colores.acento : Colores.apagado} />
                </Pressable>
                <Text style={estilos.aceptoTexto}>
                  {t('auth.aceptoLabel')}{' '}
                  <Text onPress={() => router.push('/legales')} style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}>
                    {t('auth.terminos')}
                  </Text>{' '}
                  {t('auth.aceptoY')}{' '}
                  <Text onPress={() => router.push('/privacidad' as Href)} style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}>
                    {t('privacidad.titulo')}
                  </Text>
                </Text>
              </View>

              <Boton texto={enviando ? t('auth.creando') : t('auth.continuar')} onPress={() => void crearCuenta()} cargando={enviando} deshabilitado={!aceptado} />

              <Pressable onPress={() => router.back()}>
                <Text style={estilos.enlace}>
                  {t('auth.yaTienes')}{' '}
                  <Text style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi }}>{t('auth.entrar')}</Text>
                </Text>
              </Pressable>
            </>
          ) : null}

          {/* Paso 2: QR */}
          {paso === 'qr' ? (
            <>
              <Text style={estilos.titulo}>{t('auth.dosfaTitulo')}</Text>
              <Text style={estilos.subtitulo}>{t('auth.dosfaObligatoriaAyuda')}</Text>
              <Text style={[estilos.centrado, { color: Colores.tintaSuave }]}>{t('auth.escaneaConApp')}</Text>
              <View style={estilos.qrCaja}>
                <QrCode valor={otpauth} tam={196} />
              </View>
              <Text style={[estilos.centrado, { color: Colores.apagado, fontSize: 11 }]}>{t('auth.oIngresaManual')}</Text>
              <Text selectable style={estilos.secreto}>{secreto}</Text>
              <Boton texto={t('comun.siguiente')} onPress={() => setPaso('verificar')} />
            </>
          ) : null}

          {/* Paso 3: verificar */}
          {paso === 'verificar' ? (
            <>
              <Text style={estilos.titulo}>{t('auth.verificaTitulo')}</Text>
              <Text style={estilos.subtitulo}>{t('auth.verificaAyuda')}</Text>
              <Campo
                etiqueta={t('auth.codigo')}
                value={codigo}
                onChangeText={(texto) => setCodigo(texto.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoFocus
              />
              {error ? <Text style={estilos.error}>{error}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Boton texto={t('comun.atras')} variante="fantasma" onPress={() => setPaso('qr')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton texto={enviando ? t('auth.creando') : t('auth.verificar')} onPress={() => void verificar()} cargando={enviando} deshabilitado={codigo.length !== 6} />
                </View>
              </View>
            </>
          ) : null}

          {/* Paso 4: respaldo */}
          {paso === 'respaldo' ? (
            <>
              <Text style={estilos.titulo}>{t('auth.respaldoTitulo')}</Text>
              <Text style={estilos.subtitulo}>{t('auth.respaldoAyuda')}</Text>
              <View style={estilos.respaldoGrid}>
                {respaldo.map((codigoRespaldo) => (
                  <Text key={codigoRespaldo} selectable style={estilos.codigoRespaldo}>
                    {codigoRespaldo}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Boton texto={t('auth.descargarCodigos')} variante="fantasma" onPress={compartirCodigos} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton texto={t('auth.guardadosEntrar')} onPress={finalizar} />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { flexGrow: 1, padding: Espacio.l, gap: Espacio.l },
  pasoNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tarjetaForm: { backgroundColor: Colores.tarjeta, borderRadius: 22, padding: Espacio.l, gap: Espacio.m, marginTop: 'auto' as never },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 24, color: Colores.tinta },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, marginTop: -8 },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tinta },
  chipMoneda: { borderRadius: 999, borderWidth: 1, borderColor: Colores.linea, paddingHorizontal: 12, paddingVertical: 6 },
  error: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.riesgo },
  enlace: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, textAlign: 'center' },
  centrado: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, textAlign: 'center' },
  qrCaja: { alignSelf: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 16 },
  secreto: { fontFamily: Fuentes.cuerpoSemi, fontSize: 14, letterSpacing: 1.5, textAlign: 'center', color: Colores.tinta, backgroundColor: Colores.canvas2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  respaldoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codigoRespaldo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: Colores.tinta, backgroundColor: Colores.canvas, borderColor: Colores.linea, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  // Superficie del tema (no un crema fijo): con tema oscuro el texto quedaba ilegible.
  aceptoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colores.canvas2, borderWidth: 1, borderColor: Colores.linea, borderRadius: 14, padding: 12 },
  aceptoTexto: { flex: 1, fontFamily: Fuentes.cuerpo, fontSize: 12.5, lineHeight: 18, color: Colores.tinta },
});
