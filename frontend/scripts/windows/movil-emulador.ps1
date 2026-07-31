# movil-emulador.ps1 - arranca el emulador Android e instala/abre la app movil (Expo)
# Uso:
#   .\scripts\windows\movil-emulador.ps1              # usa el primer AVD de la maquina
#   .\scripts\windows\movil-emulador.ps1 -Avd Pixel_9 # uno concreto
#   .\scripts\windows\movil-emulador.ps1 -Frio        # arranque en frio (snapshot sucio)
# Equivalentes: scripts/linux/movil-emulador.sh · scripts/macos/movil-emulador.sh
# Requiere Android SDK (ANDROID_HOME) con un AVD creado, y Node.
# ASCII y PowerShell 5.1 por convencion del repo.
#
# NO hay AVD "global": cada quien crea los suyos en Android Studio y viven en
# %USERPROFILE%\.android\avd. Por eso aqui NO se cablea ningun nombre (antes
# ponia 'Small_Phone', que solo existe en la maquina de quien lo escribio):
# si no se pasa -Avd se toma el primero disponible. Para fijar uno propio sin
# escribirlo cada vez, define la variable de entorno FINTECHVITAL_AVD.

param(
    [string]$Avd,
    [switch]$Frio
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = 'C:\Android\Sdk' }
$emulador = Join-Path $sdk 'emulator\emulator.exe'
$adb = Join-Path $sdk 'platform-tools\adb.exe'

if (-not (Test-Path $emulador)) {
    Write-Error "No se encontro el emulador en $emulador. Define ANDROID_HOME."
    exit 1
}

$avds = @(& $emulador -list-avds | Where-Object { $_ -and $_.Trim() })
if ($avds.Count -eq 0) {
    Write-Error @'
No hay ningun AVD creado en esta maquina.
Crea uno en Android Studio: More Actions > Virtual Device Manager > Create Device.
Los AVD son LOCALES: no se comparten por el repo ni hay uno estandar del equipo.
'@
    exit 1
}

# Prioridad: -Avd > FINTECHVITAL_AVD > el primero que haya
if (-not $Avd) { $Avd = $env:FINTECHVITAL_AVD }
if (-not $Avd) {
    $Avd = $avds[0]
    Write-Host "Sin -Avd: uso el primero disponible ('$Avd'). Otros: $($avds -join ', ')"
}
if ($avds -notcontains $Avd) {
    Write-Error "El AVD '$Avd' no existe en esta maquina. Disponibles: $($avds -join ', ')"
    exit 1
}

# 1. Arrancar el emulador si no hay ninguno corriendo
$dispositivos = & $adb devices | Select-String 'emulator-\d+\s+device'
if (-not $dispositivos) {
    # -no-snapshot-load: si el emulador se mato de golpe queda un snapshot sucio
    # y arranca congelado (adb responde y boot_completed=1, pero la UI no pinta).
    # `$args` es variable automatica de PowerShell: se usa otro nombre.
    $argumentos = @('-avd', $Avd)
    if ($Frio) { $argumentos += '-no-snapshot-load'; Write-Host 'Arranque en frio (sin snapshot).' }
    Write-Host "Arrancando emulador $Avd..."
    Start-Process $emulador -ArgumentList $argumentos
} else {
    Write-Host 'Ya hay un emulador corriendo.'
}

# 2. Esperar a que el sistema termine de bootear
Write-Host 'Esperando el boot de Android (puede tardar 1-2 min)...'
& $adb wait-for-device
$booteado = $false
for ($i = 0; $i -lt 60; $i++) {
    $prop = (& $adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
    if ($prop -eq '1') { $booteado = $true; break }
    Start-Sleep -Seconds 3
}
if (-not $booteado) {
    Write-Error 'El emulador no termino de bootear en 3 minutos.'
    exit 1
}
Write-Host 'Emulador listo.'

# 3. Lanzar Expo apuntando al emulador (instala Expo Go si hace falta)
Set-Location (Join-Path $raiz 'mobile')
Write-Host 'Iniciando Expo (Ctrl+C para salir)...'
npx expo start --android
