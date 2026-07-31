import { Image } from 'react-native';

/**
 * Marca Fintech Vital (movil).
 *
 * Va en PNG y no en SVG a proposito: `react-native-svg` esta instalado pero
 * `react-native-svg-transformer` no, asi que Metro no sabe importar un .svg
 * como componente. Los PNG salen de `scripts/marca/generar-assets.mjs` en
 * 1x/2x/3x y Metro elige la densidad de la pantalla.
 *
 * Sobre fondo oscuro la parte pizarra del imagotipo se pierde contra el fondo,
 * de ahi la variante en negativo.
 */

/** Proporciones reales del arte (viewBox de los SVG), para derivar el ancho. */
const RATIO_LOGO = 2867.71 / 1692.11;
const RATIO_ISOTIPO = 1548.58 / 1492.42;

const FUENTES = {
  claro: require('../../assets/marca/logo.png'),
  oscuro: require('../../assets/marca/logo-negativo.png'),
  isotipo: require('../../assets/marca/isotipo.png'),
};

interface Props {
  /** `completo` = imagotipo con letras · `isotipo` = solo la V. */
  variante?: 'completo' | 'isotipo';
  /** Claridad del FONDO sobre el que se apoya (no del logo). */
  fondo?: 'claro' | 'oscuro';
  /** Alto en px; el ancho sale de la proporcion. */
  alto?: number;
}

export function Logo({ variante = 'completo', fondo = 'oscuro', alto = 32 }: Props) {
  const esIso = variante === 'isotipo';
  const fuente = esIso ? FUENTES.isotipo : FUENTES[fondo];
  const ancho = alto * (esIso ? RATIO_ISOTIPO : RATIO_LOGO);
  return (
    <Image
      source={fuente}
      style={{ width: ancho, height: alto }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Fintech Vital"
    />
  );
}
