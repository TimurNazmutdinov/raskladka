// Диагностика меню: вода в блюде не мешает готовить, недостающие продукты и недобор объясняются в предупреждениях.
import * as M from '../src/menu.js';
import * as E from '../src/engine.js';
import { PARAMS } from '../src/defaults.js';
import { builtinProductSets, builtinMenuSets } from '../src/builtin.js';
import { defaultSimple, virtualGroup } from '../src/simple.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const D = { appetite: 1, shareM: 1, shareF: 0.8 };
const mkTrip = goal => ({ group: virtualGroup({ ...defaultSimple(), n: 4 }, D), days: [{ type: 'Ходовой' }, { type: 'Ходовой' }], gear: {}, drops: [], food: { hot: '2' }, prefs: { mode: 'std', kcalGoal: goal, restPct: 80 } });
const run = (trip, ms, ps) => { const calc = E.computeTrip(trip, P); return { calc, menu: M.buildMenu(trip, calc, ms, ps, P, null, 0) }; };

ok('isWater', M.isWater('Вода техническая') && M.isWater('вода питьевая') && M.isWater('Вода') && !M.isWater('Водка') && !M.isWater('Молоко'));

const ps = builtinProductSets()[0], ms = builtinMenuSets()[0];
// блюдо с водой, которой нет в наборе продуктов, по-прежнему готовится
const withWater = { ...ms, dishes: ms.dishes.map(d => (d.meal === 'b' ? { ...d, ing: [{ name: 'Вода техническая', g: 300, min: 200, max: 400 }, ...d.ing] } : d)) };
const a = run(mkTrip(2500), withWater, ps);
ok('вода, которой нет в наборе, не отбрасывает блюдо', a.menu.days.every(d => d.b.items.length > 0 && !d.b.empty));
ok('вода не попадает в продукты меню', a.menu.days.every(d => d.b.items.every(i => i.pid)));
ok('menuProblems не жалуется на воду', M.menuProblems(withWater, ps).length === 0);

// настоящий недостающий продукт: блюдо не готовится, причина названа
const oneBreakfast = { ...ms, dishes: ms.dishes.filter(d => d.meal !== 'b' || d.id === 'b1') }, noOats = { ...ps, items: ps.items.filter(p => !/овсяные/i.test(p.name)) };
const b = run(mkTrip(2500), oneBreakfast, noOats);
ok('единственный завтрак без продукта: пустой приём и пояснение с названием продукта', b.menu.days.every(d => d.b.none) && /нельзя приготовить/.test(b.menu.warnings[0]) && /овсяные хлопья/i.test(b.menu.warnings[0]));

// недобор: цель выше, чем способно дать меню
const c = run(mkTrip(9000), ms, ps);
ok('недобор: предупреждение с процентом', c.menu.warnings.some(w => /недобор \d+%/.test(w)));
// нормальный случай без предупреждений о недоборе
ok('без недобора при цели 3000', !run(mkTrip(3000), ms, ps).menu.warnings.some(w => /недобор/.test(w)));
