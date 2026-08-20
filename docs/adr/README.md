# ADR - Architecture Decision Records

Una decisión estructural por archivo. **Se escriben cuando se toma la decisión,
no después.** Un ADR no se edita: si la decisión cambia, se escribe uno nuevo que
**supersede** al anterior, y el viejo queda como registro histórico.

> Lo único que sí se toca de un ADR viejo es su **cabecera de estado**, para que
> quien lo abra sepa en la primera línea que ya no rige y a dónde ir. El cuerpo
> se deja intacto, incluso cuando habla en presente de cosas que cambiaron: ese
> es justamente su valor.

## Índice

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-monorepo.md) | Monorepo | ✅ Aceptada |
| [0002](0002-tres-servicios.md) | Tres servicios: Spring Boot + FastAPI + Next.js | ✅ Aceptada |
| [0003](0003-oracle-autonomous-db.md) | ~~Oracle Autonomous Database como BD~~ | ⛔ Reemplazada por 0012 → 0014 |
| [0004](0004-auth-propio-jwt.md) | Auth propio con JWT (sin proveedor externo) | ✅ Aceptada |
| [0005](0005-infra-oci-privada.md) | VCN privada + Cloudflare Tunnel, sin Load Balancer | ✅ **Aplicada** (2026-08-20) |
| [0006](0006-dataset-sintetico.md) | Dataset sintético generado por el equipo | ✅ Aceptada |
| [0007](0007-recomendaciones-por-reglas.md) | Recomendaciones por reglas, no con un LLM | ✅ Aceptada |
| [0008](0008-infra-no-bloquea-app.md) | La infraestructura no bloquea a la aplicación | ✅ Aceptada |
| [0009](0009-multi-idioma.md) | 🌎 Multi-idioma: español, portugués e inglés | ✅ Aceptada |
| [0010](0010-app-movil-react-native.md) | 📱 App móvil con React Native (Expo), además de la web | ✅ Aceptada |
| [0011](0011-mocks-desacoplados-frontend.md) | Mocks desacoplados para desarrollar las interfaces | ✅ **Cumplida**: los mocks ya se retiraron |
| [0012](0012-motor-mysql.md) | ~~El motor de BD es **MySQL 8**~~ (reemplazaba a 0003) | ⛔ Reemplazada por 0014 |
| [0013](0013-2fa-obligatorio-en-registro.md) | 🔒 El 2FA es **obligatorio** y se configura en el registro | ✅ Aceptada |
| **[0014](0014-motor-postgresql.md)** | **El motor de BD es PostgreSQL 16** (reemplaza a MySQL, ADR-0012) | ✅ Aceptada — **vigente** |
| [0015](0015-tokens-en-el-cliente.md) | 🔒 Los tokens se persisten en el cliente: `localStorage` en web, llavero en móvil | ✅ Aceptada |

## Formato

```markdown
# ADR-000X - Título en una línea

- **Estado**: Propuesta | Aceptada | Rechazada | Supersedida por ADR-000Y
- **Fecha**: YYYY-MM-DD

## Contexto
Qué problema hay que resolver y qué restricciones existen.

## Decisión
Qué se decidió, en una frase clara.

## Alternativas consideradas
Qué más se evaluó y **por qué se descartó**. (Esta sección es la que importa:
sin ella, en un mes nadie recuerda por qué no se hizo lo obvio.)

## Consecuencias
Lo bueno Y lo malo. Un ADR sin costos es un ADR deshonesto.
```
