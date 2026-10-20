#!/usr/bin/env node
// Lee el foro de la comunidad (GitHub Discussions que usa Giscus) y genera data/community.json:
//   · equipos publicados con la línea "pp-team:" (del botón "Copiar mi equipo"), con sus votos 👍
//   · debilidades/resistencias que confirman varios usuarios ("pp-affinity:"), por contenido y piso
// Todo lo publicado es dato de usuarios: solo se aceptan ids que existen en la base de datos
// y nunca se ejecuta ni se copia otra cosa que esas líneas.
//
// Uso: GITHUB_TOKEN=… npm run data:community   (en GitHub Actions el token ya existe)

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'community.json');
const MIN_REPORTS = 3; // usuarios distintos que tienen que coincidir
const MIN_AGREE = 0.7; // proporción mínima de acuerdo
const ELEMENTS = new Set(['red', 'blue', 'green', 'yellow']);

const site = await readFile(join(ROOT, 'src', 'config', 'site.ts'), 'utf8');
const conf = (k) => site.match(new RegExp(`${k}:\\s*'([^']*)'`))?.[1] ?? '';
const repo = process.env.GISCUS_REPO || conf('repo');
const categoryId = process.env.GISCUS_CATEGORY_ID || conf('categoryId');
const token = process.env.GITHUB_TOKEN;

const empty = { _comment: 'Generado por npm run data:community a partir del foro (Giscus). No editar a mano.', updatedAt: null, repo: null, threads: {} };
if (!repo || !categoryId || !token) {
  console.log('Foro sin configurar o sin GITHUB_TOKEN: se deja data/community.json como está.');
  if (!existsSync(OUT)) await writeFile(OUT, JSON.stringify(empty, null, 2) + '\n', 'utf8');
  process.exit(0);
}

const charIds = new Set(JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'characters.json'), 'utf8')).items.map((c) => c.id));
const memIds = new Set(JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'memories.json'), 'utf8')).items.map((m) => m.id));
const [owner, name] = repo.split('/');

const QUERY = `query($owner:String!,$name:String!,$cat:ID!,$after:String){
  repository(owner:$owner,name:$name){
    discussions(first:50, after:$after, categoryId:$cat){
      pageInfo{ hasNextPage endCursor }
      nodes{ title url comments(first:100){ nodes{ body url createdAt author{ login } reactions(content:THUMBS_UP){ totalCount } } } }
    }
  }
}`;
async function gql(variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'PhantomParadeHub-community' },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.repository.discussions;
}

const id = (x) => (x && x !== '-' ? x : null);
function parse(body) {
  const t = body.match(/pp-team:\s*main=(\S+)\s+sub=(\S+)\s+helper=(\S+)(?:\s+mem=(\S+))?/);
  const team = t && {
    main: t[1].split(',').slice(0, 4).map(id).map((x) => (x && charIds.has(x) ? x : null)),
    sub: charIds.has(t[2]) ? t[2] : null,
    helper: charIds.has(t[3]) ? t[3] : null,
    mems: (t[4] ?? '').split(',').slice(0, 5).map(id).map((x) => (x && memIds.has(x) ? x : null)),
  };
  const a = body.match(/pp-affinity:\s*([^\n`]+)/);
  const affinity = {};
  for (const [, el, v] of (a?.[1] ?? '').matchAll(/(\w+)=(weak|resist)/g)) if (ELEMENTS.has(el)) affinity[el] = v;
  const f = Number(body.match(/pp-floor:\s*(\d{1,3})/)?.[1]);
  return { team: team && team.main.some(Boolean) ? team : null, affinity, floor: Number.isFinite(f) && f > 0 ? f : null };
}

const threads = {};
let after = null, total = 0;
do {
  const page = await gql({ owner, name, cat: categoryId, after });
  for (const d of page.nodes) {
    const term = d.title.trim(); // Giscus "specific": el título es el id del contenido
    if (!/^[a-z0-9-]{3,120}$/.test(term)) continue;
    const th = (threads[term] ??= { url: d.url, comments: 0, teams: [], reports: {} });
    for (const c of d.comments.nodes) {
      th.comments++;
      total++;
      const p = parse(c.body ?? '');
      const author = c.author?.login ?? 'anon';
      if (p.team) th.teams.push({ ...p.team, floor: p.floor, votes: c.reactions.totalCount, author, url: c.url, date: c.createdAt.slice(0, 10) });
      if (Object.keys(p.affinity).length) {
        const key = p.floor ? `${term}/${p.floor}` : term;
        // Un voto por usuario y clave (cuenta el último que publicó)
        (th.reports[key] ??= {})[author] = p.affinity;
      }
    }
  }
  after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (after);

// Consenso de debilidades: suficientes usuarios y suficiente acuerdo por elemento
for (const th of Object.values(threads)) {
  th.teams.sort((a, b) => b.votes - a.votes || b.date.localeCompare(a.date));
  th.teams = th.teams.slice(0, 20);
  th.affinity = {};
  for (const [key, byUser] of Object.entries(th.reports)) {
    const votes = Object.values(byUser);
    const out = { weak: [], resist: [], reports: votes.length };
    for (const el of ELEMENTS) {
      const said = votes.map((v) => v[el]).filter(Boolean);
      if (said.length < MIN_REPORTS) continue;
      for (const kind of ['weak', 'resist']) if (said.filter((x) => x === kind).length / said.length >= MIN_AGREE) out[kind].push(el);
    }
    if (out.weak.length || out.resist.length) th.affinity[key] = out;
  }
  delete th.reports;
}

await writeFile(OUT, JSON.stringify({ ...empty, updatedAt: new Date().toISOString(), repo, threads }, null, 2) + '\n', 'utf8');
console.log(`Foro: ${Object.keys(threads).length} hilos, ${total} mensajes, ${Object.values(threads).reduce((a, t) => a + t.teams.length, 0)} equipos, ${Object.values(threads).reduce((a, t) => a + Object.keys(t.affinity).length, 0)} debilidades con consenso.`);
