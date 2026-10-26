// Glosario de mecánicas (es/en; los demás idiomas usan el inglés).
// Definiciones propias contrastadas con guías publicadas (citadas en Créditos) y con los kits de la web.
type Text = { es: string; en: string };
export interface Term { id: string; jp: string; name: Text; desc: Text }
export interface TermGroup { id: string; title: Text; terms: Term[] }

const t = (id: string, jp: string, es: string, en: string, des: string, den: string): Term => ({ id, jp, name: { es, en }, desc: { es: des, en: den } });

export const GLOSSARY_INTRO: Text = {
  es: 'Qué significa cada término que verás en las habilidades, memorias y combates de Jujutsu Kaisen Phantom Parade. Entre paréntesis, el nombre japonés para que lo reconozcas en guías de JP.',
  en: 'What each term you will see in Jujutsu Kaisen Phantom Parade skills, memories and battles means. In brackets, the Japanese name so you can recognise it in JP guides.',
};

export const GLOSSARY: TermGroup[] = [
  {
    id: 'basics',
    title: { es: 'Lo básico del combate', en: 'Battle basics' },
    terms: [
      t('skills', 'スキル1・2・3', 'Habilidades 1, 2 y 3', 'Skills 1, 2 and 3', 'Las tres habilidades de comando de cada personaje. La Habilidad 1 no gasta energía maldita; la 2 y la 3 sí, y algunas tienen tiempo de espera.', 'Each character’s three command skills. Skill 1 costs no cursed energy; Skills 2 and 3 do, and some have a cooldown.'),
      t('ce', '呪力', 'Energía maldita', 'Cursed energy', 'El recurso que gastan las habilidades 2 y 3. Se recupera cada turno; algunos kits y memorias la recuperan de golpe.', 'The resource Skills 2 and 3 spend. It recovers every turn; some kits and memories restore it in bursts.'),
      t('special', '必殺', 'Especial', 'Special', 'El ataque más fuerte de cada personaje. Se lanza cuando su barra de especial está llena; la barra se carga al usar habilidades y al recibir golpes.', 'Each character’s strongest attack. It fires when its special gauge is full; the gauge charges as you use skills and take hits.'),
      t('combo', '連携必殺', 'Especial combinado', 'Combo special', 'Si dos aliados lanzan su especial en el mismo turno, se añade un ataque conjunto con daño extra y mejoras propias de la pareja.', 'If two allies fire their Special on the same turn, a joint attack is added with extra damage and buffs of its own.'),
      t('order', '行動順', 'Orden de actuación', 'Action order', 'Tus personajes actúan de izquierda a derecha. Pon a los apoyos a la izquierda para que sus mejoras lleguen antes del ataque.', 'Your characters act from left to right. Put supports on the left so their buffs land before the attack.'),
      t('weak', '弱点・耐性', 'Debilidad y resistencia', 'Weakness and resistance', 'Cada enemigo tiene colores que le hacen más daño (▲) y colores que le hacen menos (▼). Atacar su debilidad también vacía antes su barra de Break.', 'Each enemy has colors that deal more damage to it (▲) and colors that deal less (▼). Hitting its weakness also drains its Break gauge faster.'),
      t('break', 'ブレイク', 'Break', 'Break', 'Al vaciar la barra de Break de un enemigo, este no puede actuar durante 2 turnos y recibe más daño: es el mejor momento para los especiales.', 'When you empty an enemy’s Break gauge it cannot act for 2 turns and takes more damage: the best moment for Specials.'),
      t('bf', '黒閃', 'Destello Negro', 'Black Flash', 'Un golpe crítico especial que solo pueden activar algunos personajes. Muchos de sus kits ganan mejoras o energía cuando lo activan.', 'A special critical hit only some characters can trigger. Many of their kits gain buffs or energy when it happens.'),
      t('crit', '会心', 'Crítico', 'Critical hit', 'Golpe que hace más daño. Se potencia con la probabilidad de crítico y el daño crítico, y se reduce con la resistencia a críticos del objetivo.', 'A hit that deals more damage. Boosted by crit rate and crit damage, and reduced by the target’s crit resistance.'),
      t('domain', '領域展開', 'Expansión de dominio', 'Domain expansion', 'Algunos especiales despliegan un dominio que cambia el combate durante varios turnos; sus efectos dependen de cada personaje.', 'Some Specials deploy a domain that changes the battle for several turns; its effects depend on the character.'),
    ],
  },
  {
    id: 'debuffs',
    title: { es: 'Estados alterados y debilitamientos', en: 'Status ailments and debuffs' },
    terms: [
      t('stun', 'スタン', 'Aturdimiento', 'Stun', 'El objetivo no puede actuar mientras dure.', 'The target cannot act while it lasts.'),
      t('disrupt', '撹乱', 'Perturbación', 'Disruption', 'El objetivo puede perder su turno y además recibe más daño.', 'The target may lose its turn and also takes more damage.'),
      t('poison', '毒', 'Veneno', 'Poison', 'El objetivo recibe daño al final de cada turno.', 'The target takes damage at the end of each turn.'),
      t('taunted', '挑発', 'Provocación', 'Taunt', 'El objetivo provocado tiene que atacar a quien lo provocó.', 'A taunted target must attack whoever taunted it.'),
      t('statdown', '体術・術式ダウン', 'Bajada de cuerpo a cuerpo o técnica', 'Taijutsu / Jujutsu down', 'Reduce el stat de cuerpo a cuerpo (taijutsu) o de técnica (jujutsu) del objetivo.', 'Lowers the target’s Taijutsu or Jujutsu stat.'),
      t('dmgdown', '与ダメージダウン', 'Daño infligido reducido', 'Damage dealt down', 'El objetivo hace menos daño.', 'The target deals less damage.'),
      t('vuln', '被ダメージアップ', 'Daño recibido aumentado', 'Damage taken up', 'El objetivo recibe más daño; existe en general o solo de cuerpo a cuerpo, de técnica o de un color. Es la base de los debilitadores.', 'The target takes more damage; it can be general or only from Taijutsu, Jujutsu or one color. The core of debuffers.'),
      t('critres', '会心抵抗ダウン', 'Resistencia a críticos reducida', 'Crit resistance down', 'Hace más fácil que el objetivo reciba golpes críticos.', 'Makes the target easier to crit.'),
      t('cedown', '呪力回復量ダウン', 'Recuperación de energía reducida', 'Cursed energy recovery down', 'El objetivo recupera menos energía maldita cada turno.', 'The target recovers less cursed energy each turn.'),
      t('gaugelock', '必殺ゲージ上昇無効', 'Barra de especial bloqueada', 'Special gauge locked', 'La barra de especial del objetivo deja de cargarse.', 'The target’s special gauge stops charging.'),
    ],
  },
  {
    id: 'buffs',
    title: { es: 'Mejoras y estados defensivos', en: 'Buffs and defensive states' },
    terms: [
      t('statup', '体術・術式アップ', 'Subida de cuerpo a cuerpo o técnica', 'Taijutsu / Jujutsu up', 'Aumenta el stat de cuerpo a cuerpo o de técnica. Las mejoras se acumulan: dos de +75 % suman +150 %.', 'Raises Taijutsu or Jujutsu. Buffs stack: two +75% buffs add up to +150%.'),
      t('dmgup', '与ダメージアップ', 'Daño infligido aumentado', 'Damage dealt up', 'Aumenta el daño que hace el personaje.', 'Increases the damage the character deals.'),
      t('guard', '被ダメージダウン', 'Daño recibido reducido', 'Damage taken down', 'Reduce el daño recibido, en general o solo de cuerpo a cuerpo o de técnica.', 'Reduces damage taken, in general or only from Taijutsu or Jujutsu.'),
      t('gaugeup', '必殺ゲージ上昇量アップ', 'Carga de especial aumentada', 'Special gauge charge up', 'La barra de especial se llena más rápido.', 'The special gauge fills faster.'),
      t('breakup', 'ブレイクダメージ量アップ', 'Daño de Break aumentado', 'Break damage up', 'Las habilidades vacían más la barra de Break del enemigo.', 'Skills drain more of the enemy’s Break gauge.'),
      t('revive', '復活', 'Resurrección', 'Revive', 'Si sus PV llegan a 0, el personaje recupera el 35 % y sigue en combate.', 'If its HP reaches 0, the character recovers 35% and stays in battle.'),
      t('nullify', '攻撃無効化', 'Invulnerabilidad', 'Attack nullification', 'Anula el daño de las habilidades enemigas. Algunos ataques lo ignoran.', 'Negates damage from enemy skills. Some attacks ignore it.'),
      t('evade', '回避', 'Esquiva', 'Evasion', 'Inmune a las habilidades enemigas de un solo objetivo.', 'Immune to single-target enemy skills.'),
      t('stealth', '隠密', 'Sigilo', 'Stealth', 'No puede ser elegido como objetivo de habilidades de un solo objetivo.', 'Cannot be targeted by single-target skills.'),
      t('surehit', '必中', 'Golpe seguro', 'Sure hit', 'Las habilidades siempre aciertan, aunque el objetivo esté esquivando.', 'Skills always hit, even if the target is evading.'),
      t('counter', 'カウンター', 'Contraataque', 'Counter', 'Una vez por turno bloquea una habilidad cuerpo a cuerpo y responde con un ataque.', 'Once per turn it blocks a melee skill and strikes back.'),
      t('taunt', '引き付け', 'Atraer ataques', 'Draw attacks', 'Atrae los ataques enemigos hacia este personaje; lo usan los tanques para proteger al resto.', 'Draws enemy attacks to this character; tanks use it to protect the rest.'),
      t('regen', '毎ターン回復', 'Recuperación por turno', 'Regeneration', 'Recupera PV o energía maldita al empezar cada turno.', 'Recovers HP or cursed energy every turn.'),
    ],
  },
  {
    id: 'growth',
    title: { es: 'Progreso del personaje', en: 'Character progression' },
    terms: [
      t('dupes', '凸', 'Copias extra (límite)', 'Dupes (limit break)', 'Cada copia repetida de un personaje sube su límite (de 0 a 5) y mejora sus stats y, a veces, sus habilidades.', 'Each duplicate copy raises the character’s limit (0 to 5), improving stats and sometimes skills.'),
      t('sp', 'SP解放', 'Desbloqueo SP', 'SP unlock', 'Mejora que cambia habilidades o pasivas de algunos personajes; cada uno tiene dos opciones y en su ficha te decimos cuál desbloquear primero.', 'An upgrade that changes skills or passives of some characters; each has two options and its page tells you which to unlock first.'),
      t('autos', 'オートスキル', 'Pasivas', 'Auto skills', 'Efectos permanentes o que se activan solos al cumplirse una condición (inicio del combate, poca vida…).', 'Effects that are always on or trigger by themselves when a condition is met (battle start, low HP…).'),
      t('memory', '廻想残滓', 'Memorias', 'Memories', 'Equipo que da stats y un efecto en combate. Elige según el personaje: cuerpo a cuerpo, técnica o vida.', 'Equipment that grants stats and an effect in battle. Pick by character: Taijutsu, Jujutsu or HP.'),
    ],
  },
];
