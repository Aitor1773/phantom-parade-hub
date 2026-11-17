# Cómo se actualizan los datos

Todo se genera con scripts. Los resultados van a `data/` y la web los lee al compilar (`npm run build`).

**Una vez publicada, todo esto lo hace solo cada día** el proceso `.github/workflows/daily.yml` (`npm run data:daily` + imágenes los lunes + compilar + publicar). Cómo activarlo: [PUBLICAR.md](PUBLICAR.md). `npm run data:community` lee el foro (Giscus) y genera `data/community.json`. `npm run data:events` lee los eventos abiertos (JP) y guarda su equipo recomendado, elemento y memorias en `data/normalized/event-guides.json`; las memorias nuevas se emparejan por fecha y se aprenden en `data/manual/jp-memories.json`. `npm run data:banner-art` descarga las imágenes oficiales de los banners abiertos (WebP de 400 px y tamaño real) en `public/img/banners/` con su índice `data/normalized/banner-art.json`; las que ya estaban se conservan. Modos con fichas: Torre ilusoria (y Anomalous Form), Enemigo poderoso enmascarado (強敵邂逅・裏), Batalla SP y Modo historia EX (`data/manual/stages.json`).

## Game8, fuente principal (desde el 2026-11-17)

Toda la información sale de Game8 (permiso total desde el 2026-10-20, ver [EMAILS_PERMISO.md](EMAILS_PERMISO.md)); solo los banners y códigos del servidor **Global** siguen aparte. Se migra por fases:

| Fase | Qué | Estado |
|---|---|---|
| 1 | Personajes: valoración, resumen, puntos fuertes y débiles, prioridad de habilidades, memorias y equipos recomendados, potencial, cómo conseguirlo, estadísticas y habilidades | Hecho |
| 2 | Memorias: valoración, cómo conseguirla, personajes recomendados, efectos y estadísticas (`npm run data:g8memories`; `npm run data:g8link` empareja las nuevas por estadísticas y números de sus efectos) | Hecho |
| 3 | Tier list de Game8 de personajes y memorias, con puntos clave, los mejores por papel e historial (`npm run data:g8tier`). La página `/tier-list` ya es la de Game8; la tier list propia (`data/manual/tier-list.json`) solo la siguen usando por dentro las recomendaciones de cuenta y el creador de equipos | Hecho |
| 4 | Contenido (torre, Anomalous Form, barrido, enemigo enmascarado, historia EX…) | Pendiente |
| 5 | Recomendaciones (`/guides/picks`, `npm run data:g8guides`): reroll, ticket de SSR, pase al gacha permanente, ranking de SR y rareza baja. Eventos y arte de banners ya venían de Game8 | Hecho |
| 5b | Gachas JP, materiales, títulos y guías de sistema | Pendiente |
| 6 | Quitar la wiki y las demás fuentes | Pendiente |

- `npm run data:g8chars` → `data/normalized/game8/characters.json` (en japonés). Cada ficha se enlaza con su personaje de la web por `data/manual/jp-names.json` («「epíteto」nombre» → id). Si sale un personaje nuevo sin emparejar, añádelo ahí.
- `npm run data:translate` → `data/i18n/game8.json`: traduce al resto de idiomas lo que aún no esté traducido, con **Cloudflare Workers AI (plan gratuito)**. Cada texto se traduce una vez. Se para antes de pasar de 9.000 «neuronas» al día (el plan gratis da 10.000), así que lo pendiente se reparte en varios días. Para corregir una traducción a mano, cámbiala y pon `"by": "manual"`: no se vuelve a tocar.
- Las imágenes siguen siendo las nuestras: las de Game8 son más pequeñas (arte de 500 px frente a 1.440 px). Solo se usarán para lo que no tengamos.

### Clave de Cloudflare para traducir (una vez)

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) (la misma cuenta donde está la web). Copia tu **Account ID** (está en la página de inicio de la cuenta, columna derecha, o en *Workers & Pages*).
2. Ve a *My Profile → API Tokens → Create Token → Create Custom Token*. Nombre: `phantom-parade-traducir`. Permisos: **Account · Workers AI · Read** y **Account · Workers AI · Edit**. Crea el token y cópialo (solo se ve una vez).
3. En GitHub, en el repositorio: *Settings → Secrets and variables → Actions → New repository secret*. Crea `CF_ACCOUNT_ID` con el Account ID y `CF_API_TOKEN` con el token.
4. Listo: la actualización diaria empezará a traducir. Para probarlo ya: *Actions → Actualización diaria → Run workflow*.

## Orden recomendado

