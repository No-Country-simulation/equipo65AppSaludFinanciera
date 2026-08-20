# stack.ps1 - enciende y apaga Fintech Vital entero (base de datos + modelo +
# API + web) con UN solo comando, en contenedores.
#
# Para el dia a dia bastan tres:
#
#   .\ops\stack.ps1 arriba     lo enciende todo
#   .\ops\stack.ps1 probar     comprueba que todo responde de verdad
#   .\ops\stack.ps1 abajo      lo apaga (los datos se conservan)
#
#   .\ops\stack.ps1 ayuda      la lista completa, explicada
#
# Equivalente en Linux/macOS: ops/stack.sh
#
# Lo que el script resuelve solo, para no tener que saber de contenedores:
#
#   - ENCUENTRA Docker o Podman aunque la consola tenga el PATH viejo. Es el
#     caso tipico justo despues de instalar: Windows solo lee el PATH al abrir
#     una terminal nueva, asi que la que ya estaba abierta no ve el programa
#     recien instalado y el script diria "no hay motor" mintiendo.
#   - Elige el motor que ademas TENGA compose, no solo el que este encendido.
#     Podman no trae compose incorporado y se apoya en el de Docker.
#   - Si un PUERTO esta ocupado por otro programa, se mueve al siguiente libre
#     en vez de fallar. Se desactiva con -PuertosFijos.
#   - Crea ops\.env la primera vez copiando ops\.env.ejemplo.
#
# ASCII y PowerShell 5.1 por convencion del repo (sin &&, sin acentos).

param(
    [Parameter(Position = 0)]
    [string]$Accion = 'arriba',

    [ValidateSet('docker', 'podman')]
    [string]$Motor,

    # Para 'logs': de que servicio (db | api | ml | web | tunel).
    [string]$Servicio,

    # Levanta solo esos servicios: -Solo db,api
    [string[]]$Solo,

    # Archivo de entorno. Por defecto ops\.env; para el entorno publico,
    # ops\.env.staging.
    [string]$Entorno,

    # Solo para 'efimero': ademas de los contenedores, borra tambien las
    # imagenes construidas localmente al salir.
    [switch]$BorrarImagenes,

    # No buscar puertos alternativos: usa los del .env y falla si estan
    # ocupados. Util cuando algo de fuera (un tunel, un proxy) depende del
    # numero de puerto exacto.
    [switch]$PuertosFijos
)

$ErrorActionPreference = 'Continue'
$ops     = $PSScriptRoot
$raiz    = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $ops 'compose.yml'
$envFile = if ($Entorno) { if (Test-Path $Entorno) { $Entorno } else { Join-Path $ops $Entorno } } else { Join-Path $ops '.env' }
$envEjem = Join-Path $ops '.env.ejemplo'

$acciones = @('arriba', 'efimero', 'abajo', 'reiniciar', 'estado', 'logs', 'probar',
              'rebuild', 'migrar', 'psql', 'limpiar', 'tunel', 'ayuda')

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

function Nota([string]$texto) { Write-Host ('  ' + $texto) -ForegroundColor DarkGray }

# ----------------------------------------------------------------- ayuda ---
function Mostrar-Ayuda {
    Write-Host ''
    Write-Host '  Fintech Vital - encender el proyecto entero' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  Levanta la base de datos, el modelo, la API y la web en contenedores.'
    Write-Host '  No hace falta instalar Java, Node, Python ni PostgreSQL: va todo dentro.'
    Write-Host ''
    Write-Host '  LO QUE USARAS CASI SIEMPRE' -ForegroundColor White
    Write-Host '    .\ops\stack.ps1 arriba      Enciende todo. La primera vez tarda unos'
    Write-Host '                                minutos (construye las imagenes); despues,'
    Write-Host '                                segundos.'
    Write-Host '    .\ops\stack.ps1 probar      Comprueba de verdad que responde: base de'
    Write-Host '                                datos, login real, API y web.'
    Write-Host '    .\ops\stack.ps1 abajo       Lo apaga. Los datos NO se borran.'
    Write-Host ''
    Write-Host '  CUANDO ALGO NO VA' -ForegroundColor White
    Write-Host '    .\ops\stack.ps1 estado      Que hay encendido ahora mismo.'
    Write-Host '    .\ops\stack.ps1 logs -Servicio api'
    Write-Host '                                Mira lo que dice un servicio por dentro.'
    Write-Host '                                Servicios: db | api | ml | web | tunel.'
    Write-Host '                                Ctrl+C para dejar de mirar.'
    Write-Host '    .\ops\stack.ps1 reiniciar   Apaga y enciende sin reconstruir.'
    Write-Host '    .\ops\stack.ps1 rebuild     Reconstruye las imagenes desde cero. Es lo'
    Write-Host '                                que toca si cambiaste codigo y no se refleja,'
    Write-Host '                                o si tocaste NEXT_PUBLIC_API_URL.'
    Write-Host ''
    Write-Host '  DE VEZ EN CUANDO' -ForegroundColor White
    Write-Host '    .\ops\stack.ps1 efimero     Enciende todo y, al pulsar Ctrl+C, lo borra'
    Write-Host '                                sin dejar rastro (ni datos ni RAM ocupada).'
    Write-Host '    .\ops\stack.ps1 migrar      Aplica cambios nuevos de base de datos a'
    Write-Host '                                una base que ya existe.'
    Write-Host '    .\ops\stack.ps1 psql        Consola SQL contra la base de datos.'
    Write-Host '    .\ops\stack.ps1 limpiar     BORRA los datos y empieza de cero.'
    Write-Host '                                Pide confirmacion escrita.'
    Write-Host '    .\ops\stack.ps1 tunel       Como "arriba", pero exige el token de'
    Write-Host '                                Cloudflare y avisa si falta.'
    Write-Host ''
    Write-Host '  OPCIONES' -ForegroundColor White
    Write-Host '    -Motor docker|podman        Fuerza el motor de contenedores.'
    Write-Host '    -Entorno .env.staging       Usa otro archivo de configuracion.'
    Write-Host '    -Solo db,api                Levanta solo esos servicios.'
    Write-Host '    -PuertosFijos               No buscar puertos alternativos si el que'
    Write-Host '                                toca esta ocupado (por defecto SI busca).'
    Write-Host ''
    Write-Host '  Mas detalle, y que hacer cuando algo falla, en ops\README.md'
    Write-Host ''
}

