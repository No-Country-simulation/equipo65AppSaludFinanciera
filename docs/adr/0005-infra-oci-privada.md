# ADR-0005 - VCN privada + Cloudflare Tunnel, sin Load Balancer

- **Estado**: ✅ **Aceptada y APLICADA** (2026-08-20)
- **Fecha**: 2026-07-13

> ✅ **Se desplegó así.** La instancia no tiene IP pública, no hay ningún puerto
> abierto, el único acceso administrativo es por Bastion y la única entrada
> pública es el túnel de Cloudflare — exactamente lo que decide este ADR.
>
> **Dos cosas salieron distintas** de lo que se preveía aquí: no se usó
> **Terraform + Ansible** (la instancia se creó a mano y el despliegue lo hacen
> scripts propios en `ops/oci/`), y el dominio final es **`fintechvital.com`**,
> no un subdominio de `angelezequiel.dev`. Ver
> [`../../../ops/DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md).

## Contexto

Hay que desplegar la aplicación en OCI (requisito obligatorio del hackathon) y
mostrarla funcionando en un video. El equipo ya tiene el dominio
**`angelezequiel.dev`** y quiere una arquitectura de red seria: sin IPs públicas,
sin puertos abiertos, secretos en Vault, infraestructura reproducible.

El Always Free de OCI da: **4 OCPU ARM / 24 GB** (divisibles en hasta 4 VMs), 1
Autonomous Database, 20 GB de Object Storage, **1 Load Balancer**, Bastion y Vault.

## Decisión

- **VCN privada** (`10.0.0.0/16`), instancias **sin IP pública**, **ninguna** regla
  de ingress desde internet.
- **4 instancias ARM** (1 OCPU / 6 GB c/u) corriendo **el mismo stack completo**
  (cloudflared + nginx + web + backend + ml) - réplicas idénticas.
- **Cloudflare Tunnel** como única puerta de entrada: `cloudflared` corre en las 4
  instancias como **réplicas del mismo túnel**, estableciendo conexiones
  **salientes** hacia Cloudflare.
- **OCI Bastion** como único acceso SSH.
- **OCI Vault** para todos los secretos.
- **Terraform** (infra) + **Ansible** (configuración y despliegue).
- **SIN Load Balancer.**

## La decisión que cambió: por qué NO hay Load Balancer

El planteo inicial era `túnel → LB privado → 4 instancias`. **Se descartó al
analizarlo.**

`cloudflared` soporta **réplicas del mismo túnel**: corriendo el mismo túnel (mismo
token) en las 4 instancias, Cloudflare las registra como 4 orígenes del mismo
hostname y **reparte el tráfico entre ellas con failover automático**. Eso es
exactamente lo que se le iba a pedir al Load Balancer.

Poner un LB detrás del túnel habría significado:

- Un salto de red extra y **un punto de fallo más**.
- Consumir el único LB del Always Free.
- Health checks duplicados (Cloudflare ya los hace).
- …para obtener el balanceo **que Cloudflare ya estaba haciendo**.

**Es una decisión reversible.** El LB entra si aparece tráfico que *no* pasa por el
túnel y que haya que balancear (p. ej. si el servicio de ML se separara a sus
propias instancias). Hoy no es el caso: cada instancia habla con su ML local.

## Alternativas consideradas

**VM con IP pública + nginx + Let's Encrypt.** Lo estándar y lo más simple.
Descartada: exige abrir el 80/443 al mundo y exponer una IP. El túnel da TLS, anti-DDoS y
DNS sin abrir nada, y es **estrictamente más seguro**.

**Instancias especializadas** (una por capa: web / api / ml / gateway) en vez de
réplicas idénticas. Es más limpio conceptualmente y no carga el modelo 4 veces.
Descartada: cada instancia sería un **punto único de fallo** de su capa (si muere
`i-api`, no hay API), y requeriría 4 playbooks de Ansible distintos. Las réplicas
idénticas dan HA real con un solo playbook.

**Desplegar solo en local y grabar el video.** Descartada como plan A, **retenida
como plan B** (ver [ADR-0008](0008-infra-no-bloquea-app.md)).

## Consecuencias

**A favor:**

- **Cero superficie de ataque desde internet**: no hay IP pública, no hay puerto
  abierto, no hay SSH expuesto. Es difícil hacerlo mejor.
- **HA real**: se puede matar una instancia en vivo durante la demo y el sitio
  sigue. *(Es un momento excelente para el video, dicho sea de paso.)*
- Infraestructura **reproducible**: `terraform apply` la reconstruye entera.
- Un solo playbook de Ansible para las 4 instancias.
- Todo dentro del Always Free: **costo 0**, salvo el dominio (que ya se tiene).

**En contra (asumido):**

- **El modelo queda cargado 4 veces** (una por instancia). Con modelos de sklearn
  de pocos MB y 6 GB de RAM por instancia, es irrelevante.
- **Un deploy de cualquier capa toca las 4 instancias.** Ansible lo hace en serie
  (`serial: 1`) para no perder servicio, pero el despliegue tarda más.
- **Complejidad operativa alta.** Bastion, wallet, Vault, túnel y 4 nodos es mucha
  máquina para un MVP de hackathon. **Este es el riesgo #1 del proyecto** y por eso
  existe el [ADR-0008](0008-infra-no-bloquea-app.md).
- **La capacidad ARM del Always Free es notoriamente escasa** ("Out of host
  capacity" es habitual y puede durar días). Por eso el aprovisionamiento se
  intenta en la **Semana 1**, no en la 4.
- **`terraform.tfstate` contiene secretos en claro** y el repo es público. Está en
  `.gitignore` y **nunca** se commitea. Hay que ser consciente de esto.
