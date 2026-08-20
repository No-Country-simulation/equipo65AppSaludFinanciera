# ENUNCIADO OFICIAL - Hackathon ONE G9 (Alura + Oracle)

> 📌 **FUENTE EXTERNA. NO SE EDITA.**
>
> Esto es la transcripción del enunciado del hackathon, reorganizada para poder
> leerla, pero **sin cambiar ni una palabra de lo que pide**. Es el **contrato con
> el jurado**.
>
> - **Lo que el hackathon exige** → este documento.
> - **Lo que nosotros decidimos hacer** → [`REQUISITOS.md`](REQUISITOS.md).
> - **Verificación punto por punto** → [`../entrega/CHECKLIST.md`](../entrega/CHECKLIST.md).
>
> Si alguna vez hay duda sobre si algo es obligatorio o si lo inventamos nosotros,
> **la respuesta está aquí**.

- **Convocatoria**: Hackathon ONE - Proyectos G9 | Alura + Oracle
- **Enlace**: <https://alura-es-cursos.github.io/proyectos-hackathon-g9-latam/>
- **Área**: Fintech / Educación Financiera / Billeteras Digitales
- **Entrega**: video demostrando el funcionamiento, antes del **23 de agosto de 2026**

---

## 1. El problema

> Soluciones orientadas a usuarios que desean comprender mejor sus hábitos
> financieros, organizar sus gastos y tomar decisiones más conscientes sobre su
> dinero.

Crear una solución inteligente capaz de **analizar el comportamiento financiero de
un usuario** a partir de sus transacciones e información financiera, generando una
visión más completa de su **salud financiera**.

La solución deberá recibir información relacionada con gastos y hábitos
financieros: descripción de transacciones, montos, categorías de gastos, ingresos
mensuales, frecuencia de ahorro, nivel de endeudamiento y otros indicadores
relevantes.

Con base en estos datos, el sistema deberá ser capaz de:

1. Clasificar automáticamente los gastos en categorías financieras.
2. Identificar patrones de consumo.
3. Clasificar el perfil financiero del usuario.
4. Generar indicadores que ayuden a comprender los hábitos financieros.
5. Presentar recomendaciones simples para mejorar la salud financiera.

**Dos requisitos técnicos transversales:**

- La solución deberá devolver los resultados **en formato JSON**.
- La solución deberá utilizar **servicios OCI** para el almacenamiento,
  procesamiento o despliegue de la aplicación.

## 2. Necesidad del cliente

> Muchas personas tienen acceso a los datos de sus transacciones, pero tienen
> dificultades para transformar esa información en conocimiento útil para la toma de
> decisiones.

La solución debe permitir:

- Organizar automáticamente gastos e ingresos.
- Comprender hacia dónde se dirige el dinero.
- Identificar hábitos financieros positivos o de riesgo.
- Recibir recomendaciones simples de mejora.
- **Realizar un seguimiento de la evolución del comportamiento financiero a lo largo
  del tiempo.**

> *(Este último punto es el que sostiene nuestro diferencial: el gráfico de
> evolución del perfil. No es un extra que inventamos - está en el enunciado.)*

## 3. Validación de mercado

El mercado de las fintechs, los bancos digitales y las plataformas de educación
financiera continúa en expansión. Los usuarios buscan herramientas que les permitan
automatizar el control financiero, comprender patrones de consumo, mejorar la
capacidad de planificación, reducir riesgos financieros y recibir recomendaciones
personalizadas.

> **Las soluciones que combinan el análisis de gastos y la evaluación del perfil
> financiero generan más valor que los clasificadores aislados**, ya que ofrecen una
> visión más amplia del comportamiento del usuario.

*(Es decir: no alcanza con clasificar transacciones. Hay que **diagnosticar**. Por
eso hay dos modelos, M1 y M2, y no uno.)*

## 4. Objetivo del hackathon

Desarrollar un **MVP funcional** capaz de:

1. Clasificar automáticamente los gastos financieros.
2. Analizar el comportamiento financiero del usuario.
3. Generar una clasificación del perfil financiero.
4. Presentar recomendaciones personalizadas.
5. Poner los resultados a disposición mediante una **API REST**.
6. Utilizar **al menos un servicio OCI** como parte de la arquitectura.

---

