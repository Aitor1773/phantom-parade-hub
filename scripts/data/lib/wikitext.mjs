// Utilidades mínimas para leer plantillas de MediaWiki ({{Nombre|clave=valor|…}}).

/** Encuentra todas las plantillas de nivel superior cuyo nombre está en `names`. */
export function findTemplates(wikitext, names) {
  const wanted = new Set(names.map(normName));
  const out = [];
  let i = 0;
  while ((i = wikitext.indexOf('{{', i)) !== -1) {
    const end = matchBraces(wikitext, i);
    if (end === -1) break;
    const inner = wikitext.slice(i + 2, end - 2);
    const parts = splitTopLevel(inner);
    const name = normName(parts[0] ?? '');
    if (wanted.has(name)) out.push({ name: parts[0].trim(), params: toParams(parts.slice(1)) });
    i = end;
  }
  return out;
}

function normName(s) {
  return s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Devuelve el índice justo después del "}}" que cierra el "{{" en `start`. */
function matchBraces(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; }
    else if (text[i] === '}' && text[i + 1] === '}') { depth--; i++; if (depth === 0) return i + 1; }
  }
  return -1;
}

/** Divide por "|" ignorando los que están dentro de {{…}} o [[…]]. */
function splitTopLevel(inner) {
  const parts = [];
  let depthT = 0, depthL = 0, cur = '';
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === '{{') { depthT++; cur += two; i++; continue; }
    if (two === '}}') { depthT--; cur += two; i++; continue; }
    if (two === '[[') { depthL++; cur += two; i++; continue; }
    if (two === ']]') { depthL--; cur += two; i++; continue; }
    if (inner[i] === '|' && depthT === 0 && depthL === 0) { parts.push(cur); cur = ''; continue; }
    cur += inner[i];
  }
  parts.push(cur);
  return parts;
}

function toParams(parts) {
  const params = {};
  let pos = 1;
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) params[String(pos++)] = p.trim();
    else params[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
  }
  return params;
}

/** Convierte wikitext de un campo a texto plano con saltos de línea. */
export function toPlain(value) {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
