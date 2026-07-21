import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Presupuesto } from '@/data';
import { Colores, COLOR_CATEGORIA, Fuentes, Radio } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext'; // 1. Hook de tema
import { useI18n } from '@/i18n';
import { formatearMoneda } from '@/lib/formato';

export function estadoPresupuesto(p: Presupuesto) {
  const fraccion = p.limite > 0 ? p.gastado / p.limite : 0;
  return {
    fraccion,
    excedido: p.gastado > p.limite,
    diferencia: Math.abs(p.limite - p.gastado),
    // Fallback de color por si se usa fuera de un contexto React
    color: fraccion >= 1 ? Colores.riesgo : fraccion >= 0.8 ? Colores.alertaFondo : Colores.ok,
  };
}

export function BarraPresupuesto({
  presupuesto,
  etiqueta,
  onEditar,
  onEliminar,
  compacta = false,
}: {
  presupuesto: Presupuesto;
  etiqueta: string;
  onEditar?: () => void;
  onEliminar?: () => void;
  compacta?: boolean;
}) {
  const { t, idioma } = useI18n();
  const { temaActivo } = useTheme(); // 2. Tema inyectado
  const { fraccion, excedido, diferencia } = estadoPresupuesto(presupuesto);
  
  // Calculamos los colores con el tema dinámico
  const colorCat = COLOR_CATEGORIA[presupuesto.categoria] ?? temaActivo.serieResto;
  const colorBarra = fraccion >= 1 ? temaActivo.riesgo : fraccion >= 0.8 ? temaActivo.alertaFondo : temaActivo.ok;

  return (
    <View style={compacta ? undefined : [e.tarjeta, { backgroundColor: temaActivo.tarjeta, borderColor: temaActivo.linea }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colorCat }} />
          <Text numberOfLines={1} style={[e.etiqueta, { color: temaActivo.tinta }]}>{etiqueta}</Text>
        </View>
        <Text style={[e.montos, { color: temaActivo.apagado }]}>
          <Text style={{ fontFamily: Fuentes.cuerpoSemi, color: temaActivo.tinta }}>
            {formatearMoneda(presupuesto.gastado, presupuesto.moneda, idioma)}
          </Text>
          {'  '}{t('presupuestos.de')} {formatearMoneda(presupuesto.limite, presupuesto.moneda, idioma)}
        </Text>
      </View>

      <View style={[e.pista, { backgroundColor: temaActivo.canvas2 }]}>
        <View style={{ width: `${Math.min(100, fraccion * 100)}%`, height: '100%', borderRadius: 999, backgroundColor: colorBarra }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
        <Text style={[e.nota, { color: temaActivo.apagado }, excedido && { color: temaActivo.riesgo, fontFamily: Fuentes.cuerpoSemi }]}>
          {excedido
            ? t('presupuestos.excedido', { monto: formatearMoneda(diferencia, presupuesto.moneda, idioma) })
            : t('presupuestos.disponible', { monto: formatearMoneda(diferencia, presupuesto.moneda, idioma) })}
        </Text>
        {!compacta && (onEditar || onEliminar) ? (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {onEditar ? (
              <Pressable onPress={onEditar}>
                <Text style={{ color: temaActivo.acento, fontFamily: Fuentes.cuerpoSemi, fontSize: 12 }}>
                  {t('presupuestos.editar')}
                </Text>
              </Pressable>
            ) : null}
            {onEliminar ? (
              <Pressable onPress={onEliminar}>
                <Text style={{ color: temaActivo.riesgo, fontFamily: Fuentes.cuerpoSemi, fontSize: 12 }}>
                  {t('presupuestos.eliminar')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: Radio.l, padding: 14 },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 14 },
  montos: { fontFamily: Fuentes.cuerpo, fontSize: 12 },
  pista: { height: 10, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  nota: { fontFamily: Fuentes.cuerpo, fontSize: 11.5 },
});