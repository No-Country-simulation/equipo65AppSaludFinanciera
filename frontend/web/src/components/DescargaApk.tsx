import { useTranslations } from 'next-intl';
import { Icono } from '@/components/Icono';

/**
 * Descarga del APK de Android.
 *
 * La URL viene de `NEXT_PUBLIC_APK_URL` y NO tiene valor por defecto a
 * proposito: si nadie la configura, este bloque no se pinta. Un boton de
 * descarga que lleva a un 404 es peor que no ofrecer la app.
 *
 * Es un enlace normal y no un `fetch`: el APK lo sirve GitHub Releases (otro
 * dominio), asi que el atributo `download` lo ignora el navegador y ademas no
 * hace falta - el tipo MIME ya hace que se descargue en vez de abrirse.
 */
export function DescargaApk() {
  const t = useTranslations('comun');
  const url = process.env.NEXT_PUBLIC_APK_URL;
  if (!url) return null;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icono nombre="android" className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t('apkTitulo')}</p>
          <p className="mt-0.5 text-xs text-muted">{t('apkAyuda')}</p>
          <a
            href={url}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <Icono nombre="descargar" className="h-4 w-4" strokeWidth={2} />
            {t('apkBoton')}
          </a>
          <p className="mt-2 text-[11px] leading-snug text-muted">{t('apkAviso')}</p>
        </div>
      </div>
    </div>
  );
}