## 5. Resultados esperados

### 5.1 Ciencia de Datos - un notebook que contenga

| # | Contenido |
|---|---|
| 1 | Exploración y limpieza de datos (EDA) |
| 2 | Procesamiento de variables financieras y textuales |
| 3 | Ingeniería de atributos |
| 4 | Clasificación de gastos |
| 5 | Análisis del perfil financiero |
| 6 | Entrenamiento y evaluación de modelos |
| 7 | Métricas de rendimiento adecuadas |
| 8 | Serialización de los modelos |

### 5.2 Back-End - una API REST que contenga

| # | Contenido |
|---|---|
| 1 | Endpoint para análisis financiero |
| 2 | Endpoint para clasificación de transacciones |
| 3 | Validación de entrada |
| 4 | Manejo de errores |
| 5 | Documentación de los endpoints |

### 5.3 OCI - al menos uno de estos servicios

- **Object Storage** para almacenamiento de modelos o datos.
- **OCI Compute** para el alojamiento de la aplicación.
- **OCI Functions** para procesamiento específico.
- **Base de datos** opcional para la persistencia de información.

> ⚠️ Dice **"al menos uno"**. ✅ **Se usan cuatro** (2026-08-20): **Compute** para
> alojar la aplicación, **Container Registry** para las imágenes, **Vault** para
> los secretos y **Bastion** para el acceso administrativo. Object Storage se
> planeó y no se usó. El resto es diferenciación, no requisito — ver
> [ADR-0008](../adr/0008-infra-no-bloquea-app.md).

---

## 6. Funcionalidades obligatorias (MVP)

### 6.1 Clasificación de transacciones

El sistema deberá clasificar automáticamente los gastos en categorías como:

`Alimentación` · `Transporte` · `Salud` · `Vivienda` · `Educación` · `Ocio` ·
`Servicios` · **y otras categorías definidas por el equipo**.

> La frase *"otras categorías definidas por el equipo"* es la que nos habilita a
> usar nuestras 12. Ver [`../datos/TAXONOMIA.md`](../datos/TAXONOMIA.md).

### 6.2 Análisis del perfil financiero

El sistema deberá generar una evaluación del perfil financiero del usuario.
Ejemplos de categorías:

`Saludable` · `En observación` · `En riesgo`

> **Las categorías podrán ser adaptadas por el equipo según la estrategia adoptada.**
> *(Nosotros mantenemos estas tres.)*

### 6.3 Recomendaciones financieras

Recomendaciones **simples y objetivas** con base en los resultados. Ejemplos:

- Reducir los gastos en una determinada categoría.
- Aumentar la frecuencia de ahorro.
- Mejorar el control de los gastos recurrentes.

---

## 7. Ejemplo de uso (textual del enunciado)

**Endpoint**: `POST /analisis-financiero`

**Entrada:**

```json
{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "frecuencia_ahorro": "Media",
  "transacciones": [
    { "descripcion": "Supermercado", "valor": 420 },
    { "descripcion": "Combustible",  "valor": 300 },
    { "descripcion": "Streaming",    "valor": 40 }
  ]
}
```

**Salida:**

```json
{
  "perfil_financiero": "En observación",
  "probabilidad": 0.82,
  "resumen_gastos": {
    "alimentacion": 420,
    "transporte": 300,
    "entretenimiento": 40
  },
  "recomendaciones": [
    "Monitorear los gastos recurrentes de entretenimiento",
    "Aumentar la reserva financiera mensual"
  ]
}
```

