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

export type Server = 'global' | 'jp';
export const DEFAULT_SERVER: Server = 'global';
