# publicar.ps1 - deja un entorno listo para entregar, de una sola pasada.
#
#   .\ops\publicar.ps1 -Entorno .env.prod
#
# Hace, en este orden y sin pasos manuales:
#
#   1. Compila el APK de Android apuntando a la API de ESE entorno.
#   2. COMPRUEBA que la URL correcta quedo dentro del APK.
#   3. Lo copia a frontend/web/public/, que es de donde lo sirve la web.
#   4. Reconstruye las imagenes de los contenedores, ya con el APK dentro.
#   5. Levanta el stack (y el tunel, si el entorno trae token).
#
# El problema que resuelve: NEXT_PUBLIC_APK_URL apunta a un archivo dentro de
# frontend/web/public/, pero el .apk esta en .gitignore (son ~110 MB por build),
# asi que NO viaja en el clon. Si se construye la imagen de la web sin haberlo
# copiado antes, el boton de descarga da 404 - y no se nota hasta que alguien
# lo pulsa, normalmente el jurado.
#
# Saltarse el APK:  -SinApk   (util para iterar rapido en la web)
#
# ASCII y PowerShell 5.1 por convencion del repo (sin &&, sin acentos).

param(
    # Archivo de entorno, igual que en stack.ps1: .env | .env.staging | .env.prod
    [string]$Entorno = '.env',

    # No compilar el APK: reutiliza el que ya este en public/ (o ninguno).
    [switch]$SinApk,

    # Compilar y copiar el APK, pero no tocar los contenedores.
    [switch]$SoloApk,

    [ValidateSet('docker', 'podman')]
    [string]$Motor
)

$ErrorActionPreference = 'Continue'
$ops     = $PSScriptRoot
$raiz    = Split-Path -Parent $PSScriptRoot
$movil   = Join-Path $raiz 'frontend\mobile'
$destino = Join-Path $raiz 'frontend\web\public\fintech-vital.apk'
$envFile = if (Test-Path $Entorno) { $Entorno } else { Join-Path $ops $Entorno }

function Escribir([string]$nivel, [string]$texto) {
    switch ($nivel) {
        'OK'    { Write-Host '[ OK  ] ' -ForegroundColor Green    -NoNewline }
        'ERROR' { Write-Host '[ERROR] ' -ForegroundColor Red      -NoNewline }
        'AVISO' { Write-Host '[AVISO] ' -ForegroundColor Yellow   -NoNewline }
        'INFO'  { Write-Host '[ --  ] ' -ForegroundColor DarkGray -NoNewline }
    }
    Write-Host $texto
}
function Titulo([string]$t) { Write-Host ''; Write-Host ('== ' + $t + ' ==') -ForegroundColor Cyan }
function Nota([string]$t)   { Write-Host ('  ' + $t) -ForegroundColor DarkGray }

function Leer-Env([string]$clave, [string]$porDefecto) {
    if (-not (Test-Path $envFile)) { return $porDefecto }
    $linea = Select-String -Path $envFile -Pattern "^\s*$clave\s*=" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $linea) { return $porDefecto }
    $valor = ($linea.Line -split '=', 2)[1].Trim()
    $valor = ($valor -replace '\s+#.*$', '').Trim().Trim('"').Trim("'")
    if ($valor) { return $valor } else { return $porDefecto }
}

if (-not (Test-Path $envFile)) {
    Escribir 'ERROR' ("No encuentro el archivo de entorno: " + $envFile)
    Nota 'Usa -Entorno .env.staging o -Entorno .env.prod'
    exit 1
}

$apiUrl = Leer-Env 'NEXT_PUBLIC_API_URL' ''
$apkUrl = Leer-Env 'NEXT_PUBLIC_APK_URL' ''

Titulo 'Entorno'
Nota ('Archivo : ' + $envFile)
Nota ('API     : ' + $apiUrl)
Nota ('APK     : ' + $(if ($apkUrl) { $apkUrl } else { '(desactivado: NEXT_PUBLIC_APK_URL vacia)' }))

