import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Espacio, Fuentes } from '@/constants/tema';
import { Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

export default function Onboarding() {
  const { temaActivo } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Controladores de los pasos
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);

  // Datos que vamos a recolectar
  const [saldo, setSaldo] = useState('');
  const [nombreMeta, setNombreMeta] = useState('');
  const [montoMeta, setMontoMeta] = useState('');

  const manejarAvance = async () => {
    if (paso === 1) {
      if (!saldo) return alert("Ingresa tu saldo inicial");
      // TODO: Aquí conectaremos con el POST de Java para la tarjeta
      setPaso(2);
    } else if (paso === 2) {
      if (!nombreMeta || !montoMeta) return alert("Completa tu meta");
      setGuardando(true);
      
      // TODO: Aquí conectaremos con el POST de Java para la meta
      
      // Simulamos que estamos procesando la IA y los datos (Efecto "Wow" para jueces)
      setTimeout(() => {
        setGuardando(false);
        // Mandamos al usuario directo a su panel principal
        router.replace('/(tabs)/panel'); // Ajusta la ruta de tu dashboard
      }, 2000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: temaActivo.canvas }}>
      <Hero paddingTop={insets.top + 14}>
        <Text style={[s.titulo, { color: temaActivo.blanco }]}>
          {paso === 1 ? '¡Bienvenido a Fintech Vital!' : 'Casi listos...'}
        </Text>
        <Text style={s.subtitulo}>
          {paso === 1 
            ? 'Vamos a configurar tu cuenta principal para empezar a analizar tus finanzas.' 
            : 'Fijar objetivos es el primer paso para la libertad financiera.'}
        </Text>
      </Hero>

      <View style={{ padding: Espacio.m, marginTop: 20 }}>
        <Tarjeta style={{ borderColor: temaActivo.acento, borderWidth: 1 }}>
          
          {paso === 1 && (
            <View style={{ gap: 16 }}>
              <TituloTarjeta>Paso 1: Tu primera cuenta</TituloTarjeta>
              <Text style={{ fontFamily: Fuentes.cuerpo, color: temaActivo.apagado }}>
                ¿Con cuánto saldo estás iniciando hoy?
              </Text>
              <TextInput
                style={[s.input, { color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                placeholder="Ej. 5000"
                placeholderTextColor={temaActivo.apagado}
                keyboardType="numeric"
                value={saldo}
                onChangeText={setSaldo}
              />
            </View>
          )}

          {paso === 2 && (
            <View style={{ gap: 16 }}>
              <TituloTarjeta>Paso 2: Tu primera meta</TituloTarjeta>
              <TextInput
                style={[s.input, { color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                placeholder="¿Qué quieres lograr? (Ej. Comprar un auto)"
                placeholderTextColor={temaActivo.apagado}
                value={nombreMeta}
                onChangeText={setNombreMeta}
              />
              <TextInput
                style={[s.input, { color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                placeholder="¿Cuánto necesitas? (Ej. 150000)"
                placeholderTextColor={temaActivo.apagado}
                keyboardType="numeric"
                value={montoMeta}
                onChangeText={setMontoMeta}
              />
            </View>
          )}

          <Pressable
            style={[s.botonPrincipal, { backgroundColor: temaActivo.acento, marginTop: 24 }]}
            onPress={manejarAvance}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color={temaActivo.blanco} />
            ) : (
              <Text style={{ color: temaActivo.blanco, fontFamily: Fuentes.cuerpoSemi, textAlign: 'center', fontSize: 16 }}>
                {paso === 1 ? 'Siguiente' : 'Finalizar y ver mi Panel'}
              </Text>
            )}
          </Pressable>
        </Tarjeta>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  titulo: { fontFamily: Fuentes.titulo, fontSize: 26, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontFamily: Fuentes.cuerpo, fontSize: 16 },
  botonPrincipal: { padding: 16, borderRadius: 12 }
});