if ($Accion -eq 'ayuda' -or $Accion -eq '-h' -or $Accion -eq '--help' -or $Accion -eq '/?') {
    Mostrar-Ayuda
    exit 0
}

if ($acciones -notcontains $Accion) {
    Escribir 'ERROR' ("No conozco la accion '" + $Accion + "'.")
    Write-Host ''
    Write-Host '  Lo que casi seguro querias:'
    Write-Host '    .\ops\stack.ps1 arriba     encender todo'
    Write-Host '    .\ops\stack.ps1 abajo      apagarlo'
    Write-Host '    .\ops\stack.ps1 ayuda      ver la lista completa'
    Write-Host ''
    exit 1
}

# --------------------------------------------------------------- entorno ---
# El compose se niega a arrancar sin POSTGRES_PASSWORD. En vez de fallar con un
# error de compose, se crea el .env desde el ejemplo la primera vez.
if (-not (Test-Path $envFile)) {
    if (Test-Path $envEjem) {
        Copy-Item $envEjem $envFile
        Escribir 'INFO' 'Primera vez por aqui: he creado ops\.env copiando ops\.env.ejemplo.'
        Nota 'Sirve tal cual para trabajar en local. Revisalo antes de publicar nada fuera.'
    } else {
        Escribir 'ERROR' 'Falta ops\.env y tampoco esta ops\.env.ejemplo para copiarlo.'
        Nota 'Baja el repositorio entero, o pide ops\.env.ejemplo a alguien del equipo.'
        exit 1
    }
}

# ---------------------------------------------------- motor de contenedores ---
function Refrescar-Path {
    # Windows guarda el PATH en el registro y las consolas solo lo leen al
    # abrirse. Justo despues de instalar Docker o Podman, la terminal que ya
    # estaba abierta NO los ve: el script diria "no hay motor" cuando si lo hay.
    # Se relee el PATH del registro y se anaden las entradas que falten, mas las
    # carpetas de instalacion habituales que algunos instaladores no registran.
    $actual = @($env:Path -split ';' | Where-Object { $_ })
    $nuevas = @()
    foreach ($ambito in @('Machine', 'User')) {
        $valor = [Environment]::GetEnvironmentVariable('Path', $ambito)
        if (-not $valor) { continue }
        foreach ($ruta in ($valor -split ';')) {
            if ($ruta -and ($actual -notcontains $ruta) -and ($nuevas -notcontains $ruta)) { $nuevas += $ruta }
        }
    }
    # Docker Desktop deja en cli-plugins un docker-compose.exe suelto: es
    # exactamente el proveedor de compose que Podman necesita, asi que anadir
    # esa carpeta arregla los dos motores de una vez.
    $habituales = @(
        "$env:ProgramFiles\Docker\Docker\resources\bin",
        "$env:ProgramFiles\Docker\cli-plugins",
        "${env:ProgramFiles(x86)}\Docker\Docker\resources\bin",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\resources\bin",
        "$env:USERPROFILE\.docker\bin",
        "$env:USERPROFILE\.docker\cli-plugins",
        "$env:LOCALAPPDATA\Programs\Podman",
        "$env:ProgramFiles\RedHat\Podman"
    )
    foreach ($ruta in $habituales) {
        if ($ruta -and (Test-Path $ruta) -and ($actual -notcontains $ruta) -and ($nuevas -notcontains $ruta)) { $nuevas += $ruta }
    }
    if ($nuevas.Count -gt 0) { $env:Path = (($actual + $nuevas) -join ';') }
}

function Existe-Programa([string]$cli) {
    return [bool](Get-Command $cli -ErrorAction SilentlyContinue)
}

function Test-MotorVivo([string]$cli) {
    if (-not (Existe-Programa $cli)) { return $false }
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $cli info 2>&1 | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false } finally { $ErrorActionPreference = $anterior }
}

function Test-ComposeDisponible([string]$cli) {
    # Docker trae compose dentro. Podman NO: delega en un docker-compose.exe
    # externo y, si no lo encuentra, falla a mitad del build con un error opaco.
    if (-not (Existe-Programa $cli)) { return $false }
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $cli compose version 2>&1 | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false } finally { $ErrorActionPreference = $anterior }
}

# 'ausente' (no instalado) | 'dormido' (instalado, apagado) |
# 'sin-compose' (encendido, pero no sabe leer el compose.yml) | 'listo'
function Estado-Motor([string]$cli) {
    if (-not (Existe-Programa $cli))        { return 'ausente' }
    if (-not (Test-MotorVivo $cli))         { return 'dormido' }
    if (-not (Test-ComposeDisponible $cli)) { return 'sin-compose' }
    return 'listo'
}

