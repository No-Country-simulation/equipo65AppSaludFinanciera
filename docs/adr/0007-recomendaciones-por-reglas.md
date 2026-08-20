# ADR-0007 - Recomendaciones por motor de reglas, no con un LLM

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13

## Contexto

El enunciado pide: *"La solución deberá generar recomendaciones simples y objetivas
con base en los resultados obtenidos"*, con ejemplos como *"Reducir los gastos en
una determinada categoría"* o *"Aumentar la frecuencia de ahorro"*.

En 2026 la tentación obvia es enchufar un LLM: se le pasan los indicadores y
devuelve recomendaciones en lenguaje natural, bonitas y variadas. El proyecto
además llevaba entonces el codename `financeAI` (hoy **Fintech Vital**).

## Decisión

**Motor de reglas determinista en Spring Boot.** Cada recomendación es una regla
`condición → (código, texto, prioridad, indicador que la disparó)`. El catálogo
completo está en [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md) §4.

**No se usa ningún LLM en el camino de la recomendación.**

## Alternativas consideradas

**LLM (Claude/GPT) generando las recomendaciones.** Texto más natural, más
variado, y suena más impresionante. **Descartada**, y vale la pena ser explícito
sobre el porqué, porque parece la opción "moderna":

- **No es explicable.** El enunciado lista la *explicabilidad de los modelos* entre
  los recursos valorados. Con una regla se puede señalar exactamente qué indicador
  disparó qué consejo. Con un LLM, la respuesta a *"¿por qué me dijo esto?"* es "no
  sé".
- **No es determinista.** La misma entrada puede dar textos distintos. En la demo
  es un riesgo puro: si el jurado corre el ejemplo dos veces y ve dos respuestas
  diferentes, el producto parece inestable.
- **Es una dependencia externa en el camino crítico.** Una llamada de red que puede
  fallar, tener latencia o quedarse sin cuota **justo durante la presentación**.
- **Puede alucinar consejos financieros.** En un dominio fintech, un LLM que
  inventa una recomendación de inversión es un problema real, no teórico.
- **Cuesta dinero** y requiere una API key (otro pendiente para Angel, otro
  secreto que gestionar).
- Y la razón de fondo: **el trabajo de IA del proyecto son los dos modelos
  entrenados**. Ese es el entregable que evalúa Data Science. Meter un LLM para
  redactar frases no agrega inteligencia; agrega superficie de fallo.

**Reglas + un LLM solo para redactar el texto final.** Lo mejor de ambos, en
teoría. Descartada: mantiene todos los costos operativos (dependencia, latencia,
key, no-determinismo) a cambio de que las frases suenen mejor. No compensa.

## Consecuencias

**A favor:**

- **Determinista**: la misma entrada da siempre la misma salida. La demo es
  reproducible al 100%.
- **Explicable**: cada recomendación devuelve el `indicador` que la disparó. El
  frontend puede mostrar *"esto te lo decimos porque tu tasa de ahorro es 4%"*.
- **Auditable**: las reglas están en una tabla en la documentación. Cualquiera del
  equipo (o del jurado) puede leerlas y discutirlas.
- **Cero latencia, cero costo, cero dependencias.**
- Es **testeable**: cada regla tiene su test unitario con su caso borde.

**En contra (asumido):**

- **Los textos son fijos.** Suenan a plantilla, porque lo son. Se mitiga
  interpolando la categoría concreta (*"Reducir los gastos en alimentación"*, no
  *"en una categoría"*) y con la lista de la TAXONOMIA §4, que cubre los casos que
  importan.
- **No captura combinaciones raras** que un modelo o un LLM podrían notar. Para un
  MVP con 8 indicadores, el espacio de casos es chico y las reglas lo cubren bien.
- **Los umbrales son un juicio, no ciencia** (0.40 de endeudamiento, 0.30 de gasto
  discrecional…). Se ajustan con la distribución real del dataset en la S2 y se
  documenta el porqué en el notebook. **Está bien que sea un juicio, siempre que
  esté escrito y sea discutible** - que es exactamente lo que un LLM no ofrece.

> **Si en la presentación preguntan "¿por qué no usaron un LLM?"**, la respuesta es
> esta: *porque en fintech una recomendación tiene que poder explicarse, y porque
> el componente de IA del proyecto son los modelos entrenados, no un generador de
> frases.* Es una respuesta fuerte, no una excusa.
