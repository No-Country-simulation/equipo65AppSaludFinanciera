# web-docker.ps1 - levanta la web (Next.js) en un contenedor en http://localhost:3000
# Uso:
#   .\scripts\windows\web-docker.ps1            # build + up
#   .\scripts\windows\web-docker.ps1 -Rebuild   # fuerza rebuild sin cache
#   .\scripts\windows\web-docker.ps1 -Down      # detiene y elimina el contenedor
# Equivalentes: scripts/linux/web-docker.sh · scripts/macos/web-docker.sh
#
# Prefiere Docker (estandar del proyecto). Si el daemon de Docker no esta
# disponible, cae automaticamente a Podman (mismo Dockerfile / imagen OCI).
# ASCII y PowerShell 5.1 por convencion del repo.
#
#   -Motor docker|podman   fuerza un motor y se salta la deteccion

param(
    [switch]$Down,
    [switch]$Rebuild,
    [ValidateSet('docker', 'podman')]
    [string]$Motor
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$web = Join-Path $raiz 'web'
$imagen = 'fintechvital/web:local'
$contenedor = 'fintechvital-web'

function Test-DockerVivo {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
    # 'Continue' local: si el daemon no responde, el stderr de docker no debe
    # ser un error terminante (con 'Stop' abortaba el script y nunca caia a Podman)
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & docker info 2>&1 | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $anterior
    }
}

function Iniciar-DockerDesktop {
    Write-Host 'Docker no responde; intentando iniciar Docker Desktop (hasta 2 min)...'
    $rutas = @("$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe")
    $arrancado = $false
    foreach ($ruta in $rutas) { if (Test-Path $ruta) { Start-Process $ruta; $arrancado = $true; break } }
    if (-not $arrancado) { Write-Host 'No se encontro el ejecutable de Docker Desktop.'; return $false }
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 4
        Write-Host -NoNewline '.'
        if (Test-DockerVivo) { Write-Host ''; return $true }
    }
    Write-Host ''
    return $false
}

function Test-PodmanVivo {
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) { return $false }
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & podman info 2>&1 | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $anterior
    }
}

# En Windows/macOS Podman corre dentro de una VM ("machine"). Si esa VM esta
# parada, TODOS los comandos fallan con "Cannot connect to Podman" (exit 125) y
# desde el menu parece que la imagen o el contenedor no existieran. Hay que
# arrancarla explicitamente: el script no lo hacia y ese era el fallo.
function Iniciar-PodmanMachine {
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) { return $false }
    Write-Host 'La maquina de Podman esta parada; arrancandola (puede tardar ~1 min)...'
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & podman machine start 2>&1 | ForEach-Object { Write-Host "  $_" }
    } finally {
        $ErrorActionPreference = $anterior
    }
    for ($i = 0; $i -lt 15; $i++) {
        if (Test-PodmanVivo) { return $true }
        Start-Sleep -Seconds 4
    }
    return $false
}

# --- Elegir motor de contenedores ---
# Orden: lo que YA este vivo primero (arrancar un motor cuesta minutos). Docker
# es el estandar del proyecto, asi que se prueba antes; pero si no responde y
# Podman si, se usa Podman en vez de esperar 2 min a Docker Desktop.
$motorElegido = $null
if ($Motor) {
    $motorElegido = $Motor
    Write-Host "Motor forzado por parametro: $motorElegido"
    if ($motorElegido -eq 'podman' -and -not (Test-PodmanVivo)) {
        if (-not (Iniciar-PodmanMachine)) { Write-Error 'No se pudo arrancar la maquina de Podman.'; exit 1 }
    }
} elseif (Test-DockerVivo) {
    $motorElegido = 'docker'
} elseif (Test-PodmanVivo) {
    Write-Host 'Docker no responde; usando Podman (ya estaba corriendo).'
    $motorElegido = 'podman'
} elseif (Iniciar-PodmanMachine) {
    Write-Host 'Usando Podman.'
    $motorElegido = 'podman'
} elseif (Iniciar-DockerDesktop) {
    $motorElegido = 'docker'
} else {
    Write-Error @'
Ningun motor de contenedores disponible.
  - Docker Desktop: instalado pero el daemon no responde (suele necesitar que lo
    abras a mano una vez, por el aviso de UAC).
  - Podman: no se pudo arrancar la maquina. Prueba "podman machine start".
Alternativa sin contenedor: opcion [5] del menu (npm run dev).
'@
    exit 1
}

if ($Down) {
    & $motorElegido rm -f $contenedor 2>$null | Out-Null
    Write-Host 'Contenedor detenido.'
    exit 0
}

# --- Build ---
$cacheArg = if ($Rebuild) { '--no-cache' } else { $null }
Write-Host "Construyendo imagen con $motorElegido..."
& $motorElegido build $cacheArg `
    --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 `
    -t $imagen $web
if (-not $?) { Write-Error 'Fallo el build de la imagen.'; exit 1 }

# --- Run ---
& $motorElegido rm -f $contenedor 2>$null | Out-Null
# bind a 127.0.0.1: necesario para el forward en Podman rootless sobre WSL2
& $motorElegido run -d --name $contenedor -p 127.0.0.1:3000:3000 $imagen | Out-Null
if (-not $?) { Write-Error 'Fallo el arranque del contenedor.'; exit 1 }

Write-Host 'Esperando respuesta de la web...'
$listo = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/es/login' -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -eq 200) { $listo = $true; break }
    } catch { }
}

if ($listo) {
    Write-Host ''
    Write-Host "Web lista ($motorElegido): http://localhost:3000 (es | pt | en)"
    Write-Host 'Necesita la API arriba: .\ops\stack.ps1 arriba'
} else {
    Write-Warning "El contenedor arranco pero la web no respondio a tiempo. Revisa: $motorElegido logs $contenedor"
}
