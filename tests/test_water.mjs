// Вода в блюдах (суп, каша): входит в рецепт и масштабируется с блюдом, но не продукт — 0 ккал, не покупается, не входит в вес рюкзака; считается как вода на готовку.
import * as M from '../src/menu.js';
import * as E from '../src/engine.js';
import { menuGrams, menuWater } from '../src/calcview.js';
import { buildSummary } from '../src/summary.js';
import { PARAMS } from '../src/defaults.js';
import { builtinProductSets, builtinMenuSets } from '../src/builtin.js';
import { defaultSimple, virtualGroup } from '../src/simple.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c, extra = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : ' — ' + extra)); if (!c) process.exitCode = 1; };
const D = { appetite: 1, shareM: 1, shareF: 0.8 };
const ps = builtinProductSets()[0], ms0 = builtinMenuSets()[0];
const soup = water => ms0.dishes.map(d => (d.meal === 'd' ? { ...d, ing: [...(water ? [{ name: 'Вода техническая', g: 400, min: 280, max: 600 }] : []), ...d.ing] } : d));
const run = (dishes, n, goal = 3200) => {
  const trip = { group: virtualGroup({ ...defaultSimple(), n }, D), days: [{ type: 'Ходовой' }, { type: 'Ходовой' }], gear: {}, drops: [], food: { hot: '2' }, prefs: { mode: 'std', kcalGoal: goal, restPct: 100 } };
  const calc = E.computeTrip(trip, P); return { trip, calc, menu: M.buildMenu(trip, calc, { ...ms0, dishes }, ps, P, null, 0) };
};
const dry = run(soup(false), 6), wet = run(soup(true), 6);
const wItems = menu => menu.days.flatMap(d => (d.d?.items || []).filter(i => i.water));

ok('вода есть в приёме, у неё нет продукта, она помечена', wItems(wet.menu).length === 2 && wItems(wet.menu).every(i => i.pid === null && i.g >= 400));
ok('вода не меняет калории меню (0 ккал)', wet.menu.days.every((d, i) => Math.abs(M.itemsKcal(d.d.items, ps.items) - M.itemsKcal(dry.menu.days[i].d.items, ps.items)) < 1));
ok('сухой вес раскладки не включает воду', menuGrams(wet.menu.days[0]) === menuGrams(dry.menu.days[0]));
ok('вода на готовку считается отдельно (на группу, г)', menuWater(wet.menu.days[0]) === wItems(wet.menu)[0].g && menuWater(dry.menu.days[0]) === 0);
ok('perGrams приёма — сухой вес', wet.menu.days[0].d.perGrams === dry.menu.days[0].d.perGrams);

// вода масштабируется с блюдом и с размером группы: больше порция/людей — больше воды в пределах мин/макс рецепта
const big = run(soup(true), 12), small = run(soup(true), 3);
ok('вода растёт с числом людей (12 против 3 чел ≈ ×4)', Math.abs(wItems(big.menu)[0].g / wItems(small.menu)[0].g - 4) < 0.5, `${wItems(big.menu)[0].g}/${wItems(small.menu)[0].g}`);
const hi = run(soup(true), 6, 5000);
ok('при большей цели порция и вода растут, но не выше «макс» рецепта (600 г на человека)', wItems(hi.menu)[0].g >= wItems(wet.menu)[0].g && wItems(hi.menu)[0].g <= 600 * 6 + 10, `${wItems(hi.menu)[0].g}`);

// сводка: вода на готовку
const rows = [];
const S = buildSummary({ trip: wet.trip, calc: wet.calc, menu: wet.menu, P, pset: ps, rows, currency: '₸' });
const ind = S.indicators.find(i => i.label.startsWith('Вода на готовку'));
ok('в сводке есть «Вода на готовку»', ind && Math.abs(ind.value - wet.menu.days.reduce((s, d) => s + menuWater(d), 0) / 1000) < 0.05, JSON.stringify(ind));
// вода в рецепте — всегда вода на готовку, даже если «Вода …» есть среди продуктов набора (иначе в список покупок попали бы десятки литров бутилированной воды)
const withProd = { ...ps, items: [...ps.items, { id: 'w1', name: 'Вода техническая', cat: 'drink', kcal: 0, p: 0, f: 0, c: 0, pack: 1500, shelf: 999, unit: 'бутылка', on: true, tags: '' }] };
const trip = { group: virtualGroup({ ...defaultSimple(), n: 6 }, D), days: [{ type: 'Ходовой' }], gear: {}, drops: [], food: { hot: '2' }, prefs: { mode: 'std', kcalGoal: 3200, restPct: 100 } };
const m2 = M.buildMenu(trip, E.computeTrip(trip, P), { ...ms0, dishes: soup(true) }, withProd, P, null, 0);
ok('вода из рецепта — вода на готовку, даже если такой продукт есть в наборе', !m2.days[0].d.items.some(i => i.pid === 'w1') && menuWater(m2.days[0]) > 0);
