/**
 * ⚠️ MOCK - SE BORRA AL INTEGRAR (ADR-0011).
 * Simula la API en memoria y respalda su estado en el almacenamiento del
 * cliente (localStorage/AsyncStorage) para sobrevivir a recargas y reaperturas.
 * Replica las FORMULAS DOCUMENTADAS (TAXONOMIA §3-§4) solo para que el demo
 * sea coherente; la logica real vive en Spring Boot.
 */
import type {
  AltaMeta,
  AltaTransaccion,
  FiltrosTransacciones,
  FinanceDataSource,
  PatchUsuario,
} from '../datasource';
import type {
  Analisis,
  Categoria,
  CategoriaSlug,
  ComparacionMensual,
  CuentaBancaria,
  DatosExportados,
  EventoCalendario,
  Evolucion,
  Idioma,
  Indicadores,
  MetaAhorro,
  Moneda,
  PaginaTransacciones,
  PerfilSlug,
  Presupuesto,
  PuntoEvolucion,
  RecomendacionDetalle,
  RegistroBuro,
  ResultadoImport,
  ResumenAnalisis,
  ResumenMensual,
  SaludCrediticia,
  Tarjeta,
  Transaccion,
  Usuario,
} from '../types';
import { CATEGORIAS, FinanceApiError, TERMINOS_VERSION } from '../types';
import { almacenLocal } from '../config';
import {
  BURO_DEMO,
  CLAVES_CATEGORIA,
  CUENTAS_DEMO,
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_PERFIL,
  EVENTOS_DEMO,
  EVOLUCION_DEMO,
  FRECUENCIA_NUM,
  METAS_DEMO,
  MONEDAS_DEMO,
  PRESUPUESTOS_DEMO,
  PRIORIDAD_RECOMENDACION,
  TARJETAS_DEMO,
  TEXTOS_RECOMENDACION,
  TIPO_CATEGORIA,
  TRANSACCIONES_DEMO,
  UMBRAL_CATEGORIA,
  USUARIO_DEMO,
} from './fixtures';

const MES_ANALISIS = '2026-07';
const LATENCIA_MS = 300;

interface EstadoMock {
  usuario: Usuario | null;
  transacciones: Transaccion[];
  evolucion: PuntoEvolucion[];
  analisisGuardados: Analisis[];
  metas: MetaAhorro[];
  presupuestos: Omit<Presupuesto, 'gastado'>[];
  cuentas: CuentaBancaria[];
  tarjetas: Tarjeta[];
  buro: RegistroBuro[];
  eventos: EventoCalendario[];
  siguienteId: number;
}

/** Estado compartido entre pantallas (unica "BD" del mock). */
const estado: EstadoMock = {
  usuario: null,
  transacciones: [],
  evolucion: [],
  analisisGuardados: [],
  metas: [],
  presupuestos: [],
  cuentas: [],
  tarjetas: [],
  buro: [],
  eventos: [],
  siguienteId: 500,
};

const MES_ANTERIOR = '2026-06';

/**
 * Persistencia del mock: la "BD" en memoria se respalda entera en el
 * almacenamiento del cliente, para que recargar la pagina (web) o reabrir la
 * app (movil) no borre lo que el usuario cargo. Clave versionada: si cambia la
 * forma de EstadoMock, subir a v2 y el estado viejo se descarta solo.
 */
// v3: EstadoMock gano cuentas/tarjetas/buro (v2) y eventos (v3). Subir la version
// descarta el respaldo viejo y re-siembra, en vez de dejar las pantallas vacias.
const CLAVE_ESTADO = 'fintechvital.mock.estado.v3';

/** Rehidratacion en curso; espera() la aguarda para no servir datos a medias. */
let hidratacion: Promise<void> = Promise.resolve();

function persistir(): void {
  void almacenLocal.guardar(CLAVE_ESTADO, JSON.stringify(estado)).catch(() => {});
}

/** Restaura el estado respaldado si pertenece a `email`. Devuelve si lo logro. */
async function restaurarEstado(email: string): Promise<boolean> {
  try {
    const crudo = await almacenLocal.obtener(CLAVE_ESTADO);
    if (!crudo) return false;
    const guardado = JSON.parse(crudo) as EstadoMock;
    if (guardado?.usuario?.email !== email) return false;
    Object.assign(estado, guardado);
    return true;
  } catch {
    return false; // respaldo corrupto/ilegible → se re-siembra
  }
}

const espera = async (ms = LATENCIA_MS) => {
  await hidratacion;
  await new Promise((listo) => setTimeout(listo, ms));
};

const error = (status: number, codigo: string, mensaje: string): FinanceApiError =>
  new FinanceApiError({ codigo, mensaje, detalles: [], traza_id: `mock-${Date.now()}` }, status);

const exigirSesion = (): Usuario => {
  if (!estado.usuario) throw error(401, 'NO_AUTENTICADO', 'Sesion expirada o inexistente');
  return estado.usuario;
};

const redondear = (n: number, decimales = 3) => {
  const factor = 10 ** decimales;
  return Math.round(n * factor) / factor;
};

