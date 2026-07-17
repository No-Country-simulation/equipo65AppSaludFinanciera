import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Idioma, Transaccion } from '@/data';
import { Colores, Fuentes } from '@/constants/tema';

const LOCALE: Record<Idioma, string> = { es: 'es-MX', pt: 'pt-BR', en: 'en-US' };

/** Calendario del mes con un punto en los días que tienen gastos. */
export function CalendarioPagos({
  transacciones,
  mes, // 'YYYY-MM'
  idioma,
}: {
  transacciones: Transaccion[];
  mes: string;
  idioma: Idioma;
}) {
  const { dias, offset, gastoPorDia, maximo, iniciales } = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number);
    const dias = new Date(anio, mesNum, 0).getDate();
    const offset = (new Date(anio, mesNum - 1, 1).getDay() + 6) % 7; // lunes=0

    const gastoPorDia = new Map<number, number>();
    for (const tx of transacciones) {
      if (!tx.fecha.startsWith(mes) || tx.valor >= 0) continue;
      const dia = Number(tx.fecha.slice(8, 10));
      gastoPorDia.set(dia, (gastoPorDia.get(dia) ?? 0) + Math.abs(tx.valor));
    }
    const maximo = Math.max(...gastoPorDia.values(), 1);

    const formato = new Intl.DateTimeFormat(LOCALE[idioma], { weekday: 'narrow' });
    const base = new Date(2026, 5, 1); // lunes
    const iniciales = Array.from({ length: 7 }, (_, i) =>
      formato.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    );

    return { dias, offset, gastoPorDia, maximo, iniciales };
  }, [transacciones, mes, idioma]);

  const celdas = [...Array.from({ length: offset }, () => 0), ...Array.from({ length: dias }, (_, i) => i + 1)];

  return (
    <View>
      <View style={s.fila}>
        {iniciales.map((ini, i) => (
          <Text key={i} style={s.inicial}>
            {ini}
          </Text>
        ))}
      </View>
      <View style={s.grilla}>
        {celdas.map((dia, i) => {
          const gasto = dia > 0 ? gastoPorDia.get(dia) : undefined;
          const intensidad = gasto ? 0.35 + 0.65 * (gasto / maximo) : 0;
          return (
            <View key={i} style={[s.celda, gasto ? s.celdaConGasto : null]}>
              {dia > 0 ? (
                <>
                  <Text style={[s.dia, gasto ? { fontFamily: Fuentes.cuerpoSemi, color: Colores.tinta } : null]}>
                    {dia}
                  </Text>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      marginTop: 2,
                      backgroundColor: gasto ? `rgba(18,86,74,${intensidad})` : 'transparent',
                    }}
                  />
                </>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row' },
  inicial: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fuentes.cuerpoSemi,
    fontSize: 10,
    color: Colores.apagado,
    textTransform: 'uppercase',
    paddingBottom: 4,
  },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  celdaConGasto: { backgroundColor: 'rgba(242,238,228,0.85)' },
  dia: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: Colores.apagado },
});
