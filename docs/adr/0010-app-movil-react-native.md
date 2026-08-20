# ADR-0010 - App móvil con React Native (Expo), además de la web

- **Estado**: Aceptada
- **Fecha**: 2026-07-15
- **Amplía**: [ADR-0002](0002-tres-servicios.md) (se agrega un cuarto cliente; los
  tres servicios no cambian). **Modifica** el anti-alcance de
  [`REQUISITOS.md`](../producto/REQUISITOS.md) §6 ("No hay app móvil").

## Contexto

REQUISITOS §6 decía "**No hay app móvil.** Web responsive". El equipo decidió en
su primera conversación que quiere una **app móvil nativa**, con la app de banca
de **BBVA como referencia visual** (dashboard con gráficos de gastos, movimientos,
navegación por tabs). El enunciado del hackathon no exige app móvil, pero tampoco
la prohíbe, y en el video demo una app móvil que se ve como una fintech real suma.

Restricciones: el equipo frontend domina JavaScript/TypeScript/React (por eso la
web es Next.js), hay 1 fullstack para todo el frontend, y quedan ~5 semanas.

## Decisión

Se agrega **`mobile/` - React Native con Expo (TypeScript)** como segundo cliente
de la **misma API pública** de Spring Boot. La web Next.js **se mantiene** tal
como estaba decidida (es la que consume el jurado vía navegador y la que se
despliega en OCI).

- Los dos clientes consumen **el mismo** [`CONTRATO_API.md`](../arquitectura/CONTRATO_API.md);
  la app móvil no pide ningún endpoint nuevo.
- Los **tipos TypeScript del contrato y los fixtures** se escriben una vez y se
  comparten por copia estructurada (mismo archivo en `web/src/data` y
  `mobile/src/data`) hasta que exista un paquete compartido.
- La app móvil respeta las mismas reglas duras: slugs nunca traducidos, etiquetas
  desde la API, trilingüe `es`/`pt`/`en`, nada de lógica de negocio en el cliente.

## Alternativas consideradas

- **Solo web responsive** *(lo decidido originalmente)*: descartada por decisión
  del equipo; una app móvil instalada da una demo más convincente estilo fintech.
- **Flutter**: descartada - nadie en el equipo escribe Dart; con React Native el
  fullstack reutiliza React, TypeScript y la capa de datos del contrato.
- **PWA / Capacitor envolviendo la web Next.js**: descartada - no da la
  experiencia nativa (tabs, gestos, splash) que el equipo quiere imitar de BBVA,
  y encadena el ciclo de release móvil al de la web.
- **React Native "bare" sin Expo**: descartada - Expo elimina la configuración
  nativa de Android/iOS, corre en el emulador con un comando y el equipo no
  necesita módulos nativos custom en este alcance.

## Consecuencias

- ✅ Demo móvil instalable (emulador o dispositivo) con la estética de banca que
  el equipo quiere; la web sigue cubriendo el requisito de siempre.
- ✅ Reuso real: tipos del contrato, fixtures, lógica de formato e i18n se
  comparten entre web y móvil.
- ❌ **Más superficie para el mismo equipo**: dos frontends que mantener con 1
  fullstack. Mitigación: la **web es el entregable principal**; la móvil es
  *best-effort* y **nunca bloquea la entrega** (misma filosofía que ADR-0008).
- ❌ CI y verificación extra (lint + typecheck de `mobile/`).
- ❌ La app móvil **no se publica en stores** en este alcance (correría en
  emulador/APK de desarrollo para el video). Publicar es post-hackathon.
