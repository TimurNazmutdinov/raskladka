// Режим «Просто, на группу»: вместо списка участников — число человек и «средний участник».
// Приложение создаёт n одинаковых виртуальных участников, поэтому меню, закупки и рюкзаки работают как раньше.
export const defaultSimple = () => ({ on: false, n: 12, weight: 70, height: 172, age: 35, veg: false, noEat: '', notes: '' });

// d: { appetite, shareM, shareF } — значения по умолчанию из параметров. Пол чередуется (М, Ж, М, …) — средний состав.
export function virtualGroup(s, d) {
  const n = Math.max(1, Math.min(60, Math.round(+s.n) || 1)), no = (s.noEat || '').trim();
  return Array.from({ length: n }, (_, i) => {
    const f = i % 2 === 1;
    return { id: 'sim' + i, virtual: true, name: `Участник ${i + 1}`, sex: f ? 'F' : 'M', age: +s.age || 35, height: +s.height || 172, weight: +s.weight || 70, gear: null, appetite: d.appetite, share: f ? d.shareF : d.shareM, allergy: no, veg: !!s.veg, dislike: no };
  });
}

// Дополняет сохранённый поход полями, которых в старых данных нет
export function ensureTrip(t) {
  t.simple = { ...defaultSimple(), ...(t.simple || {}) };
  t.buyers ||= []; t.buyDept ||= {}; t.buyItem ||= {};
  t.prefs ||= {}; if (!('kcalGoal' in t.prefs)) t.prefs.kcalGoal = null; if (t.prefs.restPct == null) t.prefs.restPct = 80;
  return t;
}

// Включает/выключает простой режим. При включении подробная группа запоминается и возвращается при выключении.
export function setSimpleMode(t, on, d) {
  ensureTrip(t);
  if (on) {
    if (t.group.length && !t.group.every(p => p.virtual)) t.detailedGroup = t.group;
    t.simple.on = true; t.group = virtualGroup(t.simple, d);
  } else {
    t.simple.on = false;
    if (t.detailedGroup) { t.group = t.detailedGroup; delete t.detailedGroup; }
  }
  return t;
}
export const rebuildSimple = (t, d) => { if (t.simple.on) t.group = virtualGroup(t.simple, d); return t; };