/** 8 codigos de respaldo de un solo uso (formato XXXX-XXXX). En la BD van hasheados. */
function generarCodigosRespaldo(): string[] {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bloque = () =>
    Array.from({ length: 4 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('');
  return Array.from({ length: 8 }, () => `${bloque()}-${bloque()}`);
}

export function clasificarDescripcion(descripcion: string): { categoria: CategoriaSlug; confianza: number } {
  const texto = descripcion.toLowerCase();
  for (const [categoria, claves] of CLAVES_CATEGORIA) {
    if (claves.some((clave) => texto.includes(clave))) {
      return { categoria, confianza: redondear(0.82 + (texto.length % 13) * 0.01, 2) };
    }
  }
  return { categoria: 'otros', confianza: 0.35 }; // RN6: confianza < 0.40 → otros
}

const delMes = (transaccion: Transaccion) => transaccion.fecha.startsWith(MES_ANALISIS);

function resumenGastos(transacciones: Transaccion[]): Partial<Record<CategoriaSlug, number>> {
  const resumen: Partial<Record<CategoriaSlug, number>> = {};
  for (const transaccion of transacciones) {
    if (transaccion.valor >= 0) continue;
    if (TIPO_CATEGORIA[transaccion.categoria] !== 'gasto') continue;
    resumen[transaccion.categoria] =
      redondear((resumen[transaccion.categoria] ?? 0) + Math.abs(transaccion.valor), 2);
  }
  return resumen;
}

/** TAXONOMIA §3 - los 8 indicadores, con sus casos borde. */
function calcularIndicadores(usuario: Usuario, transacciones: Transaccion[]): Indicadores {
  const resumen = resumenGastos(transacciones);
  const ingreso = usuario.ingreso_mensual;
  const esencial = (['alimentacion', 'vivienda', 'servicios', 'salud', 'transporte'] as const)
    .reduce((suma, slug) => suma + (resumen[slug] ?? 0), 0);
  const discrecional = (resumen.entretenimiento ?? 0) + (resumen.compras ?? 0);
  const gastoTotal = Object.values(resumen).reduce((suma, monto) => suma + monto, 0);

  // Recurrente v1: misma descripcion normalizada ≥2 veces con montos ±10%
  const porDescripcion = new Map<string, number[]>();
  for (const transaccion of transacciones) {
    if (transaccion.valor >= 0 || TIPO_CATEGORIA[transaccion.categoria] !== 'gasto') continue;
    const clave = transaccion.descripcion.trim().toLowerCase();
    porDescripcion.set(clave, [...(porDescripcion.get(clave) ?? []), Math.abs(transaccion.valor)]);
  }
  let recurrente = 0;
  for (const montos of porDescripcion.values()) {
    if (montos.length < 2) continue;
    const promedio = montos.reduce((a, b) => a + b, 0) / montos.length;
    if (montos.every((monto) => Math.abs(monto - promedio) / promedio <= 0.1)) {
      recurrente += montos.reduce((a, b) => a + b, 0);
    }
  }

  const tasaAhorro = Math.max(-2, Math.min(1, (ingreso - gastoTotal) / ingreso));
  return {
    tasa_ahorro: redondear(tasaAhorro),
    ratio_endeudamiento: redondear(usuario.nivel_endeudamiento / 100),
    ratio_gasto_ingreso: redondear(gastoTotal / ingreso),
    ratio_gasto_esencial: redondear(esencial / ingreso),
    ratio_gasto_discrecional: redondear(discrecional / ingreso),
    concentracion_gasto: gastoTotal === 0 ? 0 : redondear(Math.max(...Object.values(resumen)) / gastoTotal),
    frecuencia_ahorro_num: FRECUENCIA_NUM[usuario.frecuencia_ahorro],
    ratio_recurrente: gastoTotal === 0 ? 0 : redondear(recurrente / gastoTotal),
  };
}

/** Heuristica de referencia de TAXONOMIA §2. */
function perfilHeuristico(ind: Indicadores): PerfilSlug {
  if (
    ind.tasa_ahorro < 0 ||
    ind.ratio_endeudamiento > 0.4 ||
    (ind.frecuencia_ahorro_num === 0 && ind.ratio_gasto_ingreso > 0.95)
  ) {
    return 'en_riesgo';
  }
  if (ind.tasa_ahorro >= 0.2 && ind.ratio_endeudamiento <= 0.2 && ind.frecuencia_ahorro_num >= 2) {
    return 'saludable';
  }
  return 'en_observacion';
}

function probabilidades(ind: Indicadores, perfil: PerfilSlug): Record<PerfilSlug, number> {
  const puntajes: Record<PerfilSlug, number> = {
    en_riesgo:
      0.15 + Math.max(0, ind.ratio_endeudamiento - 0.4) * 3 + Math.max(0, -ind.tasa_ahorro) * 4,
    saludable:
      0.15 + Math.max(0, ind.tasa_ahorro - 0.2) * 3 + Math.max(0, 0.2 - ind.ratio_endeudamiento) * 2,
    en_observacion: 0.5,
  };
  puntajes[perfil] += 0.9;
  const total = puntajes.saludable + puntajes.en_observacion + puntajes.en_riesgo;
  const probs: Record<PerfilSlug, number> = {
    saludable: redondear(puntajes.saludable / total, 2),
    en_observacion: redondear(puntajes.en_observacion / total, 2),
    en_riesgo: redondear(puntajes.en_riesgo / total, 2),
  };
  probs[perfil] = redondear(1 - (Object.entries(probs) as [PerfilSlug, number][])
    .filter(([slug]) => slug !== perfil)
    .reduce((suma, [, p]) => suma + p, 0), 2);
  return probs;
}

/** TAXONOMIA §4 - motor de reglas (max 5, alta → baja). */
function evaluarReglas(
  ind: Indicadores,
  resumen: Partial<Record<CategoriaSlug, number>>,
  ingreso: number,
  idioma: Idioma,
): RecomendacionDetalle[] {
  const disparadas: { codigo: string; parametros: Record<string, string | number>; indicador: string }[] = [];
  if (ind.ratio_gasto_ingreso < 0.3) {
    disparadas.push({
      codigo: 'REC_DATOS_PARCIALES',
      parametros: { pct: Math.round(ind.ratio_gasto_ingreso * 100) },
      indicador: 'ratio_gasto_ingreso',
    });
  }
  if (ind.tasa_ahorro < 0) disparadas.push({ codigo: 'REC_DEFICIT', parametros: {}, indicador: 'tasa_ahorro' });
  if (ind.ratio_endeudamiento > 0.4) disparadas.push({ codigo: 'REC_DEUDA_ALTA', parametros: {}, indicador: 'ratio_endeudamiento' });
  if (ind.tasa_ahorro >= 0 && ind.tasa_ahorro < 0.1) disparadas.push({ codigo: 'REC_AHORRO_BAJO', parametros: {}, indicador: 'tasa_ahorro' });
  if (ind.frecuencia_ahorro_num === 0) disparadas.push({ codigo: 'REC_SIN_AHORRO', parametros: {}, indicador: 'frecuencia_ahorro_num' });
  if (ind.ratio_gasto_esencial > 0.6) disparadas.push({ codigo: 'REC_ESENCIAL_ALTO', parametros: {}, indicador: 'ratio_gasto_esencial' });
  if (ind.ratio_gasto_discrecional > 0.3) disparadas.push({ codigo: 'REC_DISCRECIONAL_ALTO', parametros: {}, indicador: 'ratio_gasto_discrecional' });
  if (ind.concentracion_gasto > 0.5) {
    const [categoriaTop] = (Object.entries(resumen) as [CategoriaSlug, number][])
      .sort((a, b) => b[1] - a[1])[0] ?? ['otros', 0];
    disparadas.push({ codigo: 'REC_CONCENTRACION', parametros: { categoria: categoriaTop }, indicador: 'concentracion_gasto' });
  }
  if (ind.ratio_recurrente > 0.15) disparadas.push({ codigo: 'REC_RECURRENTE_ALTO', parametros: {}, indicador: 'ratio_recurrente' });
  const excesos = (Object.entries(resumen) as [CategoriaSlug, number][])
    .filter(([slug, monto]) => monto / ingreso > (UMBRAL_CATEGORIA[slug] ?? 1))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  for (const [slug] of excesos) {
    disparadas.push({ codigo: 'REC_CATEGORIA_EXCESO', parametros: { categoria: slug }, indicador: 'ratio_gasto_ingreso' });
  }
  if (ind.tasa_ahorro >= 0.2 && ind.ratio_endeudamiento <= 0.2) {
    disparadas.push({ codigo: 'REC_CONSOLIDA', parametros: {}, indicador: 'tasa_ahorro' });
  }

  const orden: Record<string, number> = { alta: 0, media: 1, baja: 2 };
  return disparadas
    .map((regla) => {
      let texto = TEXTOS_RECOMENDACION[regla.codigo][idioma];
      for (const [clave, valor] of Object.entries(regla.parametros)) {
        const legible =
          clave === 'categoria'
            ? ETIQUETAS_CATEGORIA[valor as CategoriaSlug][idioma]
            : String(valor);
        texto = texto.replaceAll(`{${clave}}`, legible);
      }
      return {
        codigo: regla.codigo,
        texto,
        parametros: regla.parametros,
        prioridad: PRIORIDAD_RECOMENDACION[regla.codigo],
        indicador: regla.indicador,
      } satisfies RecomendacionDetalle;
    })
    .sort((a, b) => orden[a.prioridad] - orden[b.prioridad])
    .slice(0, 5); // RN8
}

/**
 * Re-renderiza los textos de un analisis GUARDADO al idioma actual. El motor
 * persiste `codigo` + `parametros` (el texto es solo presentacion), asi que un
 * analisis creado en es se lee en pt/en sin volver a calcularlo. Ver ADR-0009.
 */
function traducirAnalisis(analisis: Analisis, idioma: Idioma): Analisis {
  if (analisis.idioma === idioma) return analisis;
  const detalle = analisis.recomendaciones_detalle.map((rec) => {
    let texto = TEXTOS_RECOMENDACION[rec.codigo]?.[idioma] ?? rec.texto;
    for (const [clave, valor] of Object.entries(rec.parametros)) {
      const legible =
        clave === 'categoria'
          ? (ETIQUETAS_CATEGORIA[valor as CategoriaSlug]?.[idioma] ?? String(valor))
          : String(valor);
      texto = texto.replaceAll(`{${clave}}`, legible);
    }
    return { ...rec, texto };
  });
  return {
    ...analisis,
    perfil_financiero: ETIQUETAS_PERFIL[analisis.perfil_codigo][idioma],
    recomendaciones: detalle.map((rec) => rec.texto),
    recomendaciones_detalle: detalle,
    idioma,
  };
}

function construirAnalisis(idioma: Idioma, id: string, fechaIso: string): Analisis {
  const usuario = exigirSesion();
  const transaccionesMes = estado.transacciones.filter(delMes);
  if (usuario.ingreso_mensual <= 0) {
    throw error(422, 'VALIDACION_ENTRADA', 'ingreso_mensual debe ser mayor que 0');
  }
  if (transaccionesMes.length < 3) {
    throw error(422, 'VALIDACION_ENTRADA', 'se requieren al menos 3 transacciones');
  }
  const resumen = resumenGastos(transaccionesMes);
  const indicadores = calcularIndicadores(usuario, transaccionesMes);
  const perfil = perfilHeuristico(indicadores);
  const detalle = evaluarReglas(indicadores, resumen, usuario.ingreso_mensual, idioma);
  return {
    id,
    perfil_financiero: ETIQUETAS_PERFIL[perfil][idioma],
    perfil_codigo: perfil,
    probabilidad: probabilidades(indicadores, perfil)[perfil],
    probabilidades: probabilidades(indicadores, perfil),
    resumen_gastos: resumen,
    indicadores,
    recomendaciones: detalle.map((rec) => rec.texto),
    recomendaciones_detalle: detalle,
    moneda: usuario.moneda_principal,
    idioma,
    modelo_version: '0.0.0-mock',
    analizado_en: fechaIso,
  };
}

/** Analisis sinteticos para el historial (meses pasados de EVOLUCION_DEMO). */
function analisisDesdePunto(punto: PuntoEvolucion, idioma: Idioma, indice: number): Analisis {
  const usuario = exigirSesion();
  const factor = 0.85 + indice * 0.04;
  const base = resumenGastos(estado.transacciones.filter(delMes));
  const resumen: Partial<Record<CategoriaSlug, number>> = {};
  for (const [slug, monto] of Object.entries(base) as [CategoriaSlug, number][]) {
    resumen[slug] = redondear(monto * factor, 2);
  }
  const gastoTotal = Object.values(resumen).reduce((suma, monto) => suma + monto, 0);
  const indicadores: Indicadores = {
    tasa_ahorro: punto.tasa_ahorro,
    ratio_endeudamiento: punto.ratio_endeudamiento,
    ratio_gasto_ingreso: redondear(gastoTotal / usuario.ingreso_mensual),
    ratio_gasto_esencial: redondear((gastoTotal * 0.58) / usuario.ingreso_mensual),
    ratio_gasto_discrecional: redondear((gastoTotal * 0.27) / usuario.ingreso_mensual),
    concentracion_gasto: 0.33,
    frecuencia_ahorro_num: FRECUENCIA_NUM[usuario.frecuencia_ahorro],
    ratio_recurrente: 0.12,
  };
  const detalle = evaluarReglas(indicadores, resumen, usuario.ingreso_mensual, idioma);
  return {
    id: `a-${punto.fecha}`,
    perfil_financiero: ETIQUETAS_PERFIL[punto.perfil_codigo][idioma],
    perfil_codigo: punto.perfil_codigo,
    probabilidad: punto.probabilidad,
    probabilidades: probabilidades(indicadores, punto.perfil_codigo),
    resumen_gastos: resumen,
    indicadores,
    recomendaciones: detalle.map((rec) => rec.texto),
    recomendaciones_detalle: detalle,
    moneda: usuario.moneda_principal,
    idioma,
    modelo_version: '0.0.0-mock',
    analizado_en: `${punto.fecha}T18:00:00Z`,
  };
}

function iniciarEstadoDemo(): void {
  estado.usuario = { ...USUARIO_DEMO };
  estado.transacciones = TRANSACCIONES_DEMO.map((transaccion) => ({ ...transaccion }));
  estado.evolucion = EVOLUCION_DEMO.map((punto) => ({ ...punto }));
  estado.analisisGuardados = [];
  estado.metas = METAS_DEMO.map((meta) => ({ ...meta }));
  estado.presupuestos = PRESUPUESTOS_DEMO.map((presupuesto) => ({ ...presupuesto }));
  estado.cuentas = CUENTAS_DEMO.map((cuenta) => ({ ...cuenta }));
  estado.tarjetas = TARJETAS_DEMO.map((tarjeta) => ({ ...tarjeta, credito: tarjeta.credito ? { ...tarjeta.credito } : undefined }));
  estado.buro = BURO_DEMO.map((registro) => ({ ...registro }));
  estado.eventos = EVENTOS_DEMO.map((evento) => ({ ...evento }));
}

function iniciarEstadoVacio(email: string, moneda: Moneda, terminosVersion?: string): void {
  estado.usuario = {
    id: `u-${Date.now()}`,
    email,
    nombre: email.split('@')[0],
    moneda_principal: moneda,
    idioma: 'es',
    ingreso_mensual: 0,
    nivel_endeudamiento: 0,
    frecuencia_ahorro: 'nula',
    totp_activo: false, // pendiente: el asistente de registro lo activa (2FA obligatorio)
    terminos_version: terminosVersion ?? TERMINOS_VERSION,
    terminos_aceptados_en: new Date().toISOString(),
  };
  estado.transacciones = [];
  estado.evolucion = [];
  estado.analisisGuardados = [];
  estado.metas = [];
  estado.presupuestos = [];
  estado.cuentas = [];
  estado.tarjetas = [];
  estado.buro = [];
  estado.eventos = [];
}

/** Gasto por categoría de un mes ('YYYY-MM'), solo gastos. */
function gastoPorCategoriaMes(mes: string): Partial<Record<CategoriaSlug, number>> {
  const resumen: Partial<Record<CategoriaSlug, number>> = {};
  for (const transaccion of estado.transacciones) {
    if (!transaccion.fecha.startsWith(mes)) continue;
    if (transaccion.valor >= 0 || TIPO_CATEGORIA[transaccion.categoria] !== 'gasto') continue;
    resumen[transaccion.categoria] = redondear(
      (resumen[transaccion.categoria] ?? 0) + Math.abs(transaccion.valor),
      2,
    );
  }
  return resumen;
}

function resumenMensual(mes: string): ResumenMensual {
  const porCategoria = gastoPorCategoriaMes(mes);
  const gastoTotal = Object.values(porCategoria).reduce((suma, monto) => suma + (monto ?? 0), 0);
  const ingresoTotal = estado.transacciones
    .filter((t) => t.fecha.startsWith(mes) && t.valor > 0)
    .reduce((suma, t) => suma + t.valor, 0);
  return {
    mes,
    gasto_total: redondear(gastoTotal, 2),
    ingreso_total: redondear(ingresoTotal, 2),
    balance: redondear(ingresoTotal - gastoTotal, 2),
    por_categoria: porCategoria,
  };
}

export function crearMockDataSource(idioma: Idioma): FinanceDataSource {
  return {
    async login(email, password, codigoTotp) {
      await espera();
      // ATAJO DE DESARROLLO (solo mock, se va junto con esta carpeta al integrar):
      // con el email EN BLANCO se entra directo como el usuario demo, sin
      // password ni 2FA. Evita teclear correo + 10 caracteres + 6 digitos en cada
      // recarga durante el desarrollo.
      // El flujo REAL queda intacto: si escribes un email, se sigue exigiendo
      // password de 10+ y codigo TOTP. Eso es lo que se le enseña al jurado
      // (2FA obligatorio, ADR-0013) y no se puede perder.
      const atajoDemo = email.trim() === '';
      const correo = atajoDemo ? USUARIO_DEMO.email : email;

      if (!atajoDemo && password.length < 10) {
        throw error(401, 'CREDENCIALES_INVALIDAS', 'Email o password incorrectos');
      }
      if (!estado.usuario || estado.usuario.email !== correo) {
        // Volver a entrar con el mismo email recupera los datos respaldados
        if (!(await restaurarEstado(correo))) {
          if (correo === USUARIO_DEMO.email) iniciarEstadoDemo();
          else iniciarEstadoVacio(correo, 'USD');
        }
      }
      const yaActivo =
        !atajoDemo && estado.usuario?.email === correo && estado.usuario.totp_activo;
      if (yaActivo && !codigoTotp) {
        return { access_token: '', refresh_token: '', expira_en: 0, requiere_2fa: true };
      }
      persistir();
      return {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expira_en: 900,
        requiere_2fa: false,
        usuario: estado.usuario ?? undefined,
      };
    },

    async registro(alta) {
      await espera();
      if (alta.password.length < 10) {
        throw error(422, 'VALIDACION_ENTRADA', 'La password debe tener al menos 10 caracteres');
      }
      if (alta.email === USUARIO_DEMO.email) {
        throw error(409, 'EMAIL_YA_REGISTRADO', 'Ese email ya esta registrado');
      }
      iniciarEstadoVacio(alta.email, alta.moneda_principal, alta.terminos_version);
      // Datos personales del alta (USUARIOS los exige/soporta)
      if (estado.usuario) {
        const nombre = alta.nombre.trim();
        estado.usuario = {
          ...estado.usuario,
          nombre: nombre || estado.usuario.nombre,
          apellido: alta.apellido.trim() || undefined,
          fecha_nacimiento: alta.fecha_nacimiento || undefined,
          genero: alta.genero,
          telefono: alta.telefono?.trim() || undefined,
          ciudad: alta.ciudad?.trim() || undefined,
        };
      }
      persistir();
      return exigirSesion();
    },

    async logout() {
      await espera(100);
      estado.usuario = null;
    },

    async me() {
      await espera(150);
      return exigirSesion();
    },

    async actualizarPerfil(patch: PatchUsuario) {
      await espera();
      const usuario = exigirSesion();
      estado.usuario = { ...usuario, ...patch };
      persistir();
      return estado.usuario;
    },

    async iniciar2fa() {
      await espera();
      exigirSesion();
      return {
        secreto: 'MOCKBASE32SECRETXYZ234',
        otpauth_uri:
          'otpauth://totp/FintechVital:demo?secret=MOCKBASE32SECRETXYZ234&issuer=FintechVital',
      };
    },

    async activar2fa(codigoTotp) {
      await espera();
      const usuario = exigirSesion();
      if (!/^\d{6}$/.test(codigoTotp)) {
        throw error(422, 'TOTP_INVALIDO', 'El codigo debe tener 6 digitos');
      }
      estado.usuario = { ...usuario, totp_activo: true };
      persistir();
      return { codigos_respaldo: generarCodigosRespaldo() };
    },

    async regenerarCodigos2fa() {
      await espera();
      exigirSesion();
      // 2FA obligatorio: no se desactiva; a lo sumo se regeneran los codigos de respaldo.
      return { codigos_respaldo: generarCodigosRespaldo() };
    },

    async desactivar2fa(password) {
      await espera();
      const usuario = exigirSesion();
      if (password.length < 10) throw error(401, 'CREDENCIALES_INVALIDAS', 'Password incorrecta');
      estado.usuario = { ...usuario, totp_activo: false };
      persistir();
    },

    hidratarSesion(usuario) {
      // Recarga (web) o reapertura (movil): el mock en memoria se reinicio pero
      // el cliente aun tiene la sesion. Restaura el estado respaldado; si no
      // hay respaldo (primera vez o corrupto) re-siembra. espera() aguarda esta
      // promesa, asi ninguna pantalla lee datos a medio hidratar.
      hidratacion = (async () => {
        if (!(await restaurarEstado(usuario.email))) {
          if (usuario.email === USUARIO_DEMO.email) iniciarEstadoDemo();
          else iniciarEstadoVacio(usuario.email, usuario.moneda_principal);
        }
        estado.usuario = { ...usuario }; // la copia de la sesion es la vigente (ingreso, 2FA, idioma)
        persistir();
      })();
    },

    async transacciones(filtros: FiltrosTransacciones = {}) {
      await espera();
      exigirSesion();
      const { desde, hasta, categoria, tarjeta, pagina = 1, tam = 50 } = filtros;
      const filtradas = estado.transacciones
        .filter((transaccion) => (desde ? transaccion.fecha >= desde : true))
        .filter((transaccion) => (hasta ? transaccion.fecha <= hasta : true))
        .filter((transaccion) => (categoria ? transaccion.categoria === categoria : true))
        .filter((transaccion) => (tarjeta ? transaccion.id_tarjeta === tarjeta : true))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      const inicio = (pagina - 1) * tam;
      return {
        items: filtradas.slice(inicio, inicio + tam),
        pagina,
        total: filtradas.length,
      } satisfies PaginaTransacciones;
    },

    async crearTransaccion(alta: AltaTransaccion) {
      await espera();
      const usuario = exigirSesion();
      if (!alta.descripcion.trim()) {
        throw error(422, 'VALIDACION_ENTRADA', 'descripcion no puede estar vacia');
      }
      const { categoria, confianza } = clasificarDescripcion(alta.descripcion);
      const nueva: Transaccion = {
        id: `t-${estado.siguienteId++}`,
        descripcion: alta.descripcion.trim(),
        valor: alta.valor,
        moneda: alta.moneda ?? usuario.moneda_principal,
        fecha: alta.fecha ?? new Date().toISOString().slice(0, 10),
        categoria: alta.valor > 0 ? 'ingresos' : categoria,
        confianza,
        categoria_origen: 'modelo',
      };
      estado.transacciones = [nueva, ...estado.transacciones];
      persistir();
      return nueva;
    },

    async corregirCategoria(id, categoria) {
      await espera();
      exigirSesion();
      const objetivo = estado.transacciones.find((transaccion) => transaccion.id === id);
      if (!objetivo) throw error(404, 'NO_ENCONTRADO', 'La transaccion no existe');
      objetivo.categoria = categoria;
      objetivo.categoria_origen = 'usuario'; // RN3
      objetivo.confianza = 1;
      persistir();
      return { ...objetivo };
    },

    async eliminarTransaccion(id) {
      await espera();
      exigirSesion();
      estado.transacciones = estado.transacciones.filter((transaccion) => transaccion.id !== id);
      persistir();
    },

    async importarCsv(archivo) {
      await espera(600);
      const usuario = exigirSesion();
      const texto = await archivo.text();
      const lineas = texto.split(/\r?\n/).filter((linea) => linea.trim().length > 0);
      const errores: { fila: number; error: string }[] = [];
      let importadas = 0;
      lineas.forEach((linea, indice) => {
        if (indice === 0) return; // cabecera fecha,descripcion,valor,moneda
        const [fecha, descripcion, valorCrudo, moneda] = linea.split(',');
        const valor = Number(valorCrudo);
        if (!fecha || !descripcion || Number.isNaN(valor)) {
          errores.push({ fila: indice + 1, error: 'valor no es un numero o faltan campos' });
          return;
        }
        const { categoria, confianza } = clasificarDescripcion(descripcion);
        estado.transacciones = [
          {
            id: `t-${estado.siguienteId++}`,
            descripcion: descripcion.trim(),
            valor,
            moneda: (moneda?.trim() as Moneda) || usuario.moneda_principal,
            fecha: fecha.trim(),
            categoria: valor > 0 ? 'ingresos' : categoria,
            confianza,
            categoria_origen: 'modelo',
          },
          ...estado.transacciones,
        ];
        importadas += 1;
      });
      persistir();
      return { importadas, rechazadas: errores.length, errores } satisfies ResultadoImport;
    },

    async ejecutarAnalisis() {
      await espera(900);
      const analisis = construirAnalisis(idioma, `a-${Date.now()}`, new Date().toISOString());
      estado.analisisGuardados = [analisis, ...estado.analisisGuardados];
      persistir();
      return analisis;
    },

    async historialAnalisis(pagina = 1, tam = 12) {
      await espera();
      exigirSesion();
      const pasados: ResumenAnalisis[] = [...estado.evolucion]
        .reverse()
        .map((punto) => ({
          id: `a-${punto.fecha}`,
          perfil_codigo: punto.perfil_codigo,
          probabilidad: punto.probabilidad,
          analizado_en: `${punto.fecha}T18:00:00Z`,
        }));
      const recientes: ResumenAnalisis[] = estado.analisisGuardados.map((analisis) => ({
        id: analisis.id,
        perfil_codigo: analisis.perfil_codigo,
        probabilidad: analisis.probabilidad,
        analizado_en: analisis.analizado_en,
      }));
      const inicio = (pagina - 1) * tam;
      return [...recientes, ...pasados].slice(inicio, inicio + tam);
    },

    async obtenerAnalisis(id) {
      await espera();
      const guardado = estado.analisisGuardados.find((analisis) => analisis.id === id);
      if (guardado) return traducirAnalisis(guardado, idioma);
      const indice = estado.evolucion.findIndex((punto) => `a-${punto.fecha}` === id);
      if (indice === -1) throw error(404, 'NO_ENCONTRADO', 'El analisis no existe');
      return analisisDesdePunto(estado.evolucion[indice], idioma, indice);
    },

    async ultimoAnalisis() {
      await espera();
      exigirSesion();
      if (estado.analisisGuardados.length > 0) {
        return traducirAnalisis(estado.analisisGuardados[0], idioma);
      }
      if (estado.transacciones.filter(delMes).length < 3) return null;
      const analisis = construirAnalisis(idioma, 'a-actual', `${MES_ANALISIS}-14T09:30:00Z`);
      estado.analisisGuardados = [analisis];
      persistir();
      return analisis;
    },

    async evolucion() {
      await espera();
      const usuario = exigirSesion();
      const actual = estado.analisisGuardados[0];
      const puntoActual: PuntoEvolucion[] = actual
        ? [{
            fecha: actual.analizado_en.slice(0, 10),
            perfil_codigo: actual.perfil_codigo,
            probabilidad: actual.probabilidad,
            tasa_ahorro: actual.indicadores.tasa_ahorro,
            ratio_endeudamiento: actual.indicadores.ratio_endeudamiento,
          }]
        : [];
      return {
        moneda: usuario.moneda_principal,
        puntos: [...estado.evolucion, ...puntoActual],
      } satisfies Evolucion;
    },

    async categorias() {
      await espera(150);
      return CATEGORIAS.map((slug) => ({
        slug,
        etiqueta: ETIQUETAS_CATEGORIA[slug][idioma],
        tipo: TIPO_CATEGORIA[slug],
      })) satisfies Categoria[];
    },

    async monedas() {
      await espera(100);
      return [...MONEDAS_DEMO];
    },

    async cuentas() {
      await espera(200);
      exigirSesion();
      return estado.cuentas.map((cuenta) => ({ ...cuenta }));
    },

    async tarjetas() {
      await espera(200);
      exigirSesion();
      return estado.tarjetas.map((tarjeta) => ({
        ...tarjeta,
        credito: tarjeta.credito ? { ...tarjeta.credito } : undefined,
      }));
    },

    async saludCrediticia() {
      await espera();
      const usuario = exigirSesion();
      const historial = [...estado.buro].sort((a, b) => a.fecha.localeCompare(b.fecha));
      const actual = historial[historial.length - 1] ?? {
        fecha: new Date().toISOString().slice(0, 10),
        score_crediticio: 0,
        dias_atraso: 0,
        monto_adeudado: 0,
      };
      return {
        moneda: usuario.moneda_principal,
        actual: { ...actual },
        historial: historial.map((registro) => ({ ...registro })),
      } satisfies SaludCrediticia;
    },

    async crearTarjeta(alta) {
      await espera();
      exigirSesion();
      if (!/^\d{4}$/.test(alta.ultimos4)) {
        throw error(422, 'VALIDACION_ENTRADA', 'Los ultimos 4 digitos son invalidos');
      }
      const nueva: Tarjeta = {
        id: `tar-${estado.siguienteId++}`,
        id_cuenta: alta.id_cuenta,
        ultimos4: alta.ultimos4,
        tipo: alta.tipo,
        red_pago: alta.red_pago,
        fecha_vencimiento: alta.fecha_vencimiento,
        estado: alta.estado ?? 'activa',
        etiqueta: alta.etiqueta?.trim() || undefined,
        credito:
          alta.tipo === 'credito' && alta.credito
            ? { ...alta.credito, saldo_utilizado: 0 }
            : undefined,
      };
      estado.tarjetas = [...estado.tarjetas, nueva];
      persistir();
      return { ...nueva, credito: nueva.credito ? { ...nueva.credito } : undefined };
    },

    async actualizarTarjeta(id, cambios) {
      await espera();
      exigirSesion();
      const tarjeta = estado.tarjetas.find((t) => t.id === id);
      if (!tarjeta) throw error(404, 'NO_ENCONTRADO', 'La tarjeta no existe');
      if (cambios.id_cuenta !== undefined) tarjeta.id_cuenta = cambios.id_cuenta;
      if (cambios.ultimos4 !== undefined) tarjeta.ultimos4 = cambios.ultimos4;
      if (cambios.tipo !== undefined) tarjeta.tipo = cambios.tipo;
      if (cambios.red_pago !== undefined) tarjeta.red_pago = cambios.red_pago;
      if (cambios.fecha_vencimiento !== undefined) tarjeta.fecha_vencimiento = cambios.fecha_vencimiento;
      if (cambios.estado !== undefined) tarjeta.estado = cambios.estado;
      if (cambios.etiqueta !== undefined) tarjeta.etiqueta = cambios.etiqueta.trim() || undefined;
      if (tarjeta.tipo === 'credito') {
        const base = cambios.credito ?? tarjeta.credito ?? { limite_credito: 0, dia_corte: 1, dia_pago: 1 };
        tarjeta.credito = {
          limite_credito: base.limite_credito,
          dia_corte: base.dia_corte,
          dia_pago: base.dia_pago,
          saldo_utilizado: tarjeta.credito?.saldo_utilizado ?? 0,
        };
      } else {
        tarjeta.credito = undefined;
      }
      persistir();
      return { ...tarjeta, credito: tarjeta.credito ? { ...tarjeta.credito } : undefined };
    },

    async eliminarTarjeta(id) {
      await espera();
      exigirSesion();
      estado.tarjetas = estado.tarjetas.filter((t) => t.id !== id);
      persistir();
    },

    async eventos() {
      await espera(150);
      exigirSesion();
      return estado.eventos.map((evento) => ({ ...evento }));
    },

    async crearEvento(alta) {
      await espera(200);
      exigirSesion();
      if (!alta.titulo.trim()) throw error(422, 'VALIDACION_ENTRADA', 'El titulo no puede estar vacio');
      const nuevo: EventoCalendario = {
        id: `ev-${estado.siguienteId++}`,
        fecha: alta.fecha,
        titulo: alta.titulo.trim(),
        tipo: alta.tipo,
        monto: alta.monto,
      };
      estado.eventos = [...estado.eventos, nuevo];
      persistir();
      return { ...nuevo };
    },

    async actualizarEvento(id, cambios) {
      await espera(200);
      exigirSesion();
      const evento = estado.eventos.find((e) => e.id === id);
      if (!evento) throw error(404, 'NO_ENCONTRADO', 'El evento no existe');
      if (cambios.fecha !== undefined) evento.fecha = cambios.fecha;
      if (cambios.titulo !== undefined) evento.titulo = cambios.titulo.trim();
      if (cambios.tipo !== undefined) evento.tipo = cambios.tipo;
      if (cambios.monto !== undefined) evento.monto = cambios.monto;
      persistir();
      return { ...evento };
    },

    async eliminarEvento(id) {
      await espera(200);
      exigirSesion();
      estado.eventos = estado.eventos.filter((e) => e.id !== id);
      persistir();
    },

    async comparacionMensual() {
      await espera();
      exigirSesion();
      return {
        actual: resumenMensual(MES_ANALISIS),
        anterior: resumenMensual(MES_ANTERIOR),
      } satisfies ComparacionMensual;
    },

    async metas() {
      await espera();
      exigirSesion();
      return estado.metas.map((meta) => ({ ...meta }));
    },

    async crearMeta(alta: AltaMeta) {
      await espera();
      const usuario = exigirSesion();
      if (!alta.nombre.trim()) throw error(422, 'VALIDACION_ENTRADA', 'nombre no puede estar vacio');
      if (alta.objetivo <= 0) throw error(422, 'VALIDACION_ENTRADA', 'objetivo debe ser mayor que 0');
      const nueva: MetaAhorro = {
        id: `m-${estado.siguienteId++}`,
        nombre: alta.nombre.trim(),
        objetivo: alta.objetivo,
        ahorrado: alta.ahorrado ?? 0,
        moneda: usuario.moneda_principal,
        fecha_limite: alta.fecha_limite,
        icono: alta.icono ?? 'meta',
        color: alta.color ?? '#414c5a',
      };
      estado.metas = [...estado.metas, nueva];
      persistir();
      return nueva;
    },

    async aportarMeta(id, monto) {
      await espera();
      exigirSesion();
      const meta = estado.metas.find((m) => m.id === id);
      if (!meta) throw error(404, 'NO_ENCONTRADO', 'La meta no existe');
      meta.ahorrado = Math.max(0, redondear(meta.ahorrado + monto, 2));
      persistir();
      return { ...meta };
    },

    async eliminarMeta(id) {
      await espera();
      exigirSesion();
      estado.metas = estado.metas.filter((m) => m.id !== id);
      persistir();
    },

    async presupuestos() {
      await espera();
      const usuario = exigirSesion();
      const gasto = gastoPorCategoriaMes(MES_ANALISIS);
      return estado.presupuestos.map((presupuesto) => ({
        ...presupuesto,
        moneda: usuario.moneda_principal,
        gastado: gasto[presupuesto.categoria] ?? 0,
      })) satisfies Presupuesto[];
    },

    async guardarPresupuesto(categoria, limite) {
      await espera();
      const usuario = exigirSesion();
      if (limite <= 0) throw error(422, 'VALIDACION_ENTRADA', 'limite debe ser mayor que 0');
      const existente = estado.presupuestos.find((p) => p.categoria === categoria);
      if (existente) existente.limite = limite;
      else estado.presupuestos = [...estado.presupuestos, { categoria, limite, moneda: usuario.moneda_principal }];
      persistir();
      return {
        categoria,
        limite,
        moneda: usuario.moneda_principal,
        gastado: gastoPorCategoriaMes(MES_ANALISIS)[categoria] ?? 0,
      } satisfies Presupuesto;
    },

    async eliminarPresupuesto(categoria) {
      await espera();
      exigirSesion();
      estado.presupuestos = estado.presupuestos.filter((p) => p.categoria !== categoria);
      persistir();
    },

    async exportarDatos() {
      await espera(400);
      const usuario = exigirSesion();
      const gasto = gastoPorCategoriaMes(MES_ANALISIS);
      return {
        generado_en: new Date().toISOString(),
        usuario: { ...usuario },
        transacciones: estado.transacciones.map((t) => ({ ...t })),
        metas: estado.metas.map((m) => ({ ...m })),
        presupuestos: estado.presupuestos.map((p) => ({
          ...p,
          gastado: gasto[p.categoria] ?? 0,
        })),
        analisis: estado.analisisGuardados.map((a) => ({
          id: a.id,
          perfil_codigo: a.perfil_codigo,
          probabilidad: a.probabilidad,
          analizado_en: a.analizado_en,
        })),
      } satisfies DatosExportados;
    },

    async eliminarCuenta(password) {
      await espera(600);
      exigirSesion();
      if (password.length < 10) {
        throw error(401, 'CREDENCIALES_INVALIDAS', 'Password incorrecta');
      }
      await almacenLocal.eliminar(CLAVE_ESTADO).catch(() => {});
      estado.usuario = null;
      estado.transacciones = [];
      estado.evolucion = [];
      estado.analisisGuardados = [];
      estado.metas = [];
      estado.presupuestos = [];
    },
  };
}
