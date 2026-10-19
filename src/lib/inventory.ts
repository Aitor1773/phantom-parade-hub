// Inventario del jugador: lo que tiene en su cuenta del juego.
// Se guarda en el navegador (localStorage) y se puede exportar/importar en JSON.
// La versión permite migrar el formato en el futuro (p. ej. al sincronizar con Supabase).

export const INVENTORY_VERSION = 1;
const KEY = 'pp-inventory';

export type SkillKey = 'normal' | 's1' | 's2' | 'ult';

export interface OwnedCharacter {
  level?: number;
  /** Copias extra (dupes) usadas para subir el límite */
  dupes?: number;
  skills?: Partial<Record<SkillKey, number>>; // 1–10
  sp?: boolean; // despertar SP (solo personajes que lo tienen)
  note?: string;
}

export interface OwnedMemory {
  copies?: number;
  level?: number;
}

export interface Inventory {
  version: number;
  server: 'global' | 'jp';
  updatedAt: string;
  characters: Record<string, OwnedCharacter>;
  memories: Record<string, OwnedMemory>;
  resources: Record<string, number>;
  /** Recursos añadidos por el usuario: id → nombre visible */
  customResources: Record<string, string>;
}

export const emptyInventory = (): Inventory => ({
  version: INVENTORY_VERSION,
  server: 'global',
  updatedAt: new Date().toISOString(),
  characters: {},
  memories: {},
  resources: {},
  customResources: {},
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min = 0, max = 1e9) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

/**
 * Valida y limpia datos de origen desconocido (localStorage o un archivo importado).
 * Descarta ids que no existen en la base de datos y valores fuera de rango.
 */
export function sanitize(raw: unknown, valid: { characters: Set<string>; memories: Set<string> }): Inventory {
  const inv = emptyInventory();
  if (!isObj(raw)) return inv;
  if (raw.server === 'jp' || raw.server === 'global') inv.server = raw.server;
  if (typeof raw.updatedAt === 'string') inv.updatedAt = raw.updatedAt;

  if (isObj(raw.characters)) {
    for (const [id, c] of Object.entries(raw.characters)) {
      if (!valid.characters.has(id) || !isObj(c)) continue;
      const out: OwnedCharacter = {};
      const level = num(c.level, 1, 999), dupes = num(c.dupes, 0, 99);
      if (level) out.level = level;
      if (dupes != null) out.dupes = dupes;
      if (isObj(c.skills)) {
        const skills: OwnedCharacter['skills'] = {};
        for (const k of ['normal', 's1', 's2', 'ult'] as SkillKey[]) {
          const v = num(c.skills[k], 1, 10);
          if (v) skills[k] = v;
        }
        if (Object.keys(skills).length) out.skills = skills;
      }
      if (c.sp === true) out.sp = true;
      if (typeof c.note === 'string' && c.note.trim()) out.note = c.note.slice(0, 280);
      inv.characters[id] = out;
    }
  }
  if (isObj(raw.memories)) {
    for (const [id, m] of Object.entries(raw.memories)) {
      if (!valid.memories.has(id) || !isObj(m)) continue;
      const out: OwnedMemory = {};
      const copies = num(m.copies, 1, 999), level = num(m.level, 1, 999);
      if (copies) out.copies = copies;
      if (level) out.level = level;
      inv.memories[id] = out;
    }
  }
  if (isObj(raw.customResources)) {
    for (const [id, name] of Object.entries(raw.customResources)) {
      if (/^custom-[a-z0-9-]{1,40}$/.test(id) && typeof name === 'string' && name.trim()) inv.customResources[id] = name.slice(0, 60);
    }
  }
  if (isObj(raw.resources)) {
    for (const [id, v] of Object.entries(raw.resources)) {
      const n = num(v, 0, 1e9);
      if (n != null && /^[a-z0-9-]{1,48}$/.test(id)) inv.resources[id] = n;
    }
  }
  return inv;
}

export function loadInventory(valid: { characters: Set<string>; memories: Set<string> }): Inventory {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw), valid) : emptyInventory();
  } catch {
    return emptyInventory();
  }
}

/** Devuelve false si el navegador no permite guardar (modo privado, almacenamiento lleno…). */
export function saveInventory(inv: Inventory): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...inv, version: INVENTORY_VERSION }));
    return true;
  } catch {
    return false;
  }
}

/** Descarga el inventario como archivo JSON en el dispositivo del usuario. */
export function exportInventory(inv: Inventory) {
  const blob = new Blob([JSON.stringify({ ...inv, version: INVENTORY_VERSION }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `phantom-parade-inventario-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
