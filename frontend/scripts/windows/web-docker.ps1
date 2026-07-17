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

param(
    [switch]$Down,
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$web = Join-Path $raiz 'web'
$imagen = 'financeai/web:local'
$contenedor = 'financeai-web'

function Test-DockerVivo {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
    docker info *> $null
    return [bool]$?
}

function Iniciar-DockerDesktop {
    Write-Host 'Docker no responde; intentando iniciar Docker Desktop...'
    $rutas = @("$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Docker\Docker Desktop.exe")
    foreach ($ruta in $rutas) { if (Test-Path $ruta) { Start-Process $ruta; break } }
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 4
        if (Test-DockerVivo) { return $true }
    }
    return $false
}

# --- Elegir motor de contenedores ---
$motor = $null
if (Test-DockerVivo) {
    $motor = 'docker'
} elseif (Iniciar-DockerDesktop) {
    $motor = 'docker'
} elseif (Get-Command podman -ErrorAction SilentlyContinue) {
    Write-Host 'Docker no disponible; usando Podman como alternativa.'
    $motor = 'podman'
} else {
    Write-Error 'Ni Docker ni Podman estan disponibles. Instala/arranca uno de los dos.'
    exit 1
}

if ($Down) {
    & $motor rm -f $contenedor 2>$null | Out-Null
    Write-Host 'Contenedor detenido.'
    exit 0
}

# --- Build ---
$cacheArg = if ($Rebuild) { '--no-cache' } else { $null }
Write-Host "Construyendo imagen con $motor..."
& $motor build $cacheArg `
    --build-arg NEXT_PUBLIC_DATA_SOURCE=mock `
    --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 `
    -t $imagen $web
if (-not $?) { Write-Error 'Fallo el build de la imagen.'; exit 1 }

# --- Run ---
& $motor rm -f $contenedor 2>$null | Out-Null
# bind a 127.0.0.1: necesario para el forward en Podman rootless sobre WSL2
& $motor run -d --name $contenedor -p 127.0.0.1:3000:3000 $imagen | Out-Null
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
    Write-Host "Web lista ($motor): http://localhost:3000 (es | pt | en)"
    Write-Host 'Demo: demo@financeai.dev con cualquier password de 10+ caracteres'
} else {
    Write-Warning "El contenedor arranco pero la web no respondio a tiempo. Revisa: $motor logs $contenedor"
}
