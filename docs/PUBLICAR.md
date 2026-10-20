# Publicar la web, activar el foro y la actualización diaria

Todo es **gratis**: GitHub (código, foro y proceso diario) y Cloudflare Pages (alojamiento).
**Ya está hecho** (20/10/2026); esta guía queda como referencia.

## 1. GitHub: el repositorio
- Repositorio público: <https://github.com/Aitor1773/phantom-parade-hub> (rama `main`). Giscus solo funciona con repositorios públicos.
- `gh` tiene sesión iniciada como Aitor1773 con el permiso `workflow` (necesario para subir cambios en `.github/workflows`).

> Lo que se publica es el código y los datos de la web, nada privado: `.env`, `assets-src/` y `node_modules/` están excluidos en `.gitignore`.

## 2. Foro de la comunidad (Giscus)
- Discussions activado, categoría **`Equipos y estrategias`** (formato Announcement: solo Giscus crea los hilos y los usuarios responden en ellos).
- App de Giscus instalada en el repositorio. Los IDs están en `src/config/site.ts` (`GISCUS`).

Moderación: desde GitHub puedes ocultar, borrar o bloquear comentarios, y cerrar un hilo (*Lock conversation*).

## 3. Cloudflare Pages: el alojamiento
- Proyecto `phantom-parade-hub` conectado al repositorio de GitHub (app «Cloudflare Workers and Pages», solo con acceso a este repositorio).
- Compilación: `npm run build`, carpeta `dist`, variables `NODE_VERSION=24` y `SITE_URL=https://phantom-parade-hub.pages.dev`.
- La web está en <https://phantom-parade-hub.pages.dev>. **Cada subida a `main` se publica sola**; no hacen falta tokens ni secretos.
- Dominio propio (opcional): en el proyecto, *Custom domains*. Cambia entonces `SITE_URL` en Cloudflare y en `.github/workflows/daily.yml`.

## 4. Actualización diaria
El proceso de GitHub Actions actualiza los datos, compila para comprobar que todo va bien y sube los cambios. Siempre sube al menos `data/last-run.txt`, así que Cloudflare vuelve a publicar la web cada día aunque no haya datos nuevos.

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
