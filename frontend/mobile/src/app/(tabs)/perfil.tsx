import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FrecuenciaAhorro, Moneda } from '@/data';
import { Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext'; // 1. Importamos el contexto
import { useI18n } from '@/i18n';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { BotonTema } from '@/components/BotonTema';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Aparece, Boton, Campo, Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];
const FRECUENCIAS: FrecuenciaAhorro[] = ['nula', 'baja', 'media', 'alta'];

/** Edad a partir de la fecha de nacimiento (fuera del render: usa la hora actual). */
function calcularEdad(fechaIso: string): number {
  return Math.floor((Date.now() - new Date(fechaIso).getTime()) / 31_557_600_000);
}

export default function PantallaPerfil() {
  const { t, idioma } = useI18n();
  const ds = useDataSource();
  const { usuario, actualizarUsuario, cerrarSesion } = useSesion();
  const insets = useSafeAreaInsets();
  
  // 2. Extraemos temaActivo además de esModoOscuro y toggleTema
  const { esModoOscuro, temaActivo } = useTheme();

  const [ingreso, setIngreso] = useState(String(usuario?.ingreso_mensual ?? 0));
  const [deuda, setDeuda] = useState(String(usuario?.nivel_endeudamiento ?? 0));
  const [frecuencia, setFrecuencia] = useState<FrecuenciaAhorro>(
    usuario?.frecuencia_ahorro ?? 'nula',
  );
  const [moneda, setMoneda] = useState<Moneda>(usuario?.moneda_principal ?? 'USD');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Endeudamiento y frecuencia se derivaran (pendiente formula de DS): solo lectura
  // con fallback de ajuste manual mientras tanto.
  const [ajustarDerivados, setAjustarDerivados] = useState(false);
  // 2FA obligatorio: no se desactiva; solo se regeneran los codigos de respaldo.
  const [respaldo, setRespaldo] = useState<string[]>([]);
  const [regenerando, setRegenerando] = useState(false);

  const [exportando, setExportando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [passwordCuenta, setPasswordCuenta] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  if (!usuario) return null;

  const guardar = async () => {
    setGuardando(true);
    setGuardado(false);
    try {
      const actualizado = await ds.actualizarPerfil({
        ingreso_mensual: Number(ingreso),
        nivel_endeudamiento: Number(deuda),
        frecuencia_ahorro: frecuencia,
        moneda_principal: moneda,
      });
      actualizarUsuario(actualizado);
      setGuardado(true);
    } finally {
      setGuardando(false);
    }
  };

  const regenerarCodigos = async () => {
    setRegenerando(true);
    try {
      const resultado = await ds.regenerarCodigos2fa();
      setRespaldo(resultado.codigos_respaldo);
    } finally {
      setRegenerando(false);
    }
  };

  const salir = () => {
    cerrarSesion();
    router.replace('/login');
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const datos = await ds.exportarDatos();
      await Share.share({
        title: `fintechvital-datos-${datos.generado_en.slice(0, 10)}.json`,
        message: JSON.stringify(datos, null, 2),
      });
    } finally {
      setExportando(false);
    }
  };

  const eliminarCuenta = async () => {
    setErrorBaja(null);
    setEliminando(true);
    try {
      await ds.eliminarCuenta(passwordCuenta);
      cerrarSesion();
      router.replace('/login');
    } catch (causa) {
      setErrorBaja(causa instanceof Error ? causa.message : String(causa));
      setEliminando(false);
    }
  };

  const fechaTerminos = usuario.terminos_aceptados_en
    ? new Intl.DateTimeFormat(idioma, { dateStyle: 'long' }).format(
        new Date(usuario.terminos_aceptados_en),
      )
    : null;

  const edad = usuario.fecha_nacimiento ? calcularEdad(usuario.fecha_nacimiento) : null;

  const personales: [string, string][] = [];
  if (usuario.apellido) personales.push([t('perfilUsuario.apellido'), usuario.apellido]);
  if (edad !== null) personales.push([t('perfilUsuario.edad'), t('perfilUsuario.anios', { n: edad })]);
  if (usuario.genero) personales.push([t('perfilUsuario.genero'), t(`perfilUsuario.generos.${usuario.genero}`)]);
  if (usuario.telefono) personales.push([t('perfilUsuario.telefono'), usuario.telefono]);
  if (usuario.ciudad) {
    personales.push([
      t('perfilUsuario.ciudad'),
      [usuario.ciudad, usuario.estado_region, usuario.pais].filter(Boolean).join(', '),
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: temaActivo.canvas }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Hero paddingTop={insets.top + 14}>
        <Text style={[estilos.titulo, { color: temaActivo.blanco, opacity: 0.6 }]}>{t('perfilUsuario.titulo')}</Text>
        <Text style={[estilos.nombre, { color: temaActivo.blanco }]}>{usuario.nombre}</Text>
        <Text style={[estilos.subtitulo, { color: temaActivo.blanco, opacity: 0.65 }]}>{usuario.email}</Text>
      </Hero>

      <Aparece delay={60} style={{ padding: Espacio.m, gap: Espacio.m }}>
        <Tarjeta>
          <TituloTarjeta>{t('perfilUsuario.idioma')}</TituloTarjeta>
          <SelectorIdioma />
        </Tarjeta>

        {/* --- TARJETA DE APARIENCIA --- */}
        <Tarjeta>
          <TituloTarjeta>{t('comun.apariencia')}</TituloTarjeta>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[estilos.etiqueta, { color: temaActivo.tinta }]}>
              {esModoOscuro ? t('comun.temaOscuro') : t('comun.temaClaro')}
            </Text>
            <BotonTema />
          </View>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta>{t('perfilUsuario.datosFinancieros')}</TituloTarjeta>
          <Campo
            etiqueta={`${t('perfilUsuario.ingresoMensual')} (${moneda})`}
            value={ingreso}
            onChangeText={setIngreso}
            keyboardType="numeric"
          />
          {/* Endeudamiento y frecuencia: se DERIVARAN (pendiente formula de DS) */}
          <View style={[estilos.derivado, { borderColor: temaActivo.linea, backgroundColor: temaActivo.canvas2 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[estilos.derivadoTitulo, { color: temaActivo.tinta }]}>
                {t('perfilUsuario.derivadoEtiqueta')}
              </Text>
              <Pressable onPress={() => setAjustarDerivados((v) => !v)}>
                <Text style={[estilos.enlaceMini, { color: temaActivo.acento }]}>
                  {t('perfilUsuario.ajustarManual')}
                </Text>
              </Pressable>
            </View>
            <Text style={[estilos.derivadoAyuda, { color: temaActivo.apagado }]}>
              {t('perfilUsuario.derivadoAyuda')}
            </Text>
            {ajustarDerivados ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Campo
                  etiqueta={t('perfilUsuario.endeudamiento')}
                  value={deuda}
                  onChangeText={setDeuda}
                  keyboardType="numeric"
                />
                <Text style={[estilos.etiqueta, { color: temaActivo.tinta }]}>{t('perfilUsuario.frecuencia')}</Text>
                <View style={estilos.filaChips}>
                  {FRECUENCIAS.map((valor) => (
                    <Pressable
                      key={valor}
                      onPress={() => setFrecuencia(valor)}
                      style={[
                        estilos.chip,
                        { borderColor: temaActivo.linea },
                        frecuencia === valor && { backgroundColor: temaActivo.acento, borderColor: 'transparent' },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.chipTexto,
                          { color: temaActivo.apagado },
                          frecuencia === valor && { color: temaActivo.sobreAcento },
                        ]}
                      >
                        {t(`perfilUsuario.frecuencias.${valor}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <View style={[estilos.derivadoCaja, { backgroundColor: temaActivo.tarjeta }]}>
                  <Text style={[estilos.derivadoLabel, { color: temaActivo.apagado }]}>
                    {t('perfilUsuario.endeudamiento')}
                  </Text>
                  <Text style={[estilos.derivadoValor, { color: temaActivo.tinta }]}>{deuda}/100</Text>
                </View>
                <View style={[estilos.derivadoCaja, { backgroundColor: temaActivo.tarjeta }]}>
                  <Text style={[estilos.derivadoLabel, { color: temaActivo.apagado }]}>
                    {t('perfilUsuario.frecuencia')}
                  </Text>
                  <Text style={[estilos.derivadoValor, { color: temaActivo.tinta }]}>
                    {t(`perfilUsuario.frecuencias.${frecuencia}`)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Text style={[estilos.etiqueta, { color: temaActivo.tinta }]}>{t('perfilUsuario.moneda')}</Text>
          <View style={estilos.filaChips}>
            {MONEDAS.map((codigo) => (
              <Pressable
                key={codigo}
                onPress={() => setMoneda(codigo)}
                style={[
                  estilos.chip,
                  { borderColor: temaActivo.linea },
                  moneda === codigo && { backgroundColor: temaActivo.acento, borderColor: 'transparent' }
                ]}
              >
                <Text style={[estilos.chipTexto, { color: temaActivo.apagado }, moneda === codigo && { color: temaActivo.sobreAcento }]}>
                  {codigo}
                </Text>
              </Pressable>
            ))}
          </View>

          <Boton texto={guardando ? t('comun.guardando') : t('comun.guardar')} onPress={() => void guardar()} cargando={guardando} />
          {guardado ? <Text style={[estilos.avisoOk, { color: temaActivo.okTexto }]}>{t('perfilUsuario.guardado')}</Text> : null}
        </Tarjeta>

        {personales.length > 0 ? (
          <Tarjeta>
            <TituloTarjeta>{t('perfilUsuario.datosPersonales')}</TituloTarjeta>
            <Text style={[estilos.textoApagado, { color: temaActivo.apagado }]}>
              {t('perfilUsuario.datosPersonalesAyuda')}
            </Text>
            <View style={{ gap: 10, marginTop: 4 }}>
              {personales.map(([etiqueta, valor]) => (
                <View key={etiqueta} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={[estilos.datoLabel, { color: temaActivo.apagado }]}>{etiqueta}</Text>
                  <Text style={[estilos.datoValor, { color: temaActivo.tinta }]} numberOfLines={1}>
                    {valor}
                  </Text>
                </View>
              ))}
            </View>
          </Tarjeta>
        ) : null}

        <Tarjeta>
          <TituloTarjeta>{t('perfilUsuario.seguridad')}</TituloTarjeta>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 14, color: temaActivo.tinta }}>
                {t('perfilUsuario.dosfa')}
              </Text>
              <Text style={{ fontFamily: Fuentes.cuerpoMedio, fontSize: 12, color: temaActivo.okTexto }}>
                {t('perfilUsuario.dosfaObligatoria')}
              </Text>
            </View>
            <Boton
              texto={regenerando ? t('perfilUsuario.regenerando') : t('perfilUsuario.regenerar')}
              variante="fantasma"
              onPress={() => void regenerarCodigos()}
              cargando={regenerando}
            />
          </View>
          <Text style={[estilos.textoApagado, { color: temaActivo.apagado }]}>{t('perfilUsuario.dosfaSiempre')}</Text>

          {respaldo.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={[estilos.avisoOk, { color: temaActivo.okTexto }]}>{t('perfilUsuario.codigosNuevos')}</Text>
              <View style={estilos.filaChips}>
                {respaldo.map((codigoRespaldo) => (
                  <Text
                    key={codigoRespaldo}
                    selectable
                    style={[estilos.codigoRespaldo, { color: temaActivo.tinta, backgroundColor: temaActivo.canvas, borderColor: temaActivo.linea }]}
                  >
                    {codigoRespaldo}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </Tarjeta>

        {/* Tus datos (derechos ARCO/LGPD) */}
        <Tarjeta>
          <TituloTarjeta>{t('perfilUsuario.misDatos')}</TituloTarjeta>
          <Text style={[estilos.textoApagado, { color: temaActivo.apagado }]}>{t('perfilUsuario.misDatosAyuda')}</Text>
          {fechaTerminos && usuario.terminos_version ? (
            <Text style={[estilos.terminosInfo, { color: temaActivo.apagado }]}>
              {t('perfilUsuario.terminosAceptados', { version: usuario.terminos_version, fecha: fechaTerminos })}
            </Text>
          ) : null}

          <Boton texto={exportando ? t('comun.cargando') : t('perfilUsuario.exportar')} variante="fantasma" onPress={() => void exportar()} cargando={exportando} />

          {!confirmandoBaja ? (
            <Boton texto={t('perfilUsuario.eliminarCuenta')} variante="peligro" onPress={() => setConfirmandoBaja(true)} />
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={[estilos.textoApagado, { color: temaActivo.apagado }]}>{t('perfilUsuario.eliminarAyuda')}</Text>
              <Campo etiqueta={t('perfilUsuario.eliminarConfirma')} value={passwordCuenta} onChangeText={setPasswordCuenta} secureTextEntry />
              <Boton texto={eliminando ? t('comun.cargando') : t('perfilUsuario.eliminarDefinitivo')} variante="peligro" onPress={() => void eliminarCuenta()} cargando={eliminando} deshabilitado={passwordCuenta.length === 0} />
              <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => { setConfirmandoBaja(false); setPasswordCuenta(''); setErrorBaja(null); }} />
              {errorBaja ? <Text style={[estilos.error, { color: temaActivo.riesgo }]}>{errorBaja}</Text> : null}
            </View>
          )}
        </Tarjeta>

        {/* Legal: terminos, privacidad y licencias */}
        <Tarjeta style={{ gap: 0 }}>
          <TituloTarjeta>{t('perfilUsuario.legal')}</TituloTarjeta>
          {(
            [
              ['document-text-outline', 'perfilUsuario.legales', '/legales'],
              ['shield-checkmark-outline', 'privacidad.titulo', '/privacidad'],
              ['code-slash-outline', 'licencias.titulo', '/licencias'],
            ] as const
          ).map(([icono, clave, ruta], indice) => (
            <Pressable
              key={ruta}
              onPress={() => router.push(ruta as Href)}
              style={[estilos.legalFila, { borderTopColor: temaActivo.linea }, indice === 0 && { borderTopWidth: 0 }]}
            >
              <View style={[estilos.legalesIcono, { backgroundColor: `${temaActivo.acento}14` }]}>
                <Ionicons name={icono} size={19} color={temaActivo.acento} />
              </View>
              <Text style={[estilos.legalesTitulo, { color: temaActivo.tinta }]}>{t(clave)}</Text>
              <Ionicons name="chevron-forward" size={18} color={temaActivo.apagado} />
            </Pressable>
          ))}
        </Tarjeta>

        <Boton texto={t('nav.salir')} variante="peligro" onPress={salir} />
        <Text style={[estilos.avisoEducativo, { color: temaActivo.apagado }]}>{t('comun.educativo')}</Text>
      </Aparece>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12, letterSpacing: 1.4 },
  nombre: { fontFamily: Fuentes.titulo, fontSize: 24, marginTop: 6 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 12 },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13 },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { fontFamily: Fuentes.cuerpoMedio, fontSize: 12 },
  avisoOk: { fontFamily: Fuentes.cuerpoMedio, fontSize: 12 },
  error: { fontFamily: Fuentes.cuerpoMedio, fontSize: 12 },
  textoApagado: { fontFamily: Fuentes.cuerpo, fontSize: 12.5 },
  secreto: { fontFamily: Fuentes.cuerpoSemi, fontSize: 14, letterSpacing: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  codigoRespaldo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  avisoEducativo: { fontFamily: Fuentes.cuerpo, fontSize: 11, textAlign: 'center', paddingHorizontal: 24 },
  legalesIcono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  legalesTitulo: { flex: 1, fontFamily: Fuentes.cuerpoSemi, fontSize: 14.5 },
  legalFila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  terminosInfo: { fontFamily: Fuentes.cuerpoMedio, fontSize: 11.5 },
  derivado: { borderWidth: 1, borderRadius: 14, padding: 12 },
  derivadoTitulo: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13 },
  enlaceMini: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12 },
  derivadoAyuda: { fontFamily: Fuentes.cuerpo, fontSize: 11.5, marginTop: 2 },
  derivadoCaja: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  derivadoLabel: { fontFamily: Fuentes.cuerpo, fontSize: 11 },
  derivadoValor: { fontFamily: Fuentes.titulo, fontSize: 18, marginTop: 2 },
  datoLabel: { fontFamily: Fuentes.cuerpo, fontSize: 13 },
  datoValor: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, flexShrink: 1, textAlign: 'right' },
});