> ⚠️ **Dos cosas que hay que saber de este ejemplo:**
>
> 1. **La salida usa la clave `entretenimiento`**, aunque la lista de categorías
>    obligatorias (§6.1) dice *"Ocio"*. Es una inconsistencia del propio enunciado.
>    Nosotros usamos `entretenimiento`, para ser consistentes con este ejemplo - que
>    es lo que el jurado va a ejecutar.
> 2. **El ejemplo no es internamente consistente**: 3 transacciones que suman 760
>    sobre un ingreso de 4.500 implican una tasa de ahorro del **83%**. Recomendarle
>    a esa persona *"aumentar la reserva financiera"* sería incorrecto. Es un ejemplo
>    **ilustrativo del formato**, no un caso real. Cómo lo resolvemos (y cómo se
>    defiende ante el jurado): [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md#ejemplo-1).
>
> **El formato de salida SÍ se respeta al pie de la letra**: los 4 campos
> `perfil_financiero`, `probabilidad`, `resumen_gastos` y `recomendaciones` salen
> exactamente con esos nombres.

---

## 8. Requisitos mínimos (los 8 que se verifican)

| # | Requisito |
|---|---|
| 1 | Modelo entrenado y cargado correctamente |
| 2 | Validación de entrada |
| 3 | Clasificación funcional de las transacciones |
| 4 | Análisis del perfil financiero |
| 5 | Generación de recomendaciones |
| 6 | API documentada |
| 7 | Integración con OCI |
| 8 | Mínimo de **tres ejemplos reales de uso** |

**Si falta uno solo, el proyecto no compite.** Seguimiento en
[`../entrega/CHECKLIST.md`](../entrega/CHECKLIST.md) §1.

## 9. Recursos opcionales (valorados)

| Recurso | ¿Lo hacemos? |
|---|---|
| Dashboard financiero | ✅ Sí |
| Visualización de la evolución financiera | ✅ Sí |
| Procesamiento por lotes mediante CSV | ✅ Sí |
| Historial de análisis | ✅ Sí |
| Containerización con Docker | ✅ Sí |
| Pruebas automatizadas | ✅ Sí |
| Explicabilidad de los modelos | 🟡 Si da el tiempo |
| Alertas de gastos elevados | ❌ No - [ROADMAP](../futuro/ROADMAP.md) |
| Exportación de informes | ❌ No - [ROADMAP](../futuro/ROADMAP.md) |

---

## 10. Directrices

### 10.1 Ciencia de Datos

> **Cada equipo deberá construir su propio conjunto de datos financieros.**

Los datos podrán ser:

- Obtenidos de fuentes públicas.
- **Generados mediante simulaciones.** ← *nuestra elección ([ADR-0006](../adr/0006-dataset-sintetico.md))*
- Construidos manualmente por el equipo.

**Se recomienda utilizar**: Python · Pandas · Scikit-Learn · técnicas de
clasificación supervisada · ingeniería de atributos · modelos de clasificación
adecuados para el problema.

> **Se permite el uso de otros enfoques.**

### 10.2 Back-End

> El equipo deberá desarrollar una API REST, **preferentemente** utilizando **Java
> con Spring Boot**.

La solución deberá:

- Recibir información financiera.
- Procesar clasificaciones y análisis.
- Devolver respuestas estructuradas en formato JSON.
- **Integrar el modelo de Ciencia de Datos con el backend.**
- **La arquitectura adoptada deberá ser documentada por el equipo.**

> ⚠️ Dice **"preferentemente"**, no "obligatoriamente". Aun así, elegimos Java +
> Spring Boot ([ADR-0002](../adr/0002-tres-servicios.md)) - y resolvemos "integrar
> el modelo con el backend" con un servicio de inferencia en Python, porque **Java no
> puede cargar un `.joblib` de scikit-learn**.
>
> **"La arquitectura deberá ser documentada"** es un requisito explícito, y está
> cubierto: [`../arquitectura/SYSTEM_DESIGN.md`](../arquitectura/SYSTEM_DESIGN.md),
> [`DIAGRAMAS.md`](../arquitectura/DIAGRAMAS.md) y los [15 ADR](../adr/).

### 10.3 OCI

> **La solución debe utilizar al menos un servicio OCI como parte obligatoria del
> proyecto.**

---

## 11. Lo que el enunciado NO dice (y hay que averiguar)

⚠️ **Pendiente D16** en `PENDIENTES_ANGEL.md` - hay que
leer las **bases oficiales completas** en la Semana 1:

- ¿Cuál es la **duración máxima del video**?
- ¿**Dónde se sube** y en qué formato?
- ¿Hay **presentación en vivo** ante el jurado, además del video?
- ¿Cuáles son los **criterios de evaluación** y su peso?
- ¿Hay que entregar algo más (documento, slides, repositorio en un formato concreto)?

**Si las bases piden algo que no está en este documento, se agrega aquí y al
CHECKLIST el mismo día que se descubra.** Descubrirlo en la Semana 5 sería fatal.
