import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Imagen de contenedor minima (ops/compose.yml): copia .next/standalone
  output: 'standalone',
};

export default withNextIntl(nextConfig);
