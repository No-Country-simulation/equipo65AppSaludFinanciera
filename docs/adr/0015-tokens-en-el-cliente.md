# ADR-0015 — Dónde guarda el cliente los tokens de sesión

- **Fecha**: 2026-08-14
- **Estado**: aceptada
- **Decide**: Angel
- **Sustituye/relaciona**: [ADR-0004](0004-auth-propio-jwt.md) (auth propio con JWT)

## Contexto

Hasta ahora el par de tokens (`access` + `refresh`) vivía **solo en variables de
módulo** de `src/data/api/token.ts`. Al recargar la página —o al cerrar y
reabrir la app móvil, que pasa constantemente— se perdían.

El síntoma no era "te echa fuera", que sería honesto. Era peor: la ficha del
usuario **sí** estaba persistida (`fintechvital.sesion`), así que la aplicación
seguía *pareciendo* con sesión iniciada —menú, nombre— mientras **todas** las
llamadas respondían 401 y las pantallas salían vacías. Medido:

```
navegando sin recargar:  ningún 401 · cuentas pintadas: 1
tras F5:                 401 GET /tarjetas · 401 GET /cuentas
                         cuentas pintadas: 0
                         sigue "logueado": true · usuario en localStorage: true
```

Para arreglarlo hay que persistir los tokens. La pregunta es **dónde**, y en web
no hay una opción sin coste.

## Opciones

1. **`localStorage`** (o `AsyncStorage` en móvil). Es lo que ya prevé
   `config.ts` con su export `almacenLocal`. Cero cambios de backend.
   **Riesgo: cualquier XSS lo lee**, porque es precisamente lo que JavaScript
   puede leer.
2. **Cookie `HttpOnly; Secure; SameSite`** para el refresh token. El JavaScript
   no puede leerla, así que un XSS no se lleva la sesión. Cambia el contrato de
   `/auth/login` y `/auth/refresh` (el token deja de viajar en el cuerpo), obliga
   a `credentials: 'include'` en el cliente y a CORS con `allow-credentials` y
   origen explícito, y reintroduce CSRF como problema a considerar.
3. **Llavero del sistema** (Keychain / Keystore). Solo existe en móvil.

## Decisión

**Web: `localStorage`, como riesgo asumido y con fecha.** El access token va en
`almacenLocal`; el refresh, en `almacenSeguro`, que en web es el mismo
`localStorage`.

**Móvil: `expo-secure-store`** para el refresh token (llavero del sistema) y
`AsyncStorage` para lo que no es secreto. Ahí no hay excusa: la plataforma
ofrece almacenamiento protegido y usarlo no cuesta nada de contrato.

Que sean **dos exports** (`almacenLocal` y `almacenSeguro`) y no uno es lo que
permite que la diferencia entre plataformas viva entera en `config.ts` —el único
archivo de `src/data` que puede diferir entre web y móvil (ADR-0010/0011)— y que
el resto del código siga siendo byte a byte el mismo.

### Por qué no la cookie, hoy

Es la opción correcta y no se descarta: se pospone. A once días de la entrega,
cambiar el contrato de autenticación toca backend, CORS y las dos interfaces a la
vez, y un fallo ahí no degrada una pantalla —deja a todo el mundo fuera—. El
riesgo de romper la demo pesa más que la mejora, **dado que hoy no hay ningún
punto donde entre HTML de terceros**.

## Consecuencias

**Lo que se acepta.** Si algún día entra un XSS en la web, se lleva la sesión.
La mitigación real no es dónde se guarda el token, es que no haya XSS: la web no
usa `dangerouslySetInnerHTML` en ningún sitio y no inyecta HTML de terceros.
Conviene mantenerlo así y añadir una CSP.

**Lo que se gana.** La sesión sobrevive a un F5 y a reabrir la app, que es lo que
la persona espera de cualquier aplicación. Y con el refresco automático (abajo)
deja de caerse a los 15 minutos.

**Refresco automático.** Como efecto de persistir, el access token —que dura
900 s— caduca durante el uso normal. `pedir()` detecta el 401, llama a
`/auth/refresh`, guarda el par nuevo y **reintenta la petición una sola vez**.
El refresco es **uno solo compartido** (una promesa en curso que las demás
esperan): Movimientos lanza cuatro peticiones a la vez, y como el refresh es
**rotativo**, cuatro refrescos en paralelo se invalidarían entre sí y cerrarían
la sesión justo cuando había que renovarla.

**Coste operativo del móvil.** `expo-secure-store` es un módulo nativo: hay que
**reconstruir el dev build** (`npx expo run:android`); recargar el bundle no
basta.

## Cuándo revisar esto

- Si la web pasa a renderizar contenido que no controlamos (comentarios,
  Markdown de terceros, incrustaciones).
- Después de la entrega, como primer trabajo de endurecimiento: cookie
  `HttpOnly` para el refresh + CSP.
