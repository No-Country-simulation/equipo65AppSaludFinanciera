/**
 * ⚠️ MOCK - SE BORRA AL INTEGRAR (ADR-0011).
 * Fixtures espejo de los ejemplos literales de CONTRATO_API.md y TAXONOMIA.md.
 * Un campo que el contrato no tiene, aqui es un bug.
 */
import type {
  CategoriaSlug,
  CuentaBancaria,
  EventoCalendario,
  FrecuenciaAhorro,
  Idioma,
  MedioOperacion,
  MetaAhorro,
  PerfilSlug,
  Presupuesto,
  PrioridadRecomendacion,
  PuntoEvolucion,
  RegistroBuro,
  Tarjeta,
  Transaccion,
  Usuario,
} from '../types';

/** TAXONOMIA §1.1 - etiquetas por idioma (en la real vienen de GET /categorias). */
export const ETIQUETAS_CATEGORIA: Record<CategoriaSlug, Record<Idioma, string>> = {
  alimentacion: { es: 'Alimentación', pt: 'Alimentação', en: 'Food' },
  transporte: { es: 'Transporte', pt: 'Transporte', en: 'Transport' },
  vivienda: { es: 'Vivienda', pt: 'Moradia', en: 'Housing' },
  servicios: { es: 'Servicios', pt: 'Contas e serviços', en: 'Utilities' },
  salud: { es: 'Salud', pt: 'Saúde', en: 'Health' },
  educacion: { es: 'Educación', pt: 'Educação', en: 'Education' },
  entretenimiento: { es: 'Entretenimiento', pt: 'Entretenimento', en: 'Entertainment' },
  compras: { es: 'Compras', pt: 'Compras', en: 'Shopping' },
  finanzas: { es: 'Finanzas', pt: 'Finanças', en: 'Finance' },
  comida_rapida: { es: 'Comida rápida', pt: 'Fast food', en: 'Fast food' },
  supermercado: { es: 'Supermercado', pt: 'Supermercado', en: 'Supermarket' },
  taxi: { es: 'Taxi', pt: 'Táxi', en: 'Taxi' },
  ahorro_inversion: {
    es: 'Ahorro e inversión',
    pt: 'Poupança e investimento',
    en: 'Savings & investment',
  },
  ingresos: { es: 'Ingresos', pt: 'Receitas', en: 'Income' },
  otros: { es: 'Otros', pt: 'Outros', en: 'Other' },
};

export const TIPO_CATEGORIA: Record<CategoriaSlug, 'gasto' | 'movimiento' | 'ingreso'> = {
  alimentacion: 'gasto',
  transporte: 'gasto',
  vivienda: 'gasto',
  servicios: 'gasto',
  salud: 'gasto',
  educacion: 'gasto',
  entretenimiento: 'gasto',
  compras: 'gasto',
  finanzas: 'gasto',
  ahorro_inversion: 'movimiento',
  ingresos: 'ingreso',
  otros: 'gasto',
  comida_rapida: 'gasto',
  supermercado: 'gasto',
  taxi: 'gasto',
};

/** TAXONOMIA §2 - etiquetas de perfil por idioma. */
export const ETIQUETAS_PERFIL: Record<PerfilSlug, Record<Idioma, string>> = {
  saludable: { es: 'Saludable', pt: 'Saudável', en: 'Healthy' },
  en_observacion: { es: 'En observación', pt: 'Em observação', en: 'Under observation' },
  en_riesgo: { es: 'En riesgo', pt: 'Em risco', en: 'At risk' },
};

