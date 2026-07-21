import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Idioma, Transaccion } from '@/data';
import { Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext'; // 1. Inyectamos el sistema de temas

const LOCALE: Record<Idioma, string> = { es: 'es-MX', pt: 'pt-BR', en: 'en-US' };

/** Calendario del mes con un diseño premium, circular y dinámico. */
export function CalendarioPagos({
  transacciones,
  mes, // 'YYYY-MM'
  idioma,
}: {
  transacciones: Transaccion[];
  mes: string;
  idioma: Idioma;
}) {
  const { temaActivo } = useTheme(); // 2. Obtenemos los colores dinámicos

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
    <View style={{ gap: 8 }}>
      {/* Fila de días de la semana (L, M, X...) */}
      <View style={s.fila}>
        {iniciales.map((ini, i) => (
          <Text key={i} style={[s.inicial, { color: temaActivo.apagado }]}>
            {ini}
          </Text>
        ))}
      </View>
      
      {/* Grilla de números */}
      <View style={s.grilla}>
        {celdas.map((dia, i) => {
          const gasto = dia > 0 ? gastoPorDia.get(dia) : undefined;
          const intensidad = gasto ? 0.35 + 0.65 * (gasto / maximo) : 0;
          
          return (
            <View key={i} style={s.celdaWrapper}>
              {dia > 0 ? (
                <View 
                style={[
             s.diaContenedor,
                gasto ? { backgroundColor: temaActivo.canvas2 } : null
                ]}
                >
                  <Text 
                    style={[
                      s.diaTexto, 
                      { color: gasto ? temaActivo.tinta : temaActivo.apagado },
                     gasto ? { fontFamily: Fuentes.cuerpoSemi } : null
                    ]} // Énfasis si hay gasto

                  >
                    {dia}
                  </Text>
                  
                  {/* Punto de gasto elegante */}
                  <View
                    style={[
                      s.puntoGasto,
                      { 
                        backgroundColor: gasto ? temaActivo.menta : 'transparent',
                        opacity: intensidad // La opacidad reacciona al monto
                      }
                    ]}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', marginBottom: 4 },
  inicial: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fuentes.cuerpoSemi,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  grilla: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    rowGap: 8 // Separación vertical limpia
  },
  celdaWrapper: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaContenedor: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17, // Círculo perfecto
  },
  diaTexto: { 
    fontFamily: Fuentes.cuerpo, 
    fontSize: 13 
  },
  puntoGasto: { 
    width: 4, 
    height: 4, 
    borderRadius: 2, 
    marginTop: 2 
  },
});