// Меню-план: какие блюда стоят в ячейках «день × приём пищи». План «оригинал» применяется без генерации и масштабирования.
import { MEALS, isWater } from './menu.js';
import { mealsOf, firstSlotOfType } from './meals.js';

const DASH = ' + ';
// Строит меню из плана. Количества — как в файле: на порцию × порции (из плана, иначе число участников).
export function planMenu(trip, calc, plan, dset, pset) {
  const n = calc.summary.n, warnings = [], days = calc.days.map(() => ({}));
  const withAl = (list, key) => { const m = new Map(list.map(x => [x[key], x])); for (const x of list) for (const a of x.aliases || []) if (!m.has(a)) m.set(a, x); return m; };
  const dishBy = withAl(dset?.dishes || [], 'name'), prodBy = withAl(pset?.items || [], 'name');
  for (const row of plan.rows) {
    const i = row.day - 1;
    if (i < 0 || i >= days.length) { warnings.push(`План: день ${row.day} (${row.dish.trim()}) вне дней похода — не применён`); continue; }
    const d = dishBy.get(row.dish), portions = row.portions ?? n;
    const slot = firstSlotOfType(mealsOf(trip), row.mealKey) ?? row.mealKey; // строка плана ложится в первый приём нужного типа
    const cell = days[i][slot] ||= { name: '', parts: [], items: [], fixed: true, pin: true, fromPlan: true, comments: [] };
    if (!d) { warnings.push(`День ${row.day}, ${MEALS[row.mealKey].toLowerCase()}: блюда «${row.dish.trim()}» нет в наборе блюд`); cell.parts.push({ dish: row.dish, name: row.dish, items: [], missing: true }); }
    else {
      const items = d.ing.map(ing => {
        const p = prodBy.get(ing.name), g = ing.g * portions;
        if (!p && isWater(ing.name)) return { pid: null, name: ing.name, g, unit: ing.unit || 'г', perPortion: ing.g, skip: null, water: true }; // вода на готовку
        let skip = null;
        if (!p) skip = 'нет в наборе продуктов';
        else if (ing.perGroup) skip = 'количество указано «на группу»';
        else if (ing.unit && ing.unit !== 'г') skip = `единица «${ing.unit}», не граммы`;
        else if (p.baseUnit && p.baseUnit !== 'г') skip = `базовая единица продукта «${p.baseUnit}», не граммы`;
        else if (p.kcal == null) skip = 'нет КБЖУ';
        return { pid: p?.id ?? null, name: ing.name, g, unit: ing.unit || 'г', perPortion: ing.g, skip };
      });
      cell.parts.push({ dish: d.id, name: d.name, items, portions });
    }
    if (row.comment) cell.comments.push(row.comment);
  }
  days.forEach(day => Object.values(day).forEach(c => { c.name = c.parts.map(p => p.name).join(DASH); c.items = c.parts.flatMap(p => p.items); }));
  return { days, warnings, seed: 0 };
}
export const skippedCount = menu => menu.days.reduce((s, d) => s + Object.values(d).reduce((a, c) => a + (c.items || []).filter(i => i.skip).length, 0), 0);
