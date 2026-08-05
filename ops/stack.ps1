# stack.ps1 - levanta y opera el stack completo de Fintech Vital en contenedores.
#
# Uso:
#   .\ops\stack.ps1 arriba          build + up de db, api y web
#   .\ops\stack.ps1 abajo           para y borra los contenedores (conserva los datos)
#   .\ops\stack.ps1 estado          que hay corriendo
#   .\ops\stack.ps1 logs -Servicio db
#   .\ops\stack.ps1 probar          pruebas de humo del stack completo
#   .\ops\stack.ps1 rebuild         reconstruye las imagenes sin cache
#   .\ops\stack.ps1 migrar          aplica migraciones nuevas sobre la BD existente
#   .\ops\stack.ps1 psql            abre una consola SQL contra la BD
#   .\ops\stack.ps1 limpiar         borra contenedores Y EL VOLUMEN DE DATOS
#   .\ops\stack.ps1 arriba -Motor podman    fuerza motor
#   .\ops\stack.ps1 arriba -Solo db,api     levanta solo esos servicios
#
# Equivalente en Linux/macOS: ops/stack.sh
# ASCII y PowerShell 5.1 por convencion del repo (sin &&, sin acentos).

param(
    [Parameter(Position = 0)]
    [ValidateSet('arriba', 'efimero', 'abajo', 'reiniciar', 'estado', 'logs', 'probar', 'rebuild', 'migrar', 'psql', 'limpiar', 'tunel')]
    [string]$Accion = 'arriba',

    [ValidateSet('docker', 'podman')]
    [string]$Motor,

    [string]$Servicio,
    [string[]]$Solo,

    # Archivo de entorno. Por defecto ops\.env; para produccion, ops\.env.prod.
    [string]$Entorno,

    # Solo para 'efimero': ademas de los contenedores, borra tambien las
    # imagenes construidas localmente al salir.
    [switch]$BorrarImagenes
)

$ErrorActionPreference = 'Continue'
$ops     = $PSScriptRoot
$raiz    = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $ops 'compose.yml'
$envFile = if ($Entorno) { if (Test-Path $Entorno) { $Entorno } else { Join-Path $ops $Entorno } } else { Join-Path $ops '.env' }
$envEjem = Join-Path $ops '.env.ejemplo'

function Escribir([string]$nivel, [string]$texto) {
    switch ($nivel) {
        'OK'    { Write-Host '[ OK  ] ' -ForegroundColor Green    -NoNewline }
        'ERROR' { Write-Host '[ERROR] ' -ForegroundColor Red      -NoNewline }
        'AVISO' { Write-Host '[AVISO] ' -ForegroundColor Yellow   -NoNewline }
        'INFO'  { Write-Host '[ --  ] ' -ForegroundColor DarkGray -NoNewline }
    }
    Write-Host $texto
}

function Titulo([string]$texto) {
    Write-Host ''
    Write-Host ('== ' + $texto + ' ==') -ForegroundColor Cyan
}

# --------------------------------------------------------------- entorno ---
# El compose se niega a arrancar sin POSTGRES_PASSWORD. En vez de fallar con un
# error de compose, se crea el .env desde el ejemplo la primera vez.
if (-not (Test-Path $envFile)) {
    if (Test-Path $envEjem) {
        Copy-Item $envEjem $envFile
        Escribir 'AVISO' 'No habia ops\.env: se creo desde ops\.env.ejemplo. Revisalo antes de desplegar fuera de local.'
    } else {
        Escribir 'ERROR' 'Falta ops\.env y tampoco esta ops\.env.ejemplo.'
        exit 1
    }
}

# ---------------------------------------------------- motor de contenedores ---
function Test-MotorVivo([string]$cli) {
    if (-not (Get-Command $cli -ErrorAction SilentlyContinue)) { return $false }
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $cli info 2>&1 | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false } finally { $ErrorActionPreference = $anterior }
}

function Iniciar-PodmanMachine {
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) { return $false }
    Escribir 'INFO' 'La maquina de Podman esta parada; arrancandola (puede tardar ~1 min)...'
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & podman machine start 2>&1 | ForEach-Object { Write-Host "  $_" } }
    finally { $ErrorActionPreference = $anterior }
    for ($i = 0; $i -lt 15; $i++) {
        if (Test-MotorVivo 'podman') { return $true }
        Start-Sleep -Seconds 4
    }
    return $false
}

function Iniciar-DockerDesktop {
    Escribir 'INFO' 'Docker no responde; intentando iniciar Docker Desktop (hasta 2 min)...'
    $rutas = @("$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe")
    $arrancado = $false
    foreach ($ruta in $rutas) { if (Test-Path $ruta) { Start-Process $ruta; $arrancado = $true; break } }
    if (-not $arrancado) { return $false }
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 4
        Write-Host -NoNewline '.'
        if (Test-MotorVivo 'docker') { Write-Host ''; return $true }
    }
    Write-Host ''
    return $false
}

