# Cómo Fintech Vital llega a internet

*Explicado sin tecnicismos. Si buscas los comandos exactos, ve a
[`DESPLIEGUE_NUBE_TECNICO.md`](DESPLIEGUE_NUBE_TECNICO.md).*

---

## De qué va esto

Fintech Vital funciona en la computadora de cualquiera del equipo con un solo
comando. Pero para que el jurado, un reclutador o tu tía puedan entrar desde su
teléfono, la aplicación tiene que vivir en un servidor encendido las 24 horas y
tener una dirección pública: **https://fintechvital.com**.

Este documento cuenta qué hay detrás de esa dirección, en lenguaje llano.

---

## Las cuatro piezas

La aplicación no es un solo programa: son cuatro, y cada una hace una cosa.

| Pieza | Qué hace | Comparación |
|---|---|---|
| **Web** | Lo que ves y tocas: pantallas, gráficas, botones | El mostrador de una tienda |
| **API** | Recibe peticiones, aplica las reglas, decide | El empleado que te atiende |
| **Modelo** | Clasifica gastos y calcula tu perfil financiero | El especialista al que consulta el empleado |
| **Base de datos** | Guarda tus movimientos y tu historial | El archivero del fondo |

Cada pieza va dentro de un **contenedor**: una caja cerrada que lleva dentro el
programa y todo lo que necesita para funcionar. La gracia es que la caja se
comporta igual en la laptop de quien la construyó que en el servidor. Se acabó
el "en mi máquina sí funciona".

---

## Dónde vive

En una máquina virtual de **Oracle Cloud**, en Monterrey. Es una máquina del
plan gratuito, y conviene saber lo pequeña que es:

- **1 procesador**
- **6 GB de memoria**
- **48 GB de disco**

Menos que un teléfono de gama media. Aun así le sobra: Fintech Vital entera
consume unos **450 MB** de memoria, y quedan más de **4.5 GB libres**.

### Compartiendo casa

En esa misma máquina ya vivía otra aplicación en producción. **Las dos conviven
sin estorbarse**, y no es casualidad: están montadas con dos usuarios distintos
del sistema, de forma que ninguna ve ni puede tocar los contenedores de la otra.
Es como dos inquilinos con llaves distintas en el mismo edificio: comparten el
portal y los servicios, pero nadie entra al piso de al lado.

El reparto medido después de instalar Fintech Vital:

| | Memoria |
|---|---|
| Fintech Vital | ~450 MB |
| Todo lo demás (la otra aplicación, el sistema y su caché) | el resto |
| **Libre** | **~4.6 GB** |

El único recurso realmente ajustado es el **procesador**: hay uno solo y lo
comparten. En la práctica no se nota, porque ninguna de las dos aplicaciones
tiene tráfico alto, pero es el número que hay que vigilar si algún día lo hay.

---

## Cómo entra la gente sin abrir la puerta

Aquí está la parte más elegante del montaje.

Lo normal sería abrir un puerto del servidor a internet, ponerle un candado y
cruzar los dedos. Nosotros **no abrimos nada**. El servidor no tiene siquiera
una dirección pública: desde fuera, es invisible.

En su lugar usamos un **túnel de Cloudflare**. La diferencia:

> **Puerto abierto**: pones una puerta a la calle y esperas que solo entre quien
> debe. Cualquiera puede tocar, y todo el día tocan.
>
> **Túnel**: es el servidor el que llama hacia fuera y mantiene la línea
> abierta, como un empleado que llama a la central. Nadie puede llamar al
> servidor porque el servidor no tiene teléfono. Solo existe la llamada que él
> hizo.

Resultado: no hay puerto expuesto, no hay IP que escanear, no hay que gestionar
certificados de seguridad (el candado de HTTPS lo pone Cloudflare), y de paso
llega el filtro anti ataques que Cloudflare da gratis.

Las tres direcciones que atiende:

| Dirección | Lleva a |
|---|---|
| `fintechvital.com` | La web |
| `www.fintechvital.com` | La web (la misma) |
| `api.fintechvital.com` | La API |

---

## El viaje de una versión nueva, en cinco pasos

Cuando hay que subir cambios, esto es lo que pasa:

### 1. Se empaquetan las cuatro piezas

En la computadora de quien despliega, cada pieza se mete en su caja. Aquí hay un
detalle que cuesta caro cuando se olvida: el servidor de Oracle usa
procesadores **ARM** (los mismos de los teléfonos y de las Mac modernas), y las
laptops del equipo usan **Intel/AMD**. Son idiomas distintos.

