import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComparacionMensual, Moneda } from '@/data';
import { Colores, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearMoneda } from '@/lib/formato';

function Delta({ actual, anterior, invertir }: { actual: number; anterior: number; invertir: boolean }) {
  if (anterior === 0) return null;
  const cambio = (actual - anterior) / Math.abs(anterior);
  const sube = cambio > 0;
  const bueno = invertir ? !sube : sube;
  const plano = Math.abs(cambio) < 0.005;
  const color = plano ? Colores.apagado : bueno ? Colores.okTexto : Colores.riesgo;
  const icono = plano ? 'remove-outline' : sube ? 'arrow-up' : 'arrow-down';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      <Ionicons name={icono} size={12} color={color} />
      <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 11, color }}>
        {Math.abs(Math.round(cambio * 100))}%
      </Text>
    </View>
  );
}

export function TarjetaComparacion({ datos, moneda }: { datos: ComparacionMensual; moneda: Moneda }) {
  const { t, idioma } = useI18n();
  const filas = [
    { clave: 'ingresos', actual: datos.actual.ingreso_total, anterior: datos.anterior.ingreso_total, invertir: false, color: Colores.ok },
    { clave: 'gastos', actual: datos.actual.gasto_total, anterior: datos.anterior.gasto_total, invertir: true, color: Colores.alertaFondo },
    { clave: 'balance', actual: datos.actual.balance, anterior: datos.anterior.balance, invertir: false, color: Colores.acento },
  ] as const;

  return (
    <View style={{ gap: 10 }}>
      {filas.map((fila) => (
        <View key={fila.clave} style={e.fila}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fila.color }} />
          <Text style={e.etiqueta}>{t(`panel.${fila.clave}`)}</Text>
          <Text style={e.cifra}>{formatearMoneda(fila.actual, moneda, idioma)}</Text>
          <Delta actual={fila.actual} anterior={fila.anterior} invertir={fila.invertir} />
        </View>
      ))}
    </View>
  );
}

const e = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etiqueta: { flex: 1, fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tintaSuave },
  cifra: { fontFamily: Fuentes.titulo, fontSize: 15, color: Colores.tinta },
});
