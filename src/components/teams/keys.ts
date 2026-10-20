// Textos que necesitan las islas de equipos (se pasan ya traducidos desde cada página).
import type { GameKey } from '@/i18n/game';

export const TEAM_KEYS = [
  'tm.account', 'tm.general', 'tm.main', 'tm.sub', 'tm.helper', 'tm.dmg', 'tm.sup', 'tm.weak', 'tm.resist', 'tm.empty',
  'tm.affinity', 'tm.affinity.hint', 'tm.affinity.saved', 'tm.affinity.saved.nodate', 'tm.affinity.none',
  'tm.noinv', 'tm.missing', 'tm.goaccount', 'tm.loading', 'tm.why', 'tm.why.text', 'tm.dealers', 'tm.dealers1', 'tm.dealers2', 'tm.floor',
  'el.red', 'el.blue', 'el.green', 'el.yellow', 'tm.memory', 'tm.nomem',
  'ta.ready', 'ta.ready.hint', 'ta.todo', 'ta.todo.none', 'ta.pulls', 'ta.level', 'ta.skills', 'ta.sp', 'ta.dupes', 'ta.memory', 'ta.missing',
  'ta.hint.data', 'ta.why', 'tm.affinity.community', 'tb.copy', 'tb.copied', 'tb.strategy',
] as const satisfies readonly GameKey[];

export const BUILDER_KEYS = [
  ...TEAM_KEYS,
  'tb.pick', 'tb.search', 'tb.onlyowned', 'tb.fillAccount', 'tb.fillGeneral', 'tb.clear', 'tb.save', 'tb.name', 'tb.team', 'tb.saved',
  'tb.load', 'tb.delete', 'tb.analysis', 'tb.roles', 'tb.avg', 'tb.warn.sup', 'tb.warn.dup', 'tb.warn.resist', 'tb.remove', 'tb.unranked',
  'tb.close', 'tb.recs', 'tb.recs.desc', 'tb.copy.hint', 'tb.copy.where',
] as const satisfies readonly GameKey[];