function Iniciar-PodmanMachine {
    if (-not (Existe-Programa 'podman')) { return $false }
    Escribir 'INFO' 'Podman esta instalado pero apagado. Lo enciendo (tarda ~1 minuto la primera vez)...'
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & podman machine start 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray } }
    finally { $ErrorActionPreference = $anterior }
    for ($i = 0; $i -lt 15; $i++) {
        if (Test-MotorVivo 'podman') { return $true }
        Start-Sleep -Seconds 4
    }
    return $false
}

function Iniciar-DockerDesktop {
    $rutas = @("$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Docker\Docker Desktop.exe",
               "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe")
    $exe = $null
    foreach ($ruta in $rutas) { if (Test-Path $ruta) { $exe = $ruta; break } }
    if (-not $exe) { return $false }
    Escribir 'INFO' 'Docker Desktop esta instalado pero apagado. Lo abro (puede tardar 2 minutos)...'
    Start-Process $exe
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 4
        Write-Host -NoNewline '.'
        if (Test-MotorVivo 'docker') { Write-Host ''; return $true }
    }
    Write-Host ''
    return $false
}

function Explicar-SinCompose([string]$cli) {
    Escribir 'ERROR' "$cli esta funcionando, pero no sabe leer el archivo compose.yml."
    if ($cli -eq 'podman') {
        Write-Host ''
        Write-Host '  Podman no trae "compose" incorporado: usa el de Docker, y falta esa pieza.'
        Write-Host '  Elige una de las dos e instalala:'
        Write-Host ''
        Write-Host '    A) Solo la pieza que falta (rapido, unos 10 MB):' -ForegroundColor White
        Write-Host '         winget install Docker.DockerCompose'
        Write-Host ''
        Write-Host '    B) Docker Desktop entero, y usarlo como motor:' -ForegroundColor White
        Write-Host '         winget install Docker.DockerDesktop'
        Write-Host ''
        Write-Host '  Al terminar, vuelve a correr:  .\ops\stack.ps1 arriba'
        Write-Host '  (no hace falta reabrir la terminal: el script lo vuelve a buscar)'
    } else {
        Write-Host '  Reinstala Docker Desktop, que incluye compose:'
        Write-Host '    winget install Docker.DockerDesktop'
    }
}

function Elegir-Motor {
    $habiaDocker = Existe-Programa 'docker'
    $habiaPodman = Existe-Programa 'podman'
    Refrescar-Path
    if ((-not $habiaDocker) -and (Existe-Programa 'docker')) {
        Escribir 'INFO' 'Docker estaba instalado pero esta consola no lo veia (PATH antiguo). Ya lo encontre.'
    }
    if ((-not $habiaPodman) -and (Existe-Programa 'podman')) {
        Escribir 'INFO' 'Podman estaba instalado pero esta consola no lo veia (PATH antiguo). Ya lo encontre.'
    }

    if ($Motor) {
        $estado = Estado-Motor $Motor
        if ($estado -eq 'dormido') {
            $arrancado = if ($Motor -eq 'podman') { Iniciar-PodmanMachine } else { Iniciar-DockerDesktop }
            if (-not $arrancado) {
                Escribir 'ERROR' "Pediste $Motor pero no consigo encenderlo."
                Nota 'Abrelo a mano y vuelve a intentarlo, o deja que el script elija (sin -Motor).'
                exit 1
            }
            $estado = Estado-Motor $Motor
        }
        if ($estado -eq 'ausente')     { Escribir 'ERROR' "Pediste $Motor pero no esta instalado."; exit 1 }
        if ($estado -eq 'sin-compose') { Explicar-SinCompose $Motor; exit 1 }
        return $Motor
    }

    # Se prefiere lo que YA este encendido y COMPLETO: arrancar un motor cuesta
    # minutos, y quedarse con uno a medias (vivo pero sin compose) solo retrasa
    # el fallo hasta mitad del build.
    $estadoDocker = Estado-Motor 'docker'
    if ($estadoDocker -eq 'listo') { return 'docker' }

    $estadoPodman = Estado-Motor 'podman'
    if ($estadoPodman -eq 'listo') {
        if ($estadoDocker -ne 'ausente') { Escribir 'INFO' 'Docker no esta disponible ahora mismo; uso Podman, que hace lo mismo.' }
        return 'podman'
    }

    if ($estadoPodman -eq 'dormido') {
        if (Iniciar-PodmanMachine) {
            if ((Estado-Motor 'podman') -eq 'listo') { return 'podman' }
            $estadoPodman = 'sin-compose'
        }
    }
    if ($estadoDocker -eq 'dormido') {
        if (Iniciar-DockerDesktop) {
            if ((Estado-Motor 'docker') -eq 'listo') { return 'docker' }
            $estadoDocker = 'sin-compose'
        }
    }

    if ($estadoDocker -eq 'sin-compose') { Explicar-SinCompose 'docker'; exit 1 }
    if ($estadoPodman -eq 'sin-compose') { Explicar-SinCompose 'podman'; exit 1 }

    Escribir 'ERROR' 'No encuentro ningun motor de contenedores en este equipo.'
    Write-Host ''
    Write-Host '  El proyecto corre dentro de contenedores, asi que hace falta uno de estos:'
    Write-Host ''
    Write-Host '    Docker Desktop (el mas comun):'
    Write-Host '      winget install Docker.DockerDesktop'
    Write-Host ''
    Write-Host '    Podman (mas ligero, no pide permisos de administrador):'
    Write-Host '      .\frontend\scripts\windows\verificar-requisitos.ps1 -InstalarPodman'
    Write-Host ''
    Write-Host '  Instala uno, abrelo, y vuelve a correr:  .\ops\stack.ps1 arriba'
    Write-Host ''
    exit 1
}

