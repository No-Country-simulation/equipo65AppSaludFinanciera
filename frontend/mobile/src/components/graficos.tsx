/**
 * Graficos propios con react-native-svg (livianos, sin dependencias pesadas).
 * Siguen las specs de la skill dataviz: marcas finas, separadores de 2px,
 * una sola serie por eje, el color sigue a la entidad.
 */
import { Text as TextoNativo, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  Stop,
} from 'react-native-svg';
import type { CategoriaSlug, Idioma, Moneda, PuntoEvolucion } from '@/data';
import {
  Colores,
  COLOR_CATEGORIA,
  COLOR_GRUPO,
  COLOR_PERFIL,
  Fuentes,
  MIEMBROS_GRUPO,
} from '@/constants/tema';
import { formatearMes, formatearMoneda, formatearPct } from '@/lib/formato';

export interface Porcion {
  slug: CategoriaSlug | 'otras';
  etiqueta: string;
  monto: number;
  color: string;
}

/** Top 5 categorias con color propio + resto agregado en "Otras" (gris). */
export function porcionesGasto(
  resumen: Partial<Record<CategoriaSlug, number>>,
  etiquetas: Map<CategoriaSlug, string>,
  etiquetaOtras: string,
): Porcion[] {
  const ordenadas = (Object.entries(resumen) as [CategoriaSlug, number][])
    .filter(([slug, monto]) => monto > 0 && COLOR_CATEGORIA[slug])
    .sort((a, b) => b[1] - a[1]);
  const conSlot: Porcion[] = ordenadas.slice(0, 5).map(([slug, monto]) => ({
    slug,
    etiqueta: etiquetas.get(slug) ?? slug,
    monto,
    color: COLOR_CATEGORIA[slug],
  }));
  const resto =
    ordenadas.slice(5).reduce((suma, [, monto]) => suma + monto, 0) +
    (Object.entries(resumen) as [CategoriaSlug, number][])
      .filter(([slug, monto]) => monto > 0 && !COLOR_CATEGORIA[slug])
      .reduce((suma, [, monto]) => suma + monto, 0);
  if (resto > 0) {
    conSlot.push({ slug: 'otras', etiqueta: etiquetaOtras, monto: resto, color: Colores.serieResto });
  }
  return conSlot;
}

function coordenada(centro: number, radio: number, anguloGrados: number) {
  const radianes = ((anguloGrados - 90) * Math.PI) / 180;
  return { x: centro + radio * Math.cos(radianes), y: centro + radio * Math.sin(radianes) };
}

function arco(centro: number, radio: number, inicio: number, fin: number): string {
  const desde = coordenada(centro, radio, fin);
  const hasta = coordenada(centro, radio, inicio);
  const amplio = fin - inicio <= 180 ? '0' : '1';
  return `M ${desde.x} ${desde.y} A ${radio} ${radio} 0 ${amplio} 0 ${hasta.x} ${hasta.y}`;
}

/** Fuera del componente: la regla de inmutabilidad de render prohibe acumular ahi. */
function calcularArcos(
  porciones: Porcion[],
  total: number,
  separacion: number,
): (Porcion & { inicio: number; fin: number })[] {
  const arcos: (Porcion & { inicio: number; fin: number })[] = [];
  let anguloActual = 0;
  for (const porcion of porciones) {
    const barrido = total > 0 ? (porcion.monto / total) * 360 : 0;
    arcos.push({
      ...porcion,
      inicio: anguloActual + separacion / 2,
      fin: anguloActual + Math.max(barrido - separacion / 2, separacion / 2),
    });
    anguloActual += barrido;
  }
  return arcos;
}