function Elegir-Motor {
    if ($Motor) {
        if ($Motor -eq 'podman' -and -not (Test-MotorVivo 'podman')) {
            if (-not (Iniciar-PodmanMachine)) { Escribir 'ERROR' 'No se pudo arrancar la maquina de Podman.'; exit 1 }
        }
        if ($Motor -eq 'docker' -and -not (Test-MotorVivo 'docker')) {
            if (-not (Iniciar-DockerDesktop)) { Escribir 'ERROR' 'Docker no responde.'; exit 1 }
        }
        return $Motor
    }
    # Lo que YA este vivo primero: arrancar un motor cuesta minutos.
    if (Test-MotorVivo 'docker') { return 'docker' }
    if (Test-MotorVivo 'podman') { Escribir 'INFO' 'Docker no responde; usando Podman.'; return 'podman' }
    if (Iniciar-PodmanMachine)   { return 'podman' }
    if (Iniciar-DockerDesktop)   { return 'docker' }
    Escribir 'ERROR' 'Ningun motor de contenedores disponible (ni Docker ni Podman).'
    Write-Host '  Instala uno con: .\frontend\scripts\windows\verificar-requisitos.ps1 -InstalarPodman'
    exit 1
}

$motorCli = Elegir-Motor
Escribir 'INFO' ("Motor: $motorCli")

# `podman compose` delega en un docker-compose externo y anuncia ese hecho por
# stderr. PowerShell 5.1 pinta cualquier stderr de un exe como si fuera un
# error, asi que el mensaje informativo aparece en rojo y asusta. Se silencia.
$env:PODMAN_COMPOSE_WARNING_LOGS = 'false'

# Podman 5 delega `podman compose` en un proveedor externo (docker-compose o
# podman-compose). Si no hay ninguno, avisa claro en vez de fallar con un error
# opaco a mitad del build.
function Comprobar-Compose {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $motorCli compose version 2>&1 | Out-Null
        $ok = ($LASTEXITCODE -eq 0)
    } catch { $ok = $false } finally { $ErrorActionPreference = $anterior }
    if (-not $ok) {
        Escribir 'ERROR' "$motorCli no tiene subcomando 'compose' disponible."
        if ($motorCli -eq 'podman') {
            Write-Host '  Podman necesita un proveedor de compose. Instala docker-compose:'
            Write-Host '    winget install Docker.DockerCompose'
        }
        exit 1
    }
}
Comprobar-Compose

function Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & $motorCli compose -f $compose --env-file $envFile @Args
}

function Leer-Env([string]$clave, [string]$porDefecto) {
    $linea = Select-String -Path $envFile -Pattern "^\s*$clave\s*=" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $linea) { return $porDefecto }
    $valor = ($linea.Line -split '=', 2)[1].Trim()
    if ($valor) { return $valor } else { return $porDefecto }
}

$puertoWeb = Leer-Env 'PUERTO_WEB' '3000'
$puertoApi = Leer-Env 'PUERTO_API' '8080'
$puertoDb  = Leer-Env 'PUERTO_DB'  '5432'
$dbNombre  = Leer-Env 'POSTGRES_DB' 'fintechvital'
$dbUsuario = Leer-Env 'POSTGRES_USER' 'fintechvital'

