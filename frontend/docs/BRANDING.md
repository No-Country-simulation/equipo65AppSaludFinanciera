# Branding - nombre, color e identidad *(TODO pendiente de decisión del equipo)*

> **Estado: propuesta.** Nada de esto está decidido (D4/TBD1 en
> [`../PENDIENTES_ANGEL.md`](PENDIENTES_ANGEL.md)). El codename `financeAI`
> se usa en toda la doc y el código hasta que el equipo elija. Cuando se
> decida: renombrar repo, dominio (D9), doc y marcar D4.

## §1 Criterios para el nombre

1. **Funciona en los 3 idiomas** (es · pt · en): se pronuncia sin esfuerzo y no
   significa nada raro en ninguno. Buena parte del jurado es de Brasil.
2. **Slug-safe**: sirve como dominio, subdominio, handle y nombre de repo,
   sin acentos ni espacios.
3. **Evoca el dominio** (salud/claridad financiera) sin sonar a banco ni a
   asesor regulado (anti-alcance del proyecto).
4. **Verificar antes de decidir**: dominio libre, sin app conocida con el mismo
   nombre en las tiendas, sin marca registrada evidente en el rubro.

## §2 Propuestas

| Nombre | Idea detrás | es | pt | en |
|---|---|---|---|---|
| **Fluxa** | Flujo de dinero, movimiento; corto y marcable | ✓ | ✓ (*fluxo*) | ✓ |
| **Faro** | El faro que orienta tus finanzas; misma palabra en es/pt | ✓ | ✓ | △ se explica solo en la demo |
| **Pulso** | El "pulso" de tu salud financiera; encaja con el perfil (chequeo médico) | ✓ | ✓ | △ (*pulse*) |
| **Norte** | "Tener norte": rumbo financiero claro | ✓ | ✓ (*norte/rumo*) | △ |
| **Equilibra** | Verbo real en es y pt: equilibrar ingresos y gastos | ✓ | ✓ | △ |
| **FinVital** | Salud (vital) + finanzas; suena a producto | ✓ | ✓ | ✓ |

Notas:

- △ = en inglés no es palabra común, pero se pronuncia bien - aceptable porque
  el jurado principal es hispano/brasileño.
- Se descartaron: nombres con "AI" genérico (suena a plantilla), palabras con
  acentos/ñ (rompen el criterio slug), y nombres ya usados por fintechs
  conocidas de la región (ej. Quipu, Clara, Ualá…).
- El codename **financeAI** puede quedarse como fallback consciente, pero
  contradice el criterio 3 (genérico) - decidirlo, no dejarlo por inercia.

## §3 Psicología del color (propuesta del equipo, 2026-07)

Aporte del equipo en las notas de la semana 0. Mapea bien con la semántica que
las interfaces ya usan:

| Color | Evoca | Uso en el producto |
|---|---|---|
| 🟦 Azul | Confianza, seguridad, tecnología | Marca / acentos secundarios |
| 🟩 Verde | Ahorro, crecimiento, dinero | Color primario actual de las interfaces; perfil `saludable`; positivos |
| 🟨 Amarillo | Advertencia, atención | Perfil `en_observacion`; alertas de presupuesto |
| 🟥 Rojo | Riesgo, deudas | Perfil `en_riesgo`; gastos excedidos; errores |
| ⬜ Blanco | Limpieza | Fondos y tarjetas (tema claro) |
| ⬛ Gris | Neutralidad | Texto secundario, estados vacíos |

Regla ya aplicada en web y móvil: el color **refuerza** el estado del perfil
(verde/amarillo/rojo) y no se usa para otra cosa que pueda confundir esa
lectura.

## §4 Qué falta para cerrar esto

| # | Acción | Quién |
|---|---|---|
| ⬜ | Elegir nombre (votación corta en la primera reunión con esta tabla) | Equipo |
| ⬜ | Verificar dominio + tiendas + marca | Angel |
| ⬜ | Renombrar repo/subdominio/doc y logo simple (texto basta para la demo) | Angel + agente |
