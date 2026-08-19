'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  ComparacionMensual,
  Evolucion,
  MetaAhorro,
  Presupuesto,
} from '@/data';
import { Link } from '@/i18n/navigation';
import { formatearFecha, formatearMoneda, formatearPct } from '@/lib/formato';
import { porcionesGasto, totalGastos } from '@/lib/series';
import { useSesion } from '@/lib/sesion';
import { useDataSource, useDatos } from '@/lib/useDatos';
import { GastosCategoria } from '@/components/graficos/GastosCategoria';
import { EstructuraGasto } from '@/components/graficos/EstructuraGasto';
import { GraficoEvolucion } from '@/components/graficos/Evolucion';
import { FichasIndicadores } from '@/components/graficos/Indicadores';
import { ListaRecomendaciones } from '@/components/Recomendaciones';
import { TarjetaComparacion } from '@/components/ComparacionMensual';
import { progresoMeta, TarjetaMeta } from '@/components/Metas';
import { BarraPresupuesto, estadoPresupuesto } from '@/components/Presupuestos';
import { Boton, ChipPerfil, CifraAnimada, EstadoCarga, Tarjeta, TituloTarjeta } from '@/components/ui';

interface DatosPanel {
  analisis: Analisis | null;
  evolucion: Evolucion;
  categorias: Categoria[];
  comparacion: ComparacionMensual;
  metas: MetaAhorro[];
  presupuestos: Presupuesto[];
}

export default function PaginaPanel() {
  const t = useTranslations('panel');
  const locale = useLocale();
  const { usuario, actualizarUsuario } = useSesion();
  const ds = useDataSource();
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);
  const [datosDemoActivos, setDatosDemoActivos] = useState(() => {
  return typeof window !== 'undefined' && localStorage.getItem('demo_saldo') !== null;
});
  
  const [valoresDemo, setValoresDemo] = useState<{
    saldo: number | null;
    metaNombre: string | null;
    metaMonto: number | null;
  }>({
    saldo: null,
    metaNombre: null,
    metaMonto: null
  });

