# Imágenes de personajes

> Para el flujo completo de actualización de datos, ver [DATOS.md](DATOS.md).

## Qué necesito

**Una imagen por personaje: el arte completo de la carta**, es decir, la ilustración vertical que ves al abrir el personaje en el juego.

| | Recomendado | Mínimo |
|---|---|---|
| Formato | **PNG** (sin pérdida) | JPG en calidad alta |
| Tamaño | La resolución nativa de tu móvil, sin recortar ni redimensionar | 900 px de alto |
| Orientación | Vertical, con el personaje completo | — |
| Contenido | Solo la ilustración: sin botones, menús ni textos encima | — |

Del resto me encargo yo: el script convierte a WebP y genera los tamaños para móvil y escritorio (320, 640, 960 y 1440 px de ancho). La web encuadra la imagen arriba y en vertical (3:4).

### Consejos para las capturas
- Pon la calidad gráfica del juego al máximo antes de capturar.
- Si el juego tiene un modo para ver la ilustración sin interfaz, úsalo.
- Pásalas al ordenador **como archivo original** (cable USB, Google Drive…). WhatsApp y Telegram comprimen las fotos y pierden calidad.
- No hace falta que las recortes: mándalas tal cual y, si algo no encaja, lo ajusto yo.

## Cómo añadirlas
1. Copia las imágenes a la carpeta `assets-src/characters/`.
2. Nómbralas con el **id** de la tabla de abajo, por ejemplo `the-strongest-satoru-gojo.png`. También vale escribirlo a mano: `The Strongest Satoru Gojo.png`.
3. Ejecuta `npm run images`. El script te dirá cuáles ha importado, cuáles tienen poca resolución y cuáles no ha sabido identificar.

Los originales se quedan en tu ordenador: la carpeta `assets-src/` no se sube a git.

## Imágenes de jjkppdb (ya importadas)
El arte HD, los iconos de habilidades y personajes, y las memorias (icono e ilustración) se descargaron una vez de jjkppdb.com:

```
npm run images:fetch   # descarga lenta a assets-src/jjkppdb/ (salta lo ya descargado)
npm run images         # convierte a WebP y genera los manifiestos
```

- Tus capturas en `assets-src/characters/` **siempre tienen prioridad** sobre las de jjkppdb.
- El arte de jjkppdb se asocia por los iconos de habilidad, porque sus epítetos están traducidos de otra forma. Cuatro casos se resolvieron a mano en `scripts/images/import.mjs`.
- Al salir personajes nuevos, basta con volver a ejecutar los dos comandos.
- Pendiente: 48 memorias recomendadas cuyo nombre en la wiki no coincide con el de jjkppdb. Se cuadrarán en la fase de memorias.

## Lista de personajes

111 personajes.

