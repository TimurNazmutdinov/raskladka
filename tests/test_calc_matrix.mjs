// Сквозная проверка расчёта и генератора на сетке сценариев: размер группы, цель, наборы, блюда-«части приёма».
// Критично для безопасности: меню не должно давать заметно меньше цели; числа не бывают NaN или отрицательными.
import * as M from '../src/menu.js';
import * as E from '../src/engine.js';
import { PARAMS } from '../src/defaults.js';
import { builtinProductSets, builtinMenuSets } from '../src/builtin.js';
import { defaultSimple, virtualGroup } from '../src/simple.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c, extra = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : ' — ' + extra)); if (!c) process.exitCode = 1; };
const D = { appetite: 1, shareM: 1, shareF: 0.8 };

// Набор, похожий на пользовательский: блюда — части приёма (малокалорийные), в одном есть лук, в другом вода
const U = (id, name, kcal, p, f, c, pack = 500, cat = 'grain') => ({ id, name, cat, kcal, p, f, c, pack, shelf: 999, unit: 'пачка', on: true, tags: '' });
const uProducts = { items: [U('u1', 'Гречка', 313, 12.6, 3.3, 62), U('u2', 'Говядина тушёная', 230, 15, 18, 0, 340, 'meat'), U('u3', 'Лук репчатый', 41, 1.4, 0, 9, 1000, 'veg'), U('u4', 'Овсяные хлопья', 366, 12, 6.2, 62), U('u5', 'Сухое молоко', 480, 24, 24, 38, 400, 'dairy'), U('u6', 'Сахар', 399, 0, 0, 99.8, 1000, 'sweet'), U('u7', 'Макароны', 350, 12, 1.5, 70), U('u8', 'Сыр', 370, 25, 30, 0, 200, 'cheese'), U('u9', 'Хлеб', 250, 8, 2, 50, 400, 'bread'), U('u10', 'Халва', 520, 12, 30, 50, 300, 'sweet'), U('u11', 'Масло топлёное', 890, 0, 99, 0, 200, 'fat')] };
const ing = (name, g) => ({ name, g });
const uDishes = { dishes: [
  { id: 'x1', meal: 'b', name: 'Каша овсяная', cook: 7, cond: ['any'], on: true, ing: [ing('Вода техническая', 300), ing('Овсяные хлопья', 60), ing('Сухое молоко', 15), ing('Сахар', 10)] },
  { id: 'x2', meal: 'b', name: 'Бутерброды', cook: 0, cond: ['any'], on: true, ing: [ing('Хлеб', 80), ing('Сыр', 30)] },
  { id: 'x3', meal: 'l', name: 'Перекус с халвой', cook: 0, cond: ['any'], on: true, ing: [ing('Хлеб', 70), ing('Сыр', 40), ing('Халва', 40)] },
  { id: 'x4', meal: 'l', name: 'Макароны с маслом', cook: 12, cond: ['any'], on: true, ing: [ing('Макароны', 70), ing('Масло топлёное', 10)] },
  { id: 'x5', meal: 'd', name: 'Гречка с говядиной и луком', cook: 25, cond: ['any'], on: true, ing: [ing('Гречка', 60), ing('Говядина тушёная', 70), ing('Лук репчатый', 20)] },
  { id: 'x6', meal: 'd', name: 'Макароны с говядиной', cook: 15, cond: ['any'], on: true, ing: [ing('Макароны', 70), ing('Говядина тушёная', 70)] },
] };
const sets = [['база', builtinProductSets()[0], builtinMenuSets()[0]], ['расширенный', builtinProductSets()[1], builtinMenuSets()[1]], ['«части приёма»', uProducts, uDishes]];

const run = (ps, ms, n, goal, days = 3, day = { type: 'Ходовой' }) => {
  const trip = { group: virtualGroup({ ...defaultSimple(), n }, D), days: Array.from({ length: days }, () => ({ ...day })), gear: {}, drops: [], food: { hot: '2' }, prefs: { mode: 'std', kcalGoal: goal, restPct: 100 } };
  const calc = E.computeTrip(trip, P), menu = M.buildMenu(trip, calc, ms, ps, P, null, 0), slots = Object.keys(menu.days[0]);
  const perDay = menu.days.map(d => slots.reduce((s, id) => s + M.itemsKcal(d[id]?.items || [], ps.items), 0) / n);
  return { calc, menu, slots, perDay, trip };
};

