# =============================================================================
# Despliega Fintech Vital en la instancia de OCI, por el Bastion.
#
#   .\ops\oci\desplegar.ps1                      # despliega con ops\.env.prod
#   .\ops\oci\desplegar.ps1 -Entorno .env.staging
#   .\ops\oci\desplegar.ps1 -Accion estado       # que hay corriendo ahi
#   .\ops\oci\desplegar.ps1 -Accion logs         # ultimas lineas de cada servicio
#   .\ops\oci\desplegar.ps1 -Accion bajar        # apaga el stack (conserva datos)
#   .\ops\oci\desplegar.ps1 -Accion semilla-jurado  # cuenta demo del video/jurado
#
# Todo el trabajo ocurre dentro de un contenedor con oci-cli + ssh (la imagen
# `fv-deployer`, que se construye sola), asi que en Windows no hace falta
# instalar nada mas alla de podman.
#
# La configuracion de la cuenta y la ruta de las llaves salen de
# `ops\oci\oci.env` (copia de `oci.env.ejemplo`; no entra al repositorio).
#
# ASCII y PowerShell 5.1: sin && y sin acentos, por convencion del repo.
# =============================================================================
param(
    [string]$Entorno = '.env.prod',
    [ValidateSet('desplegar', 'bajar', 'estado', 'logs', 'semilla-jurado')][string]$Accion = 'desplegar',
    # Config alternativa (por defecto: ops\oci\oci.env)
    [string]$Config
)

# 'Continue' y NO 'Stop'. En PowerShell 5.1 un ejecutable NATIVO que escribe en
# stderr se envuelve en un ErrorRecord (NativeCommandError) y con 'Stop' aborta
# el script aunque el proceso haya devuelto 0. Estos scripts mandan su progreso
# a stderr, asi que con 'Stop' esto se caia siempre en la primera linea. El
# control de errores se hace con $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
$ops = Split-Path -Parent $PSScriptRoot     # ...\ops
$oci = $PSScriptRoot                        # ...\ops\oci
$raiz = Split-Path -Parent $ops             # raiz del repo
# Las semillas viajan a la instancia en la accion semilla-jurado. Se monta
# siempre: montar de mas no cuesta nada y evita un `if` alrededor de podman run.
$semillas = Join-Path $raiz 'db\semillas'

function Titulo($t) { Write-Host ''; Write-Host ("== $t ==") -ForegroundColor Cyan }
function Morir($t)  { Write-Host $t -ForegroundColor Red; exit 1 }

Titulo 'Comprobaciones previas'

# --- Configuracion de la cuenta ---------------------------------------------
if (-not $Config) { $Config = Join-Path $oci 'oci.env' }
if (-not (Test-Path $Config)) {
    Write-Host "No encuentro $Config" -ForegroundColor Red
    Write-Host 'Copia la plantilla y rellenala:' -ForegroundColor Yellow
    Write-Host '  copy ops\oci\oci.env.ejemplo ops\oci\oci.env'
    exit 1
}

$cfg = @{}
foreach ($linea in Get-Content $Config) {
    if ($linea -match '^\s*#' -or $linea -notmatch '=') { continue }
    $par = $linea -split '=', 2
    $cfg[$par[0].Trim()] = $par[1].Trim()
}

foreach ($clave in @('OCI_USER_OCID', 'OCI_TENANCY_OCID', 'OCI_FINGERPRINT', 'OCI_LLAVES_DIR')) {
    if (-not $cfg[$clave]) { Morir "Falta $clave en $Config" }
}

$llaves = $cfg['OCI_LLAVES_DIR']
if (-not (Test-Path (Join-Path $llaves 'oci\oci_api_key.pem'))) {
    Morir "No encuentro la llave API en $llaves\oci\oci_api_key.pem (revisa OCI_LLAVES_DIR en $Config)."
}
if (-not (Test-Path (Join-Path $ops $Entorno))) {
    Morir "No encuentro ops\$Entorno."
}
Write-Host '  configuracion, llaves y entorno OK'

# --- Imagen del deployer -----------------------------------------------------
# Trae oci-cli y ssh ya instalados: sin ella cada corrida pagaria un pip install.
podman image exists fv-deployer 2>$null
if (-not $?) {
    Titulo 'Construyendo la imagen del deployer (solo la primera vez)'
    podman build -f (Join-Path $oci 'deployer.Dockerfile') -t fv-deployer $oci 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { Morir 'No se pudo construir fv-deployer' }
}

# Cada accion es un script remoto distinto; el andamiaje (tunel, copia) es comun.
$script = if ($Accion -eq 'desplegar') { '/fv/_desplegar.sh' } else { '/fv/_operar.sh' }

Titulo "Accion: $Accion  (entorno $Entorno)"

# El `2>&1 | ForEach-Object { "$_" }` del final no es adorno: sin el, PowerShell
# 5.1 envuelve la PRIMERA linea que el proceso escribe en stderr en un
# NativeCommandError y la pinta en rojo con un volcado de la llamada, como si el
# despliegue hubiera reventado. Convertir cada registro a texto lo deja como
# salida normal, y $LASTEXITCODE sigue siendo el de podman.
podman run --rm `
    -e "OCI_CLI_USER=$($cfg['OCI_USER_OCID'])" `
    -e "OCI_CLI_TENANCY=$($cfg['OCI_TENANCY_OCID'])" `
    -e "OCI_CLI_FINGERPRINT=$($cfg['OCI_FINGERPRINT'])" `
    -e "OCI_CLI_REGION=$($cfg['OCI_REGION'])" `
    -e "ENTORNO=$Entorno" -e "ACCION=$Accion" `
    -v "${llaves}:/keys:ro" `
    -v "${oci}:/fv:ro" `
    -v "${ops}:/cfg:ro" `
    -v "${semillas}:/semillas:ro" `
    fv-deployer bash $script 2>&1 | ForEach-Object { "$_" }

if ($LASTEXITCODE -eq 0) {
    Titulo 'OK'
    if ($Accion -eq 'semilla-jurado') {
        Write-Host 'Entra a comprobarlo a mano antes de grabar:'
        Write-Host '  https://fintechvital.com/es/login'
        Write-Host '  ana.torres@ejemplo.mx  (la contrasena esta en ops\.env.prod)'
    } else {
        Write-Host 'Comprueba en publico:'
        Write-Host '  https://fintechvital.com     https://api.fintechvital.com/api/v1/salud'
        Write-Host 'Y el smoke test de los 3 ejemplos:'
        Write-Host '  $env:FV_API_URL="https://api.fintechvital.com/api/v1"; node ops\ejemplos.mjs'
    }
} else {
    Titulo 'FALLO'
    Write-Host 'Si el error fue "Permission denied (publickey)" en el bastion, casi seguro'
    Write-Host 'es tu IP publica: el allowlist del Bastion trae una sola y rota con el ISP.'
    Write-Host 'Ver DESPLIEGUE_NUBE_TECNICO.md, seccion 9 (Diagnostico).'
    exit $LASTEXITCODE
}