/** Dona de composicion: anillo fino, hueco grande, cifra heroe al centro. */
export function DonaGastos({
  porciones,
  total,
  moneda,
  idioma,
  etiquetaTotal,
}: {
  porciones: Porcion[];
  total: number;
  moneda: Moneda;
  idioma: Idioma;
  etiquetaTotal: string;
}) {
  const tamano = 200;
  const centro = tamano / 2;
  const radio = 86;
  const grosor = 26;
  const separacion = 3; // grados ≈ hueco de 2px contra la superficie

  const arcos = calcularArcos(porciones, total, separacion);

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View style={{ width: tamano, height: tamano }}>
        <Svg width={tamano} height={tamano}>
          <G>
            {arcos.map((segmento) => (
              <Path
                key={segmento.slug}
                d={arco(centro, radio, segmento.inicio, segmento.fin)}
                stroke={segmento.color}
                strokeWidth={grosor}
                strokeLinecap="butt"
                fill="none"
              />
            ))}
          </G>
        </Svg>
        <View
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextoNativo
            style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 10, letterSpacing: 1.2, color: Colores.apagado }}
          >
            {etiquetaTotal.toUpperCase()}
          </TextoNativo>
          <TextoNativo style={{ fontFamily: Fuentes.titulo, fontSize: 22, color: Colores.tinta }}>
            {formatearMoneda(total, moneda, idioma)}
          </TextoNativo>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', gap: 8 }}>
        {porciones.map((porcion) => (
          <View key={porcion.slug} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: porcion.color }} />
            <TextoNativo
              numberOfLines={1}
              style={{ flex: 1, fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.tinta }}
            >
              {porcion.etiqueta}
            </TextoNativo>
            <TextoNativo style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: Colores.tinta }}>
              {formatearMoneda(porcion.monto, moneda, idioma)}
            </TextoNativo>
            <TextoNativo style={{ width: 38, textAlign: 'right', fontFamily: Fuentes.cuerpo, fontSize: 11, color: Colores.apagado }}>
              {total > 0 ? `${Math.round((porcion.monto / total) * 100)}%` : '-'}
            </TextoNativo>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Evolucion: una sola serie (tasa de ahorro); el perfil colorea el punto y
 *  la etiqueta del mes acompana SIEMPRE (nunca color solo). */
export function LineaEvolucion({
  puntos,
  idioma,
  ancho = 320,
}: {
  puntos: PuntoEvolucion[];
  idioma: Idioma;
  ancho?: number;
}) {
  const alto = 170;
  const margen = { arriba: 14, abajo: 26, izquierda: 42, derecha: 12 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;

  const valores = puntos.map((punto) => punto.tasa_ahorro);
  const minimo = Math.min(...valores, 0);
  const maximo = Math.max(...valores, 0.1);
  const rango = maximo - minimo || 1;

  const puntoX = (indice: number) =>
    margen.izquierda + (puntos.length > 1 ? (indice / (puntos.length - 1)) * anchoUtil : anchoUtil / 2);
  const puntoY = (valor: number) => margen.arriba + (1 - (valor - minimo) / rango) * altoUtil;

  const coords = puntos.map((punto, indice) => ({ x: puntoX(indice), y: puntoY(punto.tasa_ahorro) }));
  const lineaPuntos = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const baseY = puntoY(minimo);
  const areaPuntos = `${coords[0]?.x ?? 0},${baseY} ${lineaPuntos} ${coords[coords.length - 1]?.x ?? 0},${baseY}`;
  const guias = [minimo, minimo + rango / 2, maximo];

  return (
    <View style={{ gap: 4 }}>
      <Svg width={ancho} height={alto}>
        <Defs>
          <LinearGradient id="areaAhorro" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colores.acento} stopOpacity={0.26} />
            <Stop offset="1" stopColor={Colores.acento} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        {guias.map((guia) => (
          <Line
            key={guia}
            x1={margen.izquierda}
            x2={ancho - margen.derecha}
            y1={puntoY(guia)}
            y2={puntoY(guia)}
            stroke={Colores.linea}
            strokeWidth={1}
          />
        ))}
        {minimo < 0 ? (
          <Line
            x1={margen.izquierda}
            x2={ancho - margen.derecha}
            y1={puntoY(0)}
            y2={puntoY(0)}
            stroke={Colores.apagado}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ) : null}
        <Polygon points={areaPuntos} fill="url(#areaAhorro)" stroke="none" />
        <Polyline points={lineaPuntos} fill="none" stroke={Colores.acento} strokeWidth={2.5} />
        {puntos.map((punto, indice) => (
          <Circle
            key={punto.fecha}
            cx={puntoX(indice)}
            cy={puntoY(punto.tasa_ahorro)}
            r={5}
            fill={COLOR_PERFIL[punto.perfil_codigo]}
            stroke={Colores.tarjeta}
            strokeWidth={2}
          />
        ))}
      </Svg>
      {/* etiquetas de eje */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 26, justifyContent: 'space-between' }}>
        {[maximo, minimo + rango / 2, minimo].map((valor) => (
          <TextoNativo key={valor} style={{ fontFamily: Fuentes.cuerpo, fontSize: 10, color: Colores.apagado }}>
            {formatearPct(valor, idioma, 0)}
          </TextoNativo>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: margen.izquierda,
          paddingRight: margen.derecha,
        }}
      >
        {puntos.map((punto) => (
          <TextoNativo key={punto.fecha} style={{ fontFamily: Fuentes.cuerpo, fontSize: 10, color: Colores.apagado }}>
            {formatearMes(punto.fecha, idioma)}
          </TextoNativo>
        ))}
      </View>
    </View>
  );
}

