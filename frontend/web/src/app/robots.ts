import type { MetadataRoute } from 'next';

/**
 * robots.txt generado por entorno.
 *
 * El problema que resuelve: staging es publico y rastreable. En cuanto
 * fintechvital.com este arriba, los dos sirven el mismo contenido y compiten
 * entre si en el buscador -- y ademas queda indexado un entorno de pruebas con
 * datos de demostracion.
 *
 * `FV_NOINDEX` NO es una NEXT_PUBLIC_*: esto corre en el servidor, asi que se
 * lee en tiempo de ejecucion y basta con reiniciar el contenedor. No hace falta
 * reconstruir la imagen, al reves que NEXT_PUBLIC_API_URL.
 *
 *   ops/.env.staging  ->  FV_NOINDEX=si   (fuera del buscador)
 *   ops/.env.prod     ->  FV_NOINDEX=no   (indexable)
 */

/**
 * ⚠️ Sin esto, Next PRERENDERIZA esta ruta en el build y hornea el resultado en
 * la imagen: leeria FV_NOINDEX en `next build`, donde no esta definida, y
 * serviria "Allow: /" en staging para siempre. Paso de verdad (2026-08-19).
 * `force-dynamic` la evalua en cada peticion, que es lo que hace que la
 * variable de entorno sirva de algo.
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const fuera = process.env.FV_NOINDEX === 'si';

  if (fuera) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El panel vive detras del login y no aporta nada al buscador; que no
      // gaste presupuesto de rastreo en rutas que van a devolver un redirect.
      disallow: ['/api/', '/es/panel', '/pt/panel', '/en/panel'],
    },
  };
}
