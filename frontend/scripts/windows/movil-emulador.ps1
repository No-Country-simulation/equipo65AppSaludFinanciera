# movil-emulador.ps1 - arranca el emulador Android e instala/abre la app movil (Expo)
# Uso:
#   .\scripts\windows\movil-emulador.ps1                 # AVD por defecto: Pixel_9
#   .\scripts\windows\movil-emulador.ps1 -Avd otro_avd
# Equivalentes: scripts/linux/movil-emulador.sh · scripts/macos/movil-emulador.sh
# Requiere Android SDK (ANDROID_HOME) con un AVD creado, y Node.
# ASCII y PowerShell 5.1 por convencion del repo.

param(
    [string]$Avd = 'Small_Phone'
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

$avds = & $emulador -list-avds
if ($avds -notcontains $Avd) {
    Write-Error "El AVD '$Avd' no existe. Disponibles: $($avds -join ', ')"
    exit 1
}

# 1. Arrancar el emulador si no hay ninguno corriendo
$dispositivos = & $adb devices | Select-String 'emulator-\d+\s+device'
if (-not $dispositivos) {
    Write-Host "Arrancando emulador $Avd..."
    Start-Process $emulador -ArgumentList "-avd", $Avd
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
