/**
 * Marca Fintech Vital.
 *
 * El imagotipo es pizarra + lima. Sobre fondo oscuro la parte pizarra se
 * pierde contra el fondo, asi que existe una variante en negativo
 * (`logo-negativo.svg`) con la pizarra invertida a blanco. Este componente
 * elige cual mostrar.
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
 */
const RATIO_LOGO = 2867.71 / 1692.11;
const RATIO_ISOTIPO = 1548.58 / 1492.42;

interface Props {
  /** `completo` = imagotipo con letras · `isotipo` = solo la V (espacios chicos). */
  variante?: 'completo' | 'isotipo';
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
  if (variante === 'isotipo') {
    // El isotipo es integramente lima: se lee igual sobre claro y sobre oscuro.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/marca/isotipo.svg"
        alt="Fintech Vital"
        width={Math.round(alto * RATIO_ISOTIPO)}
        height={alto}
        className={className}
        style={{ height: alto, width: 'auto' }}
      />
    );
  }

  const ancho = Math.round(alto * RATIO_LOGO);
  const medidas = { width: ancho, height: alto, style: { height: alto, width: 'auto' as const } };

  if (fondo !== 'auto') {
    const src = fondo === 'oscuro' ? '/marca/logo-negativo.svg' : '/marca/logo.svg';
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Fintech Vital" {...medidas} className={className} />;
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
      <img src="/marca/logo.svg" alt="Fintech Vital" {...medidas} className="solo-claro" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/logo-negativo.svg"
        alt="Fintech Vital"
        {...medidas}
        className="solo-oscuro"
      />
    </span>
  );
}
