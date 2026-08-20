# GO LIVE - checklist para publicar en OCI (documento SUPERADO)

> ⛔ **Ya se publicó: <https://fintechvital.com>, el 2026-08-20.** Y se hizo por
> un camino distinto del que describe este checklist, que se escribió en la S0
> planeando Terraform + Ansible + Autonomous Database + cuatro instancias.
>
> **Para desplegar hoy, ve a
> [`DESPLIEGUE_NUBE_TECNICO.md`](../../ops/DESPLIEGUE_NUBE_TECNICO.md)**, que
> además lleva el registro de lo que se hizo y las trampas que aparecieron.
>
> Este documento se conserva porque las **precondiciones de §1 siguen siendo la
> pregunta correcta** antes de publicar cualquier cosa, y porque deja constancia
> de lo que se planeó.

"Producción" aquí significa: **la URL pública que se muestra en el video**.

## 1. Precondiciones (todas, sin excepción)

| | ✅ |
|---|---|
| La app corre **end-to-end en local** con `docker compose` | ⬜ |
| Los **3 ejemplos** dan lo que dice [`../entrega/EJEMPLOS.md`](../entrega/EJEMPLOS.md) | ⬜ |
| Los modelos reales están entrenados y en **Object Storage** | ⬜ |
| CI en verde en `develop` | ⬜ |
| **`gitleaks` en verde sobre todo el historial** | ⬜ |
| Las 4 instancias ARM **existen** *(⚠️ el "out of host capacity" puede tardar días)* | ⬜ |
| Autonomous DB creada y el **wallet** en Vault | ⬜ |
| **Todos** los secretos cargados en Vault | ⬜ |
| Túnel de Cloudflare creado y su token en Vault | ⬜ |

## 2. Infraestructura

| | ✅ |
|---|---|
| `terraform plan` sin sorpresas | ⬜ |
| `terraform apply` → VCN, subredes, NAT/Service GW, NSG | ⬜ |
| **Verificar: NINGUNA regla de ingress desde internet** | ⬜ |
| **Verificar: las instancias NO tienen IP pública** | ⬜ |
| OCI Bastion funciona (sesión de prueba) | ⬜ |
| `terraform.tfstate` **NO está en el repo** | ⬜ |

## 3. Configuración (Ansible)

| | ✅ |
|---|---|
| `base.yml` en las 4 instancias | ⬜ |
| `docker.yml` en las 4 | ⬜ |
| `secretos.yml` → `.env` en modo **0600** | ⬜ |
| `cloudflared.yml` → **4 réplicas del túnel** registradas | ⬜ |
| Cloudflare muestra los **4 orígenes** sanos | ⬜ |

## 4. Base de datos

| | ✅ |
|---|---|
| Las migraciones corren **limpias** contra la base de producción | ✅ 10 aplicadas, 0 pendientes |
| Las **12 categorías** están sembradas (`GET /api/v1/categorias`) | ⬜ |
| Las tasas de cambio iniciales están cargadas | ⬜ |
| El job de tasas corrió al menos una vez | ⬜ |
| **Respaldo tomado** antes de cualquier otra cosa | ⬜ |

## 5. Aplicación

| | ✅ |
|---|---|
| `ansible-playbook desplegar.yml` sin caída de servicio | ⬜ |
| `GET /api/v1/salud` → `ok` en **las 4** instancias | ⬜ |
| El ML descargó los modelos de Object Storage (no los horneados) | ⬜ |
| **`ML_URL` apunta al ML real**, NO a `ml-fake` ⚠️ | ⬜ |
| El dashboard carga en el dominio | ⬜ |
| Swagger UI accesible | ⬜ |

> ⚠️ **`ML_URL=ml-fake` en producción es el error más fácil y más humillante de
> cometer.** Se verifica explícitamente: `GET /api/v1/salud` debe reportar la
> `modelo_version` real, no `stub`.

## 6. Seguridad (antes de mostrarlo al mundo)

| | ✅ |
|---|---|
| **Ningún puerto abierto** a internet (`nmap` a la IP → nada) | ⬜ |
| Solo se llega por el túnel | ⬜ |
| El servicio de ML **no** es accesible desde fuera | ⬜ |
| El rate limit funciona (probado con un bucle) | ⬜ |
| El bloqueo por intentos fallidos funciona | ⬜ |
| CORS no es `*` | ⬜ |
| Ningún endpoint devuelve un stacktrace | ⬜ |
| El **test de aislamiento por usuario** pasa contra producción | ⬜ |
| HTTPS con certificado válido (lo da Cloudflare) | ⬜ |

## 7. Verificación final

| | ✅ |
|---|---|
| **El `curl` del enunciado funciona contra la URL pública** | ⬜ |
| Los **3 ejemplos** dan lo documentado, contra la URL pública | ⬜ |
| Registro → login → 2FA → CSV → análisis → historial, a mano | ⬜ |
| **Matar una instancia → el sitio sigue vivo** *(y de paso, es material para el video)* | ⬜ |
| Levantarla → vuelve al balanceo | ⬜ |
| El seed de demo está cargado | ⬜ |

## 8. Rollback

Si algo sale mal después de desplegar:

```bash
# Volver a la imagen anterior
ansible-playbook playbooks/desplegar.yml -e "tag=<tag-anterior>"
```

Y si nada funciona: **plan B**. Se graba en local. El proyecto se entrega igual.
