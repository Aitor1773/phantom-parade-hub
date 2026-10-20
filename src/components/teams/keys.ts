// Textos que necesitan las islas de equipos (se pasan ya traducidos desde cada página).
import type { GameKey } from '@/i18n/game';

export const TEAM_KEYS = [
  'tm.account', 'tm.general', 'tm.main', 'tm.sub', 'tm.helper', 'tm.dmg', 'tm.sup', 'tm.weak', 'tm.resist', 'tm.empty',
  'tm.affinity', 'tm.affinity.hint', 'tm.affinity.saved', 'tm.affinity.saved.nodate', 'tm.affinity.none',
  'tm.noinv', 'tm.missing', 'tm.goaccount', 'tm.loading', 'tm.why', 'tm.why.text', 'tm.dealers', 'tm.dealers1', 'tm.dealers2', 'tm.floor',
  'el.red', 'el.blue', 'el.green', 'el.yellow', 'tm.memory', 'tm.nomem',
  'ta.ready', 'ta.ready.hint', 'ta.todo', 'ta.todo.none', 'ta.pulls', 'ta.level', 'ta.skills', 'ta.sp', 'ta.dupes', 'ta.memory', 'ta.missing',
  'ta.hint.data', 'ta.why', 'tm.affinity.community', 'tb.copy', 'tb.copied', 'tb.strategy',
  'sh.title', 'sh.none', 'sh.phase', 'sh.power', 'sh.weak', 'sh.resist', 'sh.rules', 'sh.boss', 'sh.wave', 'sh.cut', 'sh.taunt',
  'sh.cutpick', 'sh.cutpick.hint', 'sh.kind.aoe', 'sh.kind.single', 'sh.kind.debuff', 'sh.kind.buff', 'sh.kind.heal', 'sh.kind.taunt',
  'sh.kind.summon', 'sh.kind.counter', 'sh.kind.enrage', 'sh.kind.other',
  'sh.actions', 'sh.ult', 'sh.immune', 'sh.updated', 'pv.cleared', 'pv.farm', 'pv.recommended', 'pv.guide', 'pv.picks', 'sh.st.stun', 'sh.st.confusion', 'sh.st.blind', 'sh.st.bind', 'sh.st.poison', 'sh.st.burn',
  'sh.st.bleed', 'sh.st.seal', 'sh.st.silence',
  'st.title', 'st.type.taijutsu', 'st.type.jujutsu', 'st.type.mixed', 'st.only', 'st.banned', 'st.note', 'st.cut.warn', 'st.cut.ok',
  'st.weak', 'st.weak.none', 'st.resist', 'st.aoe', 'st.aoe.none', 'st.taunt', 'st.debuff', 'st.debuff.none', 'st.sustain',
  'st.sustain.none', 'st.counter', 'st.summon', 'st.enrage', 'st.order', 'st.break', 'st.coop', 'st.why',
] as const satisfies readonly GameKey[];

export const BUILDER_KEYS = [
  ...TEAM_KEYS,
  'tb.pick', 'tb.search', 'tb.onlyowned', 'tb.allcolors', 'tb.fillAccount', 'tb.fillGeneral', 'tb.clear', 'tb.save', 'tb.name', 'tb.team', 'tb.saved',
  'tb.load', 'tb.delete', 'tb.analysis', 'tb.roles', 'tb.avg', 'tb.warn.sup', 'tb.warn.dup', 'tb.warn.resist', 'tb.remove', 'tb.unranked',
  'tb.close', 'tb.recs', 'tb.recs.desc', 'tb.copy.hint', 'tb.copy.where',
] as const satisfies readonly GameKey[];