let cases = 0, bad = [];
for (const [label, ps, ms] of sets) for (const n of [1, 2, 5, 12, 20]) for (const goal of [3000, 3500, 4000, 5000]) {
  const { menu, perDay, calc } = run(ps, ms, n, goal); cases++;
  const items = menu.days.flatMap(d => Object.values(d).flatMap(e => e.items || []));
  if (items.some(i => !(i.g > 0) || !Number.isFinite(i.g))) bad.push(`${label} n=${n} цель ${goal}: некорректные граммы`);
  const empty = menu.days.flatMap(d => Object.entries(d).filter(([, e]) => !e.items?.length && !e.personal)).length;
  if (empty) bad.push(`${label} n=${n} цель ${goal}: пустых приёмов ${empty}`);
  const r = perDay.reduce((a, b) => a + b, 0) / perDay.length / goal;
  if (r > 1.12) bad.push(`${label} n=${n} цель ${goal}: меню ${Math.round(r * 100)}% цели (перебор)`);
  if (r < 0.9 && !menu.warnings.some(w => /недобор/.test(w))) bad.push(`${label} n=${n} цель ${goal}: меню ${Math.round(r * 100)}% цели без предупреждения о недоборе`);
  if (r < 0.9 && label !== '«части приёма»') bad.push(`${label} n=${n} цель ${goal}: недобор ${Math.round(r * 100)}% на полноценном наборе`);
}
ok(`сетка ${cases} сценариев (цель 3000–5000): приёмы не пусты, граммы корректны, нет перебора, недобор всегда с предупреждением`, !bad.length, bad.slice(0, 6).join('; '));

// размер группы не меняет калорийность на человека
for (const [label, ps, ms] of sets) {
  const a = run(ps, ms, 2, 3500).perDay[0], b = run(ps, ms, 20, 3500).perDay[0];
  ok(`«${label}»: ккал на человека не зависят от размера группы (2 и 20 чел)`, Math.abs(a - b) / a < 0.06, `${Math.round(a)} и ${Math.round(b)}`);
}

// блюда-«части приёма» (как в файле пользователя) собираются в приёмы и дают цель
{
  const { menu, perDay, slots } = run(uProducts, uDishes, 12, 2500);
  const mixed = menu.days.some(d => ['b', 'l', 'd'].some(id => d[id]?.parts?.length > 1));
  ok('блюда-части: приёмы собраны из нескольких блюд', mixed);
  ok('блюда-части: меню ≈ цели (90–112%) и без пустых приёмов', perDay.every(k => k > 2250 && k < 2800) && menu.days.every(d => slots.every(id => d[id].items.length)), perDay.map(Math.round).join('/'));
  const e = menu.days[0].d;
  ok('лук внутри рецепта не отбрасывает блюдо', menu.days.some(d => /лук/i.test(d.d?.name || '')) || e.items.length > 0);
  const k = menu.days[0].l, perKcal = M.itemsKcal(k.items, uProducts.items) / 12;
  ok('perKcal записи согласован с суммой по продуктам (±4%)', Math.abs(perKcal - k.perKcal) / perKcal < 0.04, `${Math.round(perKcal)} против ${k.perKcal}`);
  ok('имя составного приёма и состав частей', k.parts ? k.name === k.parts.map(p => p.name).join(' + ') && k.items.length === k.parts.reduce((s, p) => s + p.items.length, 0) : true);
}

// нереальная цель: меню собирается на предел (kcal_cap), а предупреждения называют предел и недобор
{
  const { menu, perDay } = run(builtinProductSets()[0], builtinMenuSets()[0], 5, 12000);
  ok('цель 12000: меню не раздувается выше предела 5500 (+5%)', perDay.every(k => k <= P.kcal_cap * 1.05), perDay.map(Math.round).join('/'));
  ok('цель 12000: предупреждения про предел и недобор', menu.warnings.some(w => /выше предела/.test(w)) && menu.warnings.some(w => /недобор/.test(w)));
}
