# DEMO — guion del video (7 minutos)

**Entregable obligatorio**: video que demuestre el funcionamiento del proyecto,
subido **antes del 23 de agosto de 2026**.

> ⚠️ **Verificar en las bases oficiales** (D16): duración máxima, formato y dónde
> se sube. Este guion está calculado para un tope de **7:00**.

## Las dos reglas

**Grabar contra <https://fintechvital.com>, no contra `localhost`.** Que se vea la
barra de direcciones con el dominio real vale más que cualquier diapositiva de
arquitectura. Plan B al final de este documento.

**Grabar por bloques y editar después.** Diez bloques cortos y limpios salen mejor
que una toma de siete minutos con titubeos. Además permite recortar sin regrabar.

---

## Presupuesto de tiempo

**6:30 de contenido, 30 s de margen.** Los tiempos son techos: si un bloque se
pasa, se recorta el siguiente, no se roba del margen.

| # | Bloque | Pantalla | Dura | Acumulado |
|---|---|---|---|---|
| 1 | El problema y qué es esto | Cara o portada | 0:25 | 0:25 |
| 2 | **El endpoint del enunciado** | Terminal | 0:50 | 1:15 |
| 3 | El caso real: CSV → diagnóstico | Dashboard | 1:15 | 2:30 |
| 4 | 🇧🇷 El momento portugués | Dashboard | 0:30 | 3:00 |
| 5 | La evolución en el tiempo | Dashboard | 0:30 | 3:30 |
| 6 | Corrección y app móvil | Dashboard + teléfono | 0:25 | 3:55 |
| 7 | La ciencia de datos | Notebook | 0:50 | 4:45 |
| 8 | La API documentada | Swagger | 0:25 | 5:10 |
| 9 | Arquitectura y OCI | Diagrama | 0:55 | 6:05 |
| 10 | Cierre | Cara o portada | 0:25 | 6:30 |

### Cobertura de los 8 requisitos del enunciado

Ningún requisito se queda fuera, y casi todos se demuestran **dos veces**:

| # | Requisito | Se ve en |
|---|---|---|
| 1 | Modelo entrenado y cargado | 2, 3, 7 |
| 2 | Validación de entrada | 2 (el 422), 8 |
| 3 | Clasificación de transacciones | 3, 4 |
| 4 | Análisis del perfil financiero | 2, 3, 5 |
| 5 | Generación de recomendaciones | 2, 3 |
| 6 | API documentada | 8 |
| 7 | Integración con OCI | 9 |
| 8 | Tres ejemplos reales de uso | 2 (uno en vivo, los otros dos citados) |

---

## Guion

### 1 · El problema (0:25)

*Sin pantalla, o con la portada.*

> «Cualquiera puede abrir su banca y ver en qué gastó. Lo que nadie te dice es si
> estás bien o mal, y qué hacer al respecto.
>
> Fintech Vital lee tus movimientos, clasifica cada gasto, calcula ocho
> indicadores de salud financiera y te devuelve un diagnóstico con
> recomendaciones concretas. Web, app móvil, y en tres idiomas.»

**No empezar por la arquitectura.** Empezar por el problema.

### 2 · El endpoint del enunciado (0:50)

*Terminal, a pantalla completa y con letra grande.*

Lo primero que se enseña es **exactamente lo que pide el enunciado**, porque es lo
primero que el jurado va a querer comprobar. Y se lanza **contra producción**:

```bash
curl -X POST https://api.fintechvital.com/api/v1/analisis-financiero \
  -H "Content-Type: application/json" \
  -d @ejemplo1.json
```

Enseñar la respuesta con los cuatro campos: `perfil_financiero`, `probabilidad`,
`resumen_gastos`, `recomendaciones`.

> «Este es el endpoint literal del enunciado, corriendo en Oracle Cloud, sin
> autenticación, para que cualquiera lo pueda probar. Devuelve perfil
> **Saludable** con probabilidad 0.875.»

**Y aquí el detalle que conviene no saltarse** (vale los 15 segundos que cuesta):

> «El enunciado sugería recomendar "aumentar la reserva financiera". Con estos
> datos, esta persona ahorra el 83 % de su ingreso: decirle eso sería incorrecto.
> Lo que hace nuestro sistema es avisar de que **los datos están incompletos**,
> en vez de fingir un diagnóstico.»

Cerrar el bloque mandando un cuerpo inválido, que demuestra el **requisito 2**:

> «Y si la entrada es inválida, responde 422 diciendo **qué campo** falla.»

### 3 · El caso real (1:15)

*Dashboard, sesión iniciada con el usuario sobreendeudado del Ejemplo 2.*