/** TAXONOMIA §4 - textos del motor de reglas ({categoria}/{pct} se interpolan). */
export const TEXTOS_RECOMENDACION: Record<string, Record<Idioma, string>> = {
  REC_DATOS_PARCIALES: {
    es: 'Los gastos registrados cubren solo el {pct}% de tu ingreso: carga mas transacciones para un analisis mas preciso',
    pt: 'As despesas registradas cobrem apenas {pct}% da sua renda: adicione mais transações para uma análise mais precisa',
    en: 'Your recorded expenses cover only {pct}% of your income: add more transactions for a more accurate analysis',
  },
  REC_DEFICIT: {
    es: 'Tus gastos superan tus ingresos: revisa los gastos no esenciales este mes',
    pt: 'Suas despesas superam sua renda: revise os gastos não essenciais deste mês',
    en: 'Your expenses exceed your income: review non-essential spending this month',
  },
  REC_DEUDA_ALTA: {
    es: 'Tu nivel de endeudamiento es alto: prioriza reducir la deuda antes de nuevos gastos',
    pt: 'Seu nível de endividamento está alto: priorize reduzir a dívida antes de novos gastos',
    en: 'Your debt level is high: prioritize paying it down before taking on new expenses',
  },
  REC_AHORRO_BAJO: {
    es: 'Aumentar la reserva financiera mensual',
    pt: 'Aumente sua reserva financeira mensal',
    en: 'Increase your monthly financial reserve',
  },
  REC_SIN_AHORRO: {
    es: 'Establecer un ahorro automatico mensual, aunque sea un monto pequeno',
    pt: 'Estabeleça uma poupança automática mensal, mesmo que seja um valor pequeno',
    en: 'Set up an automatic monthly savings transfer, even if it is a small amount',
  },
  REC_ESENCIAL_ALTO: {
    es: 'Tus gastos esenciales consumen mas del 60% de tu ingreso: hay poco margen ante un imprevisto',
    pt: 'Suas despesas essenciais consomem mais de 60% da sua renda: há pouca margem para imprevistos',
    en: 'Essential expenses consume over 60% of your income: little room for the unexpected',
  },
  REC_DISCRECIONAL_ALTO: {
    es: 'Reducir los gastos en entretenimiento y compras liberaria margen de ahorro',
    pt: 'Reduzir gastos com entretenimento e compras liberaria margem para poupar',
    en: 'Cutting entertainment and shopping would free up room to save',
  },
  REC_CONCENTRACION: {
    es: 'Mas de la mitad de tu gasto esta en la categoria {categoria}: revisa si es sostenible',
    pt: 'Mais da metade dos seus gastos está na categoria {categoria}: avalie se é sustentável',
    en: 'More than half of your spending is in {categoria}: consider whether it is sustainable',
  },
  REC_RECURRENTE_ALTO: {
    es: 'Monitorear los gastos recurrentes de entretenimiento',
    pt: 'Monitore os gastos recorrentes com assinaturas',
    en: 'Keep an eye on your recurring subscription costs',
  },
  REC_CATEGORIA_EXCESO: {
    es: 'Reducir los gastos en {categoria}',
    pt: 'Reduzir os gastos com {categoria}',
    en: 'Reduce spending on {categoria}',
  },
  REC_CONSOLIDA: {
    es: 'Buen manejo: considera invertir el excedente en lugar de dejarlo inmovilizado',
    pt: 'Boa gestão: considere investir o excedente em vez de deixá-lo parado',
    en: 'Well managed: consider investing the surplus instead of leaving it idle',
  },
};

export const PRIORIDAD_RECOMENDACION: Record<string, PrioridadRecomendacion> = {
  REC_DATOS_PARCIALES: 'alta',
  REC_DEFICIT: 'alta',
  REC_DEUDA_ALTA: 'alta',
  REC_AHORRO_BAJO: 'alta',
  REC_SIN_AHORRO: 'alta',
  REC_ESENCIAL_ALTO: 'media',
  REC_DISCRECIONAL_ALTO: 'media',
  REC_CONCENTRACION: 'media',
  REC_RECURRENTE_ALTO: 'media',
  REC_CATEGORIA_EXCESO: 'media',
  REC_CONSOLIDA: 'baja',
};

/** TAXONOMIA §4 - umbral(categoria) como fraccion del ingreso. */
export const UMBRAL_CATEGORIA: Partial<Record<CategoriaSlug, number>> = {
  alimentacion: 0.35,
  vivienda: 0.35,
  transporte: 0.2,
  servicios: 0.15,
  salud: 0.2,
  entretenimiento: 0.15,
  compras: 0.15,
  finanzas: 0.2,
  educacion: 0.25,
  otros: 0.1,
};

export const FRECUENCIA_NUM: Record<FrecuenciaAhorro, 0 | 1 | 2 | 3> = {
  nula: 0,
  baja: 1,
  media: 2,
  alta: 3,
};