$motorCli = Elegir-Motor
$motorNombre = if ($motorCli -eq 'docker') { 'Docker' } else { 'Podman' }
Escribir 'OK' "Motor de contenedores: $motorNombre"

# `podman compose` delega en un docker-compose externo y anuncia ese hecho por
# stderr. PowerShell 5.1 pinta cualquier stderr de un exe como si fuera un
# error, asi que el mensaje informativo aparece en rojo y asusta. Se silencia.
$env:PODMAN_COMPOSE_WARNING_LOGS = 'false'

# OJO con como se declara esta funcion. Con un
# `param([Parameter(ValueFromRemainingArguments)]$Args)` PowerShell la convierte
# en funcion AVANZADA, y entonces hereda los parametros comunes: `-d` se traga
# como abreviatura de `-Debug` y `-v` como abreviatura de `-Verbose`. Ninguno de
# los dos llegaba a compose, y el efecto era grave y silencioso:
#   `up -d --build` corria ATADO a la terminal (cerrarla tumbaba el stack)
#   `down -v`       no borraba el volumen: `limpiar` decia que si y no lo hacia
# Una funcion SIMPLE con el $args automatico pasa los argumentos tal cual.
function Compose {
    & $motorCli compose -f $compose --env-file $envFile @args
}

function Leer-Env([string]$clave, [string]$porDefecto) {
    $linea = Select-String -Path $envFile -Pattern "^\s*$clave\s*=" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $linea) { return $porDefecto }
    $valor = ($linea.Line -split '=', 2)[1].Trim()
    # Comentario al final de la linea (convencion dotenv: espacio antes de #).
    $valor = ($valor -replace '\s+#.*$', '').Trim().Trim('"').Trim("'")
    if ($valor) { return $valor } else { return $porDefecto }
}

# El tunel va PEGADO al ciclo de vida del stack: sube con `arriba` y baja con
# `abajo`. Solo se enciende si el entorno trae token, porque `ops/.env` (local)
# no lo lleva y cloudflared entraria en bucle de reinicio sin el.
$tokenTunel = Leer-Env 'CLOUDFLARE_TUNNEL_TOKEN' ''
$perfilArriba = if ($tokenTunel) { @('--profile', 'tunel') } else { @() }
# Al APAGAR se pasa el perfil siempre, haya token o no: si alguien levanto el
# tunel y despues vacio el token, sin esto el contenedor quedaria huerfano.
$perfilAbajo = @('--profile', 'tunel')

$script:puertoWeb = [int](Leer-Env 'PUERTO_WEB' '3000')
$script:puertoApi = [int](Leer-Env 'PUERTO_API' '8080')
$script:puertoDb  = [int](Leer-Env 'PUERTO_DB'  '5432')
$dbNombre   = Leer-Env 'POSTGRES_DB' 'fintechvital'
$dbUsuario  = Leer-Env 'POSTGRES_USER' 'fintechvital'
$cargarDemo = Leer-Env 'FV_CARGAR_DEMO' 'no'

# --------------------------------------------------------------- puertos ---
# Un puerto ocupado es el motivo mas comun de que esto no arranque, y el error
# de compose no dice quien lo ocupa. Aqui se comprueba ANTES y, si hace falta,
# se usa otro.

function Test-PuertoLibre([int]$puerto) {
    # Hacen falta DOS comprobaciones, porque una sola deja huecos:
    #
    #   1. Intentar abrirlo en 127.0.0.1, que es justo lo que hara el
    #      contenedor. Detecta el choque duro (otro contenedor publicando ahi),
    #      el que hace fallar a compose con "port is already allocated".
    #
    #   2. Mirar si hay CUALQUIER programa escuchando en ese puerto. Windows
    #      deja convivir un 0.0.0.0:3000 de otro programa con nuestro
    #      127.0.0.1:3000, asi que el paso 1 diria que esta libre; pero
    #      entonces "localhost:3000" es ambiguo y el usuario acaba mirando la
    #      aplicacion equivocada sin saberlo. Mejor apartarse.
    $escucha = $null
    try {
        $escucha = New-Object System.Net.Sockets.TcpListener -ArgumentList @([System.Net.IPAddress]::Loopback, $puerto)
        $escucha.ExclusiveAddressUse = $true
        $escucha.Start()
    } catch {
        return $false
    } finally {
        if ($escucha) { try { $escucha.Stop() } catch { } }
    }
    try {
        $enUso = Get-NetTCPConnection -State Listen -LocalPort $puerto -ErrorAction SilentlyContinue
        if ($enUso) { return $false }
    } catch {
        # Sin el modulo de red no se puede hacer esta segunda comprobacion; nos
        # quedamos con la primera, que es la que evita el fallo duro.
    }
    return $true
}

function Quien-Usa-Puerto([int]$puerto) {
    # Solo para el mensaje: saber que "lo tiene node.exe" ahorra mucho tiempo.
    try {
        $conexion = Get-NetTCPConnection -State Listen -LocalPort $puerto -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $conexion) { return '' }
        $proceso = Get-Process -Id $conexion.OwningProcess -ErrorAction SilentlyContinue
        if ($proceso) { return $proceso.ProcessName }
        return ''
    } catch { return '' }
}

