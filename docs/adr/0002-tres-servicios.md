# ADR-0002 - Tres servicios: Spring Boot (API) + FastAPI (modelo) + Next.js (web)

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13

## Contexto

**Esta es la decisión más importante del proyecto.** Es la costura entre el
trabajo de las 2 personas de Data Science y el de los 3 de backend, y determina si
el equipo puede trabajar en paralelo o si una mitad espera a la otra.

Las restricciones:

- El enunciado dice: *"El equipo deberá desarrollar una API REST, **preferentemente**
  utilizando Java con Spring Boot"*. Es una preferencia, no una obligación.
- El enunciado recomienda Python + Pandas + scikit-learn para Data Science.
- **Java no puede cargar un `.pkl`/`.joblib` de scikit-learn.** Este es el hecho
  técnico duro alrededor del cual gira todo.
- El equipo tiene 3 personas de backend (perfil Java) y 2 de data science (perfil
  Python). Ambos grupos necesitan trabajo real desde el día 1.

## Decisión

**Tres servicios:**

1. **Spring Boot (Java 21)** - la API REST pública. Auth, validación, persistencia,
   cálculo de indicadores, motor de reglas. Es lo que ve el jurado.
2. **FastAPI (Python 3.11)** - servicio de inferencia **interno**, no expuesto a
   internet. Carga los modelos de scikit-learn y devuelve predicciones.
3. **Next.js 15** - el dashboard.

Spring Boot llama a FastAPI por HTTP en la red interna. El contrato está congelado
en [`../arquitectura/CONTRATO_MODELO.md`](../arquitectura/CONTRATO_MODELO.md).

**Regla que hace que esto funcione: el servicio de ML no tiene lógica de negocio.**
Recibe features, devuelve predicciones. Los indicadores, las reglas y la
persistencia viven en Spring.

## Alternativas consideradas

**Backend 100% Python (FastAPI), sin Java.** Un solo servicio, cero fricción
DS↔backend, el modelo carga en proceso. Descartada por dos razones: (a) se aparta
de la preferencia explícita del enunciado, que un jurado de Alura+Oracle va a
notar; (b) las 3 personas de backend tienen perfil Java - dejarlas escribiendo
Python es desperdiciar al grupo más grande del equipo.

**Spring Boot + modelo exportado a ONNX/PMML.** Un solo servicio, 100% Java.
Descartada: la conversión de un `Pipeline` de scikit-learn con `TfidfVectorizer`
(que es exactamente lo que necesita M1) a ONNX es **frágil**. `skl2onnx` soporta
TF-IDF con limitaciones, y depurar una discrepancia numérica entre el notebook y
Java se come días que no tenemos. El riesgo no compensa el ahorro de un
contenedor.

**Spring Boot + reglas de negocio en Java, sin modelo.** Rápido y trivial de
desplegar. Descartada: *"modelo entrenado y cargado correctamente"* es un
**requisito mínimo** del enunciado. Sin modelo real, el proyecto queda descalificado
en el criterio de Data Science y las 2 personas de DS no tienen nada que hacer.

## Consecuencias

**A favor:**

- Cumple la preferencia de Java **y** deja a Data Science trabajando en Python
  puro, con sklearn nativo, sin conversiones.
- **Las dos mitades trabajan en paralelo desde el día 1**: backend construye
  contra un stub del ML (`ml/stub/`) que respeta el contrato, y DS entrena contra
  el dataset. El día de la integración se cambia una variable de entorno.
- Los modelos se pueden reentrenar y redesplegar **sin tocar el backend**.
- El backend se puede testear sin Python instalado (el stub es un contenedor).

**En contra (asumido):**

- **Dos servicios que desplegar** en vez de uno. Mitigado: van en el mismo
  `docker-compose`, en la misma instancia.
- **Un salto de red** en el camino crítico (latencia +5-20 ms). Irrelevante para
  este caso de uso.
- **Un modo de fallo nuevo**: si FastAPI muere, la API no puede analizar. Mitigado
  explícitamente: Spring devuelve **503** y el frontend muestra error +
  "Reintentar". **Nunca se inventa una predicción** - es la regla de cero mock
  aplicada al backend.
- **Dos toolchains en CI** (Maven + pip). Aceptable en un monorepo con filtros de
  path.