```
npm run data:fetch      # Wiki: personajes y memorias        → data/normalized/wiki/
npm run data:banners    # Wiki: banners y cronología JP       → data/normalized/wiki/banners.json
npm run data:codes      # Códigos Global de 7 webs, cruzados  → data/normalized/codes.json
npm run data:tierdraft  # Borrador de tier list propia (respeta tus ajustes) → data/manual/tier-list.json
npm run images:fetch    # Imágenes de jjkppdb (solo si hay nuevas; salta lo ya descargado)
npm run data:link       # Empareja memorias wiki ↔ jjkppdb    → data/links/
npm run images          # Convierte imágenes a WebP           → public/img/
npm run data:compare    # Informe de discrepancias entre fuentes → data/review/
npm run build
```

## Qué se edita a mano

| Archivo | Para qué |
|---|---|
| `data/manual/global-banners.json` | Banners del servidor **Global**. La wiki no tiene una cronología Global al día. Cada entrada lleva su fuente oficial (nota de prensa, @JJKPP_GL, aviso del juego). |
| `data/manual/jp-names.json` | Nombre japonés oficial (「epíteto」nombre) → id de la web, para comparar con webs JP si alguna da permiso. |
| `data/manual/tier-list.json` | Tier list **propia** con 7 listas (blue, red, green, yellow, damage, support, sp). Para ajustar: en `lists.<lista>.entries.<id>` cambia `"rank"` y pon `"manual": true` (y una `"note"` si quieres). Fecha de revisión fija: `"reviewed"` + `"reviewedManual": true`. Con `"curated": true` (damage, support y sp) la lista solo muestra los personajes con `"manual": true`; para añadir uno nuevo pon `rank`, `"manual": true` y `"lastRank": null`. Cada cambio queda en `changelog`. |
| `data/manual/stages.json` | **Fichas de cada fase** (piso, jefe, combate de evento): enemigos, nivel, HP, debilidades, reducciones de daño físico/ritual/híbrido, habilidades con su descripción, reglas y estrategia opcional. Hoy: 111 fases (torre 20–90, Anomalous Form, barrido, formidables, Back y jefe final de dominio) con **solo hechos** sacados de Game8 y redactados con nuestras palabras, con su enlace en `url` (servidor JP, torre en temporada 2). Desde el 2026-10-20 hay permiso de Game8, GameWith y jjkppdb (ver [EMAILS_PERMISO.md](EMAILS_PERMISO.md), «Estado»), así que también se usan sus equipos de victoria y estrategias, traducidos y siempre con su nombre y enlace. También se pueden transcribir de capturas: ver [CAPTURAS-FASES.md](CAPTURAS-FASES.md). |
| `data/manual/content.json` | Debilidades y resistencias de cada contenido para los equipos recomendados (`/teams`), rellenadas **a mano desde el juego** (GameWith, AppMedia y Game8 prohíben reutilizar sus datos). Clave: id del contenido (aparece en la URL de `/teams/<id>`) o `illusory-tower/<piso>`. Valor: `{"weak": ["red"], "resist": ["green"], "note": "…", "checked": "AAAA-MM-DD"}`. `towerFloors` = número de pisos de la torre. Después: `npm run build`. |
| `data/manual/codes.json` | Códigos **probados en el juego**. Tienen prioridad sobre lo que digan las webs. |
| `scripts/data/link-jjkppdb.mjs` → `MANUAL` | Parejas de memorias wiki ↔ jjkppdb revisadas por significado. |
| `scripts/images/import.mjs` → `artToId` | Arte de jjkppdb que no se asocia solo. |
| `assets-src/characters/` | Tus capturas de arte. Tienen prioridad sobre las de jjkppdb ([IMAGENES.md](IMAGENES.md)). |

## Estado de los códigos

- **verified**: dos o más webs lo dan por activo y ninguna por caducado.
- **single**: solo una web lo da por activo.
- **conflict**: unas webs lo dan por activo y otras por caducado. Se muestra como "probablemente caducado".
- **expired**: solo aparece como caducado.
- **tested**: probado en el juego (`data/manual/codes.json`).

## Fuentes y licencias

- Datos de la JJK Phantom Parade Wiki: CC BY-SA 3.0, con atribución en cada ficha.
- De jjkppdb solo se usan imágenes del juego, y nombres, rareza y stats para emparejar. Nunca se usa su contenido propio.
- De las webs de códigos solo se extraen hechos: el código, la recompensa y si está activo. Siempre respetando su robots.txt.

## Tier list

La tier list es **propia**: un borrador calculado con los datos de la wiki (ver criterios en la propia página) y ajustado a mano.
No se copian tier lists de otras webs: jjkppdb y Game8 prohíben reproducir su contenido sin permiso. Si alguna lo concede, se podrá añadir como columna de comparación con su atribución.

Los borradores para pedir permiso a jjkppdb y Game8 están en [EMAILS_PERMISO.md](EMAILS_PERMISO.md).