function Puerto-Publicado([string]$servicio, [int]$puertoInterno) {
    # Le pregunta al motor que puerto de esta maquina esta publicando NUESTRO
    # contenedor. Sirve para dos cosas: no mover un puerto que ocupa el propio
    # stack, y decir la verdad en el resumen aunque se haya movido.
    $salida = (Compose port $servicio $puertoInterno 2>$null) | Select-Object -Last 1
    if (-not $salida) { return 0 }
    if ("$salida" -match ':(\d+)\s*$') { return [int]$matches[1] }
    return 0
}

function Elegir-Puerto([string]$etiqueta, [string]$servicio, [int]$deseado, [int]$puertoInterno) {
    if (Test-PuertoLibre $deseado) { return $deseado }
    # Ocupado. Si quien lo ocupa somos nosotros mismos no hay conflicto: es el
    # stack que ya estaba encendido, y compose reutiliza el contenedor.
    if ((Puerto-Publicado $servicio $puertoInterno) -eq $deseado) { return $deseado }
    $quien = Quien-Usa-Puerto $deseado
    if ($PuertosFijos) {
        $porQuien = ''
        if ($quien) { $porQuien = " por $quien" }
        Escribir 'ERROR' ("El puerto $deseado ($etiqueta) esta ocupado" + $porQuien + ", y pediste -PuertosFijos.")
        Nota 'Cierra ese programa, cambia el puerto en ops\.env, o quita -PuertosFijos para que busque otro.'
        exit 1
    }
    for ($p = $deseado + 1; $p -le $deseado + 60; $p++) {
        if (Test-PuertoLibre $p) {
            if ($quien) {
                Escribir 'AVISO' ("El puerto $deseado lo esta usando otro programa ($quien). Pongo $etiqueta en el $p.")
            } else {
                Escribir 'AVISO' ("El puerto $deseado esta ocupado. Pongo $etiqueta en el $p.")
            }
            return $p
        }
    }
    Escribir 'ERROR' ("No hay ningun puerto libre entre $deseado y " + ($deseado + 60) + " para $etiqueta.")
    exit 1
}

function Reservar-Puertos {
    # Las variables del shell tienen prioridad sobre el --env-file, asi que
    # exportarlas basta para que compose publique en el puerto elegido sin
    # tocar ops\.env, que es del usuario.
    $script:puertoWeb = Elegir-Puerto 'la web'           'web' $script:puertoWeb 3000
    $script:puertoApi = Elegir-Puerto 'la API'           'api' $script:puertoApi 8080
    $script:puertoDb  = Elegir-Puerto 'la base de datos' 'db'  $script:puertoDb  5432
    $env:PUERTO_WEB = "$script:puertoWeb"
    $env:PUERTO_API = "$script:puertoApi"
    $env:PUERTO_DB  = "$script:puertoDb"
    # La web llama a la API desde el NAVEGADOR, con la URL horneada en el build.
    # Si la API se movio de puerto y no se ajusta esto, la web carga pero no
    # puede iniciar sesion: pediria a un 8080 donde ya no hay nadie, y el
    # navegador lo cuenta como "TypeError: Failed to fetch".
    $urlApi = Leer-Env 'NEXT_PUBLIC_API_URL' 'http://localhost:8080/api/v1'
    if ($urlApi -match '^https?://(localhost|127\.0\.0\.1):(\d+)') {
        if ([int]$matches[2] -ne $script:puertoApi) {
            $env:NEXT_PUBLIC_API_URL = ($urlApi -replace '://(localhost|127\.0\.0\.1):\d+', ('://$1:' + $script:puertoApi))
            Escribir 'INFO' ("La web se construira apuntando a la API en el puerto " + $script:puertoApi + ".")
        }
    }
}

function Leer-PuertosReales {
    # Para las acciones que NO levantan nada: el .env dice 3000, pero el stack
    # puede estar corriendo en 3001 porque la vez anterior estaba ocupado.
    $p = Puerto-Publicado 'web' 3000; if ($p -gt 0) { $script:puertoWeb = $p }
    $p = Puerto-Publicado 'api' 8080; if ($p -gt 0) { $script:puertoApi = $p }
    $p = Puerto-Publicado 'db'  5432; if ($p -gt 0) { $script:puertoDb  = $p }
}

function Esperar-Http([string]$url, [int]$intentos) {
    for ($i = 0; $i -lt $intentos; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { return $true }
        } catch { Start-Sleep -Seconds 3 }
    }
    return $false
}

function Resumen-Arranque {
    # Con -Solo no se anuncia lo que no se ha levantado: mandar a alguien a una
    # direccion donde no hay nada es peor que no decir nada.
    $hayWeb = (-not $Solo) -or ($Solo -contains 'web')
    $hayApi = (-not $Solo) -or ($Solo -contains 'api')
    $hayDb  = (-not $Solo) -or ($Solo -contains 'db')
    Titulo 'Listo'
    Write-Host ''
    if ($hayWeb) {
        Write-Host '  Abre esto en el navegador:' -ForegroundColor White
        Write-Host ("      http://localhost:" + $script:puertoWeb) -ForegroundColor Green
        Write-Host ''
        Write-Host '  Tambien esta disponible:'
    } else {
        Write-Host '  Disponible:'
    }
    if ($hayApi) { Write-Host ("      API y su documentacion   http://localhost:" + $script:puertoApi + "/api/v1/docs") }
    if ($hayDb)  { Write-Host ("      Base de datos            localhost:" + $script:puertoDb + "  (base " + $dbNombre + ", usuario " + $dbUsuario + ")") }
    if (($cargarDemo -eq 'si') -and ($hayWeb -or $hayApi)) {
        Write-Host ''
        Write-Host '  Usuario de ejemplo para entrar:  ana.torres@ejemplo.mx'
        Write-Host '  (la contrasena es la de FV_PASSWORD_DEMO, en ops\.env)'
    }
    Write-Host ''
    Write-Host '  Siguiente paso:   .\ops\stack.ps1 probar     comprueba que todo responde'
    Write-Host '  Para apagarlo:    .\ops\stack.ps1 abajo      los datos se conservan'
    Write-Host ''
}

