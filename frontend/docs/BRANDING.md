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

> **Arte vigente: croma v2 (2026-08-06) + blanco v1 (2026-08-07).**
>
> La **croma v2** reemplazó a la v1: la tinta de las letras pasa de azul pizarra
> a **gris neutro**, el arte se **aplana** (la v1 traía sombras, la v2 no) y
> **desaparece el renglón del claim** — con lo que se cae el pendiente de la
> fuente licenciada. En la misma entrega llegó un **logotipo circular** nuevo,
> que es arte aparte y no se deriva del imagotipo.
>
> El **blanco v1** es la novedad del 2026-08-07: el **negativo REAL**, dibujado
> por el diseñador. Hasta ahora el negativo lo fabricaba `derivar-variantes.mjs`
> sustituyendo colores sobre el positivo, y esa aproximación perdía cosas del
> original (ver abajo).

Viven en [`../web/public/marca/`](../web/public/marca/):

| Archivo | Cuándo se usa |
|---|---|
| `logo.svg` | Imagotipo completo sobre **fondo claro** |
| `logo-negativo.svg` | Imagotipo sobre **fondo oscuro** (hero, sidebar, tema oscuro) |
| `isotipo.svg` | Solo la "V", sin fondo. Espacios chicos sobre fondo propio: sidebar colapsada, icono monocromo de Android |
| `isotipo-circular.svg` | Monograma "FV" dentro de un disco. **Trae su propio fondo**: favicon, iconos de app, avatar |

Los dos últimos no son intercambiables. El isotipo suelto necesita que el fondo
lo ponga quien lo usa; el circular ya lo trae, y por eso es el que va en los
iconos — antes había que inventarle al isotipo un cuadrado de relleno. La
excepción es el **icono monocromo de Android**: el sistema lo tinta de un color
plano y deja solo la silueta, así que el disco se volvería un círculo lleno sin
información. Ahí sigue yendo el isotipo suelto.

Y los originales del diseñador viven en `docs/marca/original/`:

| Archivo | Deriva |
|---|---|
| `FintechVital_Imagotipo_cromav2.svg` | `logo.svg` · `isotipo.svg` |
| `FintechVital_Imagotipo_blancov1.svg` | `logo-negativo.svg` |
| `FintechVital_Logotipo_circular.svg` | `isotipo-circular.svg` |

**Nada de esto se edita a mano.** Cuando cambie el arte, se reemplaza el original
en `docs/marca/original/` y se corren los dos scripts, en este orden:

```bash
cd frontend
node scripts/marca/derivar-variantes.mjs   # originales -> los 4 SVG
node scripts/marca/generar-assets.mjs      # SVG -> PNG del movil + iconos de app
```

> ⚠️ **El icono de app del móvil necesita un paso más, y es fácil no darse
> cuenta.** El icono del lanzador no se lee de `assets/images/` en tiempo de
> ejecución: se compila a `android/app/src/main/res/mipmap-*`. Como `android/`
> ya existe, **`npx expo run:android` NO lo regenera** — reinstala la app con el
> icono viejo y todo parece correcto salvo el icono. Hay que forzar el prebuild:
>
> ```bash
> cd frontend/mobile
> npx expo prebuild --platform android   # regenera los mipmap desde app.json
> npx expo run:android
> ```
>
> `android/` está gitignoreado (se genera), así que el prebuild no pisa nada.
> Pasó de verdad al integrar la croma v2 (2026-08-06).

### Por qué existe una versión en negativo

El imagotipo original es gris + lima. Sobre un fondo oscuro **la parte gris
desaparece** contra el fondo y solo sobrevive "VITAL". De ahí la variante en
negativo: letras claras y lima.

El circular **no necesita negativo**: el disco es su propio fondo. El isotipo
suelto tampoco: es íntegramente lima.

### ✅ Resuelto: el negativo ya es arte real, no una derivación

Hasta el 2026-08-07 `logo-negativo.svg` se **fabricaba** mapeando los grises del
positivo a un claro único. Funcionaba, pero perdía dos cosas que el arte del
diseñador sí tiene:

- **La sombra de la "V"** (`#393a3c`). Al ser un gris, entraba en el mapa de
  tinta y se aclaraba junto con las letras: el logo quedaba plano.
- **Los verdes del negativo son más claros** que los del positivo (`#abc925` /
  `#aac920` / `#acca2a` contra `#8fbf21` / `#90bf21`). Es lo correcto — el mismo
  lima sobre fondo oscuro se apaga, y el diseñador lo compensa subiéndole luz.
  La sustitución de colores no tocaba el lima, así que salía apagado.

Con el **blanco v1** ya no se deriva nada: se normaliza el original y se
publica. De paso desapareció la trampa histórica de la **"i" de VITAL** — en el
positivo era el único relleno blanco del arte y había que protegerla de la
inversión para que no quedara un agujero sobre fondo oscuro. En el negativo real
es blanca como todas las demás letras, y no hay nada que proteger.

> ⚠️ **El negativo tiene 1,4% más de ancho relativo que el positivo** (la sombra
> de la "V" ensancha el dibujo), así que `Logo.tsx` — web y móvil — lleva **dos
> proporciones**, no una. Si se rehace el arte, salen del `viewBox` que imprime
> `derivar-variantes.mjs` al correr.
>
> ⚠️ **El blanco v1 no es exactamente la misma geometría que la croma v2**: trae
> retoques menores (algunos trazos desplazados, la flecha del *check* redibujada)
> y todavía **no hay una croma equivalente**. Positivo y negativo difieren en
> detalles que a tamaño de interfaz no se notan, pero **conviene pedirle al
> diseñador la croma actualizada** para que las dos variantes vuelvan a ser el
> mismo dibujo.

### ✅ Resuelto: el claim en texto vivo

La v1 traía el claim **"Fintech Vital By 65" como texto vivo** en la fuente
licenciada `MADE Waffle Soft`, que no tenemos, así que el navegador la sustituía
y el renglón se veía mal. **La croma v2 ya no trae ese renglón**, con lo que el
pendiente se cae solo. El paso que quitaba el `<text>` sigue en
`derivar-variantes.mjs` como red de seguridad, por si vuelve a aparecer.

### ⚠️ Pendiente con el diseñador: la "F" del circular

En `logotipo-circular`, la "F" del monograma va en el **azul pizarra de la v1**
(`#424c5b`) sobre un disco **gris croma v2** (`#575757`). Entre esos dos colores
hay **1.15:1** de contraste: la letra solo se separa gracias al contorno blanco
de 10 px que trae el arte. A tamaño de favicon ese contorno se pierde y la "F"
se empieza a fundir con el disco (a 32 px todavía aguanta; a 16 px ya no).

Se integró **tal como lo entregó el diseñador** — recolorear arte ajena por
nuestra cuenta no corresponde. Hay dos salidas y la elige el diseñador:
o la "F" se aclara, o el disco se oscurece.

> Dato útil para esa charla: que el circular conserve el azul pizarra dice que la
> pizarra **no está retirada de la marca**; lo que cambió es la tinta de las
> letras del imagotipo. Por eso la paleta de la app (§2) sigue en pie.

## §2 Color

La paleta de la app se derivó del logo. Los valores exactos, con su regla de uso,
están en `web/src/app/globals.css` y `mobile/src/constants/tema.ts`.

> **La croma v2 no movió la paleta de la app, a propósito.** El arte nuevo usa
> gris neutro (`#4e4d4d`..`#595959`) donde la v1 usaba pizarra, y un lima de
> `#90bf21` en vez de `#88bd24` — una diferencia que a ojo no existe. Cambiar la
> paleta de la interfaz por eso obligaría a rehacer las mediciones de contraste
> de más abajo y a tocar todas las pantallas, sin ganancia visible. La pizarra
> además sigue viva en la marca: es el color de la "F" del logotipo circular.

| Rol | Claro | Oscuro | Origen |
|---|---|---|---|
| Pizarra (marca / interactivo) | `#414c5a` | — | "F" del circular; letras del logo v1 |
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
| ✅ | Pedir al diseñador el SVG con el claim en curvas | Resuelto: la croma v2 ya no trae claim |
| ⬜ | Definir con el diseñador la "F" del circular (1.15:1 sobre el disco) | Angel |
| ⬜ | Verificar dominio + tiendas + marca registrada | Angel |
| ⬜ | Renombrar repo de GitHub y subdominio (D9) | Angel |

### Nombres que se barajaron antes (archivo histórico)

Fluxa · Faro · Pulso · Norte · Equilibra · FinVital. Se descartaron al llegar el
logo del equipo. Nota: **FinVital** era la propuesta más cercana a lo que
terminó siendo la marca.
