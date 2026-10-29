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
  'tm.edit.hint', 'tm.reset', 'tm.options', 'tm.options.hint', 'tm.options.general', 'tm.instead',
  'tb.pick', 'tb.search', 'tb.onlyowned', 'tb.allcolors', 'tb.close', 'tb.unranked',
  // Análisis de tu equipo para una fase (TeamAnalysis)
  'an.title', 'an.content', 'an.content.none', 'an.stage', 'an.power', 'an.power.hint', 'an.v.easy', 'an.v.ok',
  'an.v.tight', 'an.v.hard', 'an.v.nopower', 'an.v.nodata', 'an.ratio', 'an.factor', 'an.reach', 'an.reach.last',
  'an.reach.all', 'an.reach.none', 'an.reach.wall', 'an.reach.gaps', 'an.phases', 'an.swaps', 'an.swaps.own', 'an.swaps.pull', 'an.swaps.general',
  'an.swaps.none', 'an.swap', 'an.swap.empty', 'an.apply', 'an.r.weak', 'an.r.notresist', 'an.r.nocut', 'an.r.aoe',
  'an.r.cleanse', 'an.r.sustain', 'an.r.proven', 'an.r.rank', 'an.plan', 'an.turn.t1', 'an.turn.mid', 'an.turn.break',
  'an.turn.ult', 'an.turn.end', 'an.nohelper', 'an.open', 'an.why', 'pl.t1.buffs', 'pl.t1.nosup', 'pl.taunt',
  'pl.taunt.aoe', 'pl.adds', 'pl.adds.aoe', 'pl.break', 'pl.break.weak', 'pl.break.gate', 'pl.burst', 'pl.burst.any',
  'pl.ult', 'pl.ult.def', 'pl.cleanse', 'pl.cleanse.none', 'pl.sustain', 'pl.regen', 'pl.actions', 'pl.counter',
  'pl.summon', 'pl.immune', 'pl.enrage', 'pl.sub',
] as const satisfies readonly GameKey[];

export const BUILDER_KEYS = [
  ...TEAM_KEYS,
  'tb.fillAccount', 'tb.fillGeneral', 'tb.clear', 'tb.save', 'tb.name', 'tb.team', 'tb.saved',
  'tb.load', 'tb.delete', 'tb.analysis', 'tb.roles', 'tb.avg', 'tb.warn.sup', 'tb.warn.dup', 'tb.warn.resist', 'tb.remove',
  'tb.recs', 'tb.recs.desc', 'tb.copy.hint', 'tb.copy.where',
  'tp.title', 'tp.desc', 'tp.turn', 'tp.turnplus', 'tp.special', 'tp.special.order', 'tp.combo', 'tp.sp', 'tp.noguide', 'tp.guide',
  'ch.normal', 'ch.s1', 'ch.s2', 'ch.ult', 'ch.combo',
] as const satisfies readonly GameKey[];
