# Frontend desde cero - máquina sin nada instalado

Guía para dejar corriendo la **web** (contenedor o modo dev) y la **app móvil**
(emulador o teléfono) partiendo de una máquina limpia, como si fuera una VM
recién creada. Para el stack completo (backend/ML/BD, cuando existan) ver
[`ONBOARDING.md`](proceso/ONBOARDING.md).

> **Atajo**: después de instalar los requisitos, TODO se maneja desde el menú -
> **Windows**: doble clic en `frontend/INICIAR.bat` · **Linux/macOS**:
> `cd frontend && ./iniciar.sh`. La opción `[1]` del menú es un **doctor** que revisa la
> máquina y te dice exactamente qué falta.

## §1 Requisitos técnicos

| Recurso | Mínimo | Recomendado | Para qué |
|---|---|---|---|
| RAM | 8 GB | 16 GB | Emulador (~2-3 GB) + contenedor + IDE a la vez |
| Disco libre | ~15 GB | 25 GB | Android Studio + SDK (~10 GB), imágenes de contenedor (~2 GB), node_modules (~1.5 GB) |
| CPU | 4 núcleos con **virtualización habilitada** en BIOS/UEFI (Intel VT-x / AMD-V) | - | Emulador Android y Docker/WSL2 |
| SO | Windows 10/11 64-bit · Ubuntu 22.04+ (o equivalente) · macOS 13+ | - | - |
| Red | Descargas de ~5 GB la primera vez | - | Instaladores + npm |

## §2 Software a instalar

| Herramienta | Versión | Web | Móvil (emulador) | Móvil (teléfono físico) |
|---|---|---|---|---|
| **Git** | reciente | ✅ | ✅ | ✅ |
| **Node.js** (incluye npm) | **20+ LTS** (22 recomendado) | ✅ | ✅ | ✅ |
| **Docker Desktop** (o Podman) | reciente | Solo para el modo contenedor | - | - |
| **Android Studio** (SDK + emulador) | reciente | - | ✅ | - |
| **Expo Go** (app en el teléfono) | de la tienda | - | - | ✅ |

> La ruta más corta para ver la app móvil **sin instalar Android Studio**:
> teléfono físico + Expo Go (§6.2).

### Windows

1. **Git** → <https://git-scm.com/downloads> (siguiente-siguiente, defaults OK).
2. **Node.js LTS** → <https://nodejs.org> (instalador `.msi`). Verifica en una
   terminal nueva: `node -v` (v20+) y `npm -v`.
3. **Docker Desktop** → <https://docs.docker.com/desktop/setup/install/windows-install/>
   - usa WSL2 (el instalador lo activa; puede pedir reiniciar). Si Docker
   Desktop no arranca en tu máquina, **Podman** es alternativa soportada
   (`winget install RedHat.Podman`, luego `podman machine init` y
   `podman machine start`) - los scripts lo detectan solos.
4. **Android Studio** → <https://developer.android.com/studio>. En el primer
   arranque, el wizard instala el SDK. Después: **Device Manager → Create
   device** (ej. Pixel 9, imagen del sistema recomendada).
5. Variable de entorno `ANDROID_HOME` apuntando al SDK (típico:
   `C:\Users\<tu-usuario>\AppData\Local\Android\Sdk`). Los scripts también
   buscan en `C:\Android\Sdk`.