function Explicar-FalloDeArranque {
    Escribir 'ERROR' 'No se pudo encender el stack.'
    Write-Host ''
    Write-Host '  El motivo esta en las lineas de arriba. Los habituales:'
    Write-Host ''
    Write-Host '    "failed to solve: process /bin/sh -c npm run build"' -ForegroundColor White
    Write-Host '        La web no llego a compilar. Sube por el registro hasta la primera'
    Write-Host '        linea que empiece por "Type error", "Error:" o "Module not found":'
    Write-Host '        ahi estan el archivo y la linea. Si NO hay ninguna y solo corta de'
    Write-Host '        golpe, casi siempre es falta de MEMORIA: el equipo mata al proceso'
    Write-Host '        sin decir nada. Se arregla dandole mas RAM a WSL, creando el'
    Write-Host '        archivo  %UserProfile%\.wslconfig  con:'
    Write-Host '            [wsl2]'
    Write-Host '            memory=4GB'
    Write-Host '        y despues  wsl --shutdown  y volver a abrir Docker.'
    Write-Host ''
    Write-Host '    "port is already allocated" / "bind: address already in use"' -ForegroundColor White
    Write-Host '        Un puerto ocupado. Este script ya busca otro solo, asi que si aun'
    Write-Host '        asi sale, corre .\ops\stack.ps1 abajo y vuelve a intentarlo.'
    Write-Host ''
    Write-Host '    "no space left on device"' -ForegroundColor White
    Write-Host '        Disco lleno de imagenes viejas:  docker system prune -a'
    Write-Host ''
    Write-Host '  Si vas a pedir ayuda al equipo, manda el registro COMPLETO. Para'
    Write-Host '  guardarlo en un archivo:' -ForegroundColor White
    Write-Host '      .\ops\stack.ps1 arriba *> registro-error.txt'
    Write-Host '  Una captura de la ultima linea no basta: el error de verdad esta antes.'
    Write-Host ''
}

