# financeAI - móvil (React Native + Expo)

App móvil del proyecto (referencia visual: BBVA). Misma cobertura funcional
que la web: login/registro con 2FA, inicio con perfil financiero y gastos por
categoría, movimientos, presupuestos, metas, análisis con recomendaciones y
evolución, perfil. **Trilingüe: español · português · english.**

## Versiones

| Dependencia | Versión |
|---|---|
| Expo | **SDK 57** (~57.0.6) |
| React Native | **0.86.0** |
| React | **19.2.3** |
| Expo Router (navegación por archivos) | SDK 57 |
| TypeScript | **6.0** |
| AsyncStorage | 2.2 |
| Reanimated / Gesture Handler | 4.5 / 2.32 |
| Node.js requerido | **20+** |

## Cómo correrla

**Emulador Android** (recomendado para desarrollo):

```powershell
..\scripts\windows\movil-emulador.ps1     # Windows: arranca el AVD y Expo
```

```bash
../scripts/linux/movil-emulador.sh        # Linux (macos/ para Mac)
```

**Teléfono físico** (sin Android Studio): instala [Expo Go](https://expo.dev/go)
en el teléfono, conéctalo al mismo Wi-Fi que tu máquina y:

```bash
npm install
npx expo start          # escanea el QR con Expo Go
```

**Usuario demo**: `demo@financeai.dev` + cualquier contraseña de 10+ caracteres.

> ¿Máquina sin nada instalado? Guía completa paso a paso:
> [`docs/proceso/FRONTEND_DESDE_CERO.md`](../docs/FRONTEND_DESDE_CERO.md)

## De dónde salen los datos

Igual que la web: capa mock desacoplada
([ADR-0011](../docs/adr/0011-mocks-desacoplados-frontend.md)), elegida por
variable de entorno:

```bash
EXPO_PUBLIC_DATA_SOURCE=mock   # default hoy (sin backend)
EXPO_PUBLIC_DATA_SOURCE=api    # al integrar
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1   # 10.0.2.2 = localhost del anfitrion en el emulador
```

`src/data/` es **byte-idéntica** a la de la web salvo `config.ts` (lee
`EXPO_PUBLIC_*` e inyecta AsyncStorage). El mock respalda su estado en
AsyncStorage, así que cerrar y reabrir la app **no** borra lo cargado.

## Estructura

```text
src/
  app/                 rutas Expo Router
    (tabs)/            inicio, movimientos, presupuestos, metas, perfil
    analisis/          stack: lista + detalle [id]
    login, registro, legales, privacidad, licencias
  components/          UI, graficos (react-native-svg), metas, presupuestos...
  data/                capa de datos (identica a web/, ADR-0011)
  i18n/                es · pt · en (expo-localization)
  lib/                 sesion (AsyncStorage)
```

## Verificación

```bash
npm run lint        # ESLint (expo lint)
npx tsc --noEmit    # typecheck
```

## Cómo se comparte (equipo y jurado del hackathon)

| Vía | Para quién | Qué se necesita |
|---|---|---|
| **Video demo** | Jurado (obligatorio de todas formas) | Grabar la app desde el emulador o un teléfono |
| **APK con EAS Build** (recomendado) | Jurado y equipo, cualquier Android | `npx eas build -p android --profile preview` genera un `.apk` instalable; el link/QR se pone en el README de entrega. **Para la entrega se compila con `EXPO_PUBLIC_DATA_SOURCE=api`** apuntando a la API pública (regla CERO mock) |
| **Expo Go + QR** | Equipo durante el desarrollo | Expo Go instalado y estar en la misma red que quien corre `npx expo start` |
| iOS / TestFlight | - | Requiere Apple Developer (US$99/año) - **descartado para el hackathon** |
