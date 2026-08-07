/**
 * Marca Fintech Vital.
 *
 * El imagotipo es gris + lima (croma v2). Sobre fondo oscuro la parte gris se
 * pierde contra el fondo, asi que existe una variante en negativo
 * (`logo-negativo.svg`) con el gris invertido a claro. Este componente elige
 * cual mostrar.
 *
 * El cambio claro/oscuro se hace por CSS (`.solo-claro` / `.solo-oscuro` en
 * globals.css) y NO por estado de React: el tema se pinta en <html> antes de
 * la hidratacion, asi que resolverlo en JS provocaria un parpadeo.
 *
 * Se usa <img> y no next/image a proposito: el optimizador de Next no aporta
 * nada sobre un SVG (no lo re-escala ni lo recomprime) y usarlo obligaria a
 * activar `dangerouslyAllowSVG` en next.config.
 */

/**
 * Proporciones reales de los archivos, para reservar el hueco y que no salte el
 * layout. Salen del `viewBox` de cada SVG: si se regeneran con
 * `scripts/marca/derivar-variantes.mjs` sobre un arte distinto, actualizar.
 *
 * El negativo tiene su PROPIA proporcion porque ya no se deriva del positivo:
 * es arte aparte (blanco v1) y trae la sombra de la "V", que ensancha el dibujo
 * un 1,4%. Poco, pero es justo lo que se reserva antes de que cargue la imagen.
 */
const RATIO_LOGO = 2880.55 / 1702.12;
const RATIO_LOGO_NEGATIVO = 2913.46 / 1697.2;
const RATIO_ISOTIPO = 1560.04 / 1500.52;
const RATIO_CIRCULAR = 557.27 / 556.79;

interface Props {
  /**
   * - `completo`: imagotipo con letras.
   * - `isotipo`: solo la V lima, sin fondo (espacios chicos sobre fondo propio).
   * - `circular`: monograma FV dentro de un disco. Trae su propio fondo, asi
   *   que es el que sirve como avatar o icono suelto sobre cualquier color.
   */
  variante?: 'completo' | 'isotipo' | 'circular';
  /**
   * Claridad del FONDO sobre el que se apoya:
   * - `auto`: sigue el tema de la app (por defecto).
   * - `oscuro`: fuerza el negativo (hero, sidebar oscura: son oscuros siempre).
   * - `claro`: fuerza el positivo.
   */
  fondo?: 'auto' | 'claro' | 'oscuro';
  /** Alto en px. El ancho sale de la proporcion del archivo. */
  alto?: number;
  className?: string;
}

export function Logo({ variante = 'completo', fondo = 'auto', alto = 32, className = '' }: Props) {
  if (variante === 'isotipo' || variante === 'circular') {
    // Ninguna de las dos necesita negativo: el isotipo es integramente lima y
    // el circular trae su propio disco de fondo. Se leen igual sobre claro y
    // sobre oscuro.
    const circular = variante === 'circular';
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={circular ? '/marca/isotipo-circular.svg' : '/marca/isotipo.svg'}
        alt="Fintech Vital"
        width={Math.round(alto * (circular ? RATIO_CIRCULAR : RATIO_ISOTIPO))}
        height={alto}
        className={className}
        style={{ height: alto, width: 'auto' }}
      />
    );
  }

  const medidas = (ratio: number) => ({
    width: Math.round(alto * ratio),
    height: alto,
    style: { height: alto, width: 'auto' as const },
  });

  if (fondo !== 'auto') {
    const oscuro = fondo === 'oscuro';
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={oscuro ? '/marca/logo-negativo.svg' : '/marca/logo.svg'}
        alt="Fintech Vital"
        {...medidas(oscuro ? RATIO_LOGO_NEGATIVO : RATIO_LOGO)}
        className={className}
      />
    );
  }

  // Se pintan las dos variantes y CSS oculta la que no toca. Ambas llevan el
  // mismo alt: la oculta va con `display:none`, que la saca del arbol de
  // accesibilidad, asi que no se anuncia dos veces.
  //
  // OJO: `className` va en el ENVOLTORIO, no en cada <img>. La regla de tema
  // (`:root[data-theme='dark'] .solo-oscuro`) tiene especificidad 30 y le
  // ganaria a una utilidad como `lg:hidden` (10), con lo que el logo se
  // colaria en escritorio. Separandolos en dos elementos no compiten.
  return (
    <span className={`inline-flex ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/logo.svg"
        alt="Fintech Vital"
        {...medidas(RATIO_LOGO)}
        className="solo-claro"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/logo-negativo.svg"
        alt="Fintech Vital"
        {...medidas(RATIO_LOGO_NEGATIVO)}
        className="solo-oscuro"
      />
    </span>
  );
}
