import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Categoria, CategoriaSlug, Presupuesto } from '@/data';
import { Colores, Espacio, Fuentes } from '@/constants/tema';
import { useI18n } from '@/i18n';
import { formatearMoneda, formatearPct } from '@/lib/formato';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { BarraPresupuesto, estadoPresupuesto } from '@/components/presupuestos';
import { Boton, Campo, EstadoCarga, Hero, Tarjeta, TituloTarjeta } from '@/components/ui';

interface Datos {
  presupuestos: Presupuesto[];
  categorias: Categoria[];
}

export default function PantallaPresupuestos() {
  const { t, idioma } = useI18n();
  const ds = useDataSource();
  const insets = useSafeAreaInsets();

  const { datos, cargando, error, recargar } = useDatos<Datos>(async (f) => {
    const [presupuestos, categorias] = await Promise.all([f.presupuestos(), f.categorias()]);
    return { presupuestos, categorias };
  });

  const etiquetas = useMemo(
    () => new Map(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const [modal, setModal] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaSlug | ''>('');
  const [limite, setLimite] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!categoria) return;
    setGuardando(true);
    try {
      await ds.guardarPresupuesto(categoria, Number(limite));
      setCategoria('');
      setLimite('');
      setModal(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (cat: CategoriaSlug) => {
    await ds.eliminarPresupuesto(cat);
    recargar();
  };

  const editar = (p: Presupuesto) => {
    setCategoria(p.categoria);
    setLimite(String(p.limite));
    setModal(true);
  };

  const totalLimite = datos?.presupuestos.reduce((s, p) => s + p.limite, 0) ?? 0;
  const totalGastado = datos?.presupuestos.reduce((s, p) => s + p.gastado, 0) ?? 0;
  const moneda = datos?.presupuestos[0]?.moneda ?? 'USD';
  const fraccionTotal = totalLimite > 0 ? totalGastado / totalLimite : 0;
  const disponibles = (datos?.categorias ?? []).filter(
    (c) => c.tipo === 'gasto' && (c.slug === categoria || !datos?.presupuestos.some((p) => p.categoria === c.slug)),
  );

  return (
    <View style={{ flex: 1 }}>
      <Hero paddingTop={insets.top + 14}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.titulo}>{t('presupuestos.titulo')}</Text>
          <Boton texto={t('presupuestos.nuevo')} variante="claro" onPress={() => { setCategoria(''); setLimite(''); setModal(true); }} />
        </View>
        <Text style={s.subtitulo}>{t('presupuestos.subtitulo')}</Text>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m, paddingBottom: 40 }}>
        <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
          {datos && datos.presupuestos.length > 0 ? (
            <Tarjeta>
              <TituloTarjeta>{t('presupuestos.totalTitulo')}</TituloTarjeta>
              <Text style={s.totalCifra}>
                {formatearMoneda(totalGastado, moneda, idioma)}
                <Text style={{ fontFamily: Fuentes.cuerpo, fontSize: 15, color: Colores.apagado }}>
                  {'  '}{t('presupuestos.de')} {formatearMoneda(totalLimite, moneda, idioma)}
                </Text>
              </Text>
              <View style={s.pistaTotal}>
                <View
                  style={{
                    width: `${Math.min(100, fraccionTotal * 100)}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: fraccionTotal >= 1 ? Colores.riesgo : fraccionTotal >= 0.8 ? Colores.alertaFondo : Colores.menta,
                  }}
                />
              </View>
              <Text style={{ fontFamily: Fuentes.cuerpo, fontSize: 11, color: Colores.apagado, textAlign: 'right', marginTop: 4 }}>
                {formatearPct(fraccionTotal, idioma, 0)}
              </Text>
            </Tarjeta>
          ) : null}

          {datos && datos.presupuestos.length === 0 ? (
            <Text style={s.vacio}>{t('presupuestos.vacio')}</Text>
          ) : (
            [...(datos?.presupuestos ?? [])]
              .sort((a, b) => estadoPresupuesto(b).fraccion - estadoPresupuesto(a).fraccion)
              .map((p) => (
                <BarraPresupuesto
                  key={p.categoria}
                  presupuesto={p}
                  etiqueta={etiquetas.get(p.categoria) ?? p.categoria}
                  onEditar={() => editar(p)}
                  onEliminar={() => void eliminar(p.categoria)}
                />
              ))
          )}
        </EstadoCarga>
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.fondoModal}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>{t('presupuestos.nuevo')}</Text>
            <Text style={s.etiqueta}>{t('presupuestos.categoria')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {disponibles.map((c) => (
                <Pressable
                  key={c.slug}
                  onPress={() => setCategoria(c.slug)}
                  style={[s.chipCat, categoria === c.slug && { backgroundColor: Colores.acento, borderColor: 'transparent' }]}
                >
                  <Text style={{ fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: categoria === c.slug ? Colores.blanco : Colores.tintaSuave }}>
                    {c.etiqueta}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Campo etiqueta={t('presupuestos.limite')} value={limite} onChangeText={setLimite} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Boton texto={t('comun.cancelar')} variante="fantasma" onPress={() => setModal(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  texto={guardando ? t('comun.guardando') : t('presupuestos.guardar')}
                  onPress={() => void guardar()}
                  cargando={guardando}
                  deshabilitado={!categoria || !(Number(limite) > 0)}
                />
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
  subtitulo: { fontFamily: Fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  totalCifra: { fontFamily: Fuentes.titulo, fontSize: 22, color: Colores.tinta },
  pistaTotal: { height: 12, borderRadius: 999, backgroundColor: 'rgba(25,21,9,0.06)', overflow: 'hidden', marginTop: 10 },
  vacio: { fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.apagado, textAlign: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(9,26,22,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colores.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Espacio.l, gap: Espacio.m, paddingBottom: 36 },
  modalTitulo: { fontFamily: Fuentes.titulo, fontSize: 20, color: Colores.tinta },
  etiqueta: { fontFamily: Fuentes.cuerpoMedio, fontSize: 13, color: Colores.tintaSuave },
  chipCat: { borderRadius: 999, borderWidth: 1, borderColor: Colores.linea, backgroundColor: Colores.blanco, paddingHorizontal: 13, paddingVertical: 8 },
});
