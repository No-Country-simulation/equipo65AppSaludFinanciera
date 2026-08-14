import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de navegador de la web. Da por hecho que el stack ya esta arriba
 * (`.\ops\stack.ps1 arriba`): no levanta nada por su cuenta a proposito, para
 * que lo que se prueba sea la imagen de contenedor real y no un `next dev`
 * distinto al que corre de verdad.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  // Sin reintentos: un test que pasa "a la segunda" esconde justo lo que
  // buscamos, que es una pantalla que a veces no carga.
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'informe', open: 'never' }]],
  use: {
    baseURL: process.env.FV_WEB_URL ?? 'http://localhost:3000',
    locale: 'es-MX',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // La web tiene que servir tambien en pantalla de telefono: es la misma
    // interfaz que ve quien abre el enlace desde el movil.
    { name: 'movil-web', use: { ...devices['Pixel 7'] } },
  ],
});
