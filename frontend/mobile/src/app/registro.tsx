import { useEffect, useState } from 'react';
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

import { FinanceApiError, TERMINOS_VERSION, type Ciudad, type Moneda, type Usuario } from '@/data';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { BotonTema } from '@/components/BotonTema';
import { QrCode } from '@/components/QrCode';
import { Boton, Campo } from '@/components/ui';
import { Logo } from '@/components/Logo';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];

type Paso = 'cuenta' | 'onboarding' | 'qr' | 'verificar' | 'respaldo';
const INDICE_PASO: Record<Paso, number> = {
  cuenta: 0,
  onboarding: 1,
  qr: 2,
  verificar: 2,
  respaldo: 3,
};

export default function PantallaRegistro() {
  const { t, idioma, setIdioma } = useI18n();
  const ds = useDataSource();
  const { iniciarSesion, actualizarUsuario } = useSesion();
  const insets = useSafeAreaInsets();

  const [paso, setPaso] = useState<Paso>('cuenta');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | ''>('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  // Catalogo de ciudades: `usuario.ciudad_id` es una FK, asi que la ciudad se
  // ELIGE. Escrita a mano no se podia guardar y se perdia sin avisar.
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [ciudadesFallaron, setCiudadesFallaron] = useState(false);
  const [aceptado, setAceptado] = useState(false);

  // Paso 2: puesta a punto financiera.
  const [ingreso, setIngreso] = useState('');
  const [nombreMeta, setNombreMeta] = useState('');
  const [montoMeta, setMontoMeta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [secreto, setSecreto] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);

  const fallar = (causa: unknown) =>
    setError(causa instanceof FinanceApiError ? causa.message : String(causa));

  useEffect(() => {
    let activo = true;
    ds.ciudades()
      .then((lista) => {
        if (activo) setCiudades(lista);
      })
      .catch(() => {
        if (activo) setCiudadesFallaron(true);
      });
    return () => {
      activo = false;
    };
  }, [ds]);

  /**
   * Mascara de la fecha de nacimiento: el usuario teclea solo digitos y aqui se
   * insertan los guiones (AAAA-MM-DD). El teclado es numerico, asi que sin esto
   * el separador no esta disponible en Android.
   */
  const manejarFechaNacimiento = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 8);
    const partes = [digitos.slice(0, 4), digitos.slice(4, 6), digitos.slice(6, 8)];
    setNacimiento(partes.filter((parte) => parte.length > 0).join('-'));
  };

  /**
   * Validacion previa al envio. Las reglas son las del contrato
   * (CONTRATO_API §4.1 / RegistroRequest): obligatorios email, password,
   * nombre, apellido y fecha de nacimiento; genero, telefono y ciudad son
   * OPCIONALES. Validar de mas aqui rechazaria altas que la API si acepta.
   *
   * Devuelve la clave i18n del primer fallo, o null si todo esta bien. No
   * arma frases: el proyecto es trilingue y los textos salen de t().
   */
  const validarAlta = (): string | null => {
    if (!email.trim() || !password || !nombre.trim() || !apellido.trim() || !nacimiento) {
      return 'auth.val.camposObligatorios';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'auth.val.emailInvalido';

    // 10 es el minimo del contrato, el mismo que exige la web y que anuncia
    // auth.passwordAyuda. Pedir mas aqui que en la API confunde al usuario.
    if (password.length < 10) return 'auth.val.passwordCorta';

    // Una errata deja a la persona fuera de la cuenta que acaba de crear, y
    // con 2FA de por medio recuperarla no es trivial.
    if (passwordConfirmar !== password) return 'auth.val.passwordNoCoincide';

    // La mascara garantiza la forma, no que la fecha exista: 2026-02-31 encaja
    // en el patron. Se construye la fecha y se comprueba que Date no haya
    // tenido que desbordar el dia (31 de febrero -> 3 de marzo).
    //
    // Se comparan los componentes en LOCAL, sin pasar por toISOString(): esa
    // conversion es a UTC y en una zona al este de Greenwich devolveria el dia
    // anterior, rechazando fechas correctas.
    if (nacimiento.length !== 10) return 'auth.val.fechaIncompleta';
    const [anio, mes, dia] = nacimiento.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    const existe =
      anio >= 1900 &&
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia;
    if (!existe) return 'auth.val.fechaInvalida';
    if (fecha >= new Date()) return 'auth.val.fechaFutura';

    // Opcionales: solo se validan si el usuario los escribio. El rango 6-15
    // cubre Mexico (10), Brasil (11) y Argentina con prefijo; el maximo es el
    // @Size(max = 15) de la API.
    const telefonoLimpio = telefono.replace(/\D/g, '');
    if (telefono.trim() && (telefonoLimpio.length < 6 || telefonoLimpio.length > 15)) {
      return 'auth.val.telefonoInvalido';
    }

    // La ciudad ya no se valida: sale de un selector alimentado por
    // `GET /ciudades`, asi que solo puede estar vacia o ser una del catalogo.
    return null;
  };

  const crearCuenta = async () => {
    setError(null);

    const fallo = validarAlta();
    if (fallo) {
      setError(t(fallo));
      return;
    }

    setEnviando(true);
    try {
      await ds.registro({
        email: email.trim(),
        password,
        moneda_principal: moneda,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fecha_nacimiento: nacimiento,
        genero: genero || undefined,
        telefono: telefono.trim() || undefined,
        ciudad: ciudad || undefined,
        // El idioma con el que se registro. Sin esto la cuenta quedaba en `es`
        // aunque el alta se hiciera en portugues, y al entrar desde otro
        // dispositivo la app se abria en el idioma equivocado.
        idioma,
        terminos_version: TERMINOS_VERSION,
      });
      const sesion = await ds.login(email.trim(), password);
      const creado = sesion.usuario ?? (await ds.me());
      iniciarSesion(creado, { access: sesion.access_token, refresh: sesion.refresh_token });
      setUsuario(creado);
      // La cuenta ya existe y hay sesion: de aqui en adelante las llamadas
      // van autenticadas, que es lo que necesita el paso de finanzas.
      setPaso('onboarding');
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  /** Pide el secreto TOTP y pasa al QR. Se llega aqui se guarde o no el paso 2. */
  const irAlSegundoFactor = async () => {
    const datos = await ds.iniciar2fa();
    setSecreto(datos.secreto);
    setOtpauth(datos.otpauth_uri);
    setPaso('qr');
  };

  /**
   * Paso 2: ingreso mensual y primera meta, CONTRA LA API.
   *
   * El ingreso va al perfil (`PATCH /usuarios/me`) porque es la base de todos
   * los indicadores, y la meta a `POST /metas`. No se guarda nada en el
   * dispositivo: el proyecto no admite datos simulados (ADR-0011).
   */
  const guardarFinanzas = async () => {
    setError(null);
    if (!ingreso.trim() || !(Number(ingreso) > 0)) {
      setError(t('auth.val.ingresoObligatorio'));
      return;
    }
    // O los dos o ninguno: una meta sin objetivo no se puede pintar, y un
    // objetivo sin nombre no dice nada.
    const tieneNombre = nombreMeta.trim().length > 0;
    const tieneMonto = Number(montoMeta) > 0;
    if (tieneNombre !== tieneMonto) {
      setError(t('auth.val.metaIncompleta'));
      return;
    }

    setEnviando(true);
    try {
      const actualizado = await ds.actualizarPerfil({ ingreso_mensual: Number(ingreso) });
      actualizarUsuario(actualizado);
      setUsuario(actualizado);
      if (tieneNombre && tieneMonto) {
        await ds.crearMeta({ nombre: nombreMeta.trim(), objetivo: Number(montoMeta) });
      }
      await irAlSegundoFactor();
    } catch (causa) {
      // La cuenta YA esta creada: si esto falla no se puede echar atras a la
      // persona. Se avisa y se le deja seguir con "Ahora no".
      setError(
        `${t('auth.onboardingFallo')} ${causa instanceof FinanceApiError ? causa.message : ''}`.trim(),
      );
    } finally {
      setEnviando(false);
    }
  };

  const omitirFinanzas = async () => {
    setEnviando(true);
    setError(null);
    try {
      await irAlSegundoFactor();
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

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {[t('auth.pasoCuenta'), t('auth.pasoFinanzas'), t('auth.pasoSeguridad'), t('auth.pasoListo')].map((etiqueta, i) => (
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
          {paso === 'cuenta' ? (
            <>
              <Text style={estilos.titulo}>{t('auth.registroTitulo')}</Text>
              <Text style={estilos.subtitulo}>{t('auth.registroSubtitulo')}</Text>

              <Campo etiqueta={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Campo etiqueta={t('auth.password')} ayuda={t('auth.passwordAyuda')} value={password} onChangeText={setPassword} secureTextEntry />
              <Campo etiqueta={t('auth.passwordConfirmar')} value={passwordConfirmar} onChangeText={setPasswordConfirmar} secureTextEntry />

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

              <Text style={[estilos.subtitulo, { marginTop: 2 }]}>{t('auth.datosPersonalesTitulo')}</Text>
              <Campo etiqueta={t('auth.nombre')} value={nombre} onChangeText={setNombre} autoCapitalize="words" />
              <Campo etiqueta={t('auth.apellido')} value={apellido} onChangeText={setApellido} autoCapitalize="words" />
              <Campo
                etiqueta={t('auth.fechaNacimiento')}
                ayuda={t('auth.fechaNacimientoAyuda')}
                value={nacimiento}
                onChangeText={manejarFechaNacimiento}
                keyboardType="number-pad"
                placeholder="1990-01-31"
                maxLength={10}
              />

              <View style={{ gap: 6 }}>
                <Text style={estilos.etiqueta}>{t('auth.genero')}</Text>
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
              {/* 15 = @Size(max = 15) de RegistroRequest. Con maxLength 10 no
                  entraba un numero brasileno (11 digitos). */}
              <Campo etiqueta={t('auth.telefono')} ayuda={t('auth.opcional')} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" maxLength={15} />
              {/* La ciudad se ELIGE del catalogo (`GET /ciudades`) y no se
                  escribe: en la BD es una FK, asi que un nombre a mano no se
                  podia guardar y desaparecia sin avisar. */}
              <View style={{ gap: 6 }}>
                <Text style={estilos.etiqueta}>
                  {t('auth.ciudad')} ({t('auth.opcional')})
                </Text>
                {ciudadesFallaron ? (
                  <Text style={estilos.ayuda}>{t('auth.ciudadNoDisponible')}</Text>
                ) : ciudades.length === 0 ? (
                  <Text style={estilos.ayuda}>{t('comun.cargando')}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ciudades.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setCiudad(ciudad === item.nombre ? '' : item.nombre)}
                        style={[estilos.chipMoneda, ciudad === item.nombre && { backgroundColor: Colores.acento, borderColor: 'transparent' }]}
                      >
                        <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: ciudad === item.nombre ? Colores.sobreAcento : Colores.apagado }}>
                          {item.nombre}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

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

          {paso === 'onboarding' ? (
            <>
              <Text style={estilos.titulo}>{t('auth.onboardingTitulo')}</Text>
              <Text style={estilos.subtitulo}>{t('auth.onboardingSubtitulo')}</Text>

              <Campo
                etiqueta={`${t('auth.ingresoMensual')} (${moneda})`}
                ayuda={t('auth.ingresoMensualAyuda')}
                value={ingreso}
                onChangeText={setIngreso}
                keyboardType="decimal-pad"
              />

              <Text style={[estilos.etiqueta, { marginTop: 4 }]}>
                {t('auth.metaTitulo')} ({t('auth.opcional')})
              </Text>
              <Campo
                etiqueta={t('auth.metaNombre')}
                placeholder={t('auth.metaNombrePlaceholder')}
                value={nombreMeta}
                onChangeText={setNombreMeta}
                maxLength={80}
              />
              <Campo
                etiqueta={`${t('auth.metaMonto')} (${moneda})`}
                value={montoMeta}
                onChangeText={setMontoMeta}
                keyboardType="decimal-pad"
              />

              {error ? <Text style={estilos.error}>{error}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Boton texto={t('auth.omitirPaso')} variante="fantasma" onPress={() => void omitirFinanzas()} deshabilitado={enviando} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton texto={enviando ? t('comun.guardando') : t('auth.guardarContinuar')} onPress={() => void guardarFinanzas()} cargando={enviando} />
                </View>
              </View>
            </>
          ) : null}

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
  ayuda: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: Colores.apagado },
  chipMoneda: { borderRadius: 999, borderWidth: 1, borderColor: Colores.linea, paddingHorizontal: 12, paddingVertical: 6 },
  error: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.riesgo },
  enlace: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, textAlign: 'center' },
  centrado: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, textAlign: 'center' },
  qrCaja: { alignSelf: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 16 },
  secreto: { fontFamily: Fuentes.cuerpoSemi, fontSize: 14, letterSpacing: 1.5, textAlign: 'center', color: Colores.tinta, backgroundColor: Colores.canvas2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  respaldoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codigoRespaldo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: Colores.tinta, backgroundColor: Colores.canvas, borderColor: Colores.linea, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  aceptoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colores.canvas2, borderWidth: 1, borderColor: Colores.linea, borderRadius: 14, padding: 12 },
  aceptoTexto: { flex: 1, fontFamily: Fuentes.cuerpo, fontSize: 12.5, lineHeight: 18, color: Colores.tinta },
});