# ------------------------------------------------------------- pruebas ---
function Probar-Stack {
    $fallos = 0

    Titulo 'Base de datos'
    $psqlBase = @('exec', '-T', 'db', 'psql', '-U', $dbUsuario, '-d', $dbNombre, '-tAc')

    $tablas = (Compose @psqlBase "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'") 2>$null
    $tablas = ("$tablas").Trim()
    if ($tablas -match '^\d+$' -and [int]$tablas -ge 20) {
        Escribir 'OK' "Esquema creado: $tablas tablas"
    } else {
        Escribir 'ERROR' "No se pudo contar las tablas (respuesta: '$tablas')"; $fallos++
    }

    $migr = (Compose @psqlBase "SELECT count(*) FROM esquema_historial") 2>$null
    $migr = ("$migr").Trim()
    $migrEsperadas = (Get-ChildItem (Join-Path $raiz 'db\migraciones') -Filter 'V*__*.sql' -ErrorAction SilentlyContinue).Count
    if ($migrEsperadas -lt 1) { $migrEsperadas = 1 }
    if ($migr -match '^\d+$' -and [int]$migr -ge $migrEsperadas) {
        Escribir 'OK' "Migraciones aplicadas: $migr de $migrEsperadas"
    } else {
        Escribir 'ERROR' "Faltan migraciones: aplicadas '$migr' de $migrEsperadas. Corre: stack.ps1 migrar"; $fallos++
    }

    $cats = (Compose @psqlBase "SELECT count(*) FROM categoria") 2>$null
    $cats = ("$cats").Trim()
    if ($cats -eq '12') { Escribir 'OK' 'Taxonomia: 12 categorias' }
    else { Escribir 'ERROR' "Se esperaban 12 categorias, hay '$cats'"; $fallos++ }

    $i18n = (Compose @psqlBase "SELECT count(*) FROM categoria_i18n") 2>$null
    $i18n = ("$i18n").Trim()
    if ($i18n -eq '36') { Escribir 'OK' 'i18n: 36 etiquetas (12 x 3 idiomas)' }
    else { Escribir 'ERROR' "Se esperaban 36 etiquetas i18n, hay '$i18n'"; $fallos++ }

    $usuarios = (Compose @psqlBase "SELECT count(*) FROM usuario") 2>$null
    $usuarios = ("$usuarios").Trim()
    if ($usuarios -match '^\d+$' -and [int]$usuarios -gt 0) {
        Escribir 'OK' "Semilla demo: $usuarios usuarios"
        $movs = (Compose @psqlBase "SELECT count(*) FROM transaccion") 2>$null
        Escribir 'OK' ("Movimientos: " + ("$movs").Trim())
        $anal = (Compose @psqlBase "SELECT count(*) FROM analisis") 2>$null
        Escribir 'OK' ("Analisis: " + ("$anal").Trim())
        $perf = (Compose @psqlBase "SELECT string_agg(DISTINCT perfil_codigo, ', ') FROM analisis") 2>$null
        Escribir 'INFO' ("Perfiles presentes: " + ("$perf").Trim())
    } else {
        Escribir 'INFO' 'Sin datos de ejemplo (FV_CARGAR_DEMO=no). Es lo esperado en produccion.'
    }

    # Los indicadores solo cuadran si las vistas y la semilla concuerdan.
    $ind = (Compose @psqlBase "SELECT count(*) FROM vw_indicadores_mensuales") 2>$null
    $ind = ("$ind").Trim()
    if ($ind -match '^\d+$') { Escribir 'OK' "Vista de indicadores responde ($ind filas)" }
    else { Escribir 'ERROR' 'La vista vw_indicadores_mensuales fallo'; $fallos++ }

    Titulo 'API'
    $apiOk = $false
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$puertoApi/api/v1/salud" -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { $apiOk = $true; break }
        } catch { Start-Sleep -Seconds 3 }
    }
    if ($apiOk) {
        Escribir 'OK' "API responde en http://localhost:$puertoApi"
        # El login real es la prueba que importa: demuestra que la API habla con
        # la base de datos y no con credenciales escritas en el codigo.
        try {
            $cuerpoLogin = '{"email":"ana.torres@ejemplo.mx","password":"' + (Leer-Env 'FV_PASSWORD_DEMO' '') + '"}'
            $bytesLogin = [Text.Encoding]::UTF8.GetBytes($cuerpoLogin)
            $rl = Invoke-WebRequest -Uri "http://127.0.0.1:$puertoApi/api/v1/auth/login" -Method Post -Body $bytesLogin -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
            if (($rl.Content | ConvertFrom-Json).access_token) {
                Escribir 'OK' 'Login contra la BD: devuelve token'
            } else {
                Escribir 'ERROR' 'El login respondio sin access_token'; $fallos++
            }
        } catch {
            Escribir 'AVISO' 'El login no devolvio token (revisa FV_PASSWORD_DEMO y que la semilla este cargada)'
        }
        try {
            $cuerpo = '{"ingreso_mensual":4500,"nivel_endeudamiento":25,"frecuencia_ahorro":"Media","transacciones":[{"descripcion":"Supermercado","valor":420}]}'
            $bytes = [Text.Encoding]::UTF8.GetBytes($cuerpo)
            $r2 = Invoke-WebRequest -Uri "http://127.0.0.1:$puertoApi/api/v1/analisis-financiero" -Method Post -Body $bytes -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
            Escribir 'OK' 'POST /api/v1/analisis-financiero responde'
        } catch {
            Escribir 'AVISO' 'POST /api/v1/analisis-financiero NO existe todavia (la API lo expone en /api/analisis-financiero y con otra forma). Ver docs/REVISION_API.md'
        }
    } else {
        Escribir 'ERROR' "La API no respondio en el puerto $puertoApi"; $fallos++
    }

    Titulo 'Web'
    $webOk = $false
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$puertoWeb/es/login" -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { $webOk = $true; break }
        } catch { Start-Sleep -Seconds 3 }
    }
    if ($webOk) { Escribir 'OK' "Web responde en http://localhost:$puertoWeb (es | pt | en)" }
    else { Escribir 'ERROR' "La web no respondio en el puerto $puertoWeb"; $fallos++ }

    Write-Host ''
    if ($fallos -eq 0) {
        Write-Host 'Stack verificado: todo responde.' -ForegroundColor Green
        return 0
    }
    Write-Host "Hay $fallos comprobacion(es) en rojo." -ForegroundColor Red
    return 1
}

# ------------------------------------------------------------- acciones ---
switch ($Accion) {

    'arriba' {
        Titulo 'Construyendo y levantando el stack'
        if ($Solo) { Compose up -d --build @Solo } else { Compose up -d --build }
        if ($LASTEXITCODE -ne 0) { Escribir 'ERROR' 'Fallo el levantamiento del stack.'; exit 1 }
        Write-Host ''
        Compose ps
        Write-Host ''
        Escribir 'OK' "Web: http://localhost:$puertoWeb"
        Escribir 'OK' "API: http://localhost:$puertoApi"
        Escribir 'OK' "BD:  localhost:$puertoDb  (base $dbNombre, usuario $dbUsuario)"
        Write-Host ''
        Write-Host 'Comprueba que todo funciona con: .\ops\stack.ps1 probar'
    }

    'efimero' {
        # Modo "no me dejes basura": el stack corre EN PRIMER PLANO y, al salir
        # con Ctrl+C, se borran contenedores, red y volumen de datos. Sirve para
        # una prueba rapida sin que quede nada ocupando RAM ni disco.
        #
        # Ctrl+C se lo lleva `compose up` (que para los contenedores) y el
        # control vuelve aqui; el finally garantiza la limpieza aunque el
        # levantamiento falle a mitad.
        Titulo 'Stack efimero - Ctrl+C para salir y limpiar TODO'
        Escribir 'AVISO' 'Al salir se borran contenedores, red y VOLUMEN DE DATOS (la BD se recrea vacia la proxima vez).'
        try {
            Compose up --build
        } finally {
            Write-Host ''
            Titulo 'Limpiando'
            Compose down -v --remove-orphans
            if ($BorrarImagenes) {
                Compose down --rmi local 2>$null | Out-Null
                Escribir 'OK' 'Imagenes locales eliminadas.'
            }
            Escribir 'OK' 'Todo limpio: sin contenedores, sin volumen, sin RAM ocupada.'
        }
    }

    'tunel' {
        Titulo 'Levantando el stack + Cloudflare Tunnel'
        $token = Leer-Env 'CLOUDFLARE_TUNNEL_TOKEN' ''
        if (-not $token) {
            Escribir 'ERROR' 'Falta CLOUDFLARE_TUNNEL_TOKEN en el archivo de entorno.'
            exit 1
        }
        Compose --profile tunel up -d --build
        Compose ps
        Write-Host ''
        Escribir 'INFO' 'En el panel de Cloudflare, los public hostnames apuntan a los NOMBRES DE SERVICIO:'
        Write-Host '    staging.fintechvital.com      ->  http://web:3000'
        Write-Host '    api-staging.fintechvital.com  ->  http://api:8080'
        Escribir 'AVISO' 'La web hornea NEXT_PUBLIC_API_URL en el build: para staging tiene que ser https://api-staging.fintechvital.com/api/v1 y hay que reconstruir.'
    }

    'abajo' {
        Compose down
        Escribir 'OK' 'Stack detenido. El volumen de datos se conserva.'
    }

    'reiniciar' {
        Compose restart
        Compose ps
    }

    'estado' {
        Compose ps
    }

    'logs' {
        if ($Servicio) { Compose logs -f --tail 100 $Servicio }
        else { Compose logs -f --tail 100 }
    }

    'rebuild' {
        Titulo 'Reconstruyendo imagenes sin cache'
        Compose build --no-cache
        Compose up -d
        Compose ps
    }

    'migrar' {
        Titulo 'Aplicando migraciones pendientes'
        Compose --profile migrar run --rm migrador
    }

    'psql' {
        Write-Host "Consola SQL sobre $dbNombre. Salir: \q"
        Compose exec db psql -U $dbUsuario -d $dbNombre
    }

    'limpiar' {
        Write-Host 'Esto BORRA el volumen de datos de PostgreSQL. Los datos no se recuperan.' -ForegroundColor Yellow
        $r = Read-Host 'Escribe BORRAR para confirmar'
        if ($r -eq 'BORRAR') {
            Compose down -v
            Escribir 'OK' 'Contenedores y volumen eliminados.'
        } else {
            Escribir 'INFO' 'Cancelado.'
        }
    }

    'probar' {
        $codigo = Probar-Stack
        exit $codigo
    }
}
