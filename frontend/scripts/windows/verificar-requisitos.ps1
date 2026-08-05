# verificar-requisitos.ps1 - revisa que la maquina tenga todo lo necesario
# para trabajar en el proyecto: frontend (web + movil) y el stack completo en
# contenedores (base de datos + API + web).
# Uso:
#   .\scripts\windows\verificar-requisitos.ps1
#   .\scripts\windows\verificar-requisitos.ps1 -InstalarPodman   # instala Podman si falta
# Salida: 0 = listo (puede haber avisos) | 1 = falta algo critico.
# Equivalentes: scripts/linux/ y scripts/macos/ (verificar-requisitos.sh)
# Guia de instalacion desde cero: docs/FRONTEND_DESDE_CERO.md
# ASCII y PowerShell 5.1 por convencion del repo.

param(
    # Instala Podman sin preguntar. Sin este parametro, si no hay ningun motor
    # de contenedores el script OFRECE instalarlo (y en modo no interactivo se
    # limita a avisar). Instalar cosas en la maquina de alguien siempre es
    # opcional y explicito.
    [switch]$InstalarPodman
)

$ErrorActionPreference = 'SilentlyContinue'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$repo = Split-Path -Parent $raiz
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

# Instalacion OPCIONAL de Podman. Se usa winget porque viene con Windows 10/11
# y no obliga a descargar un instalador a mano. Devuelve $true si al terminar
# hay un Podman que responde.
function Instalar-Podman {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Escribir 'AVISO' 'winget no esta disponible: instala Podman a mano -> https://podman.io/docs/installation'
        return $false
    }
    Write-Host ''
    Write-Host 'Instalando Podman con winget (puede tardar unos minutos)...' -ForegroundColor Cyan
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & winget install --id RedHat.Podman --accept-source-agreements --accept-package-agreements --silent 2>&1 |
            ForEach-Object { Write-Host "  $_" }
    } finally { $ErrorActionPreference = $anterior }

    # winget no refresca el PATH de la sesion actual: se busca el exe donde lo
    # deja el instalador para poder seguir sin pedir que reabras la terminal.
    $podmanExe = Get-Command podman -ErrorAction SilentlyContinue
    if (-not $podmanExe) {
        $candidatos = @("$env:ProgramFiles\RedHat\Podman\podman.exe",
                        "$env:LOCALAPPDATA\Programs\RedHat\Podman\podman.exe")
        foreach ($c in $candidatos) {
            if (Test-Path $c) { $env:Path = (Split-Path $c) + ';' + $env:Path; break }
        }
    }
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) {
        Escribir 'AVISO' 'Podman se instalo pero no esta en el PATH de esta sesion: cierra y vuelve a abrir la terminal.'
        return $false
    }

    # En Windows, Podman corre dentro de una VM ("machine"). Sin ella, todos los
    # comandos fallan con "Cannot connect to Podman" y parece que no estuviera
    # instalado.
    Escribir 'INFO' 'Inicializando la maquina de Podman...'
    $ErrorActionPreference = 'Continue'
    & podman machine init 2>&1 | ForEach-Object { Write-Host "  $_" }
    & podman machine start 2>&1 | ForEach-Object { Write-Host "  $_" }
    $ErrorActionPreference = $anterior

    & podman info *> $null
    if ($?) { Escribir 'OK' 'Podman instalado y respondiendo'; return $true }
    Escribir 'AVISO' 'Podman quedo instalado pero la maquina no arranco. Prueba: podman machine start'
    return $false
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
        Escribir 'FALTA' 'Ni Docker ni Podman. Opciones: Docker Desktop -> https://docs.docker.com/desktop/setup/install/windows-install/  o instalar Podman desde aqui.'
        # Instalar software en la maquina de alguien es OPCIONAL y explicito:
        # con -InstalarPodman se hace directo; si no, se pregunta; y si la
        # sesion no es interactiva, solo se informa.
        $instalar = $InstalarPodman
        if (-not $instalar -and -not [Console]::IsInputRedirected) {
            Write-Host ''
            $r = Read-Host 'Quieres que instale Podman ahora con winget? (s/N)'
            $instalar = ($r -eq 's' -or $r -eq 'S')
        }
        if ($instalar) {
            if (Instalar-Podman) { $motorVivo = $true; $script:fallas-- }
        } else {
            Escribir 'INFO' 'Puedes instalarlo despues con: .\scripts\windows\verificar-requisitos.ps1 -InstalarPodman'
        }
    } else {
        Escribir 'AVISO' 'Sin motor de contenedores activo. La web puede correr igual sin contenedor: "npm run dev" (opcion 5 del menu)'
    }
} elseif ($InstalarPodman -and -not $podmanCli) {
    Escribir 'INFO' 'Ya hay un motor de contenedores activo, pero se pidio instalar Podman igualmente.'
    [void](Instalar-Podman)
}

# ------------------------------------------------- stack completo (db + api) ---
Titulo 'Stack completo (base de datos + API + web)'

$compose = Join-Path $repo 'ops\compose.yml'
if (Test-Path $compose) {
    Escribir 'OK' 'ops\compose.yml presente (stack completo en contenedores)'
} else {
    Escribir 'AVISO' 'No se encontro ops\compose.yml: sin el no se puede levantar el stack completo'
}

if (Test-Path (Join-Path $repo 'ops\.env')) {
    Escribir 'OK' 'ops\.env configurado'
} elseif (Test-Path (Join-Path $repo 'ops\.env.ejemplo')) {
    Escribir 'AVISO' 'Falta ops\.env: se crea solo la primera vez que corras ops\stack.ps1 arriba'
} else {
    Escribir 'AVISO' 'No hay ops\.env ni ops\.env.ejemplo'
}

if ($motorVivo) {
    # `compose` en Podman 5 lo provee un binario externo: si falta, el stack no
    # levanta aunque Podman este perfecto.
    $motorCli = 'podman'
    if ($dockerCli) {
        docker info *> $null
        if ($?) { $motorCli = 'docker' }
    }
    & $motorCli compose version *> $null
    if ($?) {
        Escribir 'OK' ("Subcomando 'compose' disponible en $motorCli")
    } else {
        Escribir 'AVISO' ("$motorCli no tiene 'compose'. En Podman hace falta docker-compose: winget install Docker.DockerCompose")
    }
}

# Java solo hace falta para compilar la API FUERA del contenedor. El build de
# la imagen trae su propio Maven y JDK, asi que esto es informativo.
if (Get-Command java -ErrorAction SilentlyContinue) {
    # java escribe la version en stderr y PowerShell 5.1 la envuelve en
    # ErrorRecord: se sale por cmd para recibir texto plano.
    $javaVer = (cmd /c "java -version 2>&1" | Select-Object -First 1)
    Escribir 'OK' ('Java: ' + $javaVer)
} else {
    Escribir 'INFO' 'Java no esta instalado. No hace falta: la imagen de la API compila con su propio JDK 21.'
}

if (Get-Command psql -ErrorAction SilentlyContinue) {
    Escribir 'OK' 'Cliente psql presente (util para inspeccionar la BD desde la maquina)'
} else {
    Escribir 'INFO' 'Sin cliente psql. No hace falta: usa "ops\stack.ps1 psql" (entra por el contenedor).'
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