Si empaquetas para Intel y lo mandas a un servidor ARM, la caja llega perfecta,
se guarda perfecta, y revienta al abrirla. Por eso el empaquetado se hace
diciendo explícitamente "esto es para ARM".

### 2. Se suben a un almacén

Las cajas no se mandan directas al servidor: se dejan en un **almacén de
imágenes** (el registro de contenedores de Oracle). Es como una consigna. Así
el servidor no tiene que construir nada, solo recoger, que es muchísimo más
rápido y no lo deja ahogado.

### 3. Se abre un pasillo temporal hasta el servidor

Como el servidor no es accesible desde internet, para administrarlo se usa un
**bastión**: un intermediario de Oracle que abre un pasillo temporal y vigilado
hasta la máquina. Se abre, se usa, se cierra.

### 4. El servidor recoge y arranca

Ya dentro, el servidor recoge las cajas del almacén, apaga las viejas y enciende
las nuevas. También revisa si la base de datos necesita algún cambio de
estructura y lo aplica solo.

### 5. Se comprueba que funciona de verdad

Y esto es lo importante: **no basta con que las cajas estén encendidas**. Una
aplicación puede estar "arriba" y devolver errores a todo el mundo.

Por eso al final se ejecuta una prueba real que manda tres casos de ejemplo a la
API de producción y comprueba, uno por uno, que las cuentas salen. La última vez
pasó **54 de 54 comprobaciones**.

---

## ¿Cómo sé si está funcionando ahora mismo?

Sin instalar nada: abre <https://fintechvital.com> en el navegador.

Si quieres la comprobación completa, con la aplicación descargada en tu
computadora:

```bash
FV_API_URL=https://api.fintechvital.com/api/v1 node ops/ejemplos.mjs
```

Eso manda los tres casos de ejemplo a producción y te dice qué falla, si algo
falla.

Y para ver por dentro qué está encendido en el servidor:

```powershell
.\ops\oci\desplegar.ps1 -Accion estado
```

Te responde con la lista de piezas, cuánta memoria consume cada una, si
responden y cuánto queda libre en la máquina.

---

## ¿Y si algo se rompe?

Está pensado para que se rompa poco y se arregle solo:

- **Si una pieza se cae**, el servidor la vuelve a encender sola.
- **Si se reinicia el servidor entero**, todo vuelve a arrancar solo. Esto hubo
  que activarlo a mano, y no venía por defecto.
- **Si se cae el túnel**, se reconecta solo.
- **Si falla todo lo demás**, el proyecto tiene plan B: la aplicación corre en
  local y la demo se graba. La presentación nunca depende de que la nube esté en
  pie.

Para apagarlo todo (sin borrar datos):

```powershell
.\ops\oci\desplegar.ps1 -Accion bajar
```

---

## Cosas que conviene saber

**En producción no hay datos de ejemplo.** La base arranca vacía a propósito:
quien entra a fintechvital.com se registra y carga sus propios movimientos. Las
cuentas de demostración (`ana.torres@ejemplo.mx` y compañía) solo existen en
local y en el entorno de pruebas.

**Los secretos no están en el repositorio.** Contraseñas, claves y el token del
túnel viven en archivos que nunca se suben a GitHub. El repositorio es público:
si una contraseña entrara ahí, quedaría en el historial para siempre.

**Cambiar la dirección de la API obliga a reconstruir la web.** La dirección va
grabada dentro del paquete de la web cuando se empaqueta, no se lee al
arrancar. Es una peculiaridad de la herramienta con la que está hecha, y explica
por qué un cambio aparentemente trivial pide rehacer el paquete entero.

**Cuesta cero pesos.** La máquina, el almacén de imágenes y el túnel están todos
dentro de planes gratuitos. Lo único que se paga es el dominio.

---

## Para seguir leyendo

| Si quieres… | Lee |
|---|---|
| Los comandos exactos y el detalle técnico | [`DESPLIEGUE_NUBE_TECNICO.md`](DESPLIEGUE_NUBE_TECNICO.md) |
| Levantar el proyecto en tu máquina | [`README.md`](README.md) |
| Entender la arquitectura de la aplicación | [`../docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md) |
| Los entornos (local, pruebas, producción) | [`../docs/DESPLIEGUE.md`](../docs/DESPLIEGUE.md) |
