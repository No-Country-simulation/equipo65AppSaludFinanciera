/** Piezas del analisis compartidas entre Inicio y el detalle. */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Indicadores, RecomendacionDetalle } from '@/data';
import { Colores, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearPct } from '@/lib/formato';

const FRECUENCIAS = ['nula', 'baja', 'media', 'alta'] as const;

export function FichasIndicadores({ indicadores }: { indicadores: Indicadores }) {
  const { t, idioma } = useI18n();
  const fichas: { clave: keyof Indicadores; valor: string; alerta?: boolean }[] = [
    { clave: 'tasa_ahorro', valor: formatearPct(indicadores.tasa_ahorro, idioma), alerta: indicadores.tasa_ahorro < 0.1 },
    { clave: 'ratio_endeudamiento', valor: formatearPct(indicadores.ratio_endeudamiento, idioma), alerta: indicadores.ratio_endeudamiento > 0.4 },
    { clave: 'ratio_gasto_ingreso', valor: formatearPct(indicadores.ratio_gasto_ingreso, idioma) },
    { clave: 'ratio_gasto_esencial', valor: formatearPct(indicadores.ratio_gasto_esencial, idioma), alerta: indicadores.ratio_gasto_esencial > 0.6 },
    { clave: 'ratio_gasto_discrecional', valor: formatearPct(indicadores.ratio_gasto_discrecional, idioma), alerta: indicadores.ratio_gasto_discrecional > 0.3 },
    { clave: 'concentracion_gasto', valor: formatearPct(indicadores.concentracion_gasto, idioma) },
    { clave: 'frecuencia_ahorro_num', valor: t(`perfilUsuario.frecuencias.${FRECUENCIAS[indicadores.frecuencia_ahorro_num]}`) },
    { clave: 'ratio_recurrente', valor: formatearPct(indicadores.ratio_recurrente, idioma) },
  ];

  return (
    <View style={estilos.rejilla}>
      {fichas.map((ficha) => (
        <View key={ficha.clave} style={estilos.ficha}>
          <Text style={estilos.fichaEtiqueta} numberOfLines={1}>
            {t(`indicadores.${ficha.clave}`).toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={estilos.fichaValor}>{ficha.valor}</Text>
            {ficha.alerta ? <Ionicons name="warning-outline" size={13} color={Colores.riesgo} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function ListaRecomendaciones({
  recomendaciones,
}: {
  recomendaciones: RecomendacionDetalle[];
}) {
  const { t } = useI18n();
  if (recomendaciones.length === 0) {
    return <Text style={estilos.vacio}>{t('panel.recVacio')}</Text>;
  }
  const estiloPrioridad: Record<string, { fondo: string; texto: string }> = {
    alta: { fondo: Colores.riesgoFondo, texto: Colores.riesgo },
    media: { fondo: Colores.alertaSuave, texto: Colores.alerta },
    baja: { fondo: Colores.okFondo, texto: Colores.okTexto },
  };
  return (
    <View style={{ gap: 10 }}>
      {recomendaciones.map((rec) => (
        <View key={rec.codigo + JSON.stringify(rec.parametros)} style={estilos.rec}>
          <View style={[estilos.recPrioridad, { backgroundColor: estiloPrioridad[rec.prioridad].fondo }]}>
            <Text
              style={{
                color: estiloPrioridad[rec.prioridad].texto,
                fontFamily: Fuentes.cuerpoNegrita,
                fontSize: 10,
                letterSpacing: 0.6,
              }}
            >
              {t(`panel.prioridad.${rec.prioridad}`).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={estilos.recTexto}>{rec.texto}</Text>
            <Text style={estilos.recIndicador}>
              {t('panel.disparadaPor', { indicador: t(`indicadores.${rec.indicador}`) })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ficha: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: Colores.linea,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  fichaEtiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 9.5, letterSpacing: 0.8, color: Colores.apagado },
  fichaValor: { fontFamily: Fuentes.titulo, fontSize: 19, color: Colores.tinta },
  vacio: { fontFamily: Fuentes.cuerpo, color: Colores.apagado, textAlign: 'center', paddingVertical: 18 },
  rec: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: Colores.linea,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 12,
  },
  recPrioridad: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recTexto: { fontFamily: Fuentes.cuerpo, fontSize: 13.5, lineHeight: 19, color: Colores.tinta },
  recIndicador: { fontFamily: Fuentes.cuerpo, fontSize: 11, color: Colores.apagado },
});
