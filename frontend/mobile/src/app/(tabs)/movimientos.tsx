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
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  Categoria,
  CategoriaSlug,
  MedioOperacion,
  PaginaTransacciones,
  Tarjeta as TarjetaBanco,
  Transaccion,
} from '@/data';
import { COLOR_CATEGORIA, Espacio, Fuentes } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext'; // 1. Importamos el Contexto de Tema
import { useI18n } from '@/i18n';
import { formatearFecha, formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { Boton, Campo, EstadoCarga, Hero } from '@/components/ui';

interface DatosMovimientos {
  pagina: PaginaTransacciones;
  categorias: Categoria[];
  tarjetas: TarjetaBanco[];
}

const MEDIO_ICONO: Record<MedioOperacion, React.ComponentProps<typeof Ionicons>['name']> = {
  app_movil: 'phone-portrait-outline',
  portal_web: 'globe-outline',
  cajero: 'cash-outline',
  sucursal: 'business-outline',
  pos: 'card-outline',
  transferencia: 'swap-horizontal-outline',
  efectivo: 'wallet-outline',
};

export default function PantallaMovimientos() {
  const { t, idioma } = useI18n();
  const ds = useDataSource();
  const insets = useSafeAreaInsets();
  
  // 2. Extraemos el tema activo
  const { temaActivo } = useTheme();

  const [filtro, setFiltro] = useState<CategoriaSlug | ''>('');
  const [filtroTarjeta, setFiltroTarjeta] = useState<string>('');
  const [selector, setSelector] = useState<'categoria' | 'tarjeta' | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modalAlta, setModalAlta] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<Transaccion | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoriaAlta, setCategoriaAlta] = useState<CategoriaSlug | ''>('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);

  const { datos, cargando, error, recargar } = useDatos<DatosMovimientos>(
    async (fuente) => {
      const [pagina, categorias, tarjetas] = await Promise.all([
        fuente.transacciones({
          categoria: filtro || undefined,
          tarjeta: filtroTarjeta || undefined,
          tam: 100,
        }),
        fuente.categorias(),
        fuente.tarjetas(),
      ]);
      return { pagina, categorias, tarjetas };
    },
    [filtro, filtroTarjeta],
  );

  const etiquetas = useMemo(
    () => new Map(datos?.categorias.map((categoria) => [categoria.slug, categoria.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const nombreTarjeta = useMemo(
    () =>
      new Map(
        (datos?.tarjetas ?? []).map((tarjeta) => [tarjeta.id, tarjeta.etiqueta ?? `•••• ${tarjeta.ultimos4}`]),
      ),
    [datos?.tarjetas],
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
      await ds.crearTransaccion({
        descripcion,
        valor: Number(monto),
        // Vacia = que clasifique el modelo. Si se elige una, la API la guarda
        // como correccion de la persona (categoria_origen = "usuario").
        categoria: categoriaAlta || undefined,
      });
      setDescripcion('');
      setMonto('');
      setCategoriaAlta('');
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

  const limpiarFiltros = () => {
    setFiltro('');
    setFiltroTarjeta('');
  };

  const importarCsv = async () => {
    const elegido = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    const archivoElegido = elegido.assets?.[0];
    if (elegido.canceled || !archivoElegido) return;

    setImportando(true);
    try {
      const respuesta = await fetch(archivoElegido.uri);
      const contenido = await respuesta.text();
      // El Blob de RN no implementa text(); se pasa un objeto minimo con esa forma.
      // Con la API real ira un archivo RN ({ uri, name, type }) en el FormData.
      const archivo = { text: async () => contenido } as unknown as Blob;
      const resultado = await ds.importarCsv(archivo);
      Alert.alert(
        t('movimientos.importar'),
        t('movimientos.resultadoImport', {
          importadas: resultado.importadas,
          rechazadas: resultado.rechazadas,
        }),
      );
      recargar();
    } catch (causa) {
      Alert.alert(t('movimientos.importar'), causa instanceof Error ? causa.message : String(causa));
    } finally {
      setImportando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: temaActivo.canvas }}>
      <Hero paddingTop={insets.top + 14} redondeado={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[estilos.titulo, { color: temaActivo.blanco }]}>{t('movimientos.titulo')}</Text>
          <Boton texto={`+ ${t('movimientos.nuevo')}`} variante="claro" onPress={() => setModalAlta(true)} />
        </View>
        <Text style={[estilos.subtitulo, { color: temaActivo.blanco, opacity: 0.65 }]}>{t('movimientos.subtitulo')}</Text>
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={t('movimientos.buscar')}
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={[estilos.busqueda, { color: temaActivo.blanco }]}
        />
      </Hero>

      {/* Importar CSV (real) + exportar (solo-UI) */}
      <View style={estilos.exportFila}>
        <Pressable
          onPress={() => void importarCsv()}
          disabled={importando}
          style={[
            estilos.exportChip,
            { backgroundColor: temaActivo.acento, borderColor: 'transparent' },
            importando && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={13} color={temaActivo.sobreAcento} />
          <Text style={[estilos.exportTexto, { color: temaActivo.sobreAcento }]}>
            {importando ? t('comun.cargando') : t('movimientos.importar')}
          </Text>
        </Pressable>
        {(['exportPdf', 'exportXlsx'] as const).map((clave) => (
          <Pressable
            key={clave}
            onPress={() => Alert.alert(t(`movimientos.${clave}`), t('comun.proximamente'))}
            style={[estilos.exportChip, { backgroundColor: temaActivo.tarjeta, borderColor: temaActivo.linea }]}
          >
            <Ionicons name="download-outline" size={13} color={temaActivo.tintaSuave} />
            <Text style={[estilos.exportTexto, { color: temaActivo.tintaSuave }]}>{t(`movimientos.${clave}`)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Resumen entradas/salidas */}
      <View style={estilos.resumenFila}>
        <View style={[estilos.resumenCaja, { backgroundColor: temaActivo.okFondo }]}>
          <Text style={[estilos.resumenEtiqueta, { color: temaActivo.apagado }]}>{t('movimientos.entra').toUpperCase()}</Text>
          <Text style={[estilos.resumenCifra, { color: temaActivo.okTexto }]}>
            +{formatearMoneda(resumen.entra, resumen.moneda, idioma)}
          </Text>
        </View>
        <View style={[estilos.resumenCaja, { backgroundColor: temaActivo.riesgoFondo }]}>
          <Text style={[estilos.resumenEtiqueta, { color: temaActivo.apagado }]}>{t('movimientos.sale').toUpperCase()}</Text>
          <Text style={[estilos.resumenCifra, { color: temaActivo.riesgo }]}>
            −{formatearMoneda(resumen.sale, resumen.moneda, idioma)}
          </Text>
        </View>
      </View>

      {/* Filtros compactos: abren un selector, sin scroll horizontal */}
      <View style={estilos.filtrosFila}>
        <Pressable
          onPress={() => setSelector('categoria')}
          style={[estilos.selector, { backgroundColor: temaActivo.tarjeta, borderColor: filtro ? temaActivo.acento : temaActivo.linea }]}
        >
          <Text style={[estilos.selectorEtiqueta, { color: temaActivo.apagado }]}>
            {t('movimientos.categoria')}
          </Text>
          <View style={estilos.selectorValorFila}>
            <Text numberOfLines={1} style={[estilos.selectorValor, { color: temaActivo.tinta }]}>
              {filtro ? (etiquetas.get(filtro) ?? filtro) : t('movimientos.todas')}
            </Text>
            <Ionicons name="chevron-down" size={14} color={temaActivo.apagado} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => setSelector('tarjeta')}
          style={[estilos.selector, { backgroundColor: temaActivo.tarjeta, borderColor: filtroTarjeta ? temaActivo.acento : temaActivo.linea }]}
        >
          <Text style={[estilos.selectorEtiqueta, { color: temaActivo.apagado }]}>
            {t('movimientos.filtrarTarjeta')}
          </Text>
          <View style={estilos.selectorValorFila}>
            <Text numberOfLines={1} style={[estilos.selectorValor, { color: temaActivo.tinta }]}>
              {filtroTarjeta ? (nombreTarjeta.get(filtroTarjeta) ?? filtroTarjeta) : t('movimientos.todasTarjetas')}
            </Text>
            <Ionicons name="chevron-down" size={14} color={temaActivo.apagado} />
          </View>
        </Pressable>
      </View>

      <View style={estilos.filtrosPie}>
        <Text style={[estilos.resultados, { color: temaActivo.apagado }]}>
          {t('movimientos.resultados', { n: visibles.length })}
        </Text>
        {filtro || filtroTarjeta ? (
          <Pressable onPress={limpiarFiltros} hitSlop={8}>
            <Text style={[estilos.limpiarFiltros, { color: temaActivo.acento }]}>
              {t('movimientos.limpiarFiltros')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
        <FlatList
          data={visibles}
          keyExtractor={(transaccion) => transaccion.id}
          contentContainerStyle={{ padding: Espacio.m, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={[estilos.vacio, { color: temaActivo.apagado }]}>
              {busqueda ? t('movimientos.sinResultados') : t('movimientos.vacio')}
            </Text>
          }
          renderItem={({ item: transaccion }) => (
            <View style={[estilos.fila, { backgroundColor: temaActivo.tarjeta, borderColor: temaActivo.linea }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={1} style={[estilos.filaDescripcion, { color: temaActivo.tinta }]}>
                  {transaccion.descripcion}
                  {transaccion.comercio ? (
                    <Text style={{ color: temaActivo.apagado }}> · {transaccion.comercio}</Text>
                  ) : null}
                </Text>
                <Text style={[estilos.filaMeta, { color: temaActivo.apagado }]}>
                  {formatearFecha(transaccion.fecha, idioma)} ·{' '}
                  {etiquetas.get(transaccion.categoria) ?? transaccion.categoria}
                  {transaccion.categoria_origen === 'usuario'
                    ? ` · ${t('movimientos.origenUsuario')}`
                    : ` · ${t('movimientos.confianza', { pct: Math.round(transaccion.confianza * 100) })}`}
                </Text>
                {transaccion.medio_operacion || (transaccion.id_tarjeta && nombreTarjeta.has(transaccion.id_tarjeta)) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1 }}>
                    {transaccion.medio_operacion ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name={MEDIO_ICONO[transaccion.medio_operacion]} size={12} color={temaActivo.apagado} />
                        <Text style={[estilos.filaMeta, { color: temaActivo.apagado }]}>
                          {t(`movimientos.medios.${transaccion.medio_operacion}`)}
                        </Text>
                      </View>
                    ) : null}
                    {transaccion.id_tarjeta && nombreTarjeta.has(transaccion.id_tarjeta) ? (
                      <Text style={[estilos.filaMeta, { color: temaActivo.acento }]}>
                        {nombreTarjeta.get(transaccion.id_tarjeta)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 3 }}>
                  <Pressable onPress={() => setCorrigiendo(transaccion)}>
                    <Text style={[estilos.accion, { color: temaActivo.acento }]}>{t('movimientos.corregir')}</Text>
                  </Pressable>
                  <Pressable onPress={() => void eliminar(transaccion.id)}>
                    <Text style={[estilos.accion, { color: temaActivo.riesgo }]}>
                      {t('movimientos.eliminar')}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text
                style={[
                  estilos.filaMonto,
                  { color: transaccion.valor > 0 ? temaActivo.okTexto : temaActivo.tinta },
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
          <View style={[estilos.modal, { backgroundColor: temaActivo.canvas }]}>
            <Text style={[estilos.modalTitulo, { color: temaActivo.tinta }]}>{t('movimientos.nuevo')}</Text>
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
            {/* Categoria: opcional. "Automatica" deja que la deduzca el modelo,
                que es lo normal; elegir una la fija como correccion de la persona
                y ahorra tener que guardar primero y corregir despues. */}
            <Text style={[estilos.filaMeta, { color: temaActivo.apagado, marginBottom: 6 }]}>
              {t('movimientos.categoria')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {[
                { slug: '' as CategoriaSlug | '', etiqueta: t('movimientos.categoriaAutomatica') },
                ...(datos?.categorias ?? []).map((categoria) => ({
                  slug: categoria.slug as CategoriaSlug | '',
                  etiqueta: categoria.etiqueta,
                })),
              ].map((opcion) => {
                const sel = categoriaAlta === opcion.slug;
                return (
                  <Pressable
                    key={opcion.slug || 'automatica'}
                    onPress={() => setCategoriaAlta(opcion.slug)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: sel ? temaActivo.acento : temaActivo.linea,
                      backgroundColor: sel ? `${temaActivo.acento}1a` : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: sel ? Fuentes.cuerpoSemi : Fuentes.cuerpo,
                        fontSize: 13,
                        color: sel ? temaActivo.acento : temaActivo.tinta,
                      }}
                    >
                      {opcion.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
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

      {/* ── Modal correccion de categoria ──────────────────────── */}
      {/* ── Selector de filtro (categoria / tarjeta) ─────────────── */}
      <Modal visible={selector !== null} animationType="slide" transparent onRequestClose={() => setSelector(null)}>
        <View style={estilos.fondoModal}>
          <View style={[estilos.modal, { backgroundColor: temaActivo.canvas }]}>
            <Text style={[estilos.modalTitulo, { color: temaActivo.tinta }]}>
              {selector === 'tarjeta' ? t('movimientos.filtrarTarjeta') : t('movimientos.categoria')}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(selector === 'tarjeta'
                ? [
                    { valor: '', etiqueta: t('movimientos.todasTarjetas'), color: undefined as string | undefined },
                    ...(datos?.tarjetas ?? []).map((tarjeta) => ({
                      valor: tarjeta.id,
                      etiqueta: tarjeta.etiqueta ?? `•••• ${tarjeta.ultimos4}`,
                      color: undefined as string | undefined,
                    })),
                  ]
                : [
                    { valor: '', etiqueta: t('movimientos.todas'), color: undefined as string | undefined },
                    ...(datos?.categorias ?? []).map((categoria) => ({
                      valor: categoria.slug as string,
                      etiqueta: categoria.etiqueta,
                      color: COLOR_CATEGORIA[categoria.slug] as string | undefined,
                    })),
                  ]
              ).map((opcion) => {
                const activo =
                  selector === 'tarjeta' ? filtroTarjeta === opcion.valor : filtro === opcion.valor;
                return (
                  <Pressable
                    key={`${selector}-${opcion.valor}`}
                    onPress={() => {
                      if (selector === 'tarjeta') setFiltroTarjeta(opcion.valor);
                      else setFiltro(opcion.valor as CategoriaSlug | '');
                      setSelector(null);
                    }}
                    style={[estilos.opcionCategoria, { borderBottomColor: temaActivo.linea, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                  >
                    <Ionicons
                      name={activo ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={activo ? temaActivo.acento : temaActivo.linea}
                    />
                    {opcion.color ? (
                      <View style={[estilos.chipPunto, { backgroundColor: opcion.color }]} />
                    ) : null}
                    <Text
                      style={{
                        fontFamily: activo ? Fuentes.cuerpoSemi : Fuentes.cuerpo,
                        fontSize: 14,
                        color: temaActivo.tinta,
                      }}
                    >
                      {opcion.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setSelector(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={corrigiendo !== null} animationType="slide" transparent>
        <View style={estilos.fondoModal}>
          <View style={[estilos.modal, { backgroundColor: temaActivo.canvas }]}>
            <Text style={[estilos.modalTitulo, { color: temaActivo.tinta }]}>{t('movimientos.corregir')}</Text>
            <Text numberOfLines={1} style={[estilos.filaMeta, { color: temaActivo.apagado }]}>
              {corrigiendo?.descripcion}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {datos?.categorias.map((categoria) => {
                const sel = corrigiendo?.categoria === categoria.slug;
                return (
                  <Pressable
                    key={categoria.slug}
                    onPress={() => void corregir(categoria.slug)}
                    style={[estilos.opcionCategoria, { borderBottomColor: temaActivo.linea, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  >
                    <Ionicons
                      name={sel ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={sel ? temaActivo.acento : temaActivo.linea}
                    />
                    <Text
                      style={{
                        fontFamily: sel ? Fuentes.cuerpoSemi : Fuentes.cuerpo,
                        fontSize: 14,
                        color: temaActivo.tinta,
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
  titulo: { fontFamily: Fuentes.titulo, fontSize: 25, letterSpacing: -0.4 },
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 12 },
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
  },
  exportFila: { flexDirection: 'row', gap: 8, paddingHorizontal: Espacio.m, paddingTop: 12 },
  exportChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  exportTexto: { fontFamily: Fuentes.cuerpoMedio, fontSize: 12 },
  resumenFila: { flexDirection: 'row', gap: 10, paddingHorizontal: Espacio.m, paddingTop: 12 },
  resumenCaja: { flex: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  resumenEtiqueta: { fontFamily: Fuentes.cuerpoSemi, fontSize: 9.5, letterSpacing: 0.8 },
  resumenCifra: { fontFamily: Fuentes.titulo, fontSize: 17, marginTop: 2 },
  limpiarFiltros: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12 },
  resultados: { fontFamily: Fuentes.cuerpo, fontSize: 11.5, paddingHorizontal: Espacio.m, paddingBottom: 4 },
  chipPunto: { width: 8, height: 8, borderRadius: 4 },
  filtrosFila: { flexDirection: 'row', gap: 10, paddingHorizontal: Espacio.m, paddingTop: 14 },
  selector: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, gap: 2 },
  selectorEtiqueta: { fontFamily: Fuentes.cuerpoSemi, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  selectorValorFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  selectorValor: { flex: 1, fontFamily: Fuentes.cuerpoMedio, fontSize: 13.5 },
  filtrosPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espacio.m, paddingTop: 8, paddingBottom: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  filaDescripcion: { fontFamily: Fuentes.cuerpoMedio, fontSize: 14 },
  filaMeta: { fontFamily: Fuentes.cuerpo, fontSize: 11.5 },
  filaMonto: { fontFamily: Fuentes.titulo, fontSize: 16 },
  accion: { fontFamily: Fuentes.cuerpoSemi, fontSize: 12 },
  vacio: { fontFamily: Fuentes.cuerpo, fontSize: 13, textAlign: 'center', paddingVertical: 48 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(9,26,22,0.55)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Espacio.l, gap: Espacio.m, paddingBottom: 36 },
  modalTitulo: { fontFamily: Fuentes.titulo, fontSize: 20 },
  opcionCategoria: { paddingVertical: 12, borderBottomWidth: 1 },
});