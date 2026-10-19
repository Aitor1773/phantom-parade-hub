# Cómo se actualizan los datos

Todo se genera con scripts. Los resultados van a `data/` y la web los lee al compilar (`npm run build`).

## Orden recomendado

```
npm run data:fetch      # Wiki: personajes y memorias        → data/normalized/wiki/
npm run data:banners    # Wiki: banners y cronología JP       → data/normalized/wiki/banners.json
npm run data:codes      # Códigos Global de 7 webs, cruzados  → data/normalized/codes.json
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
