# menu.ps1 - menu interactivo de desarrollo del frontend (web + movil)
# Uso:
#   Doble clic en INICIAR.bat (en frontend/), o desde PowerShell:
#   .\scripts\windows\menu.ps1
#   .\scripts\windows\menu.ps1 -Opcion 1   # ejecuta UNA opcion y sale (no interactivo)
# Equivalentes: scripts/linux/menu.sh · scripts/macos/menu.sh (iniciar.sh en la raiz)
# ASCII y PowerShell 5.1 por convencion del repo.

param([string]$Opcion)

$ErrorActionPreference = 'Continue'
$scripts = $PSScriptRoot
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Mostrar-Menu {
    Write-Host ''
    Write-Host '=================================================' -ForegroundColor Cyan
    Write-Host '    financeAI - menu de desarrollo (frontend)' -ForegroundColor Cyan
    Write-Host '=================================================' -ForegroundColor Cyan
    Write-Host '  [1] Verificar requisitos de la maquina (doctor)'
    Write-Host '  [2] Web: levantar en contenedor  -> http://localhost:3000'
    Write-Host '  [3] Web: rebuild del contenedor sin cache'
    Write-Host '  [4] Web: detener el contenedor'
    Write-Host '  [5] Web: modo desarrollo (npm run dev, recarga en vivo)'
    Write-Host '  [6] Movil: emulador Android + Expo'
    Write-Host '  [7] Movil: Expo para telefono fisico (QR con Expo Go)'
    Write-Host '  [8] Instalar dependencias (web y mobile)'
    Write-Host '  [9] Verificar codigo (lint + build web, lint + tsc movil)'
    Write-Host '  [0] Salir'
    Write-Host ''
}

function Ejecutar([string]$eleccion) {
    switch ($eleccion) {
        '1' { & (Join-Path $scripts 'verificar-requisitos.ps1') }
        '2' { & (Join-Path $scripts 'web-docker.ps1') }
        '3' { & (Join-Path $scripts 'web-docker.ps1') -Rebuild }
        '4' { & (Join-Path $scripts 'web-docker.ps1') -Down }
        '5' {
            Write-Host 'Next.js en modo desarrollo en http://localhost:3000 (Ctrl+C para salir)...'
            Push-Location (Join-Path $raiz 'web')
            npm run dev
            Pop-Location
        }
        '6' { & (Join-Path $scripts 'movil-emulador.ps1') }
        '7' {
            Write-Host 'El telefono necesita la app Expo Go y estar en el MISMO Wi-Fi que esta maquina.'
            Write-Host 'Escanea el QR que va a aparecer (Ctrl+C para salir)...'
            Push-Location (Join-Path $raiz 'mobile')
            npx expo start
            Pop-Location
        }
        '8' {
            Write-Host '--- web: npm install ---'
            Push-Location (Join-Path $raiz 'web'); npm install; Pop-Location
            Write-Host '--- mobile: npm install ---'
            Push-Location (Join-Path $raiz 'mobile'); npm install; Pop-Location
        }
        '9' {
            Push-Location (Join-Path $raiz 'web')
            Write-Host '--- web: lint ---'
            npm run lint
            if ($?) { Write-Host '--- web: build ---'; npm run build }
            Pop-Location
            Push-Location (Join-Path $raiz 'mobile')
            Write-Host '--- mobile: lint ---'
            npm run lint
            if ($?) { Write-Host '--- mobile: tsc --noEmit ---'; npx tsc --noEmit }
            Pop-Location
        }
        default { Write-Host ('Opcion no valida: "' + $eleccion + '"') -ForegroundColor Yellow }
    }
}

if ($Opcion) {
    Ejecutar $Opcion
    exit $LASTEXITCODE
}

while ($true) {
    Mostrar-Menu
    $eleccion = Read-Host 'Elige una opcion'
    if ($eleccion -eq '0') { break }
    Ejecutar $eleccion
    Write-Host ''
    Read-Host 'Enter para volver al menu' | Out-Null
}
