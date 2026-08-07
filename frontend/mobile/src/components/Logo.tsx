import { Image } from 'react-native';

/**
 * Marca Fintech Vital (movil).
 *
 * Va en PNG y no en SVG a proposito: `react-native-svg` esta instalado pero
 * `react-native-svg-transformer` no, asi que Metro no sabe importar un .svg
 * como componente. Los PNG salen de `scripts/marca/generar-assets.mjs` en
 * 1x/2x/3x y Metro elige la densidad de la pantalla.
 *
 * Sobre fondo oscuro la parte gris del imagotipo (croma v2) se pierde contra el
 * fondo, de ahi la variante en negativo.
 */

/**
 * Proporciones reales del arte (viewBox de los SVG), para derivar el ancho.
 *
 * El negativo tiene la suya porque ya no se deriva del positivo: es arte aparte
 * (blanco v1) y trae la sombra de la "V", que lo ensancha un 1,4%. Con
 * `resizeMode="contain"` una proporcion equivocada no deforma el logo, pero le
 * deja aire muerto a los lados.
 */
const RATIO_LOGO = 2880.55 / 1702.12;
const RATIO_LOGO_NEGATIVO = 2913.46 / 1697.2;
const RATIO_ISOTIPO = 1560.04 / 1500.52;
const RATIO_CIRCULAR = 557.27 / 556.79;

const FUENTES = {
  claro: require('../../assets/marca/logo.png'),
  oscuro: require('../../assets/marca/logo-negativo.png'),
  isotipo: require('../../assets/marca/isotipo.png'),
  circular: require('../../assets/marca/isotipo-circular.png'),
};

interface Props {
  /**
   * - `completo`: imagotipo con letras.
   * - `isotipo`: solo la V lima, sin fondo.
   * - `circular`: monograma FV dentro de un disco, con su propio fondo.
   */
  variante?: 'completo' | 'isotipo' | 'circular';
  /** Claridad del FONDO sobre el que se apoya (no del logo). */
  fondo?: 'claro' | 'oscuro';
  /** Alto en px; el ancho sale de la proporcion. */
  alto?: number;
}

export function Logo({ variante = 'completo', fondo = 'oscuro', alto = 32 }: Props) {
  // Las dos variantes de marca suelta se leen igual sobre claro y sobre oscuro,
  // asi que ignoran `fondo`; solo el imagotipo completo necesita el negativo.
  const fuente =
    variante === 'circular'
      ? FUENTES.circular
      : variante === 'isotipo'
        ? FUENTES.isotipo
        : FUENTES[fondo];
  const ratio =
    variante === 'circular'
      ? RATIO_CIRCULAR
      : variante === 'isotipo'
        ? RATIO_ISOTIPO
        : fondo === 'oscuro'
          ? RATIO_LOGO_NEGATIVO
          : RATIO_LOGO;
  const ancho = alto * ratio;
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