### Linux (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y git curl
# Node 22 LTS (via NodeSource; tambien sirve nvm)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
# Docker Engine
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER    # cerrar sesion y volver a entrar
# Android Studio: https://developer.android.com/studio (o snap/flatpak)
# ANDROID_HOME suele ser ~/Android/Sdk ; agrega a ~/.bashrc:
#   export ANDROID_HOME="$HOME/Android/Sdk"
# El emulador necesita KVM: sudo apt install -y qemu-kvm && sudo adduser $USER kvm
```

### macOS

```bash
# Homebrew si no esta: https://brew.sh
brew install git node@22
# Docker Desktop: https://docs.docker.com/desktop/setup/install/mac-install/
# Android Studio: https://developer.android.com/studio
# ANDROID_HOME suele ser ~/Library/Android/sdk ; agrega a ~/.zshrc:
#   export ANDROID_HOME="$HOME/Library/Android/sdk"
```

## §3 Clonar y verificar la máquina

```bash
git clone <url-del-repo> financeAI
cd financeAI/frontend
```

- **Windows**: doble clic en `INICIAR.bat` (dentro de `frontend/`) → opción `[1]` (doctor).
- **Linux/macOS**: `chmod +x iniciar.sh scripts/linux/*.sh scripts/macos/*.sh`
  (solo la primera vez, si hace falta) y `./iniciar.sh` → opción `[1]`.

El doctor marca en **rojo** lo crítico que falta y en **amarillo** los avisos.
Repite hasta que quede en verde lo que vayas a usar.

## §4 Instalar dependencias del proyecto

Opción `[8]` del menú, o a mano:

```bash
cd web && npm install && cd ..
cd mobile && npm install && cd ..
```

## §5 Levantar la web

**5.1 En contenedor** (así corre en la demo) - opción `[2]` del menú, o:

```powershell
.\scripts\windows\web-docker.ps1      # Windows
```

```bash
./scripts/linux/web-docker.sh         # Linux (macos/ para Mac)
```

Abre <http://localhost:3000> → redirige a `/es` (hay `/pt` y `/en`).

**5.2 Modo desarrollo** (recarga en vivo) - opción `[5]` del menú, o:

```bash
cd web && npm run dev
```

**Usuario demo**: `demo@financeai.dev` + cualquier contraseña de 10+
caracteres. Cualquier otro email crea una cuenta vacía. Hoy los datos salen de
la **capa mock** ([ADR-0011](adr/0011-mocks-desacoplados-frontend.md)) y se
respaldan localmente: recargar no los borra.

## §6 Levantar la app móvil

**6.1 Emulador Android** - opción `[6]` del menú, o:

```powershell
.\scripts\windows\movil-emulador.ps1      # Windows (AVD por defecto: Pixel_9)
```

```bash
./scripts/linux/movil-emulador.sh         # Linux (macos/ para Mac)
```

El script arranca el AVD, espera el boot completo y lanza Expo apuntando al
emulador (la primera vez instala Expo Go dentro del emulador).

**6.2 Teléfono físico** (sin Android Studio) - opción `[7]` del menú, o:

1. Instala **Expo Go** en el teléfono (Play Store / App Store).
2. Teléfono y computadora en el **mismo Wi-Fi**.
3. `cd mobile && npx expo start` → escanea el QR con Expo Go (Android) o la
   cámara (iOS).

## §7 Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `docker: command not found` / daemon no responde | Docker Desktop cerrado o no instalado | Abrir Docker Desktop y esperar; o usar Podman (`podman machine start`) - los scripts caen solos a Podman |
| El emulador no aparece / `emulator.exe` no encontrado | `ANDROID_HOME` sin definir | Definir la variable (§2) y abrir una terminal **nueva** |
| `El AVD 'Pixel_9' no existe` | No hay dispositivo virtual creado | Android Studio → Device Manager → Create device; o pasar el nombre: `movil-emulador -Avd <nombre>` |
| El emulador va lentísimo | Virtualización deshabilitada | Habilitar Intel VT-x / AMD-V en BIOS/UEFI (Linux: instalar KVM) |
| Expo no conecta con el teléfono | Redes distintas o firewall | Mismo Wi-Fi; en redes restrictivas usar `npx expo start --tunnel` |
| `npm install` falla con permisos (Linux) | npm global con sudo | Usar nvm, o no usar `sudo` con npm |
| La web muestra "Reintentar" con `DATA_SOURCE=api` | No hay backend todavía | Es el comportamiento correcto (F6.7); en desarrollo usa `mock` |
| Los `.sh` dan `Permission denied` | Sin bit de ejecución | `chmod +x iniciar.sh scripts/linux/*.sh scripts/macos/*.sh` |
| PowerShell bloquea los `.ps1` | Política de ejecución | Usar `INICIAR.bat` (la salta) o `powershell -ExecutionPolicy Bypass -File <script>` |
