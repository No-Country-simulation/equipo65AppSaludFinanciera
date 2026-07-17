import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Todo salvo assets estaticos y _next pasa por la negociacion de locale
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
