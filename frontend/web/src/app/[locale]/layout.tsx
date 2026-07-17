import type { Metadata } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { routing } from '@/i18n/routing';
import { SesionProvider } from '@/lib/sesion';
import { AvisoAlmacenamiento } from '@/components/AvisoAlmacenamiento';
import '../globals.css';

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  weight: ['400', '500', '600', '700'],
});
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'financeAI',
  description: 'Tu comportamiento financiero, claro y accionable',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={`${hanken.variable} ${bricolage.variable}`}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>
          <SesionProvider>
            {children}
            <AvisoAlmacenamiento />
          </SesionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