/** Imitacion barata de M1: palabra clave → categoria (es/pt/en). */
export const CLAVES_CATEGORIA: [CategoriaSlug, string[]][] = [
  ['alimentacion', ['uber eats', 'ifood', 'rappi', 'super', 'soriana', 'oxxo', 'walmart', 'chedraui', 'mercado', 'rest', 'cafe', 'café', 'panader', 'padaria', 'starbucks', 'grocery']],
  ['servicios', ['cfe', 'luz', 'agua', 'internet', 'telmex', 'izzi', 'totalplay', 'telefon', 'claro', 'vivo', 'cable', 'gas natural', 'electric']],
  ['vivienda', ['renta', 'alquiler', 'hipoteca', 'expensas', 'condominio', 'aluguel', 'inmobili', 'muebl', 'rent ']],
  ['transporte', ['uber', 'didi', '99app', 'taxi', 'gasolin', 'pemex', 'shell', 'metro', 'peaje', 'estacionamiento', 'combust', 'fuel']],
  ['salud', ['farmacia', 'doctor', 'dentista', 'hospital', 'optica', 'drogaria', 'consulta', 'pharmacy']],
  ['educacion', ['colegiatura', 'curso', 'platzi', 'udemy', 'libro', 'universidad', 'escola', 'alura', 'tuition']],
  ['entretenimiento', ['netflix', 'spotify', 'cine', 'steam', 'xbox', 'playstation', 'gym', 'gimnasio', 'smartfit', 'academia', 'boletos', 'concierto', 'disney', 'hbo', 'prime video', 'bar ']],
  ['compras', ['amazon', 'mercado libre', 'liverpool', 'zara', 'shein', 'magalu', 'americanas', 'elektra', 'tienda', 'shopping']],
  ['finanzas', ['tarjeta', 'tdc', 'credito', 'prestamo', 'interes', 'comision', 'impuesto', 'sat ', 'seguro', 'cartao', 'juros', 'banco']],
  ['ahorro_inversion', ['ahorro', 'cetes', 'inversion', 'gbm', 'fondo', 'plazo fijo', 'bitso', 'cripto', 'poupanca', 'tesouro', 'savings']],
  ['ingresos', ['salario', 'nomina', 'sueldo', 'freelance', 'venta', 'devolucion', 'reintegro', 'pix recebido', 'deposito', 'honorarios', 'abono', 'salary', 'payroll']],
];

export const USUARIO_DEMO: Usuario = {
  id: 'u-demo-001',
  email: 'demo@fintechvital.dev',
  nombre: 'Valentina Ríos',
  apellido: 'Ríos Mendoza',
  fecha_nacimiento: '1994-05-18',
  genero: 'F',
  telefono: '+52 55 1234 5678',
  ciudad: 'Ciudad de México',
  estado_region: 'CDMX',
  pais: 'México',
  moneda_principal: 'MXN',
  idioma: 'es',
  ingreso_mensual: 28500,
  nivel_endeudamiento: 32,
  frecuencia_ahorro: 'baja',
  // 2FA OBLIGATORIO: el usuario demo ya lo tiene configurado (el login pide el codigo).
  totp_activo: true,
  terminos_version: '1.0',
  terminos_aceptados_en: '2026-07-01T12:00:00Z',
};

/** Ids de las tarjetas demo (se referencian desde las transacciones). */
export const TARJETA_DEBITO = 'tar-debito-01';
export const TARJETA_ORO = 'tar-credito-oro';
export const TARJETA_AMEX = 'tar-credito-amex';

let siguienteId = 100;
interface ExtraTx {
  comercio?: string;
  medio?: MedioOperacion;
  tarjeta?: string;
}
const transaccion = (
  fecha: string,
  descripcion: string,
  valor: number,
  categoria: CategoriaSlug,
  confianza = 0.93,
  extra: ExtraTx = {},
): Transaccion => ({
  id: `t-${siguienteId++}`,
  descripcion,
  valor,
  moneda: 'MXN',
  fecha,
  categoria,
  confianza,
  categoria_origen: 'modelo',
  comercio: extra.comercio,
  medio_operacion: extra.medio,
  id_tarjeta: extra.tarjeta,
});

