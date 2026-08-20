# ADR-0009 - Multi-idioma: español, inglés y portugués

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13
- **Supersede**: la decisión TBD2 de [`../producto/REQUISITOS.md`](../producto/REQUISITOS.md)

## Contexto

El hackathon es **Alura + Oracle**, y **Alura es una empresa brasileña**: una parte
importante del jurado es de **Brasil**. La convocatoria es **LATAM**, así que también
hay evaluadores hispanohablantes, y el inglés es el idioma franco de cualquier
demostración técnica.

Un producto que solo habla español ante un jurado que piensa en portugués parte con
desventaja, y es una desventaja **evitable**.

## Decisión

**La aplicación soporta tres idiomas desde el diseño**: `es` (español, por defecto),
`pt` (portugués de Brasil) e `en` (inglés).

Y -esto es lo importante- **el multi-idioma NO es solo la interfaz**. Toca cuatro
capas:

| Capa | Qué implica |
|---|---|
| **Web** | `next-intl` con rutas por locale (`/es`, `/pt`, `/en`). Se decide **antes** de escribir la primera pantalla |
| **API** | Cabecera `Accept-Language`. `perfil_financiero`, `recomendaciones` y los mensajes de error se devuelven en el idioma pedido |
| **BD** | Tabla `categoria_i18n` (12 categorías × 3 idiomas) + columna `usuario.idioma` |
| **Modelo (M1)** | ⚠️ **El clasificador de transacciones tiene que entender descripciones en los tres idiomas.** Esto es lo que de verdad cuesta |

## Lo que casi se pasa por alto: el modelo

Traducir botones es trivial. **El problema real es M1.**

El clasificador de transacciones aprende de **texto libre de extractos bancarios**.
Si se entrena solo con comercios mexicanos en español, va a fallar con:

```
IFOOD *PEDIDO            <- delivery, Brasil     -> deberia ser alimentacion
PIX RECEBIDO SALARIO     <- transferencia, Brasil -> deberia ser ingresos
MAGAZINE LUIZA           <- retail, Brasil        -> deberia ser compras
UBER *EATS               <- delivery, EE.UU.      -> deberia ser alimentacion
WHOLE FOODS MARKET       <- supermercado, EE.UU.  -> deberia ser alimentacion
CONTA DE LUZ ENEL        <- servicios, Brasil     -> deberia ser servicios
```

Y no fallaría con un error ruidoso: devolvería **`otros`** en silencio. **Un jurado
brasileño escribiendo `"IFOOD"` y viendo `Otros` es el peor momento posible de la
demo.**

**Cómo lo resolvemos:**

1. **Un solo modelo M1, entrenado con los tres idiomas mezclados.** No tres modelos.
2. El `TfidfVectorizer` usa **`char_wb` de 3-5 caracteres** además de las palabras.
   Los n-gramas de caracteres capturan raíces compartidas entre lenguas romances
   (`supermerc-`, `farmac-`, `restaur-`, `combustí-`/`combustí`) y hacen al modelo
   sorprendentemente robusto entre español y portugués, incluso con palabras que
   nunca vio.
3. El **generador de dataset** produce transacciones en los tres idiomas, con
   **comercios reales de cada mercado** (ver [`../datos/DATASET.md`](../datos/DATASET.md) §5).
4. El **set de validación manual** incluye transacciones en los tres idiomas,
   escritas por personas distintas.
5. Se reporta el **macro-F1 por idioma**, no solo el global. Un 0.90 global que
   esconde un 0.62 en portugués es una métrica que miente.

> **Ventaja inesperada**: un modelo entrenado en tres idiomas es *mejor* material de
> presentación que uno monolingüe. Demuestra que se entendió el problema.

## Alternativas consideradas

**Solo español.** Lo más simple y lo que estaba planeado. Descartada: desperdicia una
ventaja gratuita frente a un jurado mayoritariamente brasileño, y agregar i18n
*después* de escribir 20 pantallas cuesta el triple.

**Español + inglés, sin portugués.** Descartada: el portugués es justamente el que
importa para este jurado. Sería hacer el trabajo y saltarse el motivo.

**Traducir con un LLM en tiempo real.** Descartada por las mismas razones del
[ADR-0007](0007-recomendaciones-por-reglas.md): no determinista, dependencia de red
en el camino crítico, cuesta. Las traducciones son **estáticas y finitas** (12
categorías, 3 perfiles, ~11 recomendaciones, ~25 mensajes de error): son archivos de
recursos, no un problema de IA.

**Tres modelos M1, uno por idioma.** Descartada: triplica el entrenamiento, la
evaluación y el despliegue, y exige **detectar el idioma de cada transacción** antes
de clasificarla - un problema nuevo y una fuente de errores nueva. Un solo modelo con
n-gramas de caracteres es más simple **y** más robusto ante texto mezclado (un usuario
brasileño con una suscripción a `NETFLIX.COM`).

## Consecuencias

**A favor:**

- **Habla el idioma del jurado.** En el video se cambia a `pt-BR` en vivo y se muestra
  `IFOOD *PEDIDO` clasificado correctamente. Son 15 segundos y valen mucho.
- Se decide **antes** de escribir la primera pantalla, que es cuando i18n es barato.
- El modelo multilingüe es genuinamente mejor ingeniería.
- Multi-moneda (BRL ya estaba en la lista) y multi-idioma se refuerzan: el mercado
  brasileño queda cubierto de punta a punta.

**En contra (asumido):**

- **El dataset se hace más grande y más caro de generar**: hay que investigar
  comercios reales de Brasil y EE.UU., no solo de México. Es trabajo real para la
  persona de Data.
- **Más superficie de traducción que mantener**: cada recomendación nueva son 3
  textos, no 1. Se mitiga con `codigo` + parámetros (el texto se renderiza desde un
  bundle, no se hardcodea).
- **Riesgo de traducciones malas.** El equipo probablemente no tiene un hablante
  nativo de portugués. Mitigación: los textos son **cortos y técnicos** (12 categorías,
  3 perfiles, 11 recomendaciones), y **hay que pedirle a alguien que hable portugués
  que los revise** - está en `PENDIENTES_ANGEL`. Un portugués evidentemente traducido
  con Google Translate ante un jurado brasileño es **peor que no tener portugués**.
- **El macro-F1 va a bajar** respecto de un modelo monolingüe. Es esperable y hay que
  decirlo en el notebook, con el desglose por idioma.
