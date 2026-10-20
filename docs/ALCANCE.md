# JJK Phantom Parade — Documento de alcance

> Versión 0.1 · 19/10/2026 · Borrador para revisar

Fan site no oficial de *Jujutsu Kaisen: Phantom Parade*: base de datos, guías, herramientas y recomendaciones personalizadas según la cuenta de cada jugador. Prioridad: servidor **Global**; JP como avance de lo que viene.

---

## 1. Principios

1. **Veracidad ante todo.** Cada dato tiene fuente y fecha de verificación. Si las fuentes no coinciden, el dato no se publica hasta revisarlo.
2. **Global primero.** Toda ficha distingue Global / JP (fechas, banners, balance, traducciones).
3. **Gratis.** Stack y hosting en planes gratuitos.
4. **Multi-idioma desde el día 1:** EN, ES, PT-BR, FR, DE, JA, KO, ZH (simplificado; tradicional más adelante).
5. **Legal:** aviso de fan site, atribución CC BY-SA a la wiki y nada de copiar contenido editorial ajeno.

---

## 2. Fuentes de datos y uso permitido

| Fuente | Idioma / servidor | Qué aporta | Cómo la usamos |
|---|---|---|---|
| [JJK PP Wiki (Fandom)](https://jjk-phantom-parade.fandom.com/wiki/JJK-Phantom-Parade-Wiki) | EN · Global/JP | Personajes, habilidades, stats, memorias | **Fuente base.** CC BY-SA 3.0 → reutilizable con atribución; los datos derivados se publican con la misma licencia. Extracción vía API de MediaWiki. |
| [jjkppdb.com](https://www.jjkppdb.com/) | EN/ES · JP | Habilidades re-traducidas, análisis, tiers, equipos, Rec. Bits | **Solo contraste.** Su contenido editorial es suyo: no se copia. |
| [Game8 JP](https://game8.jp/jujutsuphanpara) | JA · JP | Tiers, valores numéricos, eventos | Contraste de números y fechas JP. No se reproducen textos. |
| [AppMedia](https://appmedia.jp/phanpara) | JA · JP | Tiers, calculadoras, eventos | Contraste. |
| [GameWith](https://gamewith.jp/jujutsuphanpara/) | JA · JP | Tiers, datos de memorias, gacha | Contraste. |
| [Kamigame](https://kamigame.jp/jujutsuphanpara/index.html) | JA · JP | Datos de personajes y eventos | Contraste. |

**Hueco detectado:** casi todas las fuentes son de JP. Para Global hacen falta **fuentes oficiales Global** (X/Twitter oficial, avisos dentro del juego, web oficial) para fechas de banners y eventos. Pendiente de confirmar cuáles.

### Proceso de verificación
1. Scripts de extracción (uno por fuente), lanzados a mano o de forma programada → JSON normalizado.
2. Comparador: cruza cada campo entre las fuentes →
   - ✅ **coincide** (≥2 fuentes) → publicable
   - ⚠️ **discrepancia** → cola de revisión (panel admin)
   - ❓ **una sola fuente** → se publica marcado como "sin verificar" o se retiene, según el campo
3. Cada dato guarda: `fuente[]`, `fecha_verificación`, `servidor` (global/jp).
4. Los textos (descripciones de habilidades) se redactan o traducen con estilo propio; los números se cruzan.

---

## 3. Mapa del sitio (MVP → fases)

```
/                         Inicio: banner actual Global, cuenta atrás, novedades
/personajes               Base de datos con filtros (rareza, elemento, rol, Global/JP)
/personajes/[slug]        Ficha: stats, habilidades, auto-skills, prioridad de mejora,
                          memorias recomendadas, equipos, "¿lo tienes?" (cuenta)
/memorias                 Recollection Bits: stats, efectos, filtros
/tier-list                Oficial por elemento/rol + creador drag-and-drop compartible
/equipos                  Equipos recomendados por elemento con sustitutos
/team-builder             Constructor con sinergias (usa tu colección si estás registrado)
/banners                  Calendario Global (y JP como predicción), cuenta atrás
/herramientas/cubos       Calculadora de cubos (se especifica aparte)
/herramientas/tiradas     Planificador de tiradas / pity / gemas
/herramientas/simulador   Simulador de gacha
/codigos                  Códigos activos y caducados
/mi-cuenta                Colección, recursos, importación por capturas
/mi-cuenta/recomendaciones  Qué tirar, en qué gastar, qué equipos puedes montar
```

---

## 4. Cuenta del jugador

> No existe API ni exportación oficial, y usar la API interna del juego incumple sus términos. Por eso hay **dos vías complementarias**, sin pedir nunca el login del juego.

### 4.1 Inventario manual (base, siempre disponible)
- Cuadrícula de **todos los personajes y memorias**; con un toque se marca "lo tengo".
- Por personaje: **nivel, dupes/límite, nivel de habilidades, memorias equipadas** (y lo que haga falta según el juego).
- Por memoria: copias, nivel y límite.
- Recursos: gemas, tickets, **cubos** (por tipo), materiales, monedas.
- Edición en bloque, guardado automático y deshacer.

### 4.2 Importación por capturas (si cumple el listón de precisión)
- El usuario sube capturas de su colección, memorias y recursos.
- Reconocimiento **en el navegador** (gratis y privado):
  - Iconos → *template matching* / embeddings de imagen contra el catálogo de iconos.
  - Números (nivel, dupes, cantidades) → OCR (Tesseract.js) en zonas fijas por resolución.
- **Siempre con pantalla de revisión**: el usuario confirma o corrige antes de guardar.
- **Criterio de éxito:** ≥98 % de aciertos en iconos y ≥95 % en números en un juego de pruebas con capturas reales (varios móviles y resoluciones). Si no lo alcanza, se lanza solo la vía manual y la importación sigue en beta.
- *Necesito:* capturas reales de tu cuenta de cada pantalla (colección, memorias, inventario) para construir y probar el reconocedor.

### 4.3 Motor de recomendaciones
Con la colección del usuario y los datos verificados:
- **Equipos posibles:** los mejores equipos que puede montar ya, con sustitutos de lo que no tiene.
- **Banners:** puntuación de cada banner Global actual o próximo según su cuenta (qué hueco cubre, valor de los dupes, distancia a la pity).
- **Gasto de recursos:** prioridad de cubos, materiales y memorias (qué personaje subir primero).
- Reglas transparentes: cada recomendación explica *por qué*.

---

## 5. Diseño

### Estructura
- **Barra de navegación superior** (no lateral), fija, con **mega-menús interactivos** (vista previa al pasar el ratón, accesos rápidos, buscador global con `Ctrl+K`).
- En móvil: barra inferior con 4–5 accesos + menú completo a pantalla.
- Selector de idioma y servidor (Global/JP) siempre visibles.

### Paleta "Fuga" (inspirada en Sukuna, Fuga)
| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#0B0605` | Fondo (ceniza casi negra) |
| `--surface` | `#160C09` | Tarjetas |
| `--surface-2` | `#22130E` | Menús, hover |
| `--border` | `#3A1F16` | Bordes |
| `--ember` | `#FF5A1F` | Primario: botones, enlaces, activo |
| `--flame` | `#FFB627` | Acento caliente: destacados, SSR |
| `--spark` | `#FFE27A` | Brillos puntuales, focus |
| `--crimson` | `#C8102E` | Sukuna / alertas / limitados |
| `--blood` | `#7A0F1C` | Fondos de acento oscuros |
| `--text` | `#F5E9E0` | Texto principal |
| `--text-2` | `#B89A8A` | Texto secundario |

Efectos: brasas animadas sutiles en el hero, degradado ember→flame en CTAs, "corte" diagonal como recurso gráfico; respeto a `prefers-reduced-motion`.

---

## 6. Stack técnico (todo en plan gratuito)

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **Astro** + islas **React** | Páginas estáticas rapidísimas (SEO) + herramientas interactivas |
| Estilos | Tailwind CSS + tokens propios | Rápido y consistente |
| i18n | Rutas por idioma (`/es/`, `/ja/`…) + hreflang | SEO internacional |
| Datos del juego | JSON versionado en el repo, generado por la pipeline | Auditable, sin coste de BD |
| Cuentas y colección | **Supabase** (Auth + Postgres) | Login con email/Google/Discord, plan free |
| Reconocimiento de capturas | Tesseract.js + matching de iconos en el navegador | Gratis, privado |
| Hosting | **Cloudflare Pages** | Ancho de banda ilimitado gratis |
| Extracción | Scripts Node + GitHub Actions programadas | Gratis |

---

## 7. Fases

| Fase | Contenido |
|---|---|
| **0. Base** | Repo, design system Fuga, navegación superior, i18n, pipeline de datos de la wiki + comparador |
| **1. MVP** | Personajes + fichas, memorias, banners Global, códigos, tier list, equipos |
| **2. Herramientas** | Calculadora de cubos, planificador de tiradas, simulador, team builder |
| **3. Cuenta** | Login, inventario manual, recomendaciones |
| **4. Capturas** | Importación por capturas (beta → estable cuando pase el listón) |
| **5. Extra** | Tier list comunitaria, creadores de contenido, notificaciones de banners |

---

## 8. Pendiente de decidir
- [ ] Nombre del sitio y dominio
- [ ] Fuentes oficiales Global (fechas de banners/eventos)
- [ ] Especificación de la calculadora de cubos
- [ ] Capturas reales para la importación
- [ ] ¿Monetización? (anuncios / Ko-fi / ninguna) — afecta al tratamiento del arte oficial
- [ ] Tier list propia: ¿quién la redacta y con qué criterio?
