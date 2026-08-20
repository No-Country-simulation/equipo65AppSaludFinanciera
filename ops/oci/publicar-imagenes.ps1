# =============================================================================
# Construye las 4 imagenes arm64 y las sube a OCIR (Oracle Container Registry).
#
#   .\ops\oci\publicar-imagenes.ps1
#   .\ops\oci\publicar-imagenes.ps1 -Solo web          # solo lo que cambio
#   .\ops\oci\publicar-imagenes.ps1 -Sha a1b2c3d       # etiqueta ademas :git-<sha>
#
# Requisitos (una vez por sesion, ver DESPLIEGUE_NUBE_TECNICO.md §3):
#   - podman machine arriba
#   - emulacion arm64 registrada (se PIERDE al reiniciar la maquina podman)
#   - podman login a mx-monterrey-1.ocir.io
#
# ASCII y PowerShell 5.1: sin && y sin acentos, por convencion del repo.
# =============================================================================
param(
    [ValidateSet('db', 'api', 'ml', 'web')][string[]]$Solo,
    [string]$Sha,
    # La API que queda HORNEADA en el bundle de la web. Tiene que ser la que el
    # navegador del usuario pueda resolver, no un nombre de la red de contenedores.
    [string]$ApiUrl = 'https://api.fintechvital.com/api/v1',
    [string]$ApkUrl = '/fintech-vital.apk'
)

# 'Continue' y NO 'Stop'. En PowerShell 5.1 un ejecutable NATIVO que escribe en
# stderr se envuelve en un ErrorRecord (NativeCommandError) y con 'Stop' aborta
# el script aunque haya devuelto 0. `podman push` manda TODO su progreso a
# stderr, asi que con 'Stop' el primer push mata la corrida. Los fallos reales
# se detectan con $LASTEXITCODE, que sigue siendo fiable.
$ErrorActionPreference = 'Continue'
# Registro de destino: sale de ops\oci\oci.env para no fijar aqui datos de la
# cuenta. Formato: <region>.ocir.io/<namespace>/<repo>
$conf = Join-Path $PSScriptRoot 'oci.env'
if (-not (Test-Path $conf)) {
    Write-Host "No encuentro $conf" -ForegroundColor Red
    Write-Host 'Copia la plantilla y rellenala:  copy ops\oci\oci.env.ejemplo ops\oci\oci.env'
    exit 1
}
$cfg = @{}
foreach ($linea in Get-Content $conf) {
    if ($linea -match '^\s*#' -or $linea -notmatch '=') { continue }
    $par = $linea -split '=', 2
    $cfg[$par[0].Trim()] = $par[1].Trim()
}
$REGHOST = "$($cfg['OCI_REGION']).ocir.io"
$REG     = "$REGHOST/$($cfg['OCIR_NAMESPACE'])/$($cfg['OCIR_REPO'])"
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $raiz

function Quiere($n) { return (-not $Solo) -or ($Solo -contains $n) }
function Titulo($t) { Write-Host ''; Write-Host ("== $t ==") -ForegroundColor Cyan }

# --- Fallar rapido, antes de gastar minutos en un build inutil ---------------
Titulo 'Comprobaciones previas'

if (-not (podman login --get-login $REGHOST 2>$null)) {
    Write-Host 'No hay sesion en OCIR. Corre el login primero (ver el doc tecnico, seccion 3.3).' -ForegroundColor Red
    exit 1
}
Write-Host '  login a OCIR OK'

# La emulacion arm64 se pierde cada vez que se reinicia la maquina de podman, y
# sin ella el build produce imagenes x86 que suben sin protestar y solo revientan
# al arrancar EN LA INSTANCIA, con un "exec format error" que no dice de donde
# sale. Comprobarlo aqui cuesta dos segundos.
$arq = (podman run --rm --platform linux/arm64 docker.io/library/alpine:3 uname -m 2>$null)
if ($arq -ne 'aarch64') {
    Write-Host '  Falta la emulacion arm64 (ver el doc tecnico, seccion 3.2).' -ForegroundColor Red
    exit 1
}
Write-Host '  emulacion arm64 OK'

# El APK no viaja en el clon (~110 MB, esta en .gitignore). Si falta, la web se
# construye igual y el boton de descarga da 404 - y eso no se nota hasta que
# alguien lo pulsa.
if ((Quiere 'web') -and $ApkUrl -and -not (Test-Path 'frontend\web\public\fintech-vital.apk')) {
    Write-Host '  AVISO: no hay APK en frontend\web\public\. El boton de descarga dara 404.' -ForegroundColor Yellow
    Write-Host '         Generalo con ops\publicar.ps1 -SoloApk -Entorno .env.prod, o pasa -ApkUrl ""'
}

$etiquetas = @('latest')
if ($Sha) { $etiquetas += "git-$Sha" }

function ConstruirYSubir($nombre, $contexto, $extra) {
    Titulo "$nombre  ($($etiquetas -join ', '))"
    $args = @('build', '--platform', 'linux/arm64')
    foreach ($t in $etiquetas) { $args += @('-t', "$REG/${nombre}:$t") }
    $args += $extra
    $args += $contexto

    & podman @args 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { throw "BUILD fallo: $nombre" }

    foreach ($t in $etiquetas) {
        & podman push "$REG/${nombre}:$t" 2>&1 | ForEach-Object { "$_" }
        if ($LASTEXITCODE -ne 0) { throw "PUSH fallo: ${nombre}:$t" }
    }
    Write-Host "  $nombre publicado" -ForegroundColor Green
}

if (Quiere 'db')  { ConstruirYSubir 'db'  'db'      @() }
if (Quiere 'ml')  { ConstruirYSubir 'ml'  'ml'      @() }
if (Quiere 'api') { ConstruirYSubir 'api' 'backend' @() }
if (Quiere 'web') {
    # NEXT_PUBLIC_* se hornean en el build: cambiarlas exige reconstruir, no basta
    # con reiniciar el contenedor.
    ConstruirYSubir 'web' 'frontend/web' @(
        '--build-arg', "NEXT_PUBLIC_API_URL=$ApiUrl",
        '--build-arg', "NEXT_PUBLIC_APK_URL=$ApkUrl")
}

Titulo 'Listo'
Write-Host "Imagenes en $REG"
Write-Host 'Siguiente paso:  .\ops\oci\desplegar.ps1'
