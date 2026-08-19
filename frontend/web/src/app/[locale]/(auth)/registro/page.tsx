'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  FinanceApiError,
  TERMINOS_VERSION,
  type Ciudad,
  type Idioma,
  type Moneda,
  type Usuario,
} from '@/data';
import { Link, useRouter } from '@/i18n/navigation';
import { useSesion } from '@/lib/sesion';
import { useDataSource } from '@/lib/useDatos';
import { QrCode } from '@/components/QrCode';
import { Icono } from '@/components/Icono';
import { Boton, Campo, claseInput, claseInputError } from '@/components/ui';

const MONEDAS: Moneda[] = ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'EUR'];

/** Edad minima para abrir cuenta. La API la exige (AuthService.EDAD_MINIMA). */
const EDAD_MINIMA = 18;
const LARGO_MINIMO_PASSWORD = 10;

type Paso = 'cuenta' | 'onboarding' | 'qr' | 'verificar' | 'respaldo';

/** Indice de paso para el stepper (cuenta=0, finanzas=1, seguridad=2, listo=3). */
const INDICE_PASO: Record<Paso, number> = {
  cuenta: 0,
  onboarding: 1,
  qr: 2,
  verificar: 2,
  respaldo: 3,
};

/** Campos del formulario que pueden tener error propio. */
type CampoAlta =
  | 'email'
  | 'password'
  | 'password_confirmar'
  | 'nombre'
  | 'apellido'
  | 'fecha_nacimiento'
  | 'telefono'
  | 'ciudad'
  | 'terminos'
  | 'ingreso_mensual'
  | 'meta';

type Errores = Partial<Record<CampoAlta, string>>;

/** La fecha maxima que admite el selector: hoy menos la edad minima. */
function fechaMaximaNacimiento(): string {
  const hoy = new Date();
  hoy.setFullYear(hoy.getFullYear() - EDAD_MINIMA);
  return hoy.toISOString().slice(0, 10);
}

function aniosDesde(iso: string): number {
  const nacimiento = new Date(`${iso}T00:00:00`);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) anios -= 1;
  return anios;
}

/**
 * Fuerza de la contrasena, 0-3. Es una PISTA, no un requisito: lo unico
 * obligatorio son los 10 caracteres que valida la API. Exigir simbolos y
 * mayusculas empuja a la gente a "Password1!" y no a una frase larga, que es
 * lo que de verdad aguanta.
 */
function fuerzaPassword(valor: string): 0 | 1 | 2 | 3 {
  if (valor.length < LARGO_MINIMO_PASSWORD) return 0;
  let puntos = 1;
  if (valor.length >= 14) puntos += 1;
  if (/[0-9]/.test(valor) && /[a-zA-Z]/.test(valor)) puntos += 1;
  return Math.min(puntos, 3) as 0 | 1 | 2 | 3;
}

