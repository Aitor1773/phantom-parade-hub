// Guía de principiante y reroll (es/en; los demás idiomas usan el inglés).
// Textos propios, contrastados con guías publicadas (citadas en Créditos) y con los datos de la web.
import type { Locale } from '@/i18n/utils';

type Text = { es: string; en: string };
export interface GuideSection { id: string; title: Text; body: Text[]; links?: { path: string; label: Text }[] }

export const txt = (t: Text, lang: Locale) => (lang === 'es' ? t.es : t.en);

export const INTRO: Text = {
  es: 'Todo lo que conviene saber al empezar en Jujutsu Kaisen Phantom Parade: cómo hacer reroll, a quién elegir con el ticket SSR, cómo montar el equipo y en qué gastar los recursos.',
  en: 'Everything worth knowing when you start Jujutsu Kaisen Phantom Parade: how to reroll, who to pick with the SSR ticket, how to build your team and what to spend resources on.',
};

export const REROLL: GuideSection = {
  id: 'reroll',
  title: { es: 'Cómo hacer reroll', en: 'How to reroll' },
  body: [
    { es: 'El reroll es rápido: no hace falta reinstalar la app. Desde la pantalla de título puedes borrar los datos de jugador y empezar de nuevo.', en: 'Rerolling is quick: you do not need to reinstall the app. From the title screen you can delete your player data and start over.' },
    { es: 'Pasos: 1) descarga los datos del juego; 2) completa el tutorial (a partir del segundo intento se puede saltar); 3) recoge todo de Regalos y Misiones; 4) gasta los cubos y tickets en el gacha; 5) si no te gusta el resultado, borra los datos desde el título y repite. Cada intento lleva unos 2 minutos con el tutorial saltado.', en: 'Steps: 1) download the game data; 2) finish the tutorial (from the second attempt you can skip it); 3) claim everything from Presents and Missions; 4) spend cubes and tickets on the gacha; 5) if you do not like the result, delete the data from the title screen and repeat. Each attempt takes about 2 minutes with the tutorial skipped.' },
    { es: 'Guarda el ticket de SSR a elegir para el final: úsalo solo cuando des el reroll por terminado, para no gastarlo en una cuenta que vas a borrar.', en: 'Keep the SSR selector ticket for last: use it only once you stop rerolling, so you do not waste it on an account you will delete.' },
    { es: 'Cuándo parar: con 1 o 2 SSR de los recomendados abajo (mejor si uno es potenciador o debilitador) ya tienes un gran comienzo. Los personajes limitados no salen en el gacha normal, así que no los persigas en el reroll.', en: 'When to stop: 1 or 2 of the SSRs recommended below (ideally one buffer or debuffer) is already a great start. Limited characters are not in the regular gacha, so do not chase them while rerolling.' },
    { es: 'La cantidad de tiradas gratis al empezar cambia con las campañas: revisa Regalos y los banners activos antes de tirar.', en: 'The number of free pulls at the start changes with campaigns: check Presents and the active banners before pulling.' },
  ],
};