| Personaje | Epíteto | Rareza | id (nombre del archivo) |
|---|---|---|---|
| Aoi Todo | Are you satisfied with that? | SSR | `are-you-satisfied-with-that-aoi-todo` |
| Aoi Todo | Blast From The Past | SSR | `blast-from-the-past-aoi-todo` |
| Aoi Todo | Reckless Grade 1 | SR | `reckless-grade-1-aoi-todo` |
| Aoi Todo | With Takada-Chan | SSR | `with-takada-chan-aoi-todo` |
| Atsuya Kusakabe | Cold Light of Dusk | SSR | `cold-light-of-dusk-atsuya-kusakabe` |
| Atsuya Kusakabe | Ward off with Sharp Blade | SSR | `ward-off-with-sharp-blade-atsuya-kusakabe` |
| Choso | Fulfilling His Duty as the Older Brother | SSR | `fulfilling-his-duty-as-the-older-brother-choso` |
| Dagon | Unlimited Shikigami | SSR | `unlimited-shikigami-dagon` |
| Eiji Urushi | Chain Mark: Full Throttle | SSR | `chain-mark-full-throttle-eiji-urushi` |
| Hanami | The Thrill Of The Fight | SSR | `the-thrill-of-the-fight-hanami` |
| Jogo | Meteor of Fierceness | SSR | `meteor-of-fierceness-jogo` |
| Jogo | Pride Of A Cursed Spirit | SSR | `pride-of-a-cursed-spirit-jogo` |
| Junpei Yoshino | Value Of Life | SR | `value-of-life-junpei-yoshino` |
| Junpei Yoshino | Young Fish And Reverse Punishment | SSR | `young-fish-and-reverse-punishment-junpei-yoshino` |
| Kaito Yuki | Cursed Technique Boost | R | `cursed-technique-boost-kaito-yuki` |
| Kaito Yuki | With That Will In Mind | SSR | `with-that-will-in-mind-kaito-yuki` |
| Kaito Yuuki | The Resolve Of Being A Sorcerer | SR | `the-resolve-of-being-a-sorcerer-kaito-yuuki` |
| Kasumi Miwa | Determined Counter | SR | `determined-counter-kasumi-miwa` |
| Kasumi Miwa | Sprinting | SSR | `sprinting-kasumi-miwa` |
| Kasumi Miwa | Zanshin | SSR | `zanshin-kasumi-miwa` |
| Kento Nanami | Ex-Office Worker Turned Jujutsu Sorcerer | SR | `ex-office-worker-turned-jujutsu-sorcerer-kento-nanami` |
| Kento Nanami | First-Grade Sorcerer's Skill | SSR | `first-grade-sorcerers-skill-kento-nanami` |
| Kento Nanami | Promising New Student | SSR | `promising-new-student-kento-nanami` |
| Kento Nanami | Ratio Technique | SSR | `ratio-technique-kento-nanami` |
| Kento Nanami | Silent Suppression | SSR | `silent-suppression-kento-nanami` |
| Kento Nanami | Working Overtime | SSR | `working-overtime-kento-nanami` |
| Kiyotaka Ijichi | Background Support | R | `background-support-kiyotaka-ijichi` |
| Kiyotaka Ijichi | Pick Up After Hard Work | SSR | `pick-up-after-hard-work-kiyotaka-ijichi` |
| Kokichi Muta | I've Seen It All | SSR | `ive-seen-it-all-kokichi-muta` |
| Mahito | Inspiration From “Death” | SSR | `inspiration-from-death-mahito` |
| Mahito | Unbridled Soul | SSR | `unbridled-soul-mahito` |
| Mai Zen'in | A Clever Bullet | SR | `a-clever-bullet-mai-zenin` |
| Mai Zen'in | Effective Range | SSR | `effective-range-mai-zenin` |
| Mai Zen'in | The Final Bullet | SSR | `the-final-bullet-mai-zenin` |
| Maki Zen'in | Early Morning Departure | SSR | `early-morning-departure-maki-zenin` |
| Maki Zen'in | Innate Talent | R | `innate-talent-maki-zenin` |
| Maki Zen'in | Longsword Battle | SSR | `longsword-battle-maki-zenin` |
| Maki Zen'in | Maverick Outcast | SSR | `maverick-outcast-maki-zenin` |
| Maki Zen'in | Team Up If They Are Weak | SR | `team-up-if-they-are-weak-maki-zenin` |
| Masamichi Yaga | Ariadne's Thread Educator | SR | `ariadnes-thread-educator-masamichi-yaga` |
| Masamichi Yaga | Cursed Corpse Battle | SSR | `cursed-corpse-battle-masamichi-yaga` |
| Masamichi Yaga | Pivotal Guardian | SSR | `pivotal-guardian-masamichi-yaga` |
| Megumi Fushiguro | Bond of Friendship | SSR | `bond-of-friendship-megumi-fushiguro` |
| Megumi Fushiguro | Enjoying The Cool Summer Breeze | SSR | `enjoying-the-cool-summer-breeze-megumi-fushiguro` |
| Megumi Fushiguro | Incomplete Domain | SSR | `incomplete-domain-megumi-fushiguro` |
| Megumi Fushiguro | Inherited Cursed Technique | SSR | `inherited-cursed-technique-megumi-fushiguro` |
| Megumi Fushiguro | Rabbit's Disruption | SSR | `rabbits-disruption-megumi-fushiguro` |
| Megumi Fushiguro | Unfair Salvation | R | `unfair-salvation-megumi-fushiguro` |
| Mei Mei | Dance of the Beautiful Blades | SSR | `dance-of-the-beautiful-blades-mei-mei` |
| Mei Mei | Night Of Dancing Crows | SSR | `night-of-dancing-crows-mei-mei` |
| Miguel | Delayed Quota | SSR | `delayed-quota-miguel` |
| Momo Nishimiya | Aerial Reconnaissance | SR | `aerial-reconnaissance-momo-nishimiya` |
| Momo Nishimiya | Don't Look Down On Me | SSR | `dont-look-down-on-me-momo-nishimiya` |
| Momo Nishimiya | Tool Manipulation | SSR | `tool-manipulation-momo-nishimiya` |
| Naobito Zen'in | Crushed With Speed | SSR | `crushed-with-speed-naobito-zenin` |
| Nobara Kugisaki | A Bad Match | SSR | `a-bad-match-nobara-kugisaki` |
| Nobara Kugisaki | Girl Of Steel | SSR | `girl-of-steel-nobara-kugisaki` |
| Nobara Kugisaki | Keep Hammering At Them | SSR | `keep-hammering-at-them-nobara-kugisaki` |
| Nobara Kugisaki | Striking Eternal Summer | SSR | `striking-eternal-summer-nobara-kugisaki` |
| Nobara Kugisaki | To Stay True To Myself | R | `to-stay-true-to-myself-nobara-kugisaki` |
| Noritoshi Kamo | Blood Borne Resolve | SSR | `blood-borne-resolve-noritoshi-kamo` |
| Noritoshi Kamo | Blood of the Big Three Families | SR | `blood-of-the-big-three-families-noritoshi-kamo` |
| Noritoshi Kamo | The Golden Age of Jujutsu | SSR | `the-golden-age-of-jujutsu-noritoshi-kamo` |
| Panda | Don't Underestimate A Puppet | SSR | `dont-underestimate-a-puppet-panda` |
| Panda | Need Some Help? | SSR | `need-some-help-panda` |
| Panda | Panda Is Not A Panda | R | `panda-is-not-a-panda-panda` |
| Panda | Take The Shortest Way | SR | `take-the-shortest-way-panda` |
| Ryomen Sukuna | Battle of firepower | SSR | `battle-of-firepower-ryomen-sukuna` |
| Ryomen Sukuna | Genuine Jujutsu | SSR | `genuine-jujutsu-ryomen-sukuna` |
| Saki Rindo | Cursed Energy Catastrophe | R | `cursed-energy-catastrophe-saki-rindo` |
| Saki Rindo | Heart's Resolve | SSR | `hearts-resolve-saki-rindo` |
| Saki Rindo | Just Bring It | SR | `just-bring-it-saki-rindo` |
| Satoru Gojo | 0.2-Second Domain Expansion | SSR | `02-second-domain-expansion-satoru-gojo` |
| Satoru Gojo | Awakening | SSR | `awakening-satoru-gojo` |
| Satoru Gojo | Hollow Purple | SSR | `hollow-purple-satoru-gojo` |
| Satoru Gojo | Melting Sweet Summer Treats | SSR | `melting-sweet-summer-treats-satoru-gojo` |
| Satoru Gojo | The Strongest | SSR | `the-strongest-satoru-gojo` |
| Satoru Gojo | The Strongest Blue | SSR | `the-strongest-blue-satoru-gojo` |
| Satoru Gojo | Within Infinity | SSR | `within-infinity-satoru-gojo` |
| Shoko Ieiri | "Fwoo Hyoi" | SSR | `fwoo-hyoi-shoko-ieiri` |
| Shoko Ieiri | Life Saver | SSR | `life-saver-shoko-ieiri` |
| Shoko Ieiri | Reverse Cursed Technique | SR | `reverse-cursed-technique-shoko-ieiri` |
| Suguru Geto | This Is Justice | SSR | `this-is-justice-suguru-geto` |
| Suguru Geto | To Protect Non-Sorcerers | SSR | `to-protect-non-sorcerers-suguru-geto` |
| Suguru Geto | What Lies at the End | SSR | `what-lies-at-the-end-suguru-geto` |
| Takuma Ino | Indomitable Auspicious Beasts | SSR | `indomitable-auspicious-beasts-takuma-ino` |
| Takuma Ino | No Conceit | SSR | `no-conceit-takuma-ino` |
| Toge Inumaki | Cursed Power of Words | R | `cursed-power-of-words-toge-inumaki` |
| Toge Inumaki | Night-Lurking Sorcerer | SSR | `night-lurking-sorcerer-toge-inumaki` |
| Toge Inumaki | Resolved Cursed Speech | SSR | `resolved-cursed-speech-toge-inumaki` |
| Toge Inumaki | Shatter To Pieces | SSR | `shatter-to-pieces-toge-inumaki` |
| Toge Inumaki | The Baton Of Counterattack | SR | `the-baton-of-counterattack-toge-inumaki` |
| Toji Fushiguro | Seance | SSR | `seance-toji-fushiguro` |
| Toji Fushiguro | The Sorcerer Killer | SSR | `the-sorcerer-killer-toji-fushiguro` |
| Ultimate Mechamaru | Mode: Albatross | SR | `mode-albatross-ultimate-mechamaru` |
| Ultimate Mechamaru | Sword Option | SSR | `sword-option-ultimate-mechamaru` |
| Uraume | Step back, third-rate | SSR | `step-back-third-rate-uraume` |
| Yoshinobu Gakuganji | Crafty Rock | SSR | `crafty-rock-yoshinobu-gakuganji` |
| Yoshinobu Gakuganji | Cursed Energy Melody | SR | `cursed-energy-melody-yoshinobu-gakuganji` |
| Yu Haibara | Burning Passion | SSR | `burning-passion-yu-haibara` |
| Yuji Itadori | A Life Entrusted to Me | SSR | `a-life-entrusted-to-me-yuji-itadori` |
| Yuji Itadori | Infuse Your Cursed Energy | SSR | `infuse-your-cursed-energy-yuji-itadori` |
| Yuji Itadori | Maximum Cursed Energy Output | SSR | `maximum-cursed-energy-output-yuji-itadori` |
| Yuji Itadori | Nimble Body | SSR | `nimble-body-yuji-itadori` |
| Yuji Itadori | Smash It Into the Summer Sky | SSR | `smash-it-into-the-summer-sky-yuji-itadori` |
| Yuji Itadori | Sukuna’s Vessel | R | `sukunas-vessel-yuji-itadori` |
| Yuji Itadori | Zone | SSR | `zone-yuji-itadori` |
| Yuta Okkotsu | Executioner | SSR | `executioner-yuta-okkotsu` |
| Yuta Okkotsu | Lend Me Your Power | SSR | `lend-me-your-power-yuta-okkotsu` |
| Yuta Okkotsu | Queen of Curses | SSR | `queen-of-curses-yuta-okkotsu` |
| Yuuji Itadori | Cursed Energy Flashes Black | SSR | `cursed-energy-flashes-black-yuuji-itadori` |
