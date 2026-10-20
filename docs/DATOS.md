# Cómo se actualizan los datos

Todo se genera con scripts. Los resultados van a `data/` y la web los lee al compilar (`npm run build`).

**Una vez publicada, todo esto lo hace solo cada día** el proceso `.github/workflows/daily.yml` (`npm run data:daily` + imágenes los lunes + compilar + publicar). Cómo activarlo: [PUBLICAR.md](PUBLICAR.md). `npm run data:community` lee el foro (Giscus) y genera `data/community.json`.

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
