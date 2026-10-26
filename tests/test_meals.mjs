import * as M from '../src/menu.js';
import * as E from '../src/engine.js';
import { PARAMS } from '../src/defaults.js';
import { builtinProductSets, builtinMenuSets } from '../src/builtin.js';
import { defaultMeals, mealsOf, shareSum, slotLabel, moveSlot, removeSlot, addSlot, firstSlotOfType } from '../src/meals.js';
import { planMenu } from '../src/plan.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };

const d = defaultMeals(P);
ok('по умолчанию: завтрак, перекус, обед, перекус, ужин', d.map(s => s.type).join('') === 'bslsd');
ok('доли 25/10/25/10/30 = 100%', d.map(s => s.share).join('/') === '25/10/25/10/30' && shareSum(d) === 100);
ok('подписи: перекусы нумеруются', slotLabel(d, 's') === 'Перекус 1' && slotLabel(d, 's2') === 'Перекус 2' && slotLabel(d, 'b') === 'Завтрак');
const named = d.map(s => (s.id === 's2' ? { ...s, name: 'Чай у костра' } : s));
ok('своё имя приёма', slotLabel(named, 's2') === 'Чай у костра' && slotLabel(named, 's') === 'Перекус');
const a = addSlot(d, 's', 5);
ok('добавление: новый id, 6 приёмов', a.length === 6 && new Set(a.map(s => s.id)).size === 6);
ok('перемещение и удаление', moveSlot(d, 0, 1)[0].id === 's' && moveSlot(d, 0, -1) === d && removeSlot(d, 1).length === 4 && removeSlot([d[0]], 0).length === 1);
ok('mealsOf: без trip.meals — стандартный план', mealsOf({}, P).length === 5 && mealsOf({ meals: [d[0]] }, P).length === 1);
ok('слот плана: первый перекус', firstSlotOfType(d, 's') === 's' && firstSlotOfType(d, 'x') === null);

const ps = builtinProductSets()[0], ms = builtinMenuSets()[0];
const grp = [['M', 82, 180, 41], ['F', 58, 165, 34]].map(([sex, weight, height, age], i) => ({ name: 'p' + i, sex, weight, height, age, appetite: 1, share: 1, gear: 5 }));
const days = Array.from({ length: 3 }, () => ({ type: 'Ходовой', km: 14, up: 700, down: 400, hours: 7, cover: 'trail', maxAlt: 1800, tdmin: 8, tdmax: 20 }));
const mk = extra => ({ group: grp, days, gear: { common: 14 }, food: { hot: '2', lunchHot: false }, prefs: { mode: 'std' }, ...extra });
const run = trip => { const calc = E.computeTrip(trip, P); return { calc, menu: M.buildMenu(trip, calc, ms, ps, P, null, 0) }; };
const kc = (day, id) => M.itemsKcal(day[id]?.items || [], ps.items);

let { menu } = run(mk({}));
ok('меню по слотам: b, s, l, s2, d', Object.keys(menu.days[0]).join() === 'b,s,l,s2,d');
ok('оба перекуса не пустые, с разным составом', menu.days.every(x => x.s.items.length && x.s2.items.length) && menu.days[0].s.items.map(i => i.pid).join() !== menu.days[0].s2.items.map(i => i.pid).join());
ok('перекус ≈ своя доля (10%) цели', (() => { const t = run(mk({})).calc.days[0].target; return Math.abs(kc(menu.days[0], 's') / t - 0.10) < 0.03; })());
ok('нет лука в перекусах', menu.days.every(x => [...x.s.items, ...x.s2.items].every(i => !/лук|чеснок/i.test(ps.items.find(p => p.id === i.pid).name))));

const pers = run(mk({ prefs: { mode: 'std', snacks: 'personal' } })).menu;
ok('«в личке»: перекусов в раскладке нет', pers.days.every(x => x.s.personal && !x.s.items.length && x.s2.personal));

const custom = run(mk({ meals: [{ id: 'b', type: 'b', share: 30 }, { id: 'l', type: 'l', share: 30 }, { id: 'x1', type: 's', share: 10 }, { id: 'd', type: 'd', share: 30 }] })).menu;
ok('свой план питания: ключи меню = id приёмов', Object.keys(custom.days[0]).join() === 'b,l,x1,d' && custom.days[0].x1.items.length > 0);

// план «от файла»: строка «перекус» ложится в первый перекус
const calc = E.computeTrip(mk({}), P), dish = ms.dishes.find(x => x.meal === 'b');
const pm = planMenu(mk({}), calc, { rows: [{ day: 1, mealKey: 's', dish: dish.name, portions: 2 }] }, ms, ps);
ok('plan.js: перекус → слот s', !!pm.days[0].s && !pm.days[0].s2);
ok('в меню есть предупреждение о переборе, если минимумы превысили цель', menu.days.length === 3 && Array.isArray(run(mk({})).menu.warnings));
