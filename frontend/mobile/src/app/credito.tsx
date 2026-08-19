import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RegistroBuro, SaludCrediticia } from '@/data';
import { Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDatos } from '@/lib/useDatos';
import { Aparece, EstadoCarga, Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

const SCORE_MIN = 300;
const SCORE_MAX = 850;

type Banda = 'excelente' | 'bueno' | 'regular' | 'bajo';

function banda(score: number, tema: ReturnType<typeof useTheme>['temaActivo']): { clave: Banda; color: string } {
  if (score >= 750) return { clave: 'excelente', color: tema.ok };
  if (score >= 670) return { clave: 'bueno', color: tema.ok };
  if (score >= 580) return { clave: 'regular', color: tema.alertaFondo };
  return { clave: 'bajo', color: tema.riesgo };
}

function AnilloScore({ score, color, tinta, linea }: { score: number; color: string; tinta: string; linea: string }) {
  const R = 58;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  return (
    <Svg width={140} height={140}>
      <Circle cx={70} cy={70} r={R} stroke={linea} strokeWidth={11} fill="none" />
      <G rotation={-90} originX={70} originY={70}>
        <Circle
          cx={70}
          cy={70}
          r={R}
          stroke={color}
          strokeWidth={11}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C}`}
          strokeDashoffset={C * (1 - frac)}
        />
      </G>
      <SvgText x={70} y={78} textAnchor="middle" fontSize={30} fontFamily={Fuentes.titulo} fill={tinta}>
        {String(score)}
      </SvgText>
    </Svg>
  );
}

function LineaScore({ historial, color, linea, apagado }: { historial: RegistroBuro[]; color: string; linea: string; apagado: string }) {
  const ancho = 300;
  const alto = 150;
  const margen = { arriba: 14, abajo: 24, izquierda: 34, derecha: 12 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;
  const valores = historial.map((r) => r.score_crediticio);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const x = (i: number) => margen.izquierda + (historial.length > 1 ? (i / (historial.length - 1)) * anchoUtil : anchoUtil / 2);
  const y = (v: number) => margen.arriba + (1 - (v - min) / rango) * altoUtil;
  const puntos = historial.map((r, i) => `${x(i)},${y(r.score_crediticio)}`).join(' ');
  const guias = [min, Math.round((min + max) / 2), max];

  return (
    <Svg width={ancho} height={alto}>
      {guias.map((g) => (
        <G key={g}>
          <Line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y(g)} y2={y(g)} stroke={linea} strokeWidth={1} />
          <SvgText x={4} y={y(g) + 3} fontSize={9} fontFamily={Fuentes.cuerpo} fill={apagado}>
            {String(g)}
          </SvgText>
        </G>
      ))}
      <Polyline points={puntos} fill="none" stroke={color} strokeWidth={2.5} />
      {historial.map((r, i) => (
        <Circle key={r.fecha} cx={x(i)} cy={y(r.score_crediticio)} r={4} fill={color} />
      ))}
    </Svg>
  );
}

export default function PantallaCredito() {
  const { t, idioma } = useI18n();
  const { temaActivo } = useTheme();
  const insets = useSafeAreaInsets();

  const { datos, cargando, error, recargar } = useDatos<SaludCrediticia>((fuente) => fuente.saludCrediticia());

  const [mostrarForm, setMostrarForm] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const [formSimulador, setFormSimulador] = useState({
    usuarioId: '',
    score: '720',
    atraso: '0',
    deuda: '1500'
  });

  const simularBuro = async () => {
    if (!formSimulador.usuarioId) {
      alert("Por favor ingresa el ID del usuario (UUID)");
      return;
    }
    setSimulando(true);
    try {
      const respuesta = await fetch('http://localhost:8080/api/v1/buro/simular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarioId: formSimulador.usuarioId,
          score: parseInt(formSimulador.score),
          atraso: parseInt(formSimulador.atraso),
          deuda: parseFloat(formSimulador.deuda),
          moneda: 'MXN'
        })
      });

      if (respuesta.ok) {
        setMostrarForm(false);
        recargar(); 
      } else {
        alert('Error al simular. Revisa que el UUID sea correcto.');
      }
    } catch (error: any) {
      alert('Error de conexión: ' + error.message);
    } finally {
      setSimulando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: temaActivo.canvas }}>
      <Hero paddingTop={insets.top + 14}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()}>
            <Text style={s.volver}>← {t('nav.tarjetas')}</Text>
          </Pressable>
        </View>
        <Text style={[s.titulo, { color: temaActivo.blanco }]}>{t('credito.titulo')}</Text>
        <Text style={s.subtitulo}>{t('credito.subtitulo')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, paddingBottom: 40 }}>
        
        {/* BOTÓN DE EMERGENCIA HACKATHON */}
        <Pressable 
          style={[s.botonGigante, { backgroundColor: temaActivo.acento, marginBottom: Espacio.m }]}
          onPress={() => setMostrarForm(!mostrarForm)}
        >
          <Text style={{ color: '#fff', fontFamily: Fuentes.cuerpoSemi, fontSize: 15, textAlign: 'center' }}>
            {mostrarForm ? '❌ Cerrar Simulador' : '⚙️ [HACKATHON] Simular Datos de Buró'}
          </Text>
        </Pressable>

        {mostrarForm && (
          <Tarjeta style={{ marginBottom: Espacio.m, borderColor: temaActivo.acento, borderWidth: 2 }}>
            <TituloTarjeta>Panel de Simulación de Buró</TituloTarjeta>
            <View style={{ gap: 12, marginTop: 10 }}>
              <TextInput
                style={[s.input, { color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                placeholder="ID del Usuario (UUID)"
                placeholderTextColor={temaActivo.apagado}
                value={formSimulador.usuarioId}
                onChangeText={(t) => setFormSimulador({...formSimulador, usuarioId: t})}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[s.input, { flex: 1, color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                  placeholder="Score (300-850)"
                  placeholderTextColor={temaActivo.apagado}
                  keyboardType="numeric"
                  value={formSimulador.score}
                  onChangeText={(t) => setFormSimulador({...formSimulador, score: t})}
                />
                <TextInput
                  style={[s.input, { flex: 1, color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                  placeholder="Atraso (días)"
                  placeholderTextColor={temaActivo.apagado}
                  keyboardType="numeric"
                  value={formSimulador.atraso}
                  onChangeText={(t) => setFormSimulador({...formSimulador, atraso: t})}
                />
              </View>
              <TextInput
                style={[s.input, { color: temaActivo.tinta, borderColor: temaActivo.linea }]}
                placeholder="Monto de Deuda"
                placeholderTextColor={temaActivo.apagado}
                keyboardType="numeric"
                value={formSimulador.deuda}
                onChangeText={(t) => setFormSimulador({...formSimulador, deuda: t})}
              />
              <Pressable
                style={[s.botonGuardar, { backgroundColor: temaActivo.acento }]}
                onPress={simularBuro}
                disabled={simulando}
              >
                <Text style={{ color: temaActivo.blanco, fontFamily: Fuentes.cuerpoSemi, textAlign: 'center' }}>
                  {simulando ? 'Guardando en Java...' : '🚀 Inyectar Datos y Ver Gráfica'}
                </Text>
              </Pressable>
            </View>
          </Tarjeta>
        )}

        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos ? (
            <Aparece delay={40} style={{ gap: Espacio.m }}>
              {(() => {
                const { actual, historial, moneda } = datos;
                const b = banda(actual.score_crediticio, temaActivo);
                return (
                  <>
                    <Tarjeta>
                      <TituloTarjeta>{t('credito.score')}</TituloTarjeta>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <AnilloScore
                          score={actual.score_crediticio}
                          color={b.color}
                          tinta={temaActivo.tinta}
                          linea={temaActivo.linea}
                        />
                        <View style={{ gap: 6, flex: 1, minWidth: 140 }}>
                          <Text style={[s.banda, { color: b.color, backgroundColor: `${b.color}22` }]}>
                            {t(`credito.bandas.${b.clave}`)}
                          </Text>
                          <Text style={[s.meta, { color: temaActivo.apagado }]}>
                            {t('credito.ultimaConsulta', { fecha: formatearFecha(actual.fecha, idioma) })}
                          </Text>
                          <Text style={[s.alimenta, { color: temaActivo.apagado }]}>{t('credito.alimentaPerfil')}</Text>
                        </View>
                      </View>
                    </Tarjeta>

                    <View style={{ flexDirection: 'row', gap: Espacio.m }}>
                      <Tarjeta style={{ flex: 1 }}>
                        <TituloTarjeta>{t('credito.diasAtraso')}</TituloTarjeta>
                        <Text
                          style={[s.senalCifra, { color: actual.dias_atraso > 0 ? temaActivo.riesgo : temaActivo.okTexto }]}
                        >
                          {actual.dias_atraso > 0 ? t('credito.diasValor', { dias: actual.dias_atraso }) : t('credito.sinAtraso')}
                        </Text>
                      </Tarjeta>
                      <Tarjeta style={{ flex: 1 }}>
                        <TituloTarjeta>{t('credito.montoAdeudado')}</TituloTarjeta>
                        <Text style={[s.senalCifra, { color: temaActivo.tinta }]}>
                          {actual.monto_adeudado > 0 ? formatearMoneda(actual.monto_adeudado, moneda, idioma) : t('credito.sinDeuda')}
                        </Text>
                      </Tarjeta>
                    </View>

                    <Tarjeta>
                      <TituloTarjeta>{t('credito.evolucionTitulo')}</TituloTarjeta>
                      <LineaScore
                        historial={historial}
                        color={temaActivo.acento}
                        linea={temaActivo.linea}
                        apagado={temaActivo.apagado}
                      />
                    </Tarjeta>
                  </>
                );
              })()}
            </Aparece>
          ) : null}
        </EstadoCarga>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 23, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  banda: { alignSelf: 'flex-start', fontFamily: Fuentes.cuerpoSemi, fontSize: 14, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden' },
  meta: { fontFamily: Fuentes.cuerpo, fontSize: 11 },
  alimenta: { fontFamily: Fuentes.cuerpo, fontSize: 12 },
  senalCifra: { fontFamily: Fuentes.titulo, fontSize: 20 },
  
  botonGigante: { padding: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontFamily: Fuentes.cuerpo, fontSize: 14 },
  botonGuardar: { padding: 12, borderRadius: 8, marginTop: 4 }
});