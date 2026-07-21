import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PerfilSlug } from '@/data';
import { Espacio, Fuentes, Radio, sombra } from '@/constants/tema';
import { useI18n } from '@/i18n';
// 1. Importamos el contexto
import { useTheme } from '@/context/ThemeContext';

/** Envuelve hijos en una entrada fade+rise escalonada */
export function Aparece({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Tarjeta({ children, style }: { children: React.ReactNode; style?: object }) {
  const { temaActivo } = useTheme(); // Inyectamos el tema
  return (
    <View style={[
      estilos.tarjeta, 
      { backgroundColor: temaActivo.tarjeta, borderColor: temaActivo.linea },
      style
    ]}>
      {children}
    </View>
  );
}

export function TituloTarjeta({ children }: { children: string }) {
  const { temaActivo } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: temaActivo.menta }} />
      <Text style={[estilos.tituloTarjeta, { color: temaActivo.apagado }]}>{children.toUpperCase()}</Text>
    </View>
  );
}

export function Hero({
  children,
  paddingTop,
  redondeado = true,
}: {
  children: React.ReactNode;
  paddingTop: number;
  redondeado?: boolean;
}) {
  const { temaActivo } = useTheme();
  return (
    <LinearGradient
      // Usamos los colores dinámicos para el gradiente
      colors={[temaActivo.heroB, temaActivo.heroA, temaActivo.canvas2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          paddingTop,
          paddingHorizontal: Espacio.l,
          paddingBottom: Espacio.l,
          gap: 4,
        },
        redondeado && { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
      ]}
    >
      {children}
    </LinearGradient>
  );
}

export function Boton({
  texto,
  onPress,
  variante = 'primario',
  cargando = false,
  deshabilitado = false,
}: {
  texto: string;
  onPress: () => void;
  variante?: 'primario' | 'fantasma' | 'peligro' | 'claro';
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  const { temaActivo } = useTheme();
  
  const fondo = {
    primario: temaActivo.acento,
    fantasma: 'transparent',
    peligro: temaActivo.riesgoFondo,
    claro: 'rgba(255,255,255,0.16)',
  }[variante];
  
  const color = {
    primario: temaActivo.blanco,
    fantasma: temaActivo.tinta,
    peligro: temaActivo.riesgo,
    claro: temaActivo.blanco,
  }[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: fondo, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variante === 'fantasma' && { borderWidth: 1, borderColor: temaActivo.linea },
        variante === 'claro' && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
        (deshabilitado || cargando) && { opacity: 0.5 },
      ]}
    >
      {cargando ? <ActivityIndicator size="small" color={color} /> : null}
      <Text style={[estilos.botonTexto, { color }]}>{texto}</Text>
    </Pressable>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  ...props
}: TextInputProps & { etiqueta: string; ayuda?: string }) {
  const { temaActivo } = useTheme();
  const [enfoque, setEnfoque] = useState(false);
  
  return (
    <View style={{ gap: 6 }}>
      <Text style={[estilos.etiquetaCampo, { color: temaActivo.tintaSuave }]}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={`${temaActivo.apagado}99`}
        style={[
          estilos.entrada, 
          { backgroundColor: temaActivo.blanco, borderColor: temaActivo.linea, color: temaActivo.tinta },
          enfoque && { borderColor: temaActivo.acento }
        ]}
        onFocus={() => setEnfoque(true)}
        onBlur={() => setEnfoque(false)}
        {...props}
      />
      {ayuda ? <Text style={[estilos.ayudaCampo, { color: temaActivo.apagado }]}>{ayuda}</Text> : null}
    </View>
  );
}

export function ChipPerfil({
  perfil,
  etiqueta,
  grande = false,
}: {
  perfil: PerfilSlug;
  etiqueta: string;
  grande?: boolean;
}) {
  const { temaActivo } = useTheme();
  const estilo = {
    saludable: { fondo: temaActivo.okFondo, texto: temaActivo.okTexto, icono: 'trending-up' as const },
    en_observacion: { fondo: temaActivo.alertaSuave, texto: temaActivo.alerta, icono: 'eye-outline' as const },
    en_riesgo: { fondo: temaActivo.riesgoFondo, texto: temaActivo.riesgo, icono: 'trending-down' as const },
  }[perfil];
  
  return (
    <View
      style={[
        estilos.chip,
        { backgroundColor: estilo.fondo, paddingVertical: grande ? 7 : 3, paddingHorizontal: grande ? 14 : 10 },
      ]}
    >
      <Ionicons name={estilo.icono} size={grande ? 17 : 13} color={estilo.texto} />
      <Text style={{ color: estilo.texto, fontFamily: Fuentes.cuerpoSemi, fontSize: grande ? 16 : 12 }}>
        {etiqueta}
      </Text>
    </View>
  );
}

export function CifraAnimada({
  valor,
  formato,
  style,
  duracion = 850,
}: {
  valor: number;
  formato: (n: number) => string;
  style?: object;
  duracion?: number;
}) {
  const [mostrado, setMostrado] = useState(0);
  const [anim] = useState(() => new Animated.Value(0));
  const desde = useRef(0);

  useEffect(() => {
    const inicio = desde.current;
    anim.setValue(0);
    const id = anim.addListener(({ value }) => setMostrado(inicio + (valor - inicio) * value));
    Animated.timing(anim, {
      toValue: 1,
      duration: duracion,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      desde.current = valor;
    });
    return () => anim.removeListener(id);
  }, [valor, duracion, anim]);

  return <Text style={style}>{formato(mostrado)}</Text>;
}

export function EstadoCarga({
  cargando,
  error,
  recargar,
  children,
}: {
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { temaActivo } = useTheme();
  
  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color={temaActivo.acento} />
        <Text style={[estilos.textoApagado, { color: temaActivo.apagado }]}>{t('comun.cargando')}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={estilos.centrado}>
        <View style={[estilos.iconoError, { backgroundColor: temaActivo.riesgoFondo }]}>
          <Text style={{ color: temaActivo.riesgo, fontFamily: Fuentes.cuerpoNegrita, fontSize: 18 }}>!</Text>
        </View>
        <Text style={[estilos.textoApagado, { color: temaActivo.apagado }]}>{t('comun.errorApi')}</Text>
        <Text style={[estilos.textoApagado, { fontSize: 12, opacity: 0.7, color: temaActivo.apagado }]}>{error}</Text>
        <Boton texto={t('comun.reintentar')} variante="fantasma" onPress={recargar} />
      </View>
    );
  }
  return <>{children}</>;
}

// Los estilos se quedan como fallback de estructura, los colores se inyectan dinámicamente arriba
const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: Radio.l,
    borderWidth: 1,
    padding: Espacio.m,
    gap: Espacio.s,
    ...sombra,
  },
  tituloTarjeta: {
    fontFamily: Fuentes.cuerpoSemi,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radio.m,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  botonTexto: { fontFamily: Fuentes.cuerpoSemi, fontSize: 14 },
  etiquetaCampo: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13 },
  ayudaCampo: { fontFamily: Fuentes.cuerpo, fontSize: 11 },
  entrada: {
    borderWidth: 1,
    borderRadius: Radio.m,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fuentes.cuerpo,
    fontSize: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radio.pill,
    alignSelf: 'flex-start',
  },
  centrado: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 56 },
  textoApagado: { fontFamily: Fuentes.cuerpo, fontSize: 14, textAlign: 'center' },
  iconoError: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});