1. **Importar CSV**: arrastrar [`demo-movimientos.csv`](demo-movimientos.csv),
   que está en esta misma carpeta. Entran **14 movimientos** de golpe: la nómina
   y los 13 gastos del Ejemplo 2.

   > ⚠️ En el CSV **el signo es el dato**: `>0` ingreso, `<0` gasto. Si se editan
   > los importes a mano y se dejan en positivo, entran como ingresos y el
   > diagnóstico sale al revés.
2. **Clasificación automática**: detenerse en `UBER *TRIP HELP.UBER.COM` y
   `MERPAGO*SPOTIFY`.

   > «Esto es texto crudo de un extracto bancario, con su ruido. El modelo lo
   > clasifica solo: Transporte y Entretenimiento.»

3. **El diagnóstico**: perfil **En riesgo**, gráfico de gastos por categoría.
4. **Las recomendaciones**, señalando el indicador que dispara cada una.

   > «No es una caja negra. Cada recomendación dice de dónde sale: esta aparece
   > porque su tasa de ahorro es del **–12.9 %**, es decir, gasta más de lo que
   > ingresa. Y no las escribe un modelo de lenguaje: son reglas deterministas,
   > así que siempre se pueden explicar y auditar.»

### 4 · 🇧🇷 El momento portugués (0:30)

*Dashboard.* **Buena parte del jurado es de Brasil. Este bloque no se salta.**

Cambiar el idioma a `pt` con el selector: toda la interfaz cambia. Dar de alta una
transacción brasileña real — `IFOOD *PEDIDO` — y que salga `Alimentação`.

> «El modelo no está traducido: **está entrenado** en español, portugués e inglés.
> Reconoce `IFOOD`, `PIX` y `Magazine Luiza` igual que reconoce `Rappi` o
> `Whole Foods`. Los identificadores internos nunca se traducen; lo que cambia es
> lo que lee la persona.»

> ⚠️ **Si `IFOOD` no clasifica bien el día de grabar, este bloque no se graba.**
> Enseñar el diferencial fallando es peor que no enseñarlo.

### 5 · La evolución (0:30)

*Dashboard, pantalla de análisis.*

El gráfico del perfil a lo largo de tres meses: `en_riesgo` → `en_observacion` →
`saludable`.

> «Esto es lo que no hace una app de gastos normal. No te dice cuánto gastaste el
> mes pasado: te dice **si estás mejorando**. Cada análisis queda guardado, así
> que el historial es real, no una foto.»

**Es el diferencial del producto.** Si hay que recortar, este bloque es de los
últimos en caer.

### 6 · Corrección y móvil (0:25)

Dos cosas rápidas, encadenadas.

**Corregir una categoría mal clasificada** (15 s):

> «El modelo se equivoca, y cuando lo hace, el usuario corrige. Enseñarlo no es
> una debilidad: ningún clasificador acierta siempre, y el sistema está diseñado
> para eso.»

**La app móvil** (10 s): enseñar el teléfono con la misma cuenta y los mismos datos.

> «Y es la misma aplicación en el móvil, contra la misma API.»

### 7 · La ciencia de datos (0:50)

*Notebook.*

- El **dataset propio**: 2.373 descripciones en tres idiomas, 12 categorías,
  generado con semilla fija y comercios reales de México, Brasil y Estados Unidos.
- La **matriz de confusión** de M1.
- Y **el número honesto** — esto es lo que da credibilidad al resto:

> «Con un comercio que el modelo ya conoce, escrito de otra forma, el macro-F1 es
> **1.00**. Con una marca **completamente nueva**, que no lleva ninguna pista
> dentro, baja a **0.58**, y con el baseline por palabras clave sube a 0.60. Las
> dos cifras son ciertas y responden preguntas distintas; la realidad está entre
> las dos. Sobre veinte descripciones escritas a mano acierta diecinueve.
>
> El segundo modelo, el del perfil, saca **0.89** frente al 0.80 de la regla
> determinista, y predice las tres clases.»

**Decir el número que baja es lo que hace creíble al que sube.**

### 8 · La API documentada (0:25)

*Navegador en `https://api.fintechvital.com/api/v1/docs`.*

> «La API está documentada con OpenAPI, generada desde el propio código, así que
> no se puede desincronizar. Se puede probar desde aquí mismo.»

Desplegar un endpoint y enseñar su esquema. **Requisito 6, en 25 segundos.**

### 9 · Arquitectura y OCI (0:55)

*Diagrama.*

