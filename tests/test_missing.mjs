import { missing } from '../src/tripdays.js';
import * as E from '../src/engine.js';
import { PARAMS } from '../src/defaults.js';
import { defaultSimple, virtualGroup } from '../src/simple.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };

const days = [{ type: 'Ходовой' }, { type: 'Ходовой' }];
const mk = goal => ({ days: days.map(d => ({ ...d })), plan: {}, prefs: { mode: 'std', kcalGoal: goal, restPct: 80 }, gear: {}, drops: [], food: {}, group: virtualGroup({ ...defaultSimple(), n: 4 }, { appetite: 1, shareM: 1, shareF: 0.8 }) });

const m0 = missing(mk(null));
ok('без цели: просят дату, км, набор, сброс, часы, температуры', m0.length === 3 && m0[0] === 'дата начала' && /км, набор, сброс, часы, температура днём, температура ночью/.test(m0[1]));
ok('с целью по калориям: ничего не требуется', missing(mk(2500)).length === 0);
ok('цель 0 = не задана', missing(mk(0)).length === 3);
ok('без дней просят задать дни даже с целью', missing({ days: [], prefs: { kcalGoal: 2500 } }).length === 1);

const t = mk(2500), r = E.computeTrip(t, P);
ok('расчёт идёт без данных по дням', !!r.summary && Math.abs(r.days[0].target / 4 - 2500) < 1e-6);
ok('без данных о нагрузке предупреждения о покрытии нет', !r.warnings.some(w => /покрытие/.test(w)));

// простой выезд: нужны только дни
{
  const s = { simple: { on: true }, days: [{ type: 'Ходовой' }], plan: {}, prefs: {} };
  ok('простой выезд: с днями ничего не требуется', missing(s).length === 0);
  ok('простой выезд: без дней просят указать число дней', missing({ ...s, days: [] }).length === 1 && /число дней/.test(missing({ ...s, days: [] })[0]));
}
