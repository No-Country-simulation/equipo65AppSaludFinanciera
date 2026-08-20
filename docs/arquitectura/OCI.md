# OCI - infraestructura (documento de PLANIFICACIÓN)

**El uso de al menos un servicio OCI es requisito OBLIGATORIO del hackathon.**
Este documento es el **plan** que se escribió en la S0 para cumplirlo.

> ✅ **El requisito está CUMPLIDO: desplegado en OCI el 2026-08-20**, y
> <https://fintechvital.com> corre ahí. Pero **se desplegó más pequeño que este
> plan**, así que para operar de verdad ve a:
>
> - **Sin tecnicismos** → [`../../../ops/DESPLIEGUE_NUBE.md`](../../ops/DESPLIEGUE_NUBE.md)
> - **Referencia técnica y procedimiento manual** → [`../../../ops/DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md)
>
> | Este plan decía | Lo que se desplegó |
> |---|---|
> | **Autonomous Database** para la persistencia | **PostgreSQL 16 en contenedor** ([ADR-0014](../adr/0014-motor-postgresql.md)) |
> | **4 instancias ARM**, una por servicio | **1 instancia** `VM.Standard.A1.Flex` con los 5 contenedores. Consumen ~450 MB de 6 GB: cuatro máquinas eran innecesarias |
> | **Terraform + Ansible** | Scripts propios en `ops/oci/`. La instancia se creó a mano |
> | Object Storage para modelos y datasets | No se usó: los `.pkl` viajan dentro de la imagen del servicio de ML |
> | Vault, Bastion, VCN privada sin IP pública | ✅ **Tal cual**, los tres |
>
> Se añadió, y no estaba aquí: **OCIR** (el registro de contenedores de OCI) como
> almacén de las cuatro imágenes arm64.
>
> El resto del documento se conserva **como registro de la planificación** —
> incluidos los límites del Always Free, que siguen siendo correctos y útiles.

> ⚠️ **Antes de leer esto, lee [`../adr/0008-infra-no-bloquea-app.md`](../adr/0008-infra-no-bloquea-app.md).**
> Toda esta infraestructura es un **track paralelo** que NUNCA bloquea al
> desarrollo de la aplicación. El entorno de trabajo diario es `docker-compose`
> local. La arquitectura no es el entregable; el producto sí.

## §1 Servicios usados (y cómo cumplen el requisito)

| Servicio OCI | Para qué | ¿Cumple el requisito? |
|---|---|---|
| **Autonomous Database** (Always Free) | Toda la persistencia | ✅ "Base de datos para la persistencia" |
| **Object Storage** (20 GB Always Free) | Modelos `.joblib` + datasets versionados | ✅ "Object Storage para almacenamiento de modelos o datos" |
| **Compute** (4× ARM Ampere A1, Always Free) | Hosting de los 3 servicios | ✅ "OCI Compute para el alojamiento de la aplicación" |
| **Vault** | Secretos: JWT, wallet, clave interna, token del túnel | Extra |
| **Bastion** | Único acceso SSH del equipo | Extra |

> **Con cualquiera de los tres primeros ya cumplíamos.** Los tres juntos + Vault +
> Bastion es lo que nos diferencia - pero *también* es lo que nos puede hundir si
> se descontrola. De ahí la regla de arriba.

## §2 Límites del Always Free (verificar al aprovisionar)

| Recurso | Límite Always Free | Lo que usamos |
|---|---|---|
| Compute ARM (Ampere A1) | 4 OCPU + 24 GB RAM **en total** | 4 VMs × 1 OCPU / 6 GB |
| Autonomous Database | 2 instancias, 1 OCPU / 20 GB c/u | 1 |
| Object Storage | 20 GB | ~1 GB (modelos + datasets) |
| VCN | 1, con Internet/NAT/Service Gateway | 1 |
| Load Balancer | 1 (10 Mbps) | **0** (no lo usamos - ver §4) |
| Bastion | Sí | 1 |
| Vault | Llaves *software* gratis; HSM se cobra | Solo software |


1. **Que el NAT Gateway esté cubierto por Always Free.** Las instancias están en
   subred privada y necesitan salida a internet para que `cloudflared` establezca
   el túnel y para el job de tasas de cambio. Si el NAT tuviera costo, la
   alternativa es dar IP pública **solo de salida** o usar un Service Gateway
   (que sí cubre Object Storage sin salir a internet, pero no Cloudflare).
2. **La versión de Autonomous DB** (23ai vs 19c) → decide si `analisis.indicadores`
   usa el tipo `JSON` nativo o `CLOB + CHECK IS JSON`. Ver [`DATOS.md`](DATOS.md).
3. **La disponibilidad de capacidad ARM en la región.** Es *notoriamente* escaso
   en Always Free: puede tardar días en haber capacidad ("Out of host capacity").
   **Por eso el aprovisionamiento se intenta en la Semana 1, no en la 4.**

## §3 Topología de red

```
  Internet
     │
     ▼
  Cloudflare  (TLS, anti-DDoS, DNS: fintechvital.com)
     │
     │  Tunel saliente - NINGUN puerto de entrada abierto en OCI
     ▼
 ╔═══════════════════════════════════════════════════════════════╗
 ║  VCN  10.0.0.0/16                                             ║
 ║                                                               ║
 ║  Subred PRIVADA  10.0.1.0/24   (sin IPs publicas)             ║
 ║    app-1  app-2  app-3  app-4    <- las 4 replicas            ║
 ║       cada una: cloudflared + nginx + web + backend + ml      ║
 ║                                                               ║
 ║  Subred PRIVADA  10.0.2.0/24                                  ║
 ║    Autonomous Database  (endpoint privado, mTLS por wallet)   ║
 ║                                                               ║
 ║  NAT Gateway     -> salida a internet (cloudflared, API tasas)║
 ║  Service Gateway -> Object Storage (sin salir a internet)     ║
 ║  OCI Bastion     -> unico SSH del equipo (sesiones efimeras)  ║
 ║  OCI Vault       -> secretos                                  ║
 ╚═══════════════════════════════════════════════════════════════╝
```

**Security lists / NSG:**

| Regla | Origen | Destino | Puerto |
|---|---|---|---|
| Ingress | *(ninguna)* | - | **NINGUNO abierto a internet** |
| Egress | subred privada | 0.0.0.0/0 vía NAT | 443 (Cloudflare, API de tasas) |
| Egress | subred privada | Object Storage vía Service GW | 443 |
| Interno | app-* | Autonomous DB | 1522 (TCPS) |
| Bastion | Bastion service | app-* | 22 |

> **Lo importante**: no hay **ni una sola** regla de ingress desde internet. El
> túnel de Cloudflare es una conexión **saliente** que la instancia establece. Esto
> es estrictamente más seguro que abrir el 443 y poner un firewall delante.

## §4 Por qué NO hay Load Balancer (decisión revisada)

La idea inicial era: túnel → LB privado → 4 instancias. **La descartamos.**

`cloudflared` soporta **réplicas del mismo túnel**: si se corre el mismo túnel
(mismo token) en las 4 instancias, Cloudflare las ve como 4 orígenes del mismo
hostname y **reparte el tráfico entre ellas, con failover automático** si una deja
de responder. Es exactamente lo que se le iba a pedir al LB.

Poner un LB detrás del túnel significaría:

- Un salto de red extra y un punto de fallo más.
- Consumir el único LB del Always Free.
- Configuración de health checks duplicada (Cloudflare ya los hace).
- …para obtener **el balanceo que Cloudflare ya está haciendo**.

**Cuándo entraría el LB**: si hiciera falta balancear tráfico que *no* pasa por
el túnel (por ejemplo, si el ML se separara a sus propias instancias y el backend
necesitara balancear entre ellas). Hoy no es el caso: cada instancia habla con su
propio ML local. **Decisión reversible** - está en
[`../adr/0005-infra-oci-privada.md`](../adr/0005-infra-oci-privada.md).

## §5 Terraform - qué se declara

`infra/terraform/`

```
main.tf         Provider OCI, backend de estado (local; el .tfstate NO se commitea)
red.tf          VCN, subredes, NAT GW, Service GW, security lists, NSG
compute.tf      Las 4 instancias ARM (mismo modulo, count = 4)
database.tf     Autonomous Database + descarga del wallet
storage.tf      Buckets: modelos/, datasets/, respaldos/
vault.tf        Vault + llave maestra + los secretos
bastion.tf      OCI Bastion
salida.tf       IPs privadas, OCIDs, cadena de conexion -> los consume Ansible
```

> ⚠️ **`terraform.tfstate` contiene secretos en claro** (incluida la contraseña de
> la BD). Está en `.gitignore` y **el repo es público**. Nunca se commitea. En un
> proyecto real iría a un backend remoto cifrado (Object Storage); para el
> hackathon vive solo en la máquina de quien lo aplica, y eso hay que saberlo.

## §6 Ansible - qué configura

`infra/ansible/`

```
inventario/oci.yml        Generado por Terraform (IPs privadas)
playbooks/
  base.yml                Paquetes, usuario, hardening SSH, firewall local
  docker.yml              Docker + compose plugin
  secretos.yml            Lee de OCI Vault -> .env en la instancia (modo 0600)
  cloudflared.yml         Instala y registra la replica del tunel
  desplegar.yml           docker compose pull && up -d   <- el que se usa a diario
roles/
```

**Conexión**: Ansible entra por **OCI Bastion** (sesiones SSH efímeras), no por IP
pública - porque no hay IP pública. Se configura con `ProxyCommand` en
`ansible.cfg`.

**Despliegue diario**: `ansible-playbook playbooks/desplegar.yml`. Hace pull de
las imágenes de GHCR y reinicia el compose en las 4 instancias, en serie
(`serial: 1`) para no quedarse sin servicio.

## §7 Secretos (OCI Vault)

| Secreto | Quién lo consume |
|---|---|
| `jwt_clave_firma` | backend |
| `bd_usuario` / `bd_password` | backend (Flyway y runtime) |
| `bd_wallet_b64` | backend (el wallet `.zip` en base64) |
| `clave_interna_ml` | backend + ml (header `X-Clave-Interna`) |
| `cloudflare_token_tunel` | cloudflared |
| `api_tasas_llave` | backend (job de tipos de cambio) |

Flujo: **Vault → Ansible (`secretos.yml`) → `/opt/app/.env` (modo 0600) → docker
compose**. Los secretos **nunca** tocan el repo, ni GitHub Actions, ni un `docker
build`. Rotarlos = actualizar Vault + re-ejecutar `secretos.yml` + reiniciar.

## §8 Object Storage

| Bucket | Contenido | Quién escribe | Quién lee |
|---|---|---|---|
| `modelos/` | `modelo-{transacciones,perfil}-v*.joblib` + `.json` de metadata | Data Science (al entrenar) | el servicio ML al arrancar |
| `datasets/` | `dataset-v*.tar.gz` | Data Science | notebooks |
| `respaldos/` | Dumps de la BD antes de la demo | Ansible (manual) | - |

Acceso desde las instancias: **Instance Principal** (la VM se autentica con su
propia identidad de OCI, sin llaves). Acceso desde las laptops de DS: llave de API
del usuario. Ver `CUENTAS_SERVICIOS.md`.

## §9 Orden de aprovisionamiento

**Semana 1** (temprano - la capacidad ARM puede tardar días):

1. Crear la cuenta / tenancy de OCI y un compartment `fintechvital`.
2. **Intentar crear las 4 instancias ARM.** Si sale "Out of host capacity",
   reintentar cada día. *(Este es el riesgo #1 de la infra.)*
3. Crear la Autonomous Database y descargar el wallet.
4. Crear los buckets de Object Storage.
5. Crear el Vault y cargar los secretos.
6. Crear el túnel en Cloudflare y guardar el token.

**Semana 3-4**: Terraform + Ansible + despliegue real.

**9 de agosto**: punto de decisión. Si la app no está corriendo en OCI, **se
activa el plan B** (demo en local) y la infra se sigue por deporte, no por
necesidad.
