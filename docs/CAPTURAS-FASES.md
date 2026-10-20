# Capturas para las fichas de pisos, jefes y eventos

Las fichas de enemigos de **Equipos por contenido** salen de capturas del propio juego. No hay ninguna fuente abierta con estos datos (Game8, GameWith y AppMedia prohíben reutilizarlos y la wiki no los tiene), así que se transcriben a mano. Con cada ficha, la web ajusta los equipos (los tuyos y el general) y genera la estrategia.

## Qué capturar en cada fase
1. **La pantalla antes de combatir** (detalles del combate / *Battle Details*): nombre de la fase, poder recomendado, elementos recomendados y desaconsejados, y las **reglas especiales** (por ejemplo «solo personajes 影» o «−90 % a los buffs aliados»).
2. **La ficha de cada enemigo** (tocando su icono): nombre, nivel, HP, **debilidades ▲ y resistencias ▼**, y la descripción de **cada habilidad**.
3. **Los estados del enemigo** durante el combate si los tiene de inicio: por ejemplo «Daño físico −90 %» o «atrae los ataques».
4. Si hay varias oleadas, la de cada oleada.

Consejos: captura a pantalla completa y sin recortar, en el idioma en que juegues (lo traduzco yo), y nombra o agrupa las capturas por fase (por ejemplo «torre-12-1.png», «torre-12-2.png»). Pásamelas como archivo original o directamente en el chat.

## Cómo se guarda (lo hago yo)
Archivo `data/manual/stages.json`, una entrada por fase:

```json
"illusory-tower/12": {
  "name": "Piso 12",
  "server": "global",
  "checked": "2026-10-20",
  "source": "captura del juego",
  "power": 78300,
  "recommended": ["blue"],
  "unfavorable": ["red"],
  "rules": { "only": ["blue"], "notes": ["Buffs aliados −90 %"] },
  "enemies": [
    {
      "name": "Nombre del jefe", "boss": true, "level": 120, "hp": 2000000,
      "weak": ["blue"], "resist": ["red"],
      "cut": { "taijutsu": 90, "mixed": 90 },
      "taunt": true,
      "skills": [
        { "name": "Nombre de la habilidad", "kind": "aoe", "text": "Descripción tal como sale en el juego" }
      ]
    },
    { "name": "Esbirro", "count": 2, "level": 120, "skills": [{ "name": "…", "kind": "debuff", "text": "…" }] }
  ],
  "strategy": "Opcional: consejo escrito a mano que se muestra antes del generado."
}
```

- **Claves de fase:** torre `illusory-tower/<piso>`, torre Anomalous Form `illusory-tower-diverse/<piso>`, investigación de dominio `domain-investigation/<dificultad>-<combate>` (por ejemplo `hard-3`), y para eventos y jefes `<id del evento>/<fase>` (el id aparece en la URL de su página en `/teams/`).
- **Elementos:** `red` (幻), `blue` (影), `green` (夜), `yellow` (行).
- **Tipos de daño (`cut`):** `taijutsu` (físico), `jujutsu` (ritual), `mixed` (híbrido), en % de reducción.
- **Tipos de habilidad (`kind`):** `aoe` (golpea a todos), `single`, `debuff`, `buff`, `heal`, `taunt`, `summon`, `counter`, `enrage`, `other`. Sirven para la estrategia: por ejemplo, `debuff` hace que se valore a quien limpia debilitamientos y `aoe` a quien cura o reduce daño.

Después: `npm run build` (o el proceso diario, si la web ya está publicada).
