# Publicar la web, activar el foro y la actualización diaria

Todo es **gratis**: GitHub (código, foro y proceso diario) y Cloudflare Pages (alojamiento).
Solo hay que hacerlo una vez. Donde pone «pásame…», me lo das y lo configuro yo.

## 1. GitHub: el repositorio
1. Crea una cuenta gratuita en <https://github.com> (si no tienes).
2. Crea un repositorio **público** (Giscus solo funciona con repositorios públicos), por ejemplo `phantom-parade-hub`. Sin README ni licencia.
3. **Pásame la URL del repositorio** y lo subo (`git remote add origin …` y `git push`). La primera vez GitHub te pedirá iniciar sesión.

> Lo que se publica es el código y los datos de la web, nada privado: `.env`, `assets-src/` y `node_modules/` están excluidos en `.gitignore`.

## 2. Foro de la comunidad (Giscus)
1. En el repositorio: **Settings → General → Features → Discussions** (actívalo).
2. En la pestaña **Discussions**, crea una categoría llamada **`Equipos y estrategias`** de tipo **Announcement** (así solo Giscus crea los hilos y los usuarios responden en ellos).
3. Instala la app de Giscus en el repositorio: <https://github.com/apps/giscus> → *Install* → elige solo ese repositorio.
4. Entra en <https://giscus.app>, escribe `usuario/repositorio`, elige la categoría `Equipos y estrategias` y baja hasta el bloque de código. **Pásame `data-repo-id` y `data-category-id`** (o pégalos tú en `src/config/site.ts`, en `GISCUS`).

Moderación: desde GitHub puedes ocultar, borrar o bloquear comentarios, y cerrar un hilo (*Lock conversation*).

## 3. Cloudflare Pages: el alojamiento
1. Crea una cuenta gratuita en <https://dash.cloudflare.com>.
2. **Workers & Pages → Create → Pages → Upload assets**, ponle nombre (por ejemplo `phantom-parade-hub`) y sube cualquier archivo para crearlo; el proceso diario lo sustituirá.
3. Tu web quedará en `https://<nombre>.pages.dev` (luego puedes añadir un dominio propio).
4. **My Profile → API Tokens → Create Token → plantilla «Edit Cloudflare Workers»** (o un token personalizado con permiso *Cloudflare Pages: Edit*). Copia el token.
5. Copia tu **Account ID** (aparece en la portada de *Workers & Pages*, a la derecha).

## 4. Conectar GitHub con Cloudflare
En el repositorio: **Settings → Secrets and variables → Actions**.

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | el token del paso 3.4 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | el Account ID del paso 3.5 |
| Variable | `CF_PAGES_PROJECT` | el nombre del proyecto (`phantom-parade-hub`) |
| Variable | `SITE_URL` | `https://phantom-parade-hub.pages.dev` (o tu dominio) |

Los secretos los escribes tú directamente en GitHub: **no hace falta que me los pases**.

## 5. Primera ejecución
**Actions → Actualización diaria → Run workflow.** La primera vez tarda más (descarga todas las imágenes, unos 20 minutos). Después se ejecuta solo **cada día a las 15:30 (hora de Japón)**, justo tras el cambio de banners.

## Qué se actualiza solo y qué no

| Cada día, solo | Sigue siendo manual |
|---|---|
| Personajes, memorias y kits (wiki) | Tier list (los personajes nuevos entran como borrador, marcados) |
| Calendario de banners y eventos JP, fechas Global de la wiki | Banners Global de capturas o notas de prensa (`data/manual/global-banners.json`) |
| Códigos (con su verificación entre fuentes) | Debilidades comprobadas por ti (`data/manual/content.json`) |
| Equipos más votados y debilidades confirmadas en el foro | — |
| Imágenes nuevas de jjkppdb (los lunes) | — |
| «Disponibles ahora», estimaciones y fechas (al recompilar) | — |

Si algún paso falla (una web caída, por ejemplo), el resto sigue y se publica igual; el error queda en la pestaña **Actions** y GitHub te avisa por email.