useEffect(() => {
  if (typeof window !== 'undefined') {
    const guardadoSaldo = localStorage.getItem('demo_saldo');
    const guardadoMeta = localStorage.getItem('demo_meta_nombre');
    const guardadoMonto = localStorage.getItem('demo_meta_monto');

    if (guardadoSaldo) {
      setValoresDemo({
        saldo: parseFloat(guardadoSaldo),
        metaNombre: guardadoMeta || 'Mi Meta',
        metaMonto: guardadoMonto ? parseFloat(guardadoMonto) : 0
      });
      // 🔥 ACTIVAMOS LA DEMO AUTOMÁTICAMENTE
      setDatosDemoActivos(true);
    }
  }
}, []);
  
  const { datos: datosBackend, cargando, error, recargar } = useDatos<DatosPanel>(async (fuente) => {
    const [analisis, evolucion, categorias, comparacion, metas, presupuestos] = await Promise.all([
      fuente.ultimoAnalisis(),
      fuente.evolucion(),
      fuente.categorias(),
      fuente.comparacionMensual(),
      fuente.metas(),
      fuente.presupuestos(),
    ]);
    return { analisis, evolucion, categorias, comparacion, metas, presupuestos };
  });

  const datosMock: DatosPanel = useMemo(() => {
    const ingresoDemo = valoresDemo.saldo !== null ? valoresDemo.saldo : 45000;
    const metaNombre = valoresDemo.metaNombre !== null ? valoresDemo.metaNombre : 'Meta Financiera';
    const metaMonto = valoresDemo.metaMonto !== null ? valoresDemo.metaMonto : 50000;

    // Calculamos gastos como porcentajes del ingreso para que sea proporcional
    const gastoVivienda = ingresoDemo * 0.25;
    const gastoAlimentacion = ingresoDemo * 0.15;
    const gastoCompras = ingresoDemo * 0.05;
    const gastoTransporte = ingresoDemo * 0.08;
    const gastoServicios = ingresoDemo * 0.05;
    const gastoTotalCalculado = gastoVivienda + gastoAlimentacion + gastoCompras + gastoTransporte + gastoServicios;

    return {
     analisis: {
        id: 'demo-analisis-id',
        usuario_id: usuario?.id ?? 'demo-user',
        perfil_codigo: 'saludable',
        perfil_financiero: 'Saludable',
        probabilidad: 0.76,
        analizado_en: new Date().toISOString(),
        moneda: 'MXN',
        indicadores: {
          tasa_ahorro: 0.528,
          cobertura_emergencia_meses: 6.5,
          ratio_endeudamiento: 0.12,
          gastos_fijos_pct: 0.35,
          gastos_discrecionales_pct: 0.12,
          frecuencia_ahorro_num: 1, // <--- Esto soluciona el primer error
          ratio_recurrente: 0.85    // <--- Esto soluciona el segundo error
        },
        resumen_gastos: {
          vivienda: gastoVivienda,
          alimentacion: gastoAlimentacion,
          compras: gastoCompras,
          transporte: gastoTransporte,
          servicios: gastoServicios,
        },
        recomendaciones_detalle: [
          {
            id: 'rec-1',
            categoria: 'ahorro',
            prioridad: 'alta', // <--- Esto soluciona el error de "undefined" en Recomendaciones.tsx
            titulo: 'Mantén tu fondo de emergencia activo',
            mensaje: 'Tu ratio de ahorro te permite cubrir meses ante contingencias.',
            impacto: 'alto',
            texto: 'Mantén el buen ritmo de ahorro.' // Asegúrate de que exista esta propiedad
          },
        ],
      },
      evolucion: {
        puntos: [
          { fecha: '2026-03-01', score: 680, probabilidad: 0.65, perfil: 'estable' },
          { fecha: '2026-04-01', score: 695, probabilidad: 0.68, perfil: 'estable' },
          { fecha: '2026-05-01', score: 710, probabilidad: 0.71, perfil: 'saludable' },
          { fecha: '2026-06-01', score: 720, probabilidad: 0.73, perfil: 'saludable' },
          { fecha: '2026-07-01', score: 735, probabilidad: 0.74, perfil: 'saludable' },
          { fecha: '2026-08-01', score: 750, probabilidad: 0.76, perfil: 'saludable' },
        ],
      },
      categorias: [
        { id: 'cat-1', slug: 'vivienda', etiqueta: 'Vivienda', icono: 'hogar', color: '#ec4899' },
        { id: 'cat-2', slug: 'alimentacion', etiqueta: 'Alimentación', icono: 'comida', color: '#3b82f6' },
        { id: 'cat-3', slug: 'compras', etiqueta: 'Compras', icono: 'bolsa', color: '#f97316' },
        { id: 'cat-4', slug: 'transporte', etiqueta: 'Transporte', icono: 'auto', color: '#8b5cf6' },
        { id: 'cat-5', slug: 'servicios', etiqueta: 'Servicios', icono: 'rayo', color: '#10b981' },
      ],
      comparacion: {
        actual: {
          ingreso_total: ingresoDemo, 
          gasto_total: gastoTotalCalculado,
          balance: ingresoDemo - gastoTotalCalculado 
        },
        anterior: {
          ingreso_total: ingresoDemo * 0.9,
          gasto_total: gastoTotalCalculado * 0.95,
          balance: (ingresoDemo * 0.9) - (gastoTotalCalculado * 0.95)
        }
      },
      metas: [
        {
          id: 'meta-demo-1',
          usuario_id: usuario?.id ?? 'demo-user',
          nombre: metaNombre, 
          monto_objetivo: metaMonto, 
          monto_actual: ingresoDemo * 0.15, 
          moneda: 'MXN',
          creado_en: '2026-01-01',
        }
      ],
      presupuestos: [
        {
          categoria: 'alimentacion',
          monto_limite: gastoAlimentacion * 1.2, // El límite es un poco más del gasto real
          monto_gastado: gastoAlimentacion,
          moneda: 'MXN',
        },
        {
          categoria: 'vivienda',
          monto_limite: gastoVivienda * 1.1,
          monto_gastado: gastoVivienda,
          moneda: 'MXN',
        },
      ],
    } as unknown as DatosPanel;
  }, [usuario, valoresDemo]); 

  const datos = datosDemoActivos || (!datosBackend?.analisis && datosDemoActivos) ? datosMock : datosBackend;

  const etiquetas = useMemo(
    () => new Map<CategoriaSlug, string>(datos?.categorias.map((c) => [c.slug, c.etiqueta]) ?? []),
    [datos?.categorias],
  );

  const analizar = async () => {
    setAnalizando(true);
    setErrorAnalisis(null);
    try {
      await ds.ejecutarAnalisis();
      recargar();
    } catch (causa) {
      setErrorAnalisis(causa instanceof Error ? causa.message : String(causa));
    } finally {
      setAnalizando(false);
    }
  };

  const cargarDatosDemostracion = () => {
    if (usuario) {
      const ingresoFinal = valoresDemo.saldo !== null ? valoresDemo.saldo : 45000;
      actualizarUsuario({ ...usuario, ingreso_mensual: ingresoFinal });
    }
    setDatosDemoActivos(true);
  };

  return (
    <EstadoCarga cargando={cargando} error={error} recargar={recargar}>
      {datos ? (
        <div className="space-y-5">
          <header className="aparece flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="cifra text-3xl font-semibold text-ink">
                {t('saludo', { nombre: usuario?.nombre.split(' ')[0] || 'juanito' })}
              </h1>
              <p className="mt-1 text-sm text-muted">{t('resumenMes')}</p>
            </div>
            <div className="flex gap-2">
              {!datos.analisis && (
                <Boton onClick={cargarDatosDemostracion} className="bg-emerald-600 hover:bg-emerald-700">
                  ✨ Inyectar Datos Demo
                </Boton>
              )}
              <Boton onClick={analizar} disabled={analizando}>
                {analizando ? t('analizando') : t('analizar')}
              </Boton>
            </div>
          </header>

          {errorAnalisis ? (
            <p className="aparece rounded-xl bg-risk/10 px-4 py-2.5 text-sm font-medium text-risk">
              {errorAnalisis}
            </p>
          ) : null}

          {datos.analisis ? (
            <>
              {/* ── Tarjeta heroe: perfil financiero ─────────────────── */}
              <section
                className="aparece aparece-2 relative overflow-hidden rounded-[var(--radio)] p-6 text-white shadow-[var(--sombra-lg)] sm:p-7"
                style={{
                  background:
                    'linear-gradient(140deg, var(--hero-b) 0%, var(--hero-a) 58%, #0a1219 100%)',
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(60% 80% at 92% 8%, rgba(136,189,36,0.24), transparent 60%), radial-gradient(50% 60% at 0% 100%, rgba(159,198,64,0.12), transparent 55%)',
                  }}
                />
                <div className="relative flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      {t('perfilTitulo')}
                    </p>
                    <div className="mt-2.5">
                      <ChipPerfil
                        perfil={datos.analisis.perfil_codigo}
                        etiqueta={datos.analisis.perfil_financiero}
                        grande
                      />
                    </div>
                    <p className="mt-3 text-sm text-white/65">
                      {t('confianza', { pct: Math.round(datos.analisis.probabilidad * 100) })}
                      {' · '}
                      {t('ultimoAnalisis', {
                        fecha: formatearFecha(datos.analisis.analizado_en, locale),
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-9 gap-y-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                        {t('ingresoMensual')}
                      </p>
                      <p className="cifra mt-1 text-[1.9rem] font-semibold leading-none">
                        <CifraAnimada
                          valor={usuario?.ingreso_mensual ?? (valoresDemo.saldo || 45000)}
                          formato={(n) => formatearMoneda(n, datos.analisis!.moneda, locale)}
                        />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                        {t('gastoTotal')}
                      </p>
                      <p className="cifra mt-1 text-[1.9rem] font-semibold leading-none text-warn-bg">
                        <CifraAnimada
                          valor={totalGastos(datos.analisis.resumen_gastos)}
                          formato={(n) => formatearMoneda(n, datos.analisis!.moneda, locale)}
                        />
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                        {t('evolucionEje')}
                      </p>
                      <p className="cifra mt-1 text-[1.9rem] font-semibold leading-none text-mint">
                        <CifraAnimada
                          valor={datos.analisis.indicadores.tasa_ahorro}
                          formato={(n) => formatearPct(n, locale)}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="aparece aparece-2">
                <TarjetaComparacion datos={datos.comparacion} moneda={datos.analisis.moneda} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Tarjeta className="aparece aparece-3">
                  <TituloTarjeta>{t('gastosTitulo')}</TituloTarjeta>
                  <GastosCategoria
                    porciones={porcionesGasto(
                      datos.analisis.resumen_gastos,
                      etiquetas,
                      t('otras'),
                    )}
                    total={totalGastos(datos.analisis.resumen_gastos)}
                    moneda={datos.analisis.moneda}
                    etiquetaTotal={t('gastoTotal')}
                  />
                </Tarjeta>

                <Tarjeta className="aparece aparece-3">
                  <TituloTarjeta>{t('evolucionTitulo')}</TituloTarjeta>
                  {datos.evolucion.puntos.length > 1 ? (
                    <GraficoEvolucion puntos={datos.evolucion.puntos} />
                  ) : (
                    <p className="py-10 text-center text-sm text-muted">-</p>
                  )}
                </Tarjeta>
              </div>

              <Tarjeta className="aparece aparece-4">
                <TituloTarjeta>{t('estructuraTitulo')}</TituloTarjeta>
                <EstructuraGasto
                  resumen={datos.analisis.resumen_gastos}
                  ingreso={usuario?.ingreso_mensual ?? (valoresDemo.saldo || 45000)}
                  moneda={datos.analisis.moneda}
                />
              </Tarjeta>

              {/* Widgets de metas y presupuestos */}
              <div className="grid gap-5 lg:grid-cols-2">
                <Tarjeta className="aparece aparece-4">
                  <div className="mb-4 flex items-center justify-between">
                    <TituloTarjeta>{t('metasTitulo')}</TituloTarjeta>
                    <Link href="/metas" className="text-xs font-semibold text-accent hover:underline">
                      {t('verTodo')} →
                    </Link>
                  </div>
                  {datos.metas.length > 0 ? (
                    <div className="space-y-3">
                      {[...datos.metas]
                        .sort((a, b) => progresoMeta(b) - progresoMeta(a))
                        .slice(0, 3)
                        .map((meta) => (
                          <TarjetaMeta key={meta.id} meta={meta} compacta />
                        ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted">{t('sinMetas')}</p>
                  )}
                </Tarjeta>

                <Tarjeta className="aparece aparece-4">
                  <div className="mb-4 flex items-center justify-between">
                    <TituloTarjeta>{t('presupuestosTitulo')}</TituloTarjeta>
                    <Link href="/presupuestos" className="text-xs font-semibold text-accent hover:underline">
                      {t('verTodo')} →
                    </Link>
                  </div>
                  {datos.presupuestos.length > 0 ? (
                    <div className="space-y-4">
                      {[...datos.presupuestos]
                        .sort((a, b) => estadoPresupuesto(b).fraccion - estadoPresupuesto(a).fraccion)
                        .slice(0, 4)
                        .map((presupuesto) => (
                          <BarraPresupuesto
                            key={presupuesto.categoria}
                            presupuesto={presupuesto}
                            etiqueta={etiquetas.get(presupuesto.categoria) ?? presupuesto.categoria}
                            compacta
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted">{t('sinPresupuestos')}</p>
                  )}
                </Tarjeta>
              </div>

              <Tarjeta className="aparece aparece-4">
                <TituloTarjeta>{t('indicadoresTitulo')}</TituloTarjeta>
                <FichasIndicadores indicadores={datos.analisis.indicadores} />
              </Tarjeta>

              <Tarjeta className="aparece aparece-5">
                <TituloTarjeta>{t('recsTitulo')}</TituloTarjeta>
                <ListaRecomendaciones
                  recomendaciones={datos.analisis.recomendaciones_detalle ?? []}
                />
              </Tarjeta>
            </>
          ) : (
            <Tarjeta className="aparece aparece-2 flex flex-col items-center gap-4 py-14 text-center">
              <p className="cifra text-xl font-semibold text-ink">{t('sinDatosTitulo')}</p>
              <p className="max-w-sm text-sm text-muted">{t('sinDatosTexto')}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Boton onClick={cargarDatosDemostracion} className="bg-emerald-600 hover:bg-emerald-700">
                  🚀 Inyectar Datos Demo
                </Boton>
                <Link href="/movimientos">
                  <Boton variante="fantasma">{t('irMovimientos')}</Boton>
                </Link>
              </div>
            </Tarjeta>
          )}
        </div>
      ) : null}
    </EstadoCarga>
  );
}