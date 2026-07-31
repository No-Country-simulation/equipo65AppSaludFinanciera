# Branding - nombre, color e identidad

> **Estado: DECIDIDO (2026-07-30).** El nombre es **Fintech Vital** y lo fijó el
> **logo que diseñó el equipo** (imagotipo entregado en PNG + SVG). Con eso se
> cierra **D4**. El codename `financeAI` quedó retirado del código y de la doc.
>
> Sigue pendiente de Angel: renombrar el **repo de GitHub** y el **subdominio**
> (D9), y verificar dominio/tiendas/marca. La carpeta en disco sigue llamándose
> `financeAI/` y la doc la nombra así a propósito cuando habla de rutas.

## §1 La marca

**Fintech Vital** — imagotipo de letras recortadas donde la "V" de VITAL es a la
vez un *check* y una flecha ascendente, con barras de gráfico dentro de "TECH".

### Archivos

Viven en [`../web/public/marca/`](../web/public/marca/):

| Archivo | Cuándo se usa |
|---|---|
| `logo.svg` | Imagotipo completo sobre **fondo claro** |
| `logo-negativo.svg` | Imagotipo sobre **fondo oscuro** (hero, sidebar, tema oscuro) |
| `isotipo.svg` | Solo la "V". Espacios chicos: sidebar colapsada, favicon, icono de app |

**Nada de esto se edita a mano.** Cuando cambie el arte, se reemplaza el original
en `docs/marca/original/` y se corren los dos scripts, en este orden:

```bash
cd frontend
node scripts/marca/derivar-variantes.mjs   # original -> los 3 SVG
node scripts/marca/generar-assets.mjs      # SVG -> PNG del movil + iconos de app
```

### Por qué existe una versión en negativo

El imagotipo original es pizarra + lima. Sobre un fondo oscuro **la parte pizarra
desaparece** contra el fondo y solo sobrevive "VITAL". La variante en negativo
invierte la pizarra a claro y mantiene el lima.

> ⚠️ **La "i" de VITAL es la excepción, y es fácil equivocarse.** Es el **único
> elemento con relleno blanco** del arte, pero *no* es un hueco recortado del
> fondo: es una **letra clara a propósito**. Si al construir el negativo se
> invierte junto con todo lo demás, sobre fondo oscuro se vuelve un agujero. En
> el negativo tiene que **seguir siendo clara** y separarse por el contorno, como
> el resto de las letras. `derivar-variantes.mjs` ya lo contempla; si alguien
> rehace la variante a mano, es la trampa número uno.

### ⚠️ Pendiente con el diseñador

El SVG entregado trae el claim **"Fintech Vital By 65" como texto vivo** en la
fuente `MADE Waffle Soft`, que es licenciada y no tenemos. Cualquier navegador la
sustituye por una genérica y el renglón se ve mal. **Por eso el imagotipo en uso
va sin ese renglón.** Hay que pedirle al diseñador el SVG **con el texto
convertido a curvas** (en Illustrator: *Texto → Crear contorno*).

## §2 Color

La paleta de la app se derivó del logo. Los valores exactos, con su regla de uso,
están en `web/src/app/globals.css` y `mobile/src/constants/tema.ts`.

| Rol | Claro | Oscuro | Origen |
|---|---|---|---|
| Pizarra (marca / interactivo) | `#414c5a` | — | Letras del logo |
| Lima (marca / acento) | `#88bd24` | `#9fc640` | "VITAL" y la V del logo |
| Lima legible como texto | `#527016` | `#9fc640` | Lima oscurecido |
| Tinta | `#1b262e` | `#e8edf0` | Familia de la pizarra |
| Lienzo | `#eef1f4` | `#0f1a20` | Neutro frío |

### 🔴 Regla dura del lima (medida, no opinable)

Sobre blanco el lima `#88bd24` da **2.25:1** de contraste. WCAG AA pide **4.5:1**
para texto. Y con texto blanco encima da **también 2.25:1** — o sea que un botón
lima con texto blanco es ilegible en los dos sentidos.

Por lo tanto:

- **Tema claro**: el lima es **solo relleno** (barras, iconos grandes, fondos).
  Lo interactivo (botones, enlaces) va en **pizarra** (8.73:1). Para texto en
  lima existe `--lima-texto` (5.69:1).
- **Tema oscuro**: se invierte. Sobre `#0f1a20` el lima luce **7.79:1** y sí pasa
  a ser el color de acento.

## §3 Psicología del color (propuesta del equipo, 2026-07)

Aporte del equipo en las notas de la semana 0. Mapea bien con la semántica que
las interfaces ya usan:

| Color | Evoca | Uso en el producto |
|---|---|---|
| 🟦 Azul | Confianza, seguridad, tecnología | Pizarra de la marca; acentos secundarios |
| 🟩 Verde | Ahorro, crecimiento, dinero | Lima de la marca; perfil `saludable`; positivos |
| 🟨 Amarillo | Advertencia, atención | Perfil `en_observacion`; alertas de presupuesto |
| 🟥 Rojo | Riesgo, deudas | Perfil `en_riesgo`; gastos excedidos; errores |
| ⬜ Blanco | Limpieza | Fondos y tarjetas (tema claro) |
| ⬛ Gris | Neutralidad | Texto secundario, estados vacíos |

Regla ya aplicada en web y móvil: el color **refuerza** el estado del perfil
(verde/amarillo/rojo) y no se usa para otra cosa que pueda confundir esa lectura.

> Ojo con los **dos verdes**: el lima de marca (`#88bd24`, amarillento) y el
> verde de `saludable` (`#12a566`, azulado) conviven a propósito y son de tonos
> bien distintos. Aun así el estado del perfil **nunca** se comunica solo con
> color: siempre lleva icono + etiqueta.

## §4 Qué falta para cerrar esto

| # | Acción | Quién |
|---|---|---|
| ✅ | Elegir nombre | Equipo (vía logo, 2026-07-30) |
| ⬜ | Pedir al diseñador el SVG con el claim en curvas | Angel |
| ⬜ | Verificar dominio + tiendas + marca registrada | Angel |
| ⬜ | Renombrar repo de GitHub y subdominio (D9) | Angel |

### Nombres que se barajaron antes (archivo histórico)

Fluxa · Faro · Pulso · Norte · Equilibra · FinVital. Se descartaron al llegar el
logo del equipo. Nota: **FinVital** era la propuesta más cercana a lo que
terminó siendo la marca.