export interface TramoEstructura {
  grupo: string;
  etiqueta: string;
  monto: number;
  fraccion: number;
  color: string;
}

/** Descompone el gasto por grupo como fracción del ingreso; el resto es ahorro. */
export function tramosEstructura(
  resumen: Partial<Record<CategoriaSlug, number>>,
  ingreso: number,
  etiquetaGrupo: (grupo: string) => string,
  etiquetaAhorro: string,
): TramoEstructura[] {
  const tramos: TramoEstructura[] = Object.keys(MIEMBROS_GRUPO)
    .map((grupo) => {
      const monto = MIEMBROS_GRUPO[grupo].reduce(
        (suma, slug) => suma + (resumen[slug as CategoriaSlug] ?? 0),
        0,
      );
      return {
        grupo,
        etiqueta: etiquetaGrupo(grupo),
        monto,
        fraccion: ingreso > 0 ? monto / ingreso : 0,
        color: COLOR_GRUPO[grupo],
      };
    })
    .filter((tramo) => tramo.monto > 0);
  const gastoFraccion = tramos.reduce((suma, tramo) => suma + tramo.fraccion, 0);
  const ahorro = Math.max(0, 1 - gastoFraccion);
  if (ahorro > 0.001) {
    tramos.push({
      grupo: 'ahorro',
      etiqueta: etiquetaAhorro,
      monto: ingreso * ahorro,
      fraccion: ahorro,
      color: COLOR_GRUPO.ahorro,
    });
  }
  return tramos;
}

/** Barra apilada de la estructura del gasto + leyenda. */
export function EstructuraGasto({
  tramos,
  moneda,
  idioma,
}: {
  tramos: TramoEstructura[];
  moneda: Moneda;
  idioma: Idioma;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          height: 34,
          borderRadius: 10,
          overflow: 'hidden',
          gap: 2,
        }}
      >
        {tramos.map((tramo) => (
          <View
            key={tramo.grupo}
            style={{ flex: Math.max(0.04, tramo.fraccion), backgroundColor: tramo.color }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tramos.map((tramo) => (
          <View
            key={tramo.grupo}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '44%' }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: tramo.color }} />
            <View style={{ flex: 1 }}>
              <TextoNativo style={{ fontFamily: Fuentes.cuerpoMedio, fontSize: 12.5, color: Colores.tinta }}>
                {tramo.etiqueta}
              </TextoNativo>
              <TextoNativo style={{ fontFamily: Fuentes.cuerpo, fontSize: 11, color: Colores.apagado }}>
                {formatearMoneda(tramo.monto, moneda, idioma)}
              </TextoNativo>
            </View>
            <TextoNativo style={{ fontFamily: Fuentes.cuerpoSemi, fontSize: 13, color: Colores.tinta }}>
              {Math.round(tramo.fraccion * 100)}%
            </TextoNativo>
          </View>
        ))}
      </View>
    </View>
  );
}
