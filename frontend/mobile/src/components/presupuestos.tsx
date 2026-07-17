import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Presupuesto } from '@/data';
import { Colores, COLOR_CATEGORIA, Fuentes, Radio } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearMoneda } from '@/lib/formato';

export function estadoPresupuesto(p: Presupuesto) {
  const fraccion = p.limite > 0 ? p.gastado / p.limite : 0;
  return {
    fraccion,
    excedido: p.gastado > p.limite,
    diferencia: Math.abs(p.limite - p.gastado),
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
  const { fraccion, excedido, diferencia, color } = estadoPresupuesto(presupuesto);
  const colorCat = COLOR_CATEGORIA[presupuesto.categoria] ?? Colores.serieResto;

  return (
    <View style={compacta ? undefined : e.tarjeta}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colorCat }} />
          <Text numberOfLines={1} style={e.etiqueta}>{etiqueta}</Text>
        </View>
        <Text style={e.montos}>
          <Text style={{ fontFamily: Fuentes.cuerpoSemi, color: Colores.tinta }}>
            {formatearMoneda(presupuesto.gastado, presupuesto.moneda, idioma)}
          </Text>
          {'  '}{t('presupuestos.de')} {formatearMoneda(presupuesto.limite, presupuesto.moneda, idioma)}
        </Text>
      </View>

      <View style={e.pista}>
        <View style={{ width: `${Math.min(100, fraccion * 100)}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
        <Text style={[e.nota, excedido && { color: Colores.riesgo, fontFamily: Fuentes.cuerpoSemi }]}>
          {excedido
            ? t('presupuestos.excedido', { monto: formatearMoneda(diferencia, presupuesto.moneda, idioma) })
            : t('presupuestos.disponible', { monto: formatearMoneda(diferencia, presupuesto.moneda, idioma) })}
        </Text>
        {!compacta && (onEditar || onEliminar) ? (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {onEditar ? (
              <Pressable onPress={onEditar}>
                <Text style={{ color: Colores.acento, fontFamily: Fuentes.cuerpoSemi, fontSize: 12 }}>
                  {t('presupuestos.editar')}
                </Text>
              </Pressable>
            ) : null}
            {onEliminar ? (
              <Pressable onPress={onEliminar}>
                <Text style={{ color: Colores.riesgo, fontFamily: Fuentes.cuerpoSemi, fontSize: 12 }}>
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
  tarjeta: {
    borderWidth: 1,
    borderColor: Colores.linea,
    borderRadius: Radio.l,
    backgroundColor: 'rgba(242,238,228,0.5)',
    padding: 14,
  },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 14, color: Colores.tinta },
  montos: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: Colores.apagado },
  pista: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(25,21,9,0.06)',
    overflow: 'hidden',
    marginTop: 8,
  },
  nota: { fontFamily: Fuentes.cuerpo, fontSize: 11.5, color: Colores.apagado },
});
