# ADR-0008 - La infraestructura no bloquea a la aplicación

- **Estado**: ✅ Aceptada
- **Fecha**: 2026-07-13

> **Este ADR no es sobre tecnología. Es sobre gestión de riesgo.** Es el que
> impide que el proyecto se pierda por el camino más común: construir una
> arquitectura hermosa y llegar a la entrega sin producto.

## Contexto

La infraestructura decidida en [ADR-0005](0005-infra-oci-privada.md) es ambiciosa:
VCN privada sin IPs públicas, 4 instancias, OCI Bastion, OCI Vault, Cloudflare
Tunnel, Terraform, Ansible, wallet mTLS de Autonomous Database.

Es **excelente ingeniería**. También es, honestamente, **un proyecto en sí mismo** -
y hay que decir algo incómodo:

> **El jurado no evalúa esto.** El enunciado pide *"utilizar al menos UN servicio
> OCI"*. Con subir el modelo a Object Storage ya se cumple el requisito. Todo lo
> demás -el túnel, el bastion, el vault, las 4 réplicas- es diferenciación, no
> requisito.

Lo que sí evalúa el jurado: el notebook, los modelos, la API, las recomendaciones,
la demo funcionando. **Ninguna de esas cosas necesita que la infra exista.**

El modo de fallo clásico de un hackathon: el equipo se enamora de la
infraestructura, pelea tres semanas con "Out of host capacity" y el wallet de
Oracle, y llega al día de la entrega con una VCN preciosa y un producto a medias.

## Decisión

**La infraestructura es un track paralelo que NUNCA bloquea al desarrollo de la
aplicación.** En concreto:

1. **El entorno de desarrollo es `docker-compose` local. Desde el día 1 y hasta el
   final.** Nadie -ni backend, ni DS, ni el fullstack- necesita OCI, ni el wallet,
   ni el bastion para trabajar. Si alguien está bloqueado esperando infra, algo se
   hizo mal.
2. **Todo lo que corre en OCI corre idéntico en local**, con el mismo
   `docker-compose` y las mismas imágenes. OCI no es un entorno especial: es
   compose en otra máquina.
3. **Ninguna tarea del backlog de aplicación depende de una tarea de infra.** Se
   verifica al planear cada semana.
4. **Existe un plan B explícito**: si el 9 de agosto la app no está corriendo en
   OCI, se graba la demo en local y **el requisito de OCI se cumple con Object
   Storage** (los modelos versionados ya viven ahí desde la S2). Y ya está. El
   proyecto se entrega igual, completo.
5. **Punto de decisión: 9 de agosto** (fin de S3). No es una fecha sugerida: es el
   día en que se mira el estado y se decide plan A o plan B, **sin discusión ni
   heroísmos**.

## Alternativas consideradas

**Infra primero, app después** ("levantamos OCI y después construimos encima").
Descartada: es exactamente el modo de fallo descrito arriba. Además bloquea a 7 de
las 8 personas mientras 1 pelea con Terraform.

**Nada de infra: solo local.** Descartada como plan A: se cumpliría el requisito
mínimo pero se pierde la diferenciación, y el equipo *quiere* construirla (y tiene
6 semanas, que alcanzan). **Retenida como plan B**, que es distinto de descartada.

**Desplegar en algo más simple** (una VM con IP pública y nginx). Descartada: si
igual vamos a desplegar, la infra privada no cuesta *tanto* más y es mucho mejor
material para la presentación. Pero es la **opción de repliegue intermedia** si el
plan A falla parcialmente.

## Consecuencias

**A favor:**

- **El producto está garantizado.** Pase lo que pase con OCI, el 23 de agosto hay
  una demo que funciona.
- Nadie espera a nadie. Las 8 personas tienen trabajo desde el día 1.
- La persona que hace la infra puede tomarse el tiempo de hacerla **bien**, sin la
  presión de que 7 personas dependan de ella.
- Local ≡ OCI (mismo compose, mismas imágenes) hace que el despliegue final sea
  aburrido, que es como debe ser un despliegue.

**En contra (asumido):**

- Se puede terminar **sin usar** la infra bonita que se construyó. Sería una
  lástima, pero es infinitamente mejor que la alternativa.
- Mantener la paridad local↔OCI cuesta un poco de disciplina (nada de "esto solo
  funciona en OCI").

**Cómo se ve el fracaso de este ADR**: alguien dice *"no puedo avanzar hasta que
esté el bastion"*. Si esa frase se escucha, **este ADR se está incumpliendo** y hay
que corregir el rumbo ese mismo día.
