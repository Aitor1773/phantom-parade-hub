// Nombre provisional: se cambia aquí cuando esté decidido.
export const SITE = {
  name: 'Phantom Parade Hub',
  shortName: 'PP Hub',
  wikiUrl: 'https://jjk-phantom-parade.fandom.com/wiki/JJK-Phantom-Parade-Wiki',
};

/**
 * Las imágenes de la wiki tienen protección anti-hotlinking (solo cargan desde
 * fandom.com), así que no se enlazan. Se activará cuando haya una fuente propia
 * de imágenes (ver docs/ALCANCE.md, "Pendiente de decidir").
 */
export const REMOTE_IMAGES = false;

/**
 * Foro de la comunidad con Giscus (comentarios en GitHub Discussions, gratis).
 * Se rellena con los valores que da https://giscus.app al elegir el repositorio
 * (ver docs/PUBLICAR.md). Mientras esté vacío, la web muestra "foro pendiente".
 */
export const GISCUS = {
  repo: '', // "usuario/repositorio"
  repoId: '',
  category: 'Equipos y estrategias',
  categoryId: '',
};
export const GISCUS_ENABLED = !!(GISCUS.repo && GISCUS.repoId && GISCUS.categoryId);

export type Server = 'global' | 'jp';
export const DEFAULT_SERVER: Server = 'global';
