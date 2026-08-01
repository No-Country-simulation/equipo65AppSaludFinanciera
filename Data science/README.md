# 📊 Clasificación Automática de Transacciones Financieras y ML

Este proyecto forma parte del backend/procesamiento de datos para la aplicación de **Salud Financiera**. Contiene el pipeline para la preparación de los datos bancarios, el mapeo a macro-categorías y el entrenamiento de un modelo de Machine Learning capaz de clasificar nuevas transacciones en tiempo real.

---

## 🛠️ Tecnologías Utilizadas

* **Python 3.x**
* **Pandas**: Limpieza, manipulación y transformación de datos.
* **Scikit-Learn**: 
  * `TfidfVectorizer`: Extracción de características de texto (N-grams).
  * `LogisticRegression`: Modelo clasificador.
  * `Pipeline`: Automatización del flujo de trabajo de ML.
* **Joblib**: Exportación del modelo entrenado a formato `.pkl`.

---

## 📋 Flujo del Proyecto

### 1. Preparación del Dataset (`banco_transacciones.csv`)
* **Mapeo a Macro-Categorías**: Transforma subcategorías (ej. *Supermercado*, *Bus*, *Streaming*) en categorías principales (*Alimentación*, *Transporte*, *Ocio*, *Servicios*, etc.).
* **Ajuste de Signo Monetario**: Asigna valores positivos a los ingresos y negativos a los egresos.
* **Procesamiento Temporal**: Extracción del periodo año-mes (`Mes_Año`) para análisis financieros dentro de la app.
* **Exportación**: Genera `banco_transacciones_clasificado.csv`.

### 2. Entrenamiento del Modelo de IA
* **Vectorización NLP**: Convierte los nombres/descripciones del comercio (ej. *"Amazon Prime"*, *"Costco"*) en matrices numéricas usando `TF-IDF` con un rango de unigramas y bigramas `(1, 2)`.
* **División de Datos**: Separación estratificada en 80% Entrenamiento y 20% Prueba.
* **Entrenamiento**: Modelo de Regresión Logística dentro de un `Pipeline` unificado.
* **Resultado**: Precisión óptima en el conjunto de validación.

---

## 🚀 Uso Rápido

### Requisitos previos
```bash
pip install pandas scikit-learn joblib

# Genera banco_transacciones_clasificado.csv
python preparacion_data.py

# Genera modelo_clasificador_salud_financiera.pkl
python entrenar_modelo.py


# 💳 Análisis de Salud Financiera y Clasificación de Perfiles

Módulo encargado de evaluar la salud financiera del usuario y clasificar sus hábitos de gasto a partir de datos transaccionales, métricas crediticias y de ingresos. Utiliza técnicas de Ingeniería de Atributos y un algoritmo **Random Forest** para clasificar y diagnosticar patrones de comportamiento económico.

---

## 🛠️ Tecnologías Utilizadas

* **Python 3.x**
* **Pandas & NumPy**: Procesamiento vectorial e ingeniería de atributos.
* **Matplotlib & Seaborn**: Visualización de métricas y comportamientos de gasto.
* **Scikit-Learn**:
  * `LabelEncoder` & `StandardScaler`: Preprocesamiento y escalado de variables.
  * `RandomForestClassifier`: Algoritmo ensamble para la clasificación de gastos/perfiles.

---

## 🧠 Características e Ingeniería de Atributos (Feature Engineering)

El pipeline transforma variables crudas en datos contextuales financieros:

* **Detección de Patrones Temporales**: Flag `es_fin_de_semana` derivado de las marcas de tiempo.
* **Ratio Gasto/Ingreso**: Variable continua (`ratio_gasto_ingreso = Cantidad_Monto / Ingreso_Mensual`) que mide el impacto del gasto individual sobre el ingreso total.
* **Normalización de Variables**: Escalado estándar para el score de Buró de Crédito y montos (`StandardScaler`).
* **Codificación Categórica**: Transformación de descripciones de comercio a valores numéricos (`LabelEncoder`).

---

## 📊 Reglas de Negocio / Perfiles de Salud Financiera

El sistema evalúa indicadores clave como:
1. 🟩 **Saludable (Ahorrador)**: Bajo ratio de deuda, capacidad de ahorro activa y score crediticio alto.
2. 🟨 **Equilibrado**: Balance neutro entre ingresos y egresos, gastos de ocio bajo control.
3. 🟥 **Alto Riesgo (Sobreendeudado)**: Elevado nivel de gasto frente al ingreso, estatus de adeudo o puntaje buró bajo.

---

## 🚀 Estructura del Código

```bash
├── Carga de Datos (Estructura JSON / DataFrame)
├── Transformación & Feature Engineering (Ratios, Fechas)
├── Preprocesamiento (StandardScaler, LabelEncoder)
├── División Train/Test (80/20)
└── Entrenamiento del Clasificador (RandomForest)


pip install pandas numpy matplotlib seaborn scikit-learn