export const SECTIONS: GuideSection[] = [
  {
    id: 'team',
    title: { es: 'Cómo montar el equipo', en: 'How to build your team' },
    body: [
      { es: 'Llevas 4 titulares, 1 suplente y 1 apoyo prestado. Lo que más rinde es combinar 2 apoyos (potenciadores, debilitadores o curanderos) con 2 atacantes: los apoyos multiplican el daño mucho más que un tercer atacante.', en: 'You field 4 starters, 1 sub and 1 borrowed helper. What works best is 2 supports (buffers, debuffers or healers) with 2 attackers: supports multiply damage far more than a third attacker.' },
      { es: 'Cada enemigo tiene sus propias debilidades y resistencias por color (en el juego se ven con ▲ y ▼). Golpear su debilidad hace más daño y vacía antes su barra de Break; mira el enemigo antes de entrar y elige el color.', en: 'Each enemy has its own weaknesses and resistances by color (shown in game with ▲ and ▼). Hitting a weakness deals more damage and drains its Break gauge faster; check the enemy before entering and pick the color.' },
      { es: 'Los personajes actúan de izquierda a derecha: pon a los apoyos a la izquierda para que sus mejoras lleguen antes del golpe de tus atacantes.', en: 'Characters act from left to right: put supports on the left so their buffs land before your attackers hit.' },
      { es: 'Cada personaje tiene Habilidad 1, 2 y 3, un especial (cuando se llena su barra) y un especial combinado si lanzas el especial de dos aliados a la vez. Lanza primero los especiales de apoyo y luego los de daño.', en: 'Each character has Skill 1, 2 and 3, a Special (when its gauge is full) and a Combo Special if two allies fire their Special on the same turn. Fire support Specials first, then damage ones.' },
    ],
    links: [
      { path: '/team-builder', label: { es: 'Creador de equipos (con plan por turnos)', en: 'Team builder (with turn-by-turn plan)' } },
      { path: '/teams', label: { es: 'Equipos por contenido', en: 'Teams by content' } },
    ],
  },
  {
    id: 'upgrade',
    title: { es: 'En qué gastar los recursos', en: 'What to spend resources on' },
    body: [
      { es: 'Concentra la mejora en pocos personajes: tus 2 apoyos y tu mejor atacante. Un equipo de 4 bien subido avanza mucho más que 10 personajes a medias.', en: 'Focus upgrades on a few characters: your 2 supports and your best attacker. A well-built team of 4 goes much further than 10 half-built characters.' },
      { es: 'Sube primero las habilidades que de verdad usa cada personaje en su rotación (lo tienes en «Cómo jugarlo» de su ficha) y deja el resto para después.', en: 'Level first the skills each character really uses in its rotation (see "How to play" on its page) and leave the rest for later.' },
      { es: 'Equipa memorias acordes al personaje: de cuerpo a cuerpo para atacantes de cuerpo a cuerpo, de técnica para los de técnica, y de vida o defensa para los apoyos.', en: 'Equip memories that fit the character: Taijutsu ones for Taijutsu attackers, Jujutsu ones for Jujutsu attackers, and HP or defense ones for supports.' },
      { es: 'El desbloqueo SP cambia mucho a algunos personajes: en su ficha tienes cuál de las dos opciones desbloquear primero.', en: 'The SP unlock changes some characters a lot: their page tells you which of the two options to unlock first.' },
    ],
    links: [{ path: '/characters', label: { es: 'Fichas de personaje', en: 'Character pages' } }],
  },
  {
    id: 'pulls',
    title: { es: 'Cuándo tirar y cuándo ahorrar', en: 'When to pull and when to save' },
    body: [
      { es: 'Global recibe los banners de JP unas semanas o meses después. Mira qué viene antes de gastar: si llega un personaje que te interesa, ahorra los cubos para él.', en: 'Global gets JP banners weeks or months later. Check what is coming before spending: if a character you want is on the way, save your cubes for it.' },
      { es: 'Los puntos de gacha de un banner te permiten canjear a su destacado al llegar al pity. Calcula con el planificador si llegas antes de que acabe.', en: 'A banner’s gacha points let you exchange for its featured unit when you reach pity. Use the planner to check whether you get there before it ends.' },
      { es: 'Canjea los códigos activos en cuanto salgan: caducan y suelen dar cubos.', en: 'Redeem active codes as soon as they appear: they expire and usually give cubes.' },
    ],
    links: [
      { path: '/banners', label: { es: 'Banners y lo próximo en Global', en: 'Banners and what is coming to Global' } },
      { path: '/tools/pulls', label: { es: 'Planificador de tiradas', en: 'Pull planner' } },
      { path: '/codes', label: { es: 'Códigos', en: 'Codes' } },
    ],
  },
  {
    id: 'progress',
    title: { es: 'Qué hacer cada día y cómo avanzar', en: 'Daily routine and progression' },
    body: [
      { es: 'Cada día: recoge las recompensas de inicio de sesión y las misiones diarias, usa el gacha gratis si hay uno activo y gasta la energía en las fases que te den lo que te falta (materiales de nivel, de grado o de habilidades).', en: 'Every day: claim login rewards and daily missions, use the free gacha if one is active, and spend stamina on the stages that drop what you are missing (level, grade or skill materials).' },
      { es: 'Avanza la historia principal para desbloquear modos. Los capítulos EX son opcionales y bastante más difíciles: déjalos para cuando tengas el equipo subido.', en: 'Push the main story to unlock modes. EX chapters are optional and much harder: leave them until your team is built.' },
      { es: 'La Torre ilusoria y los combates contra enemigos poderosos piden equipos distintos según el piso o la fase: en Equipos por contenido tienes recomendaciones adaptadas a tu cuenta.', en: 'The Illusory Tower and formidable foe battles need different teams per floor or phase: Teams by content has recommendations adapted to your account.' },
      { es: 'Apunta en Mi cuenta los personajes y memorias que tienes: así la web te recomienda equipos y mejoras con lo que de verdad tienes. Exporta una copia de seguridad de vez en cuando.', en: 'Record the characters and memories you own in My account: the site then recommends teams and upgrades with what you actually have. Export a backup now and then.' },
    ],
    links: [
      { path: '/teams', label: { es: 'Equipos por contenido', en: 'Teams by content' } },
      { path: '/account', label: { es: 'Mi cuenta', en: 'My account' } },
    ],
  },
];

/** Preguntas frecuentes (también como datos estructurados FAQPage) */
export const FAQ: { q: Text; a: Text }[] = [
  { q: { es: '¿Se puede hacer reroll en JJK Phantom Parade?', en: 'Can you reroll in JJK Phantom Parade?' },
    a: { es: 'Sí. Se borran los datos de jugador desde la pantalla de título, sin reinstalar, y cada intento lleva unos 2 minutos con el tutorial saltado.', en: 'Yes. You delete your player data from the title screen, without reinstalling, and each attempt takes about 2 minutes with the tutorial skipped.' } },
  { q: { es: '¿Cuándo uso el ticket de SSR a elegir?', en: 'When should I use the SSR selector ticket?' },
    a: { es: 'Al terminar el reroll, para no perderlo en una cuenta que vas a borrar. Elige un apoyo fuerte o el atacante que más te falte.', en: 'Once you stop rerolling, so you do not lose it on an account you will delete. Pick a strong support or the attacker you are missing most.' } },
  { q: { es: '¿Puedo conseguir personajes limitados en el reroll?', en: 'Can I get limited characters while rerolling?' },
    a: { es: 'Solo si su banner está activo en ese momento; el gacha normal no los incluye.', en: 'Only if their banner is active at that moment; the regular gacha does not include them.' } },
];

export const LABELS = {
  toc: { es: 'En esta guía', en: 'In this guide' },
  targets: { es: 'Objetivos de reroll', en: 'Reroll targets' },
  targetsNote: {
    es: 'SSR del gacha normal que ya han llegado a Global, ordenados por nuestra tier list (no incluye limitados ni colaboraciones). Comprueba en el juego que estén en el gacha que vas a usar.',
    en: 'Regular-gacha SSRs already released on Global, ordered by our tier list (limited and collab units excluded). Check in game that they are in the gacha you are pulling on.',
  },
  faq: { es: 'Preguntas frecuentes', en: 'FAQ' },
  updated: { es: 'Actualizada', en: 'Updated' },
};
