import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MetaAhorro } from '@/data';
import { Colores, Espacio, Fuentes, ICONOS_META } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearMoneda } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { iconoMeta, progresoMeta, TarjetaMeta } from '@/components/metas';
import { Boton, Campo, EstadoCarga, Hero } from '@/components/ui';

export default function PantallaMetas() {
  const { t, idioma } = useI18n();
  const ds = useDataSource();
  const insets = useSafeAreaInsets();

  const { datos, cargando, error, recargar } = useDatos((f) => f.metas());

  const [modalNueva, setModalNueva] = useState(false);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [icono, setIcono] = useState('meta');
  const [guardando, setGuardando] = useState(false);
  const [aportando, setAportando] = useState<MetaAhorro | null>(null);
  const [montoAporte, setMontoAporte] = useState('');

  const crear = async () => {
    setGuardando(true);
    try {
      await ds.crearMeta({ nombre, objetivo: Number(objetivo), icono });
      setNombre('');
      setObjetivo('');
      setIcono('meta');
      setModalNueva(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const aportar = async () => {
    if (!aportando) return;
    await ds.aportarMeta(aportando.id, Number(montoAporte));
    setAportando(null);
    setMontoAporte('');
    recargar();
  };

  const eliminar = async (id: string) => {
    await ds.eliminarMeta(id);
    recargar();
  };

  const totalObjetivo = datos?.reduce((s, m) => s + m.objetivo, 0) ?? 0;
  const totalAhorrado = datos?.reduce((s, m) => s + m.ahorrado, 0) ?? 0;
  const moneda = datos?.[0]?.moneda ?? 'USD';

  return (
    <View style={{ flex: 1 }}>
      <Hero paddingTop={insets.top + 14}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.titulo}>{t('metas.titulo')}</Text>
          <Boton texto={t('metas.nueva')} variante="claro" onPress={() => setModalNueva(true)} />
        </View>
        {datos && datos.length > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
            <View>
              <Text style={s.heroEtiqueta}>{t('metas.ahorrado').toUpperCase()}</Text>
              <Text style={s.heroCifra}>{formatearMoneda(totalAhorrado, moneda, idioma)}</Text>
              <Text style={s.heroSub}>{t('metas.objetivoCorto')}: {formatearMoneda(totalObjetivo, moneda, idioma)}</Text>
            </View>
            <Text style={s.heroPct}>{totalObjetivo > 0 ? Math.round((totalAhorrado / totalObjetivo) * 100) : 0}%</Text>
          </View>
        ) : null}
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m, paddingBottom: 40 }}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos && datos.length === 0 ? (
            <Text style={s.vacio}>{t('metas.vacio')}</Text>
          ) : (
            [...(datos ?? [])]
              .sort((a, b) => progresoMeta(b) - progresoMeta(a))
              .map((meta) => (
                <TarjetaMeta
                  key={meta.id}
                  meta={meta}
                  onAportar={() => { setAportando(meta); setMontoAporte(''); }}
                  onEliminar={() => void eliminar(meta.id)}
                />
              ))
          )}
        </EstadoCarga>
      </ScrollView>

      {/* Modal nueva meta */}
      <Modal visible={modalNueva} animationType="slide" transparent>
        <View style={s.fondoModal}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>{t('metas.nueva')}</Text>
            <Campo etiqueta={t('metas.nombre')} value={nombre} onChangeText={setNombre} autoFocus />
            <Campo etiqueta={t('metas.objetivo')} value={objetivo} onChangeText={setObjetivo} keyboardType="numeric" />
            <Text style={s.etiquetaEmoji}>{t('metas.iconoAyuda')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ICONOS_META.map((clave) => {
                const activo = icono === clave;
                return (
                  <Pressable
                    key={clave}
                    onPress={() => setIcono(clave)}
                    style={[s.emoji, activo && { backgroundColor: Colores.acento, borderColor: Colores.acento }]}
                  >
                    <Ionicons name={iconoMeta(clave)} size={20} color={activo ? Colores.blanco : Colores.tintaSuave} />
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setModalNueva(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  texto={guardando ? t('comun.guardando') : t('metas.crear')}
                  onPress={() => void crear()}
                  cargando={guardando}
                  deshabilitado={!nombre.trim() || !(Number(objetivo) > 0)}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal aportar */}
      <Modal visible={aportando !== null} animationType="slide" transparent>
        <View style={s.fondoModal}>
          <View style={s.modal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {aportando ? (
                <Ionicons name={iconoMeta(aportando.icono)} size={22} color={aportando.color} />
              ) : null}
              <Text style={s.modalTitulo}>{aportando?.nombre}</Text>
            </View>
            <Campo etiqueta={t('metas.montoAporte')} value={montoAporte} onChangeText={setMontoAporte} keyboardType="numeric" autoFocus />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setAportando(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton texto={t('metas.aportar')} onPress={() => void aportar()} deshabilitado={!(Number(montoAporte) > 0)} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  titulo: { fontFamily: Fuentes.titulo, fontSize: 25, color: Colores.blanco, letterSpacing: -0.4 },
  heroEtiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.55)' },
  heroCifra: { fontFamily: Fuentes.titulo, fontSize: 24, color: Colores.blanco, marginTop: 3 },
  heroSub: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroPct: { fontFamily: Fuentes.titulo, fontSize: 34, color: Colores.menta },
  vacio: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, textAlign: 'center', paddingVertical: 40, paddingHorizontal: 24 },
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
  etiquetaEmoji: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tintaSuave },
  emoji: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colores.linea,
    backgroundColor: Colores.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