# ------------------------------------------------------------------- APK ---
if (-not $SinApk -and $apkUrl) {

    Titulo 'APK de Android'

    if (-not (Test-Path (Join-Path $movil 'android\gradlew.bat'))) {
        Escribir 'ERROR' 'Falta frontend\mobile\android. El proyecto no esta prebuildeado.'
        Nota 'Genera la carpeta nativa con:  cd frontend\mobile ; npx expo prebuild -p android'
        exit 1
    }

    # Gradle necesita un JDK. Sin esto el error que sale es criptico.
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        Escribir 'ERROR' 'No encuentro java en el PATH, y Gradle lo necesita.'
        Nota 'Instala un JDK 17+ (por ejemplo Temurin) y vuelve a abrir la terminal.'
        exit 1
    }

    if (-not $apiUrl) {
        Escribir 'ERROR' 'El entorno no define NEXT_PUBLIC_API_URL, asi que no se contra que compilar el APK.'
        exit 1
    }

    # La app movil lee EXPO_PUBLIC_API_URL; la web, NEXT_PUBLIC_API_URL. Se
    # apunta el APK a la MISMA API que la web de este entorno, que es justo lo
    # que se olvida cuando se compila a mano: queda un APK de staging colgado
    # de la web de produccion.
    $env:EXPO_PUBLIC_API_URL = $apiUrl
    Escribir 'INFO' ('Compilando contra ' + $apiUrl)
    Nota 'La primera vez Gradle tarda varios minutos. Despues usa cache.'

    Push-Location (Join-Path $movil 'android')
    # `release` se firma con el keystore de debug (asi viene la plantilla de
    # Expo): el APK es instalable y no hace falta gestionar claves. No sirve
    # para publicar en Play Store, si para repartirlo y para la demo.
    & .\gradlew.bat assembleRelease --console=plain
    $codigo = $LASTEXITCODE
    Pop-Location

    if ($codigo -ne 0) {
        Escribir 'ERROR' ('Gradle fallo (codigo ' + $codigo + '). El APK no se genero.')
        Nota 'Si el error es de memoria, sube el heap en frontend\mobile\android\gradle.properties'
        exit 1
    }

    $generado = Join-Path $movil 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path $generado)) {
        Escribir 'ERROR' ('Gradle dijo que si, pero no encuentro ' + $generado)
        exit 1
    }

    # Comprobacion que justifica el script: que la URL este DENTRO del APK.
    # El bundle de JS va comprimido, asi que se busca sobre el APK entero
    # descomprimido en memoria, no sobre los bytes crudos.
    Escribir 'INFO' 'Comprobando que la URL correcta quedo dentro del APK...'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $encontrada = $false
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($generado)
        foreach ($entrada in $zip.Entries) {
            if ($entrada.FullName -notmatch '\.(bundle|js)$') { continue }
            $lector = New-Object System.IO.StreamReader($entrada.Open())
            $texto = $lector.ReadToEnd()
            $lector.Close()
            if ($texto.Contains($apiUrl)) { $encontrada = $true; break }
        }
        $zip.Dispose()
    } catch {
        Escribir 'AVISO' ('No pude inspeccionar el APK: ' + $_.Exception.Message)
        $encontrada = $true   # no bloquear por un fallo de la comprobacion
    }

    if ($encontrada) {
        Escribir 'OK' ('El APK apunta a ' + $apiUrl)
    } else {
        Escribir 'ERROR' ('El APK NO contiene ' + $apiUrl + '.')
        Nota 'Casi seguro gano frontend\mobile\.env sobre la variable de entorno.'
        Nota ('Pon ahi EXPO_PUBLIC_API_URL=' + $apiUrl + ' y vuelve a lanzarlo.')
        exit 1
    }

    Copy-Item $generado $destino -Force
    $mb = [math]::Round((Get-Item $destino).Length / 1MB, 1)
    Escribir 'OK' ('Copiado a frontend\web\public\fintech-vital.apk (' + $mb + ' MB)')

} elseif ($SinApk) {
    Titulo 'APK de Android'
    Escribir 'INFO' 'Saltado (-SinApk).'
    if (Test-Path $destino) {
        Nota 'Se reutiliza el que ya esta en public/. Ojo: puede apuntar a otra API.'
    } else {
        Escribir 'AVISO' 'Y no hay ninguno en public/: el boton de descarga dara 404.'
    }
} elseif (-not $apkUrl) {
    Titulo 'APK de Android'
    Escribir 'INFO' 'NEXT_PUBLIC_APK_URL esta vacia: la web no pinta el bloque de descarga.'
}

if ($SoloApk) {
    Titulo 'Listo'
    Nota 'Solo se pidio el APK (-SoloApk). Los contenedores no se han tocado.'
    exit 0
}

# ------------------------------------------------------- contenedores ---
Titulo 'Imagenes y stack'
Escribir 'INFO' 'Reconstruyendo con el APK ya en su sitio...'

# Se delega en stack.ps1: ya sabe encontrar el motor, elegir puertos libres y
# encender el tunel si el entorno trae token. Duplicar eso aqui seria pedir que
# los dos scripts se desincronicen.
$argumentos = @('rebuild', '-Entorno', $Entorno)
if ($Motor) { $argumentos += @('-Motor', $Motor) }
& (Join-Path $ops 'stack.ps1') @argumentos
$codigo = $LASTEXITCODE

if ($codigo -ne 0) {
    Escribir 'ERROR' ('stack.ps1 rebuild fallo (codigo ' + $codigo + ').')
    exit $codigo
}

Titulo 'Publicado'
Nota 'Comprueba que responde:   .\ops\stack.ps1 probar -Entorno ' + $Entorno
Nota 'Los 3 ejemplos del enunciado:   node ops\ejemplos.mjs'
