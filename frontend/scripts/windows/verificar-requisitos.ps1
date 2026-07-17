# verificar-requisitos.ps1 - revisa que la maquina tenga todo lo necesario
# para trabajar con el frontend (web en contenedor y movil en emulador).
# Uso:
#   .\scripts\windows\verificar-requisitos.ps1
# Salida: 0 = listo (puede haber avisos) | 1 = falta algo critico.
# Equivalentes: scripts/linux/ y scripts/macos/ (verificar-requisitos.sh)
# Guia de instalacion desde cero: docs/FRONTEND_DESDE_CERO.md
# ASCII y PowerShell 5.1 por convencion del repo.

$ErrorActionPreference = 'SilentlyContinue'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:fallas = 0
$script:avisos = 0

function Escribir([string]$nivel, [string]$texto) {
    switch ($nivel) {
        'OK'    { Write-Host '[ OK  ] ' -ForegroundColor Green  -NoNewline }
        'FALTA' { Write-Host '[FALTA] ' -ForegroundColor Red    -NoNewline; $script:fallas++ }
        'AVISO' { Write-Host '[AVISO] ' -ForegroundColor Yellow -NoNewline; $script:avisos++ }
        'INFO'  { Write-Host '[ --  ] ' -ForegroundColor DarkGray -NoNewline }
    }
    Write-Host $texto
}

function Titulo([string]$texto) {
    Write-Host ''
    Write-Host ('== ' + $texto + ' ==') -ForegroundColor Cyan
}

# ----------------------------------------------------------------- basico ---
Titulo 'Basico (necesario para todo)'

if (Get-Command git -ErrorAction SilentlyContinue) {
    Escribir 'OK' ('Git: ' + (git --version))
} else {
    Escribir 'FALTA' 'Git no esta instalado -> https://git-scm.com/downloads'
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = (node -v).TrimStart('v')
    $nodeMajor = 0
    [void][int]::TryParse($nodeVer.Split('.')[0], [ref]$nodeMajor)
    if ($nodeMajor -ge 20) {
        Escribir 'OK' ('Node.js: v' + $nodeVer + ' (se pide 20+)')
    } else {
        Escribir 'FALTA' ('Node.js v' + $nodeVer + ' es viejo: se necesita 20+ (LTS) -> https://nodejs.org')
    }
} else {
    Escribir 'FALTA' 'Node.js no esta instalado (se necesita 20+ LTS) -> https://nodejs.org'
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
    Escribir 'OK' ('npm: v' + (npm -v))
} else {
    Escribir 'FALTA' 'npm no esta disponible (viene incluido con Node.js)'
}

if (Test-Path (Join-Path $raiz 'web\node_modules')) {
    Escribir 'OK' 'Dependencias de web/ instaladas'
} else {
    Escribir 'AVISO' 'Faltan dependencias de web/: correr "npm install" dentro de web/ (opcion 8 del menu)'
}

if (Test-Path (Join-Path $raiz 'mobile\node_modules')) {
    Escribir 'OK' 'Dependencias de mobile/ instaladas'
} else {
    Escribir 'AVISO' 'Faltan dependencias de mobile/: correr "npm install" dentro de mobile/ (opcion 8 del menu)'
}

# ----------------------------------------------- contenedores (web docker) ---
Titulo 'Contenedores (web en Docker/Podman)'

$dockerCli = Get-Command docker -ErrorAction SilentlyContinue
$podmanCli = Get-Command podman -ErrorAction SilentlyContinue
$motorVivo = $false

if ($dockerCli) {
    docker info *> $null
    if ($?) {
        Escribir 'OK' 'Docker instalado y el daemon responde'
        $motorVivo = $true
    } else {
        Escribir 'AVISO' 'Docker esta instalado pero el daemon NO responde (abre Docker Desktop y espera a que arranque)'
    }
} else {
    Escribir 'INFO' 'Docker no esta instalado'
}

if (-not $motorVivo -and $podmanCli) {
    podman info *> $null
    if ($?) {
        Escribir 'OK' 'Podman responde (alternativa valida a Docker; web-docker.ps1 lo usa solo)'
        $motorVivo = $true
    } else {
        Escribir 'AVISO' 'Podman esta instalado pero no responde: correr "podman machine start"'
    }
}

if (-not $motorVivo) {
    if (-not $dockerCli -and -not $podmanCli) {
        Escribir 'FALTA' 'Ni Docker ni Podman: instala Docker Desktop -> https://docs.docker.com/desktop/setup/install/windows-install/'
    } else {
        Escribir 'AVISO' 'Sin motor de contenedores activo. La web puede correr igual sin contenedor: "npm run dev" (opcion 5 del menu)'
    }
}