# --------------------------------------------------------------- pruebas ---
function Probar-Stack {
    $fallos = 0
    Leer-PuertosReales

    Titulo 'Base de datos'
    $psqlBase = @('exec', '-T', 'db', 'psql', '-U', $dbUsuario, '-d', $dbNombre, '-tAc')

    $tablas = (Compose @psqlBase "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'") 2>$null
    $tablas = ("$tablas").Trim()
    if ($tablas -match '^\d+$' -and [int]$tablas -ge 20) {
        Escribir 'OK' "Esquema creado: $tablas tablas"
    } else {
        Escribir 'ERROR' "No se pudo contar las tablas (respuesta: '$tablas')"
        Nota 'Suele ser que la base de datos aun no termino de arrancar. Espera 20 s y repite.'
        $fallos++
    }

    $migr = (Compose @psqlBase "SELECT count(*) FROM esquema_historial") 2>$null
    $migr = ("$migr").Trim()
    $migrEsperadas = (Get-ChildItem (Join-Path $raiz 'db\migraciones') -Filter 'V*__*.sql' -ErrorAction SilentlyContinue).Count
    if ($migrEsperadas -lt 1) { $migrEsperadas = 1 }
    if ($migr -match '^\d+$' -and [int]$migr -ge $migrEsperadas) {
        Escribir 'OK' "Migraciones aplicadas: $migr de $migrEsperadas"
    } else {
        Escribir 'ERROR' "Faltan migraciones: aplicadas '$migr' de $migrEsperadas."
        Nota 'Se arregla con: .\ops\stack.ps1 migrar'
        $fallos++
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
    if (Esperar-Http "http://127.0.0.1:$script:puertoApi/api/v1/salud" 20) {
        Escribir 'OK' "API responde en http://localhost:$script:puertoApi"
        # El login real es la prueba que importa: demuestra que la API habla con
        # la base de datos y no con credenciales escritas en el codigo.
        try {
            $cuerpoLogin = '{"email":"ana.torres@ejemplo.mx","password":"' + (Leer-Env 'FV_PASSWORD_DEMO' '') + '"}'
            $bytesLogin = [Text.Encoding]::UTF8.GetBytes($cuerpoLogin)
            $rl = Invoke-WebRequest -Uri "http://127.0.0.1:$script:puertoApi/api/v1/auth/login" -Method Post -Body $bytesLogin -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
            if (($rl.Content | ConvertFrom-Json).access_token) {
                Escribir 'OK' 'Login contra la BD: devuelve token'
            } else {
                Escribir 'ERROR' 'El login respondio sin access_token'; $fallos++
            }
        } catch {
            Escribir 'AVISO' 'El login no devolvio token (revisa FV_PASSWORD_DEMO y que la semilla este cargada)'
        }
        try {
            # 4 transacciones y no 1: el endpoint exige entre 3 y 500, asi que
            # con una sola respondia 422 y la prueba lo contaba como caido.
            $cuerpo = '{"ingreso_mensual":4500,"nivel_endeudamiento":25,"frecuencia_ahorro":"Media","transacciones":[{"descripcion":"Supermercado La Comer","valor":420},{"descripcion":"Renta departamento","valor":1500},{"descripcion":"Netflix","valor":199},{"descripcion":"Uber","valor":85}]}'
            $bytes = [Text.Encoding]::UTF8.GetBytes($cuerpo)
            $r2 = Invoke-WebRequest -Uri "http://127.0.0.1:$script:puertoApi/api/v1/analisis-financiero" -Method Post -Body $bytes -ContentType 'application/json' -UseBasicParsing -TimeoutSec 20
            $analisis = $r2.Content | ConvertFrom-Json
            if ($analisis.perfil_financiero) {
                Escribir 'OK' ("Analisis del enunciado: perfil '" + $analisis.perfil_financiero + "' con " + $analisis.recomendaciones.Count + " recomendacion(es)")
            } else {
                Escribir 'ERROR' 'POST /api/v1/analisis-financiero respondio sin perfil_financiero'; $fallos++
            }
        } catch {
            Escribir 'ERROR' 'POST /api/v1/analisis-financiero no respondio'
            Nota 'Es el endpoint que probara el jurado. Mira que dice: .\ops\stack.ps1 logs -Servicio api'
            $fallos++
        }
    } else {
        Escribir 'ERROR' "La API no respondio en el puerto $script:puertoApi"
        Nota 'Mira por que con: .\ops\stack.ps1 logs -Servicio api'
        $fallos++
    }

    Titulo 'Web'
    if (Esperar-Http "http://127.0.0.1:$script:puertoWeb/es/login" 20) {
        Escribir 'OK' "Web responde en http://localhost:$script:puertoWeb (es | pt | en)"
    } else {
        Escribir 'ERROR' "La web no respondio en el puerto $script:puertoWeb"
        Nota 'Mira por que con: .\ops\stack.ps1 logs -Servicio web'
        $fallos++
    }

    Write-Host ''
    if ($fallos -eq 0) {
        Write-Host ('Todo funciona. Abre http://localhost:' + $script:puertoWeb) -ForegroundColor Green
        return 0
    }
    Write-Host "Hay $fallos comprobacion(es) en rojo." -ForegroundColor Red
    return 1
}

# -------------------------------------------------------------- acciones ---
switch ($Accion) {

    'arriba' {
        Titulo 'Encendiendo Fintech Vital'
        Nota 'La primera vez tarda varios minutos: hay que construir las imagenes.'
        Nota 'Las siguientes son cuestion de segundos.'
        Write-Host ''
        Reservar-Puertos

        # El build va en su PROPIO comando, antes de levantar.
        #
        # No basta con `up --build`: con podman-compose, un servicio que declara
        # `build:` e `image:` a la vez se levanta desde la imagen que ya existe
        # y el build se salta. El sintoma es de los que hacen perder una tarde:
        # cambias el codigo, `arriba` dice OK, y el contenedor sigue sirviendo el
        # build anterior. Paso el 2026-08-19 con la web.
        #
        # Hacerlo aparte no cuesta nada cuando no hay cambios: las capas estan
        # en cache y `build` termina en segundos. Lo que garantiza es que un
        # cambio en el codigo SIEMPRE llega al contenedor.
        if ($Solo) {
            Compose build @Solo
        } else {
            Compose @perfilArriba build
        }
        if ($LASTEXITCODE -ne 0) { Explicar-FalloDeArranque; exit 1 }

        # Con -Solo el usuario elige servicios a mano: ahi no se cuela el tunel.
        if ($Solo) {
            Compose up -d @Solo
        } else {
            Compose @perfilArriba up -d
        }
        if ($LASTEXITCODE -ne 0) { Explicar-FalloDeArranque; exit 1 }

        # Los contenedores existen, pero la API tarda en abrir el puerto. Se
        # espera aqui para no mandar al usuario a un navegador que dara error.
        # Con -Solo se espera unicamente a lo que se pidio: quejarse de que la
        # web no responde cuando nadie la levanto seria ruido.
        Write-Host ''
        Escribir 'INFO' 'Contenedores creados. Esperando a que respondan...'
        Leer-PuertosReales
        if ((-not $Solo) -or ($Solo -contains 'web')) {
            if (Esperar-Http ("http://127.0.0.1:" + $script:puertoWeb + "/es/login") 20) {
                Escribir 'OK' 'La web ya responde.'
            } else {
                Escribir 'AVISO' 'La web aun no responde. Dale un minuto y mira: .\ops\stack.ps1 estado'
            }
        }
        if ((-not $Solo) -or ($Solo -contains 'api')) {
            if (Esperar-Http ("http://127.0.0.1:" + $script:puertoApi + "/api/v1/salud") 10) {
                Escribir 'OK' 'La API ya responde.'
            } else {
                Escribir 'AVISO' 'La API aun no responde. Dale un minuto y mira: .\ops\stack.ps1 logs -Servicio api'
            }
        }

        if ($Solo) {
            # nada que decir del tunel: no se pidio el stack completo
        } elseif ($tokenTunel) {
            Escribir 'OK' 'Tunel publico encendido. Se apaga solo con: .\ops\stack.ps1 abajo'
            Nota 'https://staging.fintechvital.com      ->  http://web:3000'
            Nota 'https://api-staging.fintechvital.com  ->  http://api:8080'
        }
        Resumen-Arranque
    }

    'efimero' {
        # Modo "no me dejes basura": el stack corre EN PRIMER PLANO y, al salir
        # con Ctrl+C, se borran contenedores, red y volumen de datos. Sirve para
        # una prueba rapida sin que quede nada ocupando RAM ni disco.
        #
        # Ctrl+C se lo lleva `compose up` (que para los contenedores) y el
        # control vuelve aqui; el finally garantiza la limpieza aunque el
        # levantamiento falle a mitad.
        Titulo 'Modo temporal - Ctrl+C para salir y borrarlo todo'
        Escribir 'AVISO' 'Al salir se borran los contenedores Y LOS DATOS. La base se recrea vacia la proxima vez.'
        Reservar-Puertos
        try {
            Compose up --build
        } finally {
            Write-Host ''
            Titulo 'Limpiando'
            Compose @perfilAbajo down -v --remove-orphans
            if ($BorrarImagenes) {
                Compose down --rmi local 2>$null | Out-Null
                Escribir 'OK' 'Imagenes locales eliminadas.'
            }
            Escribir 'OK' 'Todo limpio: sin contenedores, sin datos, sin RAM ocupada.'
        }
    }

    'tunel' {
        # Desde que `arriba` enciende el tunel solo, esta accion es un atajo
        # explicito: hace lo mismo pero falla fuerte si falta el token.
        Titulo 'Encendiendo el stack + el tunel publico de Cloudflare'
        if (-not $tokenTunel) {
            Escribir 'ERROR' 'Falta CLOUDFLARE_TUNNEL_TOKEN en el archivo de entorno.'
            Nota "Anadelo a $envFile, o usa 'arriba' si no necesitas publicar nada."
            exit 1
        }
        Reservar-Puertos
        Compose --profile tunel up -d --build
        if ($LASTEXITCODE -ne 0) { Explicar-FalloDeArranque; exit 1 }
        Compose @perfilAbajo ps
        Write-Host ''
        Escribir 'INFO' 'En el panel de Cloudflare, los public hostnames apuntan a los NOMBRES DE SERVICIO:'
        Nota 'staging.fintechvital.com      ->  http://web:3000'
        Nota 'api-staging.fintechvital.com  ->  http://api:8080'
        Escribir 'AVISO' 'La web hornea NEXT_PUBLIC_API_URL en el build: para staging tiene que ser https://api-staging.fintechvital.com/api/v1 y hay que reconstruir.'
    }

    'abajo' {
        Compose @perfilAbajo down
        Escribir 'OK' 'Apagado. Los datos se conservan: al encenderlo otra vez estara todo como lo dejaste.'
    }

    'reiniciar' {
        Compose @perfilAbajo restart
        Compose @perfilAbajo ps
    }

    'estado' {
        # Con el perfil puesto, `ps` tambien lista el tunel; sin el, compose lo
        # filtra y parece que no estuviera corriendo.
        Compose @perfilAbajo ps
        Leer-PuertosReales
        Write-Host ''
        Write-Host ("  Web  ->  http://localhost:" + $script:puertoWeb)
        Write-Host ("  API  ->  http://localhost:" + $script:puertoApi + "/api/v1/docs")
        Write-Host ("  BD   ->  localhost:" + $script:puertoDb)
        Write-Host ''
        Nota 'En la columna STATUS, "healthy" significa que el servicio ya responde de verdad.'
    }

    'logs' {
        if ($Servicio) {
            Nota "Mostrando lo que dice '$Servicio' por dentro. Ctrl+C para salir."
            Compose @perfilAbajo logs -f --tail 100 $Servicio
        } else {
            Nota 'Mostrando todos los servicios a la vez. Ctrl+C para salir.'
            Nota 'Para uno solo:  .\ops\stack.ps1 logs -Servicio api'
            Compose @perfilAbajo logs -f --tail 100
        }
    }

    'rebuild' {
        Titulo 'Reconstruyendo desde cero'
        Nota 'Sin aprovechar nada de lo ya construido. Tarda tanto como la primera vez.'
        Reservar-Puertos
        Compose build --no-cache
        if ($LASTEXITCODE -ne 0) { Explicar-FalloDeArranque; exit 1 }
        Compose up -d
        Compose @perfilAbajo ps
        Leer-PuertosReales
        Resumen-Arranque
    }

    'migrar' {
        Titulo 'Aplicando los cambios pendientes de base de datos'
        Compose --profile migrar run --rm migrador
    }

    'psql' {
        Write-Host "Consola SQL sobre la base $dbNombre. Para salir escribe \q y pulsa Enter."
        Compose exec db psql -U $dbUsuario -d $dbNombre
    }

    'limpiar' {
        Write-Host ''
        Write-Host '  Esto BORRA la base de datos entera: usuarios, movimientos y analisis.' -ForegroundColor Yellow
        Write-Host '  No se puede deshacer. La proxima vez que enciendas se creara vacia' -ForegroundColor Yellow
        Write-Host '  (con los datos de ejemplo, si FV_CARGAR_DEMO=si).' -ForegroundColor Yellow
        Write-Host ''
        Write-Host '  Si solo quieres apagar sin perder nada, cancela y usa: .\ops\stack.ps1 abajo'
        Write-Host ''
        $r = Read-Host 'Escribe BORRAR para confirmar'
        if ($r -eq 'BORRAR') {
            Compose @perfilAbajo down -v
            Escribir 'OK' 'Contenedores y datos eliminados.'
        } else {
            Escribir 'INFO' 'Cancelado: no se ha borrado nada.'
        }
    }

    'probar' {
        $codigo = Probar-Stack
        exit $codigo
    }
}