export default function PaginaRegistro() {
  const t = useTranslations('auth');
  const tComun = useTranslations('comun');
  const tPrivacidad = useTranslations('privacidad');
  const locale = useLocale();
  const ds = useDataSource();
  const router = useRouter();
  const { iniciarSesion, actualizarUsuario } = useSesion();

  const [paso, setPaso] = useState<Paso>('cuenta');

  // Paso 1: cuenta y datos personales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | ''>('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [aceptado, setAceptado] = useState(false);

  // Paso 2: puesta a punto financiera
  const [ingreso, setIngreso] = useState('');
  const [nombreMeta, setNombreMeta] = useState('');
  const [montoMeta, setMontoMeta] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  /** Campos que la persona ya toco: no se marca en rojo lo que aun no ha llenado. */
  const [tocados, setTocados] = useState<Partial<Record<CampoAlta, boolean>>>({});

  // Catalogo de ciudades. `usuario.ciudad_id` es una FK, asi que la ciudad se
  // ELIGE de esta lista: escrita a mano no se podia guardar y se perdia.
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [ciudadesFallaron, setCiudadesFallaron] = useState(false);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [secreto, setSecreto] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);

  useEffect(() => {
    let activo = true;
    ds.ciudades()
      .then((lista) => {
        if (activo) setCiudades(lista);
      })
      .catch(() => {
        if (activo) setCiudadesFallaron(true);
      });
    return () => {
      activo = false;
    };
  }, [ds]);

  /** Ciudades agrupadas por pais, con el nombre del pais en el idioma actual. */
  const porPais = useMemo(() => {
    const nombrePais = new Intl.DisplayNames([locale], { type: 'region' });
    const grupos = new Map<string, Ciudad[]>();
    for (const item of ciudades) {
      const clave = nombrePais.of(item.pais) ?? item.pais;
      const grupo = grupos.get(clave);
      if (grupo) grupo.push(item);
      else grupos.set(clave, [item]);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, locale));
  }, [ciudades, locale]);

  const fuerza = fuerzaPassword(password);

  /** Valida UN campo. Devuelve el mensaje, o undefined si esta bien. */
  const validarCampo = (campo: CampoAlta): string | undefined => {
    switch (campo) {
      case 'email':
        if (!email.trim()) return t('val.obligatorio');
        // Deliberadamente laxa: la de verdad la hace la API, y una regex
        // estricta rechaza correos validos pero raros.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return t('val.emailInvalido');
        return undefined;
      case 'password':
        if (!password) return t('val.obligatorio');
        if (password.length < LARGO_MINIMO_PASSWORD) return t('val.passwordCorta');
        return undefined;
      case 'password_confirmar':
        // Una errata en la contrasena deja a la persona fuera de su cuenta
        // recien creada, y con 2FA por medio recuperarla no es trivial.
        if (!passwordConfirmar) return t('val.obligatorio');
        if (passwordConfirmar !== password) return t('val.passwordNoCoincide');
        return undefined;
      case 'nombre':
        if (!nombre.trim()) return t('val.obligatorio');
        if (nombre.trim().length < 2) return t('val.nombreCorto');
        return undefined;
      case 'apellido':
        if (!apellido.trim()) return t('val.obligatorio');
        if (apellido.trim().length < 2) return t('val.nombreCorto');
        return undefined;
      case 'fecha_nacimiento': {
        if (!nacimiento) return t('val.fechaObligatoria');
        if (new Date(`${nacimiento}T00:00:00`) > new Date()) return t('val.fechaFutura');
        if (aniosDesde(nacimiento) < EDAD_MINIMA) return t('val.menorDeEdad');
        return undefined;
      }
      case 'telefono': {
        if (!telefono.trim()) return undefined; // opcional
        const digitos = telefono.replace(/\D/g, '');
        if (digitos.length < 6 || digitos.length > 15) return t('val.telefonoInvalido');
        return undefined;
      }
      case 'terminos':
        return aceptado ? undefined : t('val.terminos');
      case 'ingreso_mensual': {
        if (!ingreso.trim()) return t('val.ingresoObligatorio');
        if (!(Number(ingreso) > 0)) return t('val.ingresoInvalido');
        return undefined;
      }
      case 'meta': {
        // O los dos o ninguno: una meta sin objetivo no se puede pintar en la
        // barra de progreso, y un objetivo sin nombre no dice nada.
        const tieneNombre = nombreMeta.trim().length > 0;
        const tieneMonto = Number(montoMeta) > 0;
        if (tieneNombre !== tieneMonto) return t('val.metaIncompleta');
        return undefined;
      }
      default:
        return undefined;
    }
  };

  const marcarTocado = (campo: CampoAlta) => {
    setTocados((previos) => ({ ...previos, [campo]: true }));
    setErrores((previos) => ({ ...previos, [campo]: validarCampo(campo) }));
  };

  /** Solo se pinta el error de un campo que la persona ya toco, o tras enviar. */
  const errorDe = (campo: CampoAlta) => (tocados[campo] ? errores[campo] : undefined);
  const claseDe = (campo: CampoAlta) => (errorDe(campo) ? claseInputError : claseInput);

  /** Valida una lista de campos y deja marcados los que fallen. */
  const validarPaso = (campos: CampoAlta[]): boolean => {
    const encontrados: Errores = {};
    for (const campo of campos) {
      const mensaje = validarCampo(campo);
      if (mensaje) encontrados[campo] = mensaje;
    }
    setErrores(encontrados);
    setTocados(Object.fromEntries(campos.map((campo) => [campo, true])));
    if (Object.keys(encontrados).length > 0) {
      setError(t('val.revisa'));
      return false;
    }
    setError(null);
    return true;
  };

  const fallar = (causa: unknown) => {
    if (!(causa instanceof FinanceApiError)) {
      setError(String(causa));
      return;
    }
    setError(causa.message);
    // La API ya dice QUE campo esta mal (`detalles`), y en el idioma de la
    // peticion. Antes se tiraba y solo se veia "La solicitud tiene campos
    // invalidos", que no dice donde mirar.
    const porCampo: Errores = {};
    for (const detalle of causa.error.detalles ?? []) {
      porCampo[detalle.campo as CampoAlta] = detalle.error;
    }
    // Un correo repetido no llega en `detalles`: viene como codigo de negocio.
    if (causa.error.codigo === 'EMAIL_YA_REGISTRADO') porCampo.email = causa.message;

    if (Object.keys(porCampo).length > 0) {
      setErrores((previos) => ({ ...previos, ...porCampo }));
      setTocados((previos) => ({
        ...previos,
        ...Object.fromEntries(Object.keys(porCampo).map((campo) => [campo, true])),
      }));
    }
  };

  // Paso 1: crear la cuenta e iniciar sesion (2FA aun inactivo).
  const crearCuenta = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (
      !validarPaso([
        'email',
        'password',
        'password_confirmar',
        'nombre',
        'apellido',
        'fecha_nacimiento',
        'telefono',
        'terminos',
      ])
    ) {
      return;
    }

    setEnviando(true);
    try {
      await ds.registro({
        email: email.trim(),
        password,
        moneda_principal: moneda,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fecha_nacimiento: nacimiento,
        genero: genero || undefined,
        telefono: telefono.trim() || undefined,
        ciudad: ciudad || undefined,
        // El idioma con el que se registro. Sin esto la cuenta quedaba en `es`
        // aunque el alta se hiciera en /pt, y al entrar desde otro dispositivo
        // la app se abria en el idioma equivocado.
        idioma: locale as Idioma,
        terminos_version: TERMINOS_VERSION,
      });
      const sesion = await ds.login(email.trim(), password);
      const creado = sesion.usuario ?? (await ds.me());
      iniciarSesion(creado, { access: sesion.access_token, refresh: sesion.refresh_token });
      setUsuario(creado);
      // La cuenta ya existe y hay sesion: de aqui en adelante las llamadas van
      // autenticadas, que es lo que necesita el paso de finanzas.
      setErrores({});
      setTocados({});
      setPaso('onboarding');
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  /** Pide el secreto TOTP y pasa al QR. Se llega aqui se guarde o no el paso 2. */
  const irAlSegundoFactor = async () => {
    const datos = await ds.iniciar2fa();
    setSecreto(datos.secreto);
    setOtpauth(datos.otpauth_uri);
    setErrores({});
    setTocados({});
    setPaso('qr');
  };

  /**
   * Paso 2: ingreso mensual y primera meta, CONTRA LA API.
   *
   * El ingreso va al perfil (`PATCH /usuarios/me`) porque es la base de todos
   * los indicadores, y la meta a `POST /metas`. No se guarda nada en
   * localStorage: el proyecto no admite datos simulados (ADR-0011), y un dato
   * que solo vive en el navegador desaparece al cambiar de dispositivo.
   */
  const guardarFinanzas = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!validarPaso(['ingreso_mensual', 'meta'])) return;

    setEnviando(true);
    try {
      const actualizado = await ds.actualizarPerfil({ ingreso_mensual: Number(ingreso) });
      actualizarUsuario(actualizado);
      setUsuario(actualizado);

      if (nombreMeta.trim() && Number(montoMeta) > 0) {
        await ds.crearMeta({ nombre: nombreMeta.trim(), objetivo: Number(montoMeta) });
      }
      await irAlSegundoFactor();
    } catch (causa) {
      // La cuenta YA esta creada: si esto falla no se puede echar atras a la
      // persona. Se avisa y se le deja seguir con "Ahora no".
      setError(
        `${t('onboardingFallo')} ${causa instanceof FinanceApiError ? causa.message : ''}`.trim(),
      );
    } finally {
      setEnviando(false);
    }
  };

  const omitirFinanzas = async () => {
    setEnviando(true);
    setError(null);
    try {
      await irAlSegundoFactor();
    } catch (causa) {
      fallar(causa);
    } finally {
      setEnviando(false);
    }
  };

  // Paso 3: confirmar el codigo TOTP y recibir los codigos de respaldo.
  const verificar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const resultado = await ds.activar2fa(codigo);
      setRespaldo(resultado.codigos_respaldo);
      if (usuario) actualizarUsuario({ ...usuario, totp_activo: true });
      setPaso('respaldo');
    } catch (causa) {
      setError(causa instanceof FinanceApiError ? causa.message : String(causa));
    } finally {
      setEnviando(false);
    }
  };

  const descargarCodigos = () => {
    const blob = new Blob([respaldo.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'fintechvital-codigos-respaldo.txt';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const finalizar = () => {
    // Al entrar se adopta el idioma preferido del usuario (cross-device).
    router.replace('/panel', { locale: (usuario?.idioma ?? locale) as 'es' | 'pt' | 'en' });
  };

  const pasoActual = INDICE_PASO[paso];
  const etiquetasPaso = [t('pasoCuenta'), t('pasoFinanzas'), t('pasoSeguridad'), t('pasoListo')];

  return (
    <div className="aparece space-y-5">
      {/* Stepper */}
      <ol className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {etiquetasPaso.map((etiqueta, i) => (
          <li key={etiqueta} className="flex shrink-0 items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ${
                i <= pasoActual ? 'bg-accent text-sobre-accent' : 'bg-canvas-2 text-muted'
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= pasoActual ? 'text-ink' : 'text-muted'}>{etiqueta}</span>
            {i < etiquetasPaso.length - 1 ? <span className="mx-1 h-px w-5 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {/* Paso 1: cuenta */}
      {paso === 'cuenta' ? (
        <form onSubmit={crearCuenta} noValidate className="space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('registroTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('registroSubtitulo')}</p>
            <p className="mt-2 text-xs text-muted">{t('obligatorioMarca')}</p>
          </header>

          <Campo etiqueta={t('email')} requerido error={errorDe('email')}>
            <input
              className={claseDe('email')}
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              onBlur={() => marcarTocado('email')}
              autoComplete="email"
              aria-invalid={Boolean(errorDe('email'))}
            />
          </Campo>

          <Campo
            etiqueta={t('password')}
            requerido
            ayuda={t('passwordAyuda')}
            error={errorDe('password')}
          >
            <span className="relative block">
              <input
                className={`${claseDe('password')} pr-12`}
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                onBlur={() => marcarTocado('password')}
                autoComplete="new-password"
                aria-invalid={Boolean(errorDe('password'))}
              />
              <button
                type="button"
                onClick={() => setVerPassword((visible) => !visible)}
                aria-label={verPassword ? t('passwordOcultar') : t('passwordVer')}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition-colors hover:text-ink"
              >
                <Icono nombre={verPassword ? 'ojo-cerrado' : 'ojo'} className="h-[18px] w-[18px]" />
              </button>
            </span>
            {password.length > 0 ? (
              <span className="mt-2 flex items-center gap-2">
                <span className="flex h-1 flex-1 gap-1" aria-hidden>
                  {[1, 2, 3].map((nivel) => (
                    <span
                      key={nivel}
                      className={`h-full flex-1 rounded-full transition-colors ${
                        fuerza < nivel
                          ? 'bg-line'
                          : fuerza === 1
                            ? 'bg-risk'
                            : fuerza === 2
                              ? 'bg-warn'
                              : 'bg-ok'
                      }`}
                    />
                  ))}
                </span>
                <span className="text-xs font-medium text-muted">
                  {fuerza <= 1
                    ? t('passwordFuerza.debil')
                    : fuerza === 2
                      ? t('passwordFuerza.media')
                      : t('passwordFuerza.fuerte')}
                </span>
              </span>
            ) : null}
          </Campo>

          <Campo
            etiqueta={t('passwordConfirmar')}
            requerido
            error={errorDe('password_confirmar')}
          >
            <input
              className={claseDe('password_confirmar')}
              type={verPassword ? 'text' : 'password'}
              value={passwordConfirmar}
              onChange={(evento) => setPasswordConfirmar(evento.target.value)}
              onBlur={() => marcarTocado('password_confirmar')}
              autoComplete="new-password"
              aria-invalid={Boolean(errorDe('password_confirmar'))}
            />
          </Campo>

          <Campo etiqueta={t('monedaPrincipal')}>
            <select
              className={claseInput}
              value={moneda}
              onChange={(evento) => setMoneda(evento.target.value as Moneda)}
            >
              {MONEDAS.map((codigoMoneda) => (
                <option key={codigoMoneda} value={codigoMoneda}>
                  {codigoMoneda}
                </option>
              ))}
            </select>
          </Campo>

          {/* Datos personales (USUARIOS: nombre/apellido/fecha_nacimiento son NOT NULL) */}
          <div className="rounded-xl border border-line bg-canvas-2/40 p-4">
            <p className="mb-3 text-sm font-semibold text-ink">{t('datosPersonalesTitulo')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta={t('nombre')} requerido error={errorDe('nombre')}>
                <input
                  className={claseDe('nombre')}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onBlur={() => marcarTocado('nombre')}
                  autoComplete="given-name"
                  aria-invalid={Boolean(errorDe('nombre'))}
                />
              </Campo>
              <Campo etiqueta={t('apellido')} requerido error={errorDe('apellido')}>
                <input
                  className={claseDe('apellido')}
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  onBlur={() => marcarTocado('apellido')}
                  autoComplete="family-name"
                  aria-invalid={Boolean(errorDe('apellido'))}
                />
              </Campo>
              <Campo
                etiqueta={t('fechaNacimiento')}
                requerido
                ayuda={t('edadMinima')}
                error={errorDe('fecha_nacimiento')}
              >
                <input
                  className={claseDe('fecha_nacimiento')}
                  type="date"
                  value={nacimiento}
                  onChange={(e) => setNacimiento(e.target.value)}
                  onBlur={() => marcarTocado('fecha_nacimiento')}
                  max={fechaMaximaNacimiento()}
                  aria-invalid={Boolean(errorDe('fecha_nacimiento'))}
                />
              </Campo>
              <Campo etiqueta={`${t('genero')} (${t('opcional')})`}>
                <select
                  className={claseInput}
                  value={genero}
                  onChange={(e) => setGenero(e.target.value as 'M' | 'F' | '')}
                >
                  <option value="">—</option>
                  <option value="M">{t('generos.M')}</option>
                  <option value="F">{t('generos.F')}</option>
                </select>
              </Campo>
              <Campo etiqueta={`${t('telefono')} (${t('opcional')})`} error={errorDe('telefono')}>
                <input
                  className={claseDe('telefono')}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  onBlur={() => marcarTocado('telefono')}
                  inputMode="tel"
                  maxLength={15}
                  autoComplete="tel"
                  aria-invalid={Boolean(errorDe('telefono'))}
                />
              </Campo>
              {/* La ciudad es un SELECTOR y no texto libre: en la BD es una FK al
                  catalogo `ciudad`, asi que un nombre escrito a mano no se podia
                  guardar y desaparecia sin avisar. */}
              <Campo
                etiqueta={`${t('ciudad')} (${t('opcional')})`}
                error={errorDe('ciudad')}
                ayuda={ciudadesFallaron ? t('ciudadNoDisponible') : undefined}
              >
                <select
                  className={claseDe('ciudad')}
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  disabled={ciudades.length === 0}
                >
                  <option value="">{t('ciudadSelecciona')}</option>
                  {porPais.map(([pais, lista]) => (
                    <optgroup key={pais} label={pais}>
                      {lista.map((item) => (
                        <option key={item.id} value={item.nombre}>
                          {item.nombre} · {item.estado_region}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-canvas-2/50 p-3.5 transition-colors hover:border-accent/40 ${
              errorDe('terminos') ? 'border-risk' : 'border-line'
            }`}
          >
            <input
              type="checkbox"
              checked={aceptado}
              onChange={(evento) => {
                setAceptado(evento.target.checked);
                if (evento.target.checked) {
                  setErrores((previos) => ({ ...previos, terminos: undefined }));
                }
              }}
              className="mt-0.5 h-4.5 w-4.5 shrink-0"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-sm leading-snug text-ink-soft">
              {t('aceptoLabel')}{' '}
              <Link href="/legales" className="font-semibold text-accent hover:underline">
                {t('terminos')}
              </Link>{' '}
              {t('aceptoY')}{' '}
              <Link href="/privacidad" className="font-semibold text-accent hover:underline">
                {tPrivacidad('titulo')}
              </Link>
            </span>
          </label>
          {errorDe('terminos') ? (
            <p role="alert" className="-mt-3 text-xs font-medium text-risk">
              {errorDe('terminos')}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-risk">
              {error}
            </p>
          ) : null}

          {/* El boton NO se apaga por campos vacios: un boton deshabilitado que no
              dice por que es la peor forma de pedir un dato. Se envia, se valida
              y se señala el campo que falta. */}
          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? t('creando') : t('continuar')}
          </Boton>

          <p className="text-center text-sm text-muted">
            {t('yaTienes')}{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              {t('entrar')}
            </Link>
          </p>
        </form>
      ) : null}

      {/* Paso 2: puesta a punto financiera */}
      {paso === 'onboarding' ? (
        <form onSubmit={guardarFinanzas} noValidate className="aparece space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('onboardingTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('onboardingSubtitulo')}</p>
          </header>

          <Campo
            etiqueta={`${t('ingresoMensual')} (${moneda})`}
            requerido
            ayuda={t('ingresoMensualAyuda')}
            error={errorDe('ingreso_mensual')}
          >
            <input
              className={claseDe('ingreso_mensual')}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={ingreso}
              onChange={(evento) => setIngreso(evento.target.value)}
              onBlur={() => marcarTocado('ingreso_mensual')}
              autoFocus
              aria-invalid={Boolean(errorDe('ingreso_mensual'))}
            />
          </Campo>

          <div className="rounded-xl border border-line bg-canvas-2/40 p-4">
            <p className="mb-3 text-sm font-semibold text-ink">
              {t('metaTitulo')} <span className="font-normal text-muted">({t('opcional')})</span>
            </p>
            <div className="grid gap-4">
              <Campo etiqueta={t('metaNombre')} error={errorDe('meta')}>
                <input
                  className={claseDe('meta')}
                  value={nombreMeta}
                  onChange={(evento) => setNombreMeta(evento.target.value)}
                  onBlur={() => marcarTocado('meta')}
                  placeholder={t('metaNombrePlaceholder')}
                  maxLength={80}
                />
              </Campo>
              <Campo etiqueta={`${t('metaMonto')} (${moneda})`}>
                <input
                  className={claseInput}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={montoMeta}
                  onChange={(evento) => setMontoMeta(evento.target.value)}
                  onBlur={() => marcarTocado('meta')}
                />
              </Campo>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-risk">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Boton
              type="button"
              variante="fantasma"
              onClick={() => void omitirFinanzas()}
              disabled={enviando}
            >
              {t('omitirPaso')}
            </Boton>
            <Boton type="submit" disabled={enviando} className="flex-1">
              {enviando ? tComun('guardando') : t('guardarContinuar')}
            </Boton>
          </div>
        </form>
      ) : null}

      {/* Paso 3: QR */}
      {paso === 'qr' ? (
        <div className="aparece space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('dosfaTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('dosfaObligatoriaAyuda')}</p>
          </header>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-6">
            <p className="text-sm font-medium text-ink-soft">{t('escaneaConApp')}</p>
            <div className="rounded-xl bg-white p-3 shadow-[var(--sombra-md)]">
              <QrCode valor={otpauth} tam={196} />
            </div>
            <div className="w-full text-center">
              <p className="text-xs text-muted">{t('oIngresaManual')}</p>
              <code className="mt-1 block break-all rounded-lg bg-ink/5 px-3 py-2 text-sm font-semibold tracking-wider text-ink">
                {secreto}
              </code>
            </div>
          </div>

          <Boton onClick={() => setPaso('verificar')} className="w-full">
            {tComun('siguiente')}
          </Boton>
        </div>
      ) : null}

      {/* Paso 3b: verificar */}
      {paso === 'verificar' ? (
        <form onSubmit={verificar} className="space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('verificaTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('verificaAyuda')}</p>
          </header>

          <Campo etiqueta={t('codigo')}>
            <input
              className={`${claseInput} cifra text-center text-2xl tracking-[0.4em]`}
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              required
            />
          </Campo>

          {error ? <p className="text-sm font-medium text-risk">{error}</p> : null}

          <div className="flex gap-2">
            <Boton type="button" variante="fantasma" onClick={() => setPaso('qr')}>
              {tComun('atras')}
            </Boton>
            <Boton type="submit" disabled={enviando || codigo.length !== 6} className="flex-1">
              {enviando ? t('creando') : t('verificar')}
            </Boton>
          </div>
        </form>
      ) : null}

      {/* Paso 4: códigos de respaldo */}
      {paso === 'respaldo' ? (
        <div className="aparece space-y-5">
          <header>
            <h1 className="cifra text-3xl font-semibold text-ink">{t('respaldoTitulo')}</h1>
            <p className="mt-1 text-sm text-muted">{t('respaldoAyuda')}</p>
          </header>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-ok/40 bg-ok/5 p-4 sm:grid-cols-4">
            {respaldo.map((codigoRespaldo) => (
              <code
                key={codigoRespaldo}
                className="rounded-lg bg-card px-2 py-1.5 text-center text-sm font-semibold text-ink"
              >
                {codigoRespaldo}
              </code>
            ))}
          </div>

          <div className="flex gap-2">
            <Boton type="button" variante="fantasma" onClick={descargarCodigos}>
              {t('descargarCodigos')}
            </Boton>
            <Boton onClick={finalizar} className="flex-1">
              {t('guardadosEntrar')}
            </Boton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