# --------------------------------------------- android (movil en emulador) ---
Titulo 'Android (app movil en emulador)'

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = 'C:\Android\Sdk' }

if (Test-Path $sdk) {
    Escribir 'OK' ('Android SDK: ' + $sdk)
} else {
    Escribir 'AVISO' 'Android SDK no encontrado: instala Android Studio y define ANDROID_HOME. (Solo hace falta para el emulador; con un telefono fisico + Expo Go NO se necesita)'
}

$emulador = Join-Path $sdk 'emulator\emulator.exe'
if (Test-Path $emulador) {
    Escribir 'OK' 'Emulador de Android presente'
    $avds = & $emulador -list-avds
    $avds = @($avds | Where-Object { $_ -and $_.Trim() -ne '' })
    if ($avds.Count -gt 0) {
        Escribir 'OK' ('AVDs disponibles: ' + ($avds -join ', '))
    } else {
        Escribir 'AVISO' 'No hay ningun AVD creado: Android Studio > Device Manager > Create device (ej. Pixel 9)'
    }
} else {
    Escribir 'AVISO' 'emulator.exe no encontrado dentro del SDK'
}

if (Test-Path (Join-Path $sdk 'platform-tools\adb.exe')) {
    Escribir 'OK' 'adb presente (platform-tools)'
} else {
    Escribir 'AVISO' 'adb no encontrado: en Android Studio instala "Android SDK Platform-Tools"'
}

# ---------------------------------------------------------------- sistema ---
Titulo 'Sistema'

$os = Get-CimInstance Win32_OperatingSystem
if ($os) { Escribir 'INFO' ('Windows: ' + $os.Caption + ' (build ' + $os.BuildNumber + ')') }

$cs = Get-CimInstance Win32_ComputerSystem
if ($cs) {
    $ramGb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
    if ($ramGb -ge 16) {
        Escribir 'OK' ('RAM: ' + $ramGb + ' GB')
    } elseif ($ramGb -ge 8) {
        Escribir 'AVISO' ('RAM: ' + $ramGb + ' GB - alcanza, pero emulador + contenedor a la vez va a ir justo')
    } else {
        Escribir 'AVISO' ('RAM: ' + $ramGb + ' GB - por debajo de lo recomendado (8 GB minimo, 16 GB ideal)')
    }
}

$letra = (Split-Path -Qualifier $raiz).TrimEnd(':')
$disco = Get-PSDrive -Name $letra -ErrorAction SilentlyContinue
if ($disco) {
    $libreGb = [math]::Round($disco.Free / 1GB, 1)
    if ($libreGb -ge 15) {
        Escribir 'OK' ('Disco libre en ' + $letra + ': : ' + $libreGb + ' GB')
    } else {
        Escribir 'AVISO' ('Disco libre en ' + $letra + ': : ' + $libreGb + ' GB - Android Studio + SDK + imagenes de contenedor piden ~15 GB')
    }
}

# Con Hyper-V/WSL2 activos, VirtualizationFirmwareEnabled reporta False aunque
# la virtualizacion este encendida (Windows corre bajo el hipervisor): por eso
# primero se mira HypervisorPresent.
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
if ($cs -and $cs.HypervisorPresent) {
    Escribir 'OK' 'Virtualizacion activa (hipervisor presente: Hyper-V/WSL2)'
} elseif ($cpu -and $null -ne $cpu.VirtualizationFirmwareEnabled) {
    if ($cpu.VirtualizationFirmwareEnabled) {
        Escribir 'OK' 'Virtualizacion habilitada en firmware (emulador y Docker la usan)'
    } else {
        Escribir 'AVISO' 'Virtualizacion DESHABILITADA en BIOS/UEFI: el emulador y Docker/WSL2 la necesitan'
    }
} else {
    Escribir 'INFO' 'No se pudo determinar el estado de la virtualizacion (si Docker o el emulador fallan, revisala en BIOS/UEFI)'
}

# ----------------------------------------------------------------- resumen ---
Write-Host ''
if ($script:fallas -eq 0 -and $script:avisos -eq 0) {
    Write-Host 'Todo listo: no falta nada.' -ForegroundColor Green
} elseif ($script:fallas -eq 0) {
    Write-Host ('Listo para trabajar, con ' + $script:avisos + ' aviso(s). Revisa lo marcado en amarillo.') -ForegroundColor Yellow
} else {
    Write-Host ('Faltan ' + $script:fallas + ' requisito(s) criticos (en rojo) y hay ' + $script:avisos + ' aviso(s).') -ForegroundColor Red
}
Write-Host 'Guia paso a paso desde cero: docs\FRONTEND_DESDE_CERO.md'

if ($script:fallas -gt 0) { exit 1 } else { exit 0 }