> «Son tres servicios separados: la web en Next.js, la API en Java con Spring
> Boot, y el modelo en Python con FastAPI. El modelo vive aparte a propósito:
> recibe datos y devuelve predicciones, sin lógica de negocio. Así se puede
> reentrenar sin tocar el producto.
>
> Todo corre en **Oracle Cloud**: una instancia de Compute con procesador Ampere,
> en una subred privada **sin IP pública**. Las imágenes están en OCI Container
> Registry, los secretos en OCI Vault, y el único acceso de administración es por
> OCI Bastion. A internet sale por un túnel de Cloudflare, así que **no hay ni un
> puerto abierto**.
>
> Son **cuatro servicios de OCI** donde el enunciado pedía uno.»

Si sobran cinco segundos, el mejor cierre del bloque es abrir
<https://fintechvital.com> **en el teléfono, en vivo**: es la prueba de que no es
una demo local.

### 10 · Cierre (0:25)

> «Un MVP que funciona de punta a punta: clasifica, diagnostica, recomienda y
> hace seguimiento. Modelos entrenados por nosotros con nuestro propio dataset,
> recomendaciones que se pueden explicar una por una, tres idiomas, y desplegado
> en Oracle Cloud. Está en línea ahora mismo en **fintechvital.com**.»

---

## Si te pasas de tiempo

Recortar **en este orden**. Cada corte está pensado para que no se caiga ningún
requisito del enunciado:

| Orden | Qué se recorta | Cuánto | Qué se pierde |
|---|---|---|---|
| 1.º | El móvil, del bloque 6 | 10 s | Nada crítico: se menciona en el cierre |
| 2.º | La validación 422, del bloque 2 | 15 s | El requisito 2 sigue cubierto por Swagger (bloque 8) |
| 3.º | La corrección de categoría | 15 s | Un detalle de producto, no un requisito |
| 4.º | Acortar arquitectura a los 4 servicios de OCI | 25 s | La explicación del *porqué* de los 3 servicios |
| 5.º | La matriz de confusión (dejar solo los números) | 15 s | Apoyo visual, no el dato |

**Lo que NO se recorta nunca**: el bloque 2 (es el requisito literal), el bloque 4
(el jurado brasileño) y el bloque 5 (el diferencial del producto).

---

## Lo que no se debe decir en cámara

Tres afirmaciones que serían falsas y que un evaluador técnico puede comprobar:

| No decir | Por qué |
|---|---|
| «Los modelos se sirven desde **OCI Object Storage**» | Se planeó y **no se usó**: viajan dentro de la imagen del servicio de ML |
| «Si se cae una instancia, sigue funcionando» | Hay **una sola** instancia. No hay alta disponibilidad, y es un intercambio asumido |
| «Tenemos CI» / «tenemos WAF» | No hay workflows en el repositorio, y el WAF con reglas gestionadas es de pago en Cloudflare |

Y tres números que estuvieron en versiones anteriores de este guion y **no son
correctos**: *0.91* y *0.87* (nunca existieron; los buenos están en el bloque 7) y
la tasa de ahorro *–12.8 %* del Ejemplo 2, que **es –12.9 %**: el backend redondea
con `HALF_UP` y `ops/ejemplos.mjs` lo corrigió el 2026-08-19.

---

## Checklist antes de grabar

| | ✅ |
|---|---|
| `ops/ejemplos.mjs` en verde **contra producción** (54/54) | ⬜ |
| `demo-movimientos.csv` importado **de prueba** y las categorías salen bien | ⬜ |
| El `curl` del bloque 2 probado, con el JSON en un archivo aparte | ⬜ |
| 🇧🇷 `IFOOD *PEDIDO` → `Alimentação` **probado ese mismo día** | ⬜ |
| 🇧🇷 Traducciones al portugués revisadas por alguien que lo habla (D17) | ⬜ |
| Datos de demo cargados y verificados | ⬜ |
| **Ningún dato personal real** en pantalla: correos, nombres, notificaciones | ⬜ |
| **Ninguna credencial visible**: terminal, `.env` abiertos, pestañas, gestor de contraseñas | ⬜ |
| Navegador sin extensiones ni marcadores personales a la vista | ⬜ |
| Terminal con letra **grande**: tiene que leerse en un móvil | ⬜ |
| Audio probado — es lo que más se descuida | ⬜ |
| Duración por debajo del tope oficial | ⬜ |

---

## Plan B, si el sitio se cae el día de grabar

Se graba **todo en local** con `./ops/stack.sh arriba`, cambiando el dominio por
`localhost` en los bloques 2, 3 y 8. La semilla es **determinista** — los mismos
datos siempre, en cualquier máquina —, así que la grabación es reproducible.

El requisito de OCI **ya está cumplido y documentado**: si el sitio no responde, el
bloque 9 se apoya en el diagrama y en
[`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md), que lleva
el registro del despliegue. Ver [ADR-0008](../adr/0008-infra-no-bloquea-app.md):
la infraestructura nunca bloquea a la aplicación, y tampoco al video.