/** Julio 2026 (el mes que se analiza) + junio para la lista y los filtros. */
export const TRANSACCIONES_DEMO: Transaccion[] = [
  // --- Julio 2026 --- (comercio + medio_operacion + tarjeta, como en la BD del equipo)
  transaccion('2026-07-01', 'SALARIO JULIO NOMINA', 28500, 'ingresos', 0.99, { comercio: 'Nómina empresa', medio: 'sucursal', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-01', 'TRANSFERENCIA AHORRO CETES', -1000, 'ahorro_inversion', 0.95, { comercio: 'CetesDirecto', medio: 'app_movil', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-02', 'RENTA DEPARTAMENTO CONDESA', -8500, 'vivienda', 0.97, { comercio: 'Arrendamiento', medio: 'portal_web', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-02', 'SORIANA SUPERMERCADO', -1240.5, 'alimentacion', 0.96, { comercio: 'Soriana', medio: 'pos', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-03', 'CFE RECIBO LUZ', -640, 'servicios', 0.98, { comercio: 'CFE', medio: 'portal_web', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-03', 'NETFLIX.COM', -219, 'entretenimiento', 0.97, { comercio: 'Netflix', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-04', 'OXXO PLAZA INSURGENTES', -185, 'alimentacion', 0.9, { comercio: 'Oxxo', medio: 'pos', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-04', 'SMARTFIT GIMNASIO', -499, 'entretenimiento', 0.92, { comercio: 'Smart Fit', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-05', 'PEMEX GASOLINERA 5482', -750, 'transporte', 0.95, { comercio: 'Pemex', medio: 'pos', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-05', 'SPOTIFY PREMIUM', -129, 'entretenimiento', 0.97, { comercio: 'Spotify', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-05', 'TELMEX INTERNET HOGAR', -599, 'servicios', 0.96, { comercio: 'Telmex', medio: 'portal_web', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-06', 'AGUA CDMX BIMESTRE', -180, 'servicios', 0.91, { comercio: 'SACMEX', medio: 'cajero', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-07', 'UBER EATS PEDIDO', -320, 'alimentacion', 0.88, { comercio: 'Uber Eats', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-08', 'UBER VIAJE ROMA NORTE', -132, 'transporte', 0.93, { comercio: 'Uber', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-08', 'DEVOLUCION AMAZON', 450, 'ingresos', 0.85, { comercio: 'Amazon', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-09', 'CAFEBRERIA EL PENDULO', -145, 'alimentacion', 0.82, { comercio: 'El Péndulo', medio: 'pos', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-10', 'FARMACIA GUADALAJARA', -230, 'salud', 0.96, { comercio: 'Farmacias Guadalajara', medio: 'pos', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-11', 'PLATZI SUSCRIPCION ANUAL', -249, 'educacion', 0.9, { comercio: 'Platzi', medio: 'portal_web', tarjeta: TARJETA_AMEX }),
  transaccion('2026-07-12', 'MERCADO ROMA LOCAL 12', -260, 'alimentacion', 0.8, { comercio: 'Mercado Roma', medio: 'pos', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-13', 'CINEPOLIS VIP BOLETOS', -380, 'entretenimiento', 0.94, { comercio: 'Cinépolis', medio: 'app_movil', tarjeta: TARJETA_AMEX }),
  transaccion('2026-07-13', 'BOLETOS OCESA CONCIERTO', -1800, 'entretenimiento', 0.89, { comercio: 'Ticketmaster', medio: 'portal_web', tarjeta: TARJETA_AMEX }),
  transaccion('2026-07-14', 'AMAZON MX MARKETPLACE', -1450, 'compras', 0.93, { comercio: 'Amazon', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-15', 'PAGO TARJETA CREDITO', -2500, 'finanzas', 0.95, { comercio: 'Pago TDC', medio: 'app_movil', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-15', 'INTERESES TDC', -180, 'finanzas', 0.94, { comercio: 'Intereses', medio: 'sucursal', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-15', 'METRO CDMX RECARGA', -100, 'transporte', 0.9, { comercio: 'Metro CDMX', medio: 'cajero', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-16', 'SORIANA SUPERMERCADO', -980, 'alimentacion', 0.96, { comercio: 'Soriana', medio: 'pos', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-16', 'CETESDIRECTO INVERSION', -1500, 'ahorro_inversion', 0.96, { comercio: 'CetesDirecto', medio: 'app_movil', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-17', 'XBOX GAME PASS', -229, 'entretenimiento', 0.91, { comercio: 'Microsoft', medio: 'app_movil', tarjeta: TARJETA_AMEX }),
  transaccion('2026-07-18', 'OXXO GASOLINERA TIENDA', -97.5, 'alimentacion', 0.72, { comercio: 'Oxxo Gas', medio: 'pos', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-19', 'LIVERPOOL DEPTO DAMAS', -2890, 'compras', 0.95, { comercio: 'Liverpool', medio: 'pos', tarjeta: TARJETA_AMEX }),
  transaccion('2026-07-19', 'MERCADO LIBRE ENVIO', -780, 'compras', 0.9, { comercio: 'Mercado Libre', medio: 'app_movil', tarjeta: TARJETA_ORO }),
  transaccion('2026-07-20', 'ZARA REFORMA 222', -690, 'compras', 0.93, { comercio: 'Zara', medio: 'pos', tarjeta: TARJETA_AMEX }),
  transaccion('2026-07-21', 'VETERINARIA DR PATA', -600, 'otros', 0.38, { comercio: 'Vet Dr. Pata', medio: 'pos', tarjeta: TARJETA_DEBITO }),
  transaccion('2026-07-22', 'RETIRO CAJERO ATM', -400, 'otros', 0.35, { comercio: 'Cajero BBVA', medio: 'cajero', tarjeta: TARJETA_DEBITO }),
  // --- Junio 2026 (historial para lista/filtros; fuera del analisis del mes) ---
  transaccion('2026-06-01', 'SALARIO JUNIO NOMINA', 28500, 'ingresos', 0.99),
  transaccion('2026-06-02', 'RENTA DEPARTAMENTO CONDESA', -8500, 'vivienda', 0.97),
  transaccion('2026-06-03', 'NETFLIX.COM', -219, 'entretenimiento', 0.97),
  transaccion('2026-06-04', 'SMARTFIT GIMNASIO', -499, 'entretenimiento', 0.92),
  transaccion('2026-06-05', 'SPOTIFY PREMIUM', -129, 'entretenimiento', 0.97),
  transaccion('2026-06-05', 'TELMEX INTERNET HOGAR', -599, 'servicios', 0.96),
  transaccion('2026-06-07', 'SORIANA SUPERMERCADO', -1310, 'alimentacion', 0.96),
  transaccion('2026-06-12', 'PEMEX GASOLINERA 5482', -820, 'transporte', 0.95),
  transaccion('2026-06-18', 'FARMACIA DEL AHORRO', -150, 'salud', 0.93),
  transaccion('2026-06-25', 'AMAZON MX MARKETPLACE', -640, 'compras', 0.93),
];

/** Serie para GET /analisis/evolucion - la historia: venia en riesgo, mejora. */
export const EVOLUCION_DEMO: PuntoEvolucion[] = [
  { fecha: '2026-02-28', perfil_codigo: 'en_riesgo', probabilidad: 0.81, tasa_ahorro: -0.04, ratio_endeudamiento: 0.44 },
  { fecha: '2026-03-31', perfil_codigo: 'en_riesgo', probabilidad: 0.66, tasa_ahorro: 0.01, ratio_endeudamiento: 0.41 },
  { fecha: '2026-04-30', perfil_codigo: 'en_observacion', probabilidad: 0.58, tasa_ahorro: 0.05, ratio_endeudamiento: 0.38 },
  { fecha: '2026-05-31', perfil_codigo: 'en_observacion', probabilidad: 0.63, tasa_ahorro: 0.07, ratio_endeudamiento: 0.36 },
  { fecha: '2026-06-30', perfil_codigo: 'en_observacion', probabilidad: 0.71, tasa_ahorro: 0.08, ratio_endeudamiento: 0.34 },
];

export const MONEDAS_DEMO = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'] as const;

/** Metas de ahorro demo (PLANES_AHORRO: fecha_inicio + estado_plan). */
export const METAS_DEMO: MetaAhorro[] = [
  {
    id: 'm-1',
    nombre: 'Fondo de emergencia',
    objetivo: 90000,
    ahorrado: 52000,
    moneda: 'MXN',
    fecha_inicio: '2026-01-10',
    fecha_limite: '2026-12-31',
    estado: 'activo',
    icono: 'escudo',
    color: '#12a566',
  },
  {
    id: 'm-2',
    nombre: 'Viaje a Brasil',
    objetivo: 45000,
    ahorrado: 12500,
    moneda: 'MXN',
    fecha_inicio: '2026-03-01',
    fecha_limite: '2026-11-15',
    estado: 'activo',
    icono: 'avion',
    color: '#2a78d6',
  },
  {
    id: 'm-3',
    nombre: 'MacBook nueva',
    objetivo: 38000,
    ahorrado: 30400,
    moneda: 'MXN',
    fecha_inicio: '2026-02-15',
    fecha_limite: '2026-09-30',
    estado: 'activo',
    icono: 'laptop',
    color: '#eb6834',
  },
];

/** Presupuestos mensuales demo (limite por categoria; `gastado` se calcula). */
export const PRESUPUESTOS_DEMO: Omit<Presupuesto, 'gastado'>[] = [
  { categoria: 'alimentacion', limite: 4000, moneda: 'MXN' },
  { categoria: 'transporte', limite: 1500, moneda: 'MXN' },
  { categoria: 'entretenimiento', limite: 2500, moneda: 'MXN' },
  { categoria: 'compras', limite: 3000, moneda: 'MXN' },
  { categoria: 'servicios', limite: 1500, moneda: 'MXN' },
];

/** Cuentas bancarias demo (CUENTAS_BANCARIAS). */
export const CUENTAS_DEMO: CuentaBancaria[] = [
  { id: 'cta-1', numero: '**** 4821', estado: 'activa', fecha_apertura: '2021-03-15' },
  { id: 'cta-2', numero: '**** 9037', estado: 'activa', fecha_apertura: '2023-08-02' },
];

/** Tarjetas demo (TARJETAS + subtipo TARJETAS_CREDITO). */
export const TARJETAS_DEMO: Tarjeta[] = [
  {
    id: TARJETA_DEBITO,
    id_cuenta: 'cta-1',
    ultimos4: '4821',
    tipo: 'debito',
    red_pago: 'visa',
    fecha_vencimiento: '2028-05',
    estado: 'activa',
    etiqueta: 'Débito nómina',
  },
  {
    id: TARJETA_ORO,
    id_cuenta: 'cta-1',
    ultimos4: '7734',
    tipo: 'credito',
    red_pago: 'mastercard',
    fecha_vencimiento: '2027-11',
    estado: 'activa',
    etiqueta: 'Oro',
    credito: { limite_credito: 45000, dia_corte: 17, dia_pago: 5, saldo_utilizado: 18200 },
  },
  {
    id: TARJETA_AMEX,
    id_cuenta: 'cta-1',
    ultimos4: '1002',
    tipo: 'credito',
    red_pago: 'amex',
    fecha_vencimiento: '2026-09',
    estado: 'activa',
    etiqueta: 'Platinum',
    credito: { limite_credito: 60000, dia_corte: 25, dia_pago: 12, saldo_utilizado: 9800 },
  },
];

/** Historial de buro demo (HISTORIAL_BURO): venia en riesgo, mejora - misma narrativa que EVOLUCION_DEMO. */
export const BURO_DEMO: RegistroBuro[] = [
  { fecha: '2026-02-28', score_crediticio: 612, dias_atraso: 15, monto_adeudado: 41000 },
  { fecha: '2026-03-31', score_crediticio: 628, dias_atraso: 8, monto_adeudado: 39000 },
  { fecha: '2026-04-30', score_crediticio: 651, dias_atraso: 0, monto_adeudado: 35500 },
  { fecha: '2026-05-31', score_crediticio: 669, dias_atraso: 0, monto_adeudado: 33000 },
  { fecha: '2026-06-30', score_crediticio: 685, dias_atraso: 0, monto_adeudado: 30500 },
  { fecha: '2026-07-15', score_crediticio: 702, dias_atraso: 0, monto_adeudado: 28000 },
];

/** Eventos demo del calendario (recordatorios del usuario). */
export const EVENTOS_DEMO: EventoCalendario[] = [
  { id: 'ev-1', fecha: '2026-07-05', titulo: 'Pago de renta', tipo: 'pago', monto: 8500 },
  { id: 'ev-2', fecha: '2026-07-15', titulo: 'Quincena', tipo: 'cobro', monto: 14250 },
  { id: 'ev-3', fecha: '2026-07-28', titulo: 'Revisar suscripciones', tipo: 'recordatorio' },
];
