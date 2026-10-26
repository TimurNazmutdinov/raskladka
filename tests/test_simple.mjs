import * as E from '../src/engine.js';
import { PARAMS } from '../src/defaults.js';
import { defaultSimple, virtualGroup, ensureTrip, setSimpleMode, rebuildSimple } from '../src/simple.js';
import { allowed } from '../src/menu.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const D = { appetite: 1, shareM: 1, shareF: 0.8 };

const g = virtualGroup({ ...defaultSimple(), n: 12, veg: true, noEat: 'орехи' }, D);
ok('12 виртуальных участников', g.length === 12 && g.every(p => p.virtual && p.weight === 70 && p.height === 172 && p.age === 35));
ok('пол чередуется', g[0].sex === 'M' && g[1].sex === 'F' && g.filter(p => p.sex === 'F').length === 6);
ok('доля груза по полу', g[0].share === 1 && g[1].share === 0.8);
ok('вегетарианцы и «не едят» попадают в группу', g.every(p => p.veg && p.allergy === 'орехи' && p.dislike === 'орехи'));
ok('мясо не разрешено вегетарианцам', !allowed({ name: 'Тушёнка', tags: 'meat' }, g) && allowed({ name: 'Гречка', tags: '' }, g));
ok('«не едят» исключает продукт', !allowed({ name: 'Грецкие орехи', tags: '' }, g));
ok('границы числа человек', virtualGroup({ ...defaultSimple(), n: 0 }, D).length === 1 && virtualGroup({ ...defaultSimple(), n: 500 }, D).length === 60);

const old = [{ id: 'a', name: 'Аня', sex: 'F', age: 30, height: 165, weight: 55 }];
const t = ensureTrip({ group: old, days: [], prefs: {} });
ok('старые данные дополняются', t.simple.n === 12 && t.prefs.kcalGoal === null && t.prefs.restPct === 80);
setSimpleMode(t, true, D);
ok('вкл: подробная группа запомнена', t.simple.on && t.group.length === 12 && t.detailedGroup === old);
t.simple.n = 5; rebuildSimple(t, D);
ok('смена числа человек', t.group.length === 5);
setSimpleMode(t, false, D);
ok('выкл: подробная группа возвращена', !t.simple.on && t.group === old && !t.detailedGroup);

// цель по калориям
const days = [{ type: 'Ходовой', km: 15, up: 800, down: 300, hours: 7, cover: 'trail', maxAlt: 1500, tday: 15, tnight: 5 }, { type: 'Днёвка', maxAlt: 1500 }];
const trip = ensureTrip({ group: virtualGroup({ ...defaultSimple(), n: 4 }, D), days, gear: { common: 10 }, drops: [], food: {}, prefs: { mode: 'std', kcalGoal: 2500, restPct: 80 } });
const r = E.computeTrip(trip, P);
ok('цель на ходовой день = 2500 на человека', Math.abs(r.days[0].target / 4 - 2500) < 1e-6);
ok('днёвка = 80% цели', Math.abs(r.days[1].target / 4 - 2000) < 1e-6);
trip.prefs.kcalGoal = null;
const r2 = E.computeTrip(trip, P);
ok('без цели считается по нагрузке', r2.days[0].target / 4 !== 2500 && r2.days[0].cover > 0);
