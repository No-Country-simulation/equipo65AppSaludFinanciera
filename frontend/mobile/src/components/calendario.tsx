import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EventoCalendario, Idioma, Moneda, Tarjeta, TipoEvento, Transaccion } from '@/data';
import { Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource } from '@/lib/useDatos';
import { Boton, Campo } from '@/components/ui';

const LOCALE: Record<Idioma, string> = { es: 'es-MX', pt: 'pt-BR', en: 'en-US' };
const TIPOS: TipoEvento[] = ['pago', 'cobro', 'recordatorio'];

/**
 * Actividad del mes: gasto diario + corte/pago de tarjetas + eventos del usuario.
 * Los dias son pulsables: muestran su detalle y permiten crear/editar/borrar eventos.
 */
export function CalendarioPagos({
  transacciones,
  tarjetas = [],
  eventos = [],
  mes,
  idioma,
  moneda,
  onCambio,
}: {
  transacciones: Transaccion[];
  tarjetas?: Tarjeta[];
  eventos?: EventoCalendario[];
  mes: string;
  idioma: Idioma;
  moneda: Moneda;
  onCambio?: () => void;
}) {
  const { temaActivo } = useTheme();
  const { t } = useI18n();
  const ds = useDataSource();

  const [diaSel, setDiaSel] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<EventoCalendario | null>(null);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('pago');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const { dias, offset, gastoPorDia, maximo, iniciales, pagos, eventosPorDia } = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number);
    const dias = new Date(anio, mesNum, 0).getDate();
    const offset = (new Date(anio, mesNum - 1, 1).getDay() + 6) % 7;

    const gastoPorDia = new Map<number, number>();
    for (const tx of transacciones) {
      if (!tx.fecha.startsWith(mes) || tx.valor >= 0) continue;
      const dia = Number(tx.fecha.slice(8, 10));
      gastoPorDia.set(dia, (gastoPorDia.get(dia) ?? 0) + Math.abs(tx.valor));
    }
    const maximo = Math.max(...gastoPorDia.values(), 1);

    const pagos = new Map<number, { corte: string[]; pago: string[] }>();
    const anota = (dia: number, clave: 'corte' | 'pago', nombre: string) => {
      const d = Math.min(dia, dias);
      const actual = pagos.get(d) ?? { corte: [], pago: [] };
      actual[clave].push(nombre);
      pagos.set(d, actual);
    };
    for (const tarjeta of tarjetas) {
      if (!tarjeta.credito) continue;
      const nombre = tarjeta.etiqueta ?? `•••• ${tarjeta.ultimos4}`;
      anota(tarjeta.credito.dia_corte, 'corte', nombre);
      anota(tarjeta.credito.dia_pago, 'pago', nombre);
    }

    const eventosPorDia = new Map<number, EventoCalendario[]>();
    for (const evento of eventos) {
      if (!evento.fecha.startsWith(mes)) continue;
      const dia = Number(evento.fecha.slice(8, 10));
      eventosPorDia.set(dia, [...(eventosPorDia.get(dia) ?? []), evento]);
    }

    const formato = new Intl.DateTimeFormat(LOCALE[idioma], { weekday: 'narrow' });
    const base = new Date(2026, 5, 1); // lunes
    const iniciales = Array.from({ length: 7 }, (_, i) =>
      formato.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    );

    return { dias, offset, gastoPorDia, maximo, iniciales, pagos, eventosPorDia };
  }, [transacciones, tarjetas, eventos, mes, idioma]);

  // Semanas explicitas de 7: con `width: 100/7%` el redondeo hacia que solo
  // cupieran 6 celdas por fila y el calendario se desalineaba del encabezado.
  const celdas = [
    ...Array.from({ length: offset }, () => 0),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];
  const semanas: number[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    const fila = celdas.slice(i, i + 7);
    while (fila.length < 7) fila.push(0);
    semanas.push(fila);
  }
  const fechaDe = (dia: number) => `${mes}-${String(dia).padStart(2, '0')}`;

  const abrirNuevo = () => {
    setEditando(null);
    setTitulo('');
    setTipo('pago');
    setMonto('');
    setModal(true);
  };

  const abrirEdicion = (evento: EventoCalendario) => {
    setEditando(evento);
    setTitulo(evento.titulo);
    setTipo(evento.tipo);
    setMonto(evento.monto !== undefined ? String(evento.monto) : '');
    setModal(true);
  };

  const guardar = async () => {
    if (diaSel === null) return;
    setGuardando(true);
    try {
      const datos = { fecha: fechaDe(diaSel), titulo, tipo, monto: monto ? Number(monto) : undefined };
      if (editando) await ds.actualizarEvento(editando.id, datos);
      else await ds.crearEvento(datos);
      setModal(false);
      setEditando(null);
      onCambio?.();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    await ds.eliminarEvento(id);
    onCambio?.();
  };

  const marcaSel = diaSel !== null ? pagos.get(diaSel) : undefined;
  const eventosSel = diaSel !== null ? (eventosPorDia.get(diaSel) ?? []) : [];
  const gastoSel = diaSel !== null ? gastoPorDia.get(diaSel) : undefined;

  return (
    <View style={{ gap: 10 }}>
      <View style={s.fila}>
        {iniciales.map((ini, i) => (
          <Text key={i} style={[s.inicial, { color: temaActivo.apagado }]}>
            {ini}
          </Text>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        {semanas.map((semana, fi) => (
          <View key={fi} style={s.semana}>
        {semana.map((dia, i) => {
          const gasto = dia > 0 ? gastoPorDia.get(dia) : undefined;
          const marca = dia > 0 ? pagos.get(dia) : undefined;
          const evs = dia > 0 ? eventosPorDia.get(dia) : undefined;
          const marcado = Boolean(gasto || marca || evs);
          const intensidad = gasto ? 0.35 + 0.65 * (gasto / maximo) : 0;
          const activo = diaSel === dia;

          return (
            <View key={i} style={s.celdaWrapper}>
              {dia > 0 ? (
                <Pressable
                  onPress={() => setDiaSel(activo ? null : dia)}
                  style={[
                    s.diaContenedor,
                    marcado && { backgroundColor: temaActivo.canvas2 },
                    activo && { backgroundColor: temaActivo.acento },
                  ]}
                >
                  <Text
                    style={[
                      s.diaTexto,
                      { color: activo ? temaActivo.sobreAcento : marcado ? temaActivo.tinta : temaActivo.apagado },
                      marcado && { fontFamily: Fuentes.cuerpoSemi },
                    ]}
                  >
                    {dia}
                  </Text>
                  <View style={s.puntos}>
                    {gasto ? (
                      <View style={[s.punto, { backgroundColor: activo ? temaActivo.blanco : temaActivo.menta, opacity: activo ? 1 : intensidad }]} />
                    ) : null}
                    {marca?.corte.length ? <View style={[s.punto, { backgroundColor: temaActivo.alerta }]} /> : null}
                    {marca?.pago.length ? <View style={[s.punto, { backgroundColor: temaActivo.riesgo }]} /> : null}
                    {evs?.length ? <View style={[s.punto, { backgroundColor: temaActivo.menta }]} /> : null}
                  </View>
                </Pressable>
              ) : null}
            </View>
          );
        })}
          </View>
        ))}
      </View>

      {/* Leyenda */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <Leyenda color={temaActivo.menta} texto={t('panel.gastos')} apagado={temaActivo.apagado} />
        {pagos.size > 0 ? (
          <>
            <Leyenda color={temaActivo.alerta} texto={t('tarjetas.corte')} apagado={temaActivo.apagado} />
            <Leyenda color={temaActivo.riesgo} texto={t('tarjetas.pago')} apagado={temaActivo.apagado} />
          </>
        ) : null}
      </View>

      {/* Detalle del dia */}
      <View style={[s.detalle, { borderColor: temaActivo.linea, backgroundColor: temaActivo.canvas2 }]}>
        {diaSel === null ? (
          <Text style={[s.ayuda, { color: temaActivo.apagado }]}>{t('calendario.diaSeleccionado')}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[s.detalleFecha, { color: temaActivo.tinta }]}>
                {formatearFecha(fechaDe(diaSel), idioma)}
              </Text>
              <Pressable onPress={abrirNuevo} hitSlop={8}>
                <Text style={[s.accion, { color: temaActivo.acento }]}>+ {t('calendario.agregar')}</Text>
              </Pressable>
            </View>

            {gastoSel ? (
              <Text style={[s.ayuda, { color: temaActivo.apagado }]}>
                {t('calendario.gastoDia')}: {formatearMoneda(gastoSel, moneda, idioma)}
              </Text>
            ) : null}
            {marcaSel?.corte.map((n) => (
              <Text key={`c-${n}`} style={[s.ayuda, { color: temaActivo.alerta }]}>
                {t('tarjetas.corte')}: {n}
              </Text>
            ))}
            {marcaSel?.pago.map((n) => (
              <Text key={`p-${n}`} style={[s.ayuda, { color: temaActivo.riesgo }]}>
                {t('tarjetas.pago')}: {n}
              </Text>
            ))}

            {eventosSel.length === 0 ? (
              <Text style={[s.ayuda, { color: temaActivo.apagado }]}>{t('calendario.sinEventos')}</Text>
            ) : (
              eventosSel.map((evento) => (
                <View key={evento.id} style={[s.eventoFila, { backgroundColor: temaActivo.tarjeta }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.eventoTitulo, { color: temaActivo.tinta }]} numberOfLines={1}>
                      {evento.titulo}
                    </Text>
                    <Text style={[s.ayuda, { color: temaActivo.apagado }]}>
                      {t(`calendario.tipos.${evento.tipo}`)}
                      {evento.monto !== undefined ? ` · ${formatearMoneda(evento.monto, moneda, idioma)}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => abrirEdicion(evento)} hitSlop={6}>
                    <Ionicons name="create-outline" size={17} color={temaActivo.acento} />
                  </Pressable>
                  <Pressable onPress={() => void eliminar(evento.id)} hitSlop={6}>
                    <Ionicons name="trash-outline" size={17} color={temaActivo.riesgo} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Alta / edicion de evento */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.fondoModal}>
          <View style={[s.modal, { backgroundColor: temaActivo.canvas }]}>
            <Text style={[s.modalTitulo, { color: temaActivo.tinta }]}>
              {editando ? t('calendario.editar') : t('calendario.nuevo')}
            </Text>
            <Campo etiqueta={t('calendario.tituloEvento')} value={titulo} onChangeText={setTitulo} autoFocus />
            <Text style={[s.ayuda, { color: temaActivo.tinta }]}>{t('calendario.tipo')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {TIPOS.map((valor) => (
                <Pressable
                  key={valor}
                  onPress={() => setTipo(valor)}
                  style={[
                    s.chip,
                    { borderColor: temaActivo.linea },
                    tipo === valor && { backgroundColor: temaActivo.acento, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: tipo === valor ? temaActivo.sobreAcento : temaActivo.apagado }}>
                    {t(`calendario.tipos.${valor}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Campo etiqueta={t('calendario.monto')} value={monto} onChangeText={setMonto} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setModal(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  texto={guardando ? t('comun.guardando') : t('calendario.guardar')}
                  onPress={() => void guardar()}
                  cargando={guardando}
                  deshabilitado={!titulo.trim()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Leyenda({ color, texto, apagado }: { color: string; texto: string; apagado: string }) {
  return (
    <View style={s.leyendaItem}>
      <View style={[s.punto, { backgroundColor: color }]} />
      <Text style={[s.leyendaTexto, { color: apagado }]}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', marginBottom: 4 },
  inicial: { flex: 1, textAlign: 'center', fontFamily: Fuentes.cuerpoSemi, fontSize: 10, textTransform: 'uppercase' },
  semana: { flexDirection: 'row' },
  celdaWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  diaContenedor: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  diaTexto: { fontFamily: Fuentes.cuerpo, fontSize: 13 },
  puntos: { flexDirection: 'row', gap: 2, marginTop: 2, height: 4 },
  punto: { width: 4, height: 4, borderRadius: 2 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leyendaTexto: { fontFamily: Fuentes.cuerpo, fontSize: 11 },
  detalle: { borderWidth: 1, borderRadius: 14, padding: 12 },
  detalleFecha: { fontFamily: Fuentes.cuerpoSemi, fontSize: 14 },
  ayuda: { fontFamily: Fuentes.cuerpo, fontSize: 12 },
  accion: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12 },
  eventoFila: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  eventoTitulo: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13.5 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(9,26,22,0.55)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Espacio.l, gap: Espacio.m, paddingBottom: 36 },
  modalTitulo: { fontFamily: Fuentes.titulo, fontSize: 20 },
});
