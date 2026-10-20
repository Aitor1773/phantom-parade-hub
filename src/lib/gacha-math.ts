// Cálculos del gacha compartidos por el planificador y el simulador (sin dependencias del DOM).
// Las tasas y el pity vienen de GACHA (src/data/gacha.ts), que cita la wiki.

export type PullRarity = 'SSR' | 'SR' | 'R';
export type PullType = 'character' | 'memory';
export interface Rate { rarity: PullRarity; type: PullType; rate: number; tenth: number }
export interface PullResult { rarity: PullRarity; type: PullType }

/** Probabilidad de al menos un éxito en n intentos independientes con probabilidad p (0–1). */
export const atLeastOne = (p: number, n: number) => (n <= 0 || p <= 0 ? 0 : 1 - Math.pow(1 - p, n));

/** Número de tiradas necesarias para llegar a una probabilidad objetivo (p. ej. 0,5 o 0,9). */
export const pullsForChance = (p: number, target: number) => (p <= 0 ? Infinity : Math.ceil(Math.log(1 - target) / Math.log(1 - p)));

/** Tiradas que permiten unos cubos y tarjetas. */
export const pullsFrom = (cubes: number, tickets: number, cubesPerPull: number) => Math.floor(Math.max(0, cubes) / cubesPerPull) + Math.max(0, tickets);

/** Número aleatorio uniforme en [0, 1) con la API criptográfica cuando existe. */
export function random(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  return Math.random();
}

/** Una tirada. `tenth` = es la 10.ª de una 10x (SR o mejor garantizado). */
export function drawOne(rates: readonly Rate[], tenth = false, rnd = random): PullResult {
  const total = rates.reduce((a, r) => a + (tenth ? r.tenth : r.rate), 0);
  let x = rnd() * total;
  for (const r of rates) {
    x -= tenth ? r.tenth : r.rate;
    if (x < 0) return { rarity: r.rarity, type: r.type };
  }
  const last = rates.at(-1)!;
  return { rarity: last.rarity, type: last.type };
}

export const drawTen = (rates: readonly Rate[], rnd = random) => Array.from({ length: 10 }, (_, i) => drawOne(rates, i === 9, rnd));
