# Glosario

## Dominio financiero

| Término | Qué es en este proyecto |
|---|---|
| **Perfil financiero** | La clasificación del usuario: `saludable`, `en_observacion` o `en_riesgo`. La predice el modelo **M2** |
| **Indicador** | Uno de los 8 **ratios** que describen la salud financiera (tasa de ahorro, endeudamiento…). Los calcula **Spring Boot**, no el ML. Son las features de M2. [`datos/TAXONOMIA.md`](datos/TAXONOMIA.md) §3 |
| **Tasa de ahorro** | `(ingreso - gasto_total) / ingreso`. **Negativa = gasta más de lo que gana.** Es el indicador más importante |
| **Nivel de endeudamiento** | Lo **informa el usuario** (0-100), no se calcula. Es el % de su ingreso comprometido en deuda |
| **Gasto esencial** | Alimentación + vivienda + servicios + salud + transporte. Lo que no se puede recortar |
| **Gasto discrecional** | Entretenimiento + compras. Lo recortable |
| **Concentración de gasto** | Qué fracción del gasto total se va en la categoría más pesada. `> 0.5` = todo en una sola cosa |
| **Categoría** | Uno de los **12 slugs** de gasto/ingreso. Ya **no está congelada**: el catálogo lo manda data science y la base se adapta, pero cambiar un slug rompe cuatro capas a la vez ([`TAXONOMIA`](datos/TAXONOMIA.md)) |
| **Recomendación** | La salida de una **regla determinista** sobre los indicadores. **No la genera un LLM** ([ADR-0007](adr/0007-recomendaciones-por-reglas.md)) |
| **Análisis** | Una **foto inmutable**: perfil + indicadores + resumen + recomendaciones + `modelo_version`. Reentrenar no reescribe análisis viejos |
| **Frecuencia de ahorro** | Lo informa el usuario: nula / baja / media / alta → `0/1/2/3` |

## Proyecto

| Término | Qué es |
|---|---|
| **M1** | El clasificador de **transacciones**: descripción de texto → 1 de 12 categorías |
| **M2** | El clasificador de **perfil**: 8 indicadores → 1 de 3 perfiles |
| **`ml-fake` / stub** | El servicio de ML **falso** que respeta el contrato. Permite que el backend trabaje **sin esperar** a Data Science. Vive en `ml/stub/` |
| **Los tres contratos** | [`CONTRATO_API`](arquitectura/CONTRATO_API.md), [`CONTRATO_MODELO`](arquitectura/CONTRATO_MODELO.md), [`TAXONOMIA`](datos/TAXONOMIA.md). Son lo que permitió trabajar en paralelo. Cambiarlos exige un ADR y avisar al equipo |
| **Set de validación manual** | ~300 transacciones **escritas a mano** por el equipo, fuera del generador. **La única métrica honesta** de generalización |
| **Baseline** | El modelo tonto a batir (keywords para M1, regla para M2). Si el modelo no le gana, se dice |
| **Plan B** | Grabar la demo en local si la nube falla. **Ya no hace falta** — se desplegó el 2026-08-20 —, pero sigue disponible: la semilla es determinista y la grabación, reproducible ([ADR-0008](adr/0008-infra-no-bloquea-app.md)) |
| **Cero datos mock** | Regla dura: sin API → error + "Reintentar". Sin modelo → **503**. Durante el desarrollo hubo una **capa mock desacoplada y eliminable**, **ya retirada** (2026-08-14): hoy la única fuente es la API real - [ADR-0011](adr/0011-mocks-desacoplados-frontend.md) |

## Ciencia de datos

| Término | Qué es |
|---|---|
| **macro-F1** | El promedio del F1 **por clase**, sin ponderar por tamaño. **Nuestra métrica principal**, porque las clases están desbalanceadas y el *accuracy* mentiría |
| **Fuga de datos** *(data leakage)* | Que información del set de test se cuele en el entrenamiento. **Nuestro riesgo concreto**: partir por transacción en vez de por usuario. Hay un test que lo verifica |
| **Baseline** | Ver arriba |
| **TF-IDF** | Cómo se convierte el texto de la descripción en números para M1 |
| **Calibración** | `CalibratedClassifierCV`: le da probabilidades a un `LinearSVC`, que de fábrica no las tiene. **Necesario** porque la API devuelve `probabilidad` |
| **SHAP** | Técnica de explicabilidad: cuánto empujó cada indicador el resultado. Opcional en v1.0 |
| **joblib** | El formato de serialización del modelo (mejor que `pickle` crudo para objetos de sklearn) |
| **Arquetipo** | Una plantilla de usuario del generador (estudiante, sobreendeudado…). Da correlaciones realistas entre indicadores |

## Infraestructura

| Término | Qué es |
|---|---|
| **OCI** | Oracle Cloud Infrastructure. **Usarla es requisito obligatorio** del hackathon. Se usan **cuatro** servicios: Compute, Container Registry, Vault y Bastion |
| **Compute (Ampere A1)** | La máquina virtual ARM donde corre todo. **Una sola**, 1 OCPU / 6 GB, en subred privada **sin IP pública** |
| **OCIR** | *OCI Container Registry*. El almacén de las 4 imágenes `arm64`. La instancia las **baja**, no las construye |
| **OCI Bastion** | El único acceso administrativo. Sesiones efímeras y lista blanca de IP |
| **OCI Vault** | Donde viven los secretos de producción |
| **Cloudflare Tunnel** | Conexión **saliente** desde OCI hacia Cloudflare. Publica el sitio **sin abrir ningún puerto**. Es la única entrada |
| **Always Free** | El tier gratuito de OCI. Todo el despliegue cabe dentro: solo se paga el dominio |
| **arm64 / Ampere** | La arquitectura de la instancia. Las imágenes hay que construirlas **para arm64**; una x86 sube sin protestar y revienta al arrancar |
| **Autonomous Database** | La BD gestionada de Oracle. Se **evaluó y se descartó** ([ADR-0014](adr/0014-motor-postgresql.md)): el motor es **PostgreSQL 16** en contenedor |
| **Wallet** | El `.zip` de certificados de Autonomous DB. Ya no aplica; la regla de **no subirlo jamás** se conserva por si queda alguno suelto |
| **Object Storage** | Almacenamiento de objetos de OCI. **Se planeó** para los modelos y datasets y **no se usó**: los `.pkl` viajan dentro de la imagen del servicio de ML |
| **Réplicas del túnel** | Idea del plan original (el mismo túnel en 4 instancias, balanceado por Cloudflare). **No aplica**: hay una sola instancia. ⚠️ Sigue vigente lo importante: **un token identifica un túnel**, así que producción y staging necesitan tokens distintos o Cloudflare reparte el tráfico entre ambos |
| **Terraform / Ansible** | **No se usan.** Se planearon para crear y configurar la infra; al final la instancia se creó a mano y el despliegue lo hacen scripts propios en `ops/oci/` |
| **Instance Principal** | Que la instancia se autentique contra OCI con su propia identidad, sin llaves guardadas. **No se llegó a usar** |
| **gitleaks** | Escáner de secretos. **Previsto** para pre-commit y CI, todavía sin montar: hoy la auditoría de secretos es manual antes de publicar. **El repo es público** |
