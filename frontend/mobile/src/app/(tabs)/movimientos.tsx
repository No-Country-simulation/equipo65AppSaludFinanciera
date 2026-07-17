import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Categoria, CategoriaSlug, PaginaTransacciones, Transaccion } from '@/data';
import { Colores, COLOR_CATEGORIA, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { Boton, Campo, EstadoCarga, Hero } from '@/components/ui';

interface DatosMovimientos {
  pagina: PaginaTransacciones;
  categorias: Categoria[];
}

export default function PantallaMovimientos() {
  const { t, idioma } = useI18n();
  const ds = useDataSource();
  const insets = useSafeAreaInsets();

  const [filtro, setFiltro] = useState<CategoriaSlug | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAlta, setModalAlta] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<Transaccion | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState(''); // solo interfaz (F9)
  const [guardando, setGuardando] = useState(false);

  const { datos, cargando, error, recargar } = useDatos<DatosMovimientos>(
    async (fuente) => {
      const [pagina, categorias] = await Promise.all([
        fuente.transacciones({ categoria: filtro || undefined, tam: 100 }),
        fuente.categorias(),
      ]);
      return { pagina, categorias };
    },
    [filtro],
  );

  const etiquetas = useMemo(
    () => new Map(datos?.categorias.map((categoria) => [categoria.slug, categoria.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const visibles = useMemo(
    () =>
      (datos?.pagina.items ?? []).filter((tx) =>
        busqueda ? tx.descripcion.toLowerCase().includes(busqueda.toLowerCase()) : true,
      ),
    [datos?.pagina.items, busqueda],
  );

  const resumen = useMemo(() => {
    let entra = 0;
    let sale = 0;
    for (const tx of visibles) {
      if (tx.valor > 0) entra += tx.valor;
      else sale += Math.abs(tx.valor);
    }
    return { entra, sale, moneda: visibles[0]?.moneda ?? 'USD' };
  }, [visibles]);

  const agregar = async () => {
    setGuardando(true);
    try {
      await ds.crearTransaccion({ descripcion, valor: Number(monto) });
      setDescripcion('');
      setMonto('');
      setNota('');
      setModalAlta(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const corregir = async (categoria: CategoriaSlug) => {
    if (!corrigiendo) return;
    await ds.corregirCategoria(corrigiendo.id, categoria);
    setCorrigiendo(null);
    recargar();
  };

  const eliminar = async (id: string) => {
    await ds.eliminarTransaccion(id);
    recargar();
  };

  return (
    <View style={{ flex: 1 }}>
      <Hero paddingTop={insets.top + 14} redondeado={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={estilos.titulo}>{t('movimientos.titulo')}</Text>
          <Boton texto={`+ ${t('movimientos.nuevo')}`} variante="claro" onPress={() => setModalAlta(true)} />
        </View>
        <Text style={estilos.subtitulo}>{t('movimientos.subtitulo')}</Text>
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={t('movimientos.buscar')}
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={estilos.busqueda}
        />
      </Hero>

      {/* Export solo-UI (F9.15) */}
      <View style={estilos.exportFila}>
        {(['exportPdf', 'exportXlsx'] as const).map((clave) => (
          <Pressable
            key={clave}
            onPress={() => Alert.alert(t(`movimientos.${clave}`), t('comun.proximamente'))}
            style={estilos.exportChip}
          >
            <Ionicons name="download-outline" size={13} color={Colores.tintaSuave} />
            <Text style={estilos.exportTexto}>{t(`movimientos.${clave}`)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Resumen entradas/salidas */}
      <View style={estilos.resumenFila}>
        <View style={[estilos.resumenCaja, { backgroundColor: Colores.okFondo }]}>
          <Text style={estilos.resumenEtiqueta}>{t('movimientos.entra').toUpperCase()}</Text>
          <Text style={[estilos.resumenCifra, { color: Colores.okTexto }]}>
            +{formatearMoneda(resumen.entra, resumen.moneda, idioma)}
          </Text>
        </View>
        <View style={[estilos.resumenCaja, { backgroundColor: Colores.riesgoFondo }]}>
          <Text style={estilos.resumenEtiqueta}>{t('movimientos.sale').toUpperCase()}</Text>
          <Text style={[estilos.resumenCifra, { color: Colores.riesgo }]}>
            −{formatearMoneda(resumen.sale, resumen.moneda, idioma)}
          </Text>
        </View>
      </View>

      {/* Filtro por categoria (altura fija: el ScrollView horizontal no colapsa) */}
      <View style={estilos.filtrosWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtros}
        >
          <Pressable
            onPress={() => setFiltro('')}
            style={[estilos.chipFiltro, filtro === '' && estilos.chipFiltroActivo]}
          >
            <Text style={[estilos.chipFiltroTexto, filtro === '' && { color: Colores.blanco }]}>
              {t('movimientos.todas')}
            </Text>
          </Pressable>
          {datos?.categorias.map((categoria) => {
            const activo = filtro === categoria.slug;
            return (
              <Pressable
                key={categoria.slug}
                onPress={() => setFiltro(categoria.slug)}
                style={[estilos.chipFiltro, activo && estilos.chipFiltroActivo]}
              >
                <View
                  style={[
                    estilos.chipPunto,
                    { backgroundColor: COLOR_CATEGORIA[categoria.slug] ?? Colores.serieResto },
                  ]}
                />
                <Text style={[estilos.chipFiltroTexto, activo && { color: Colores.blanco }]}>
                  {categoria.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        <FlatList
          data={visibles}
          keyExtractor={(transaccion) => transaccion.id}
          contentContainerStyle={{ padding: Espacio.m, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={estilos.vacio}>
              {busqueda ? t('movimientos.sinResultados') : t('movimientos.vacio')}
            </Text>
          }
          renderItem={({ item: transaccion }) => (
            <View style={estilos.fila}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={1} style={estilos.filaDescripcion}>
                  {transaccion.descripcion}
                </Text>
                <Text style={estilos.filaMeta}>
                  {formatearFecha(transaccion.fecha, idioma)} ·{' '}
                  {etiquetas.get(transaccion.categoria) ?? transaccion.categoria}
                  {transaccion.categoria_origen === 'usuario'
                    ? ` · ${t('movimientos.origenUsuario')}`
                    : ` · ${t('movimientos.confianza', { pct: Math.round(transaccion.confianza * 100) })}`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 3 }}>
                  <Pressable onPress={() => setCorrigiendo(transaccion)}>
                    <Text style={estilos.accion}>{t('movimientos.corregir')}</Text>
                  </Pressable>
                  <Pressable onPress={() => void eliminar(transaccion.id)}>
                    <Text style={[estilos.accion, { color: Colores.riesgo }]}>
                      {t('movimientos.eliminar')}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text
                style={[
                  estilos.filaMonto,
                  { color: transaccion.valor > 0 ? Colores.okTexto : Colores.tinta },
                ]}
              >
                {transaccion.valor > 0 ? '+' : ''}
                {formatearMoneda(transaccion.valor, transaccion.moneda, idioma)}
              </Text>
            </View>
          )}
        />
      </EstadoCarga>

      {/* ── Modal alta manual ────────────────────────────────────────── */}
      <Modal visible={modalAlta} animationType="slide" transparent>
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.modalTitulo}>{t('movimientos.nuevo')}</Text>
            <Campo
              etiqueta={t('movimientos.descripcion')}
              value={descripcion}
              onChangeText={setDescripcion}
              autoFocus
            />
            <Campo
              etiqueta={t('movimientos.monto')}
              ayuda={t('movimientos.montoAyuda')}
              value={monto}
              onChangeText={setMonto}
              keyboardType="numbers-and-punctuation"
            />
            <Campo etiqueta={t('movimientos.nota')} value={nota} onChangeText={setNota} maxLength={120} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setModalAlta(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  texto={guardando ? t('comun.guardando') : t('comun.guardar')}
                  onPress={() => void agregar()}
                  cargando={guardando}
                  deshabilitado={!descripcion.trim() || Number.isNaN(Number(monto)) || monto === ''}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal correccion de categoria (RN3) ──────────────────────── */}
      <Modal visible={corrigiendo !== null} animationType="slide" transparent>
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.modalTitulo}>{t('movimientos.corregir')}</Text>
            <Text numberOfLines={1} style={estilos.filaMeta}>
              {corrigiendo?.descripcion}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {datos?.categorias.map((categoria) => {
                const sel = corrigiendo?.categoria === categoria.slug;
                return (
                  <Pressable
                    key={categoria.slug}
                    onPress={() => void corregir(categoria.slug)}
                    style={[estilos.opcionCategoria, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  >
                    <Ionicons
                      name={sel ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={sel ? Colores.acento : Colores.linea}
                    />
                    <Text
                      style={{
                        fontFamily: sel ? Fuentes.cuerpoSemi : Fuentes.cuerpo,
                        fontSize: 14,
                        color: Colores.tinta,
                      }}
                    >
                      {categoria.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setCorrigiendo(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: Fuentes.titulo, fontSize: 25, color: Colores.blanco, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  busqueda: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fuentes.cuerpo,
    fontSize: 14,
    color: Colores.blanco,
  },
  exportFila: { flexDirection: 'row', gap: 8, paddingHorizontal: Espacio.m, paddingTop: 12 },
  exportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colores.linea,
    backgroundColor: Colores.tarjeta,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exportTexto: { fontFamily: Fuentes.cuerpoMedio, fontSize: 12, color: Colores.tintaSuave },
  resumenFila: { flexDirection: 'row', gap: 10, paddingHorizontal: Espacio.m, paddingTop: 12 },
  resumenCaja: { flex: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  resumenEtiqueta: { fontFamily: Fuentes.cuerpoSemi, fontSize: 9.5, letterSpacing: 0.8, color: Colores.apagado },
  resumenCifra: { fontFamily: Fuentes.titulo, fontSize: 17, marginTop: 2 },
  filtrosWrap: { height: 56, justifyContent: 'center' },
  filtros: { gap: 8, paddingHorizontal: Espacio.m, alignItems: 'center' },
  chipFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colores.linea,
    backgroundColor: Colores.tarjeta,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipFiltroActivo: { backgroundColor: Colores.acento, borderColor: 'transparent' },
  chipPunto: { width: 8, height: 8, borderRadius: 4 },
  chipFiltroTexto: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tintaSuave },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colores.tarjeta,
    borderWidth: 1,
    borderColor: Colores.linea,
    borderRadius: 16,
    padding: 14,
  },
  filaDescripcion: { fontFamily: Fuentes.cuerpoMedio, fontSize: 14, color: Colores.tinta },
  filaMeta: { fontFamily: Fuentes.cuerpo, fontSize: 11.5, color: Colores.apagado },
  filaMonto: { fontFamily: Fuentes.titulo, fontSize: 16 },
  accion: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12, color: Colores.acento },
  vacio: {
    fontFamily: Fuentes.cuerpo,
    fontSize: 13,
    color: Colores.apagado,
    textAlign: 'center',
    paddingVertical: 48,
  },
  fondoModal: { flex: 1, backgroundColor: 'rgba(9,26,22,0.55)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colores.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Espacio.l,
    gap: Espacio.m,
    paddingBottom: 36,
  },
  modalTitulo: { fontFamily: Fuentes.titulo, fontSize: 20, color: Colores.tinta },
  opcionCategoria: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colores.linea,
  },
});
