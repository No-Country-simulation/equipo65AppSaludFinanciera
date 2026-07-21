import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MetaAhorro } from '@/data';
import { Fuentes, ICONO_META, Radio } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext'; // 1. Hook de tema
import { useI18n } from '@/i18n';
import { formatearFecha, formatearMoneda } from '@/lib/formato';

type NombreIon = ComponentProps<typeof Ionicons>['name'];
export const iconoMeta = (clave: string): NombreIon =>
  (ICONO_META[clave] ?? 'locate-outline') as NombreIon;

export function progresoMeta(meta: MetaAhorro): number {
  return meta.objetivo > 0 ? Math.min(1, meta.ahorrado / meta.objetivo) : 0;
}

export function mensualNecesario(meta: MetaAhorro): number | null {
  if (!meta.fecha_limite) return null;
  const restante = Math.max(0, meta.objetivo - meta.ahorrado);
  if (restante === 0) return 0;
  const hoy = new Date();
  const limite = new Date(`${meta.fecha_limite}T12:00:00`);
  const meses = Math.max(
    1,
    (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth()),
  );
  return Math.ceil(restante / meses);
}

export function TarjetaMeta({
  meta,
  onAportar,
  onEliminar,
  compacta = false,
}: {
  meta: MetaAhorro;
  onAportar?: () => void;
  onEliminar?: () => void;
  compacta?: boolean;
}) {
  const { t, idioma } = useI18n();
  const { temaActivo } = useTheme(); // 2. Tema inyectado
  const progreso = progresoMeta(meta);
  const completada = progreso >= 1;
  const restante = Math.max(0, meta.objetivo - meta.ahorrado);
  const mensual = mensualNecesario(meta);

  return (
    <View style={[e.tarjeta, { backgroundColor: temaActivo.tarjeta, borderColor: temaActivo.linea }, compacta && { padding: 0, borderWidth: 0, backgroundColor: 'transparent' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[e.icono, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={iconoMeta(meta.icono)} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text numberOfLines={1} style={[e.nombre, { color: temaActivo.tinta }]}>{meta.nombre}</Text>
            <Text style={[e.pct, { color: meta.color }]}>{Math.round(progreso * 100)}%</Text>
          </View>
          <Text style={[e.montos, { color: temaActivo.apagado }]}>
            {formatearMoneda(meta.ahorrado, meta.moneda, idioma)} / {formatearMoneda(meta.objetivo, meta.moneda, idioma)}
          </Text>
        </View>
      </View>

      <View style={[e.pista, { backgroundColor: temaActivo.canvas2 }]}>
        <View style={{ width: `${Math.max(3, progreso * 100)}%`, height: '100%', borderRadius: 999, backgroundColor: meta.color }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={[e.nota, { color: temaActivo.apagado }, completada && { color: temaActivo.okTexto, fontFamily: Fuentes.cuerpoSemi }]}>
          {completada
            ? t('metas.completada')
            : mensual
              ? t('metas.mensualNecesario', { monto: formatearMoneda(mensual, meta.moneda, idioma) })
              : t('metas.restante', { monto: formatearMoneda(restante, meta.moneda, idioma) })}
        </Text>
        {meta.fecha_limite && !compacta ? (
          <Text style={[e.nota, { color: temaActivo.apagado }]}>{formatearFecha(meta.fecha_limite, idioma)}</Text>
        ) : null}
      </View>

      {!compacta && (onAportar || onEliminar) ? (
        <View style={[e.acciones, { borderTopColor: temaActivo.linea }]}>
          {onAportar ? (
            <Pressable onPress={onAportar} style={[e.chipAccion, { backgroundColor: `${temaActivo.acento}1a` }]}>
              <Text style={{ color: temaActivo.acento, fontFamily: Fuentes.cuerpoSemi, fontSize: 12 }}>
                + {t('metas.aportar')}
              </Text>
            </Pressable>
          ) : null}
          {onEliminar ? (
            <Pressable onPress={onEliminar} style={e.chipAccion}>
              <Text style={{ color: temaActivo.riesgo, fontFamily: Fuentes.cuerpoSemi, fontSize: 12 }}>
                {t('metas.eliminar')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const e = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: Radio.l, padding: 14 },
  icono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nombre: { flex: 1, fontFamily: Fuentes.cuerpoSemi, fontSize: 14.5 },
  pct: { fontFamily: Fuentes.titulo, fontSize: 14 },
  montos: { fontFamily: Fuentes.cuerpo, fontSize: 11.5, marginTop: 1 },
  pista: { height: 10, borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  nota: { fontFamily: Fuentes.cuerpo, fontSize: 11.5 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  chipAccion: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
});