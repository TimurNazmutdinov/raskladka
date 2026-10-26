// Сводка расчёта: показатели, проверки и закупка по категориям. Чистые функции — данные берутся из расчёта, меню и списка покупок.
import { itemsKcal, MEALS } from './menu.js';
import { mealsOf } from './meals.js';
import { CATS } from './products.js';

const CAT_RU = Object.fromEntries(CATS);
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

// Заметки о группе (для сводки и листов закупщиков)
export const groupNotes = trip => [trip.simple?.on && trip.simple.veg ? 'Есть вегетарианцы' : '', trip.simple?.on && trip.simple.noEat ? `Не едят / аллергии: ${trip.simple.noEat}` : '', trip.simple?.on && trip.simple.notes ? trip.simple.notes : '',
  trip.prefs?.likes ? `Любимые блюда: ${trip.prefs.likes}` : '', trip.prefs?.dislikes ? `Нелюбимые блюда: ${trip.prefs.dislikes}` : ''].filter(Boolean);

// D: { trip, calc, menu, P, pset, rows (из shopData), currency }
export function buildSummary(D) {
  const { trip, calc, menu, P, pset, rows, currency = '₸' } = D, S = calc.summary, n = S.n, days = S.days, prods = pset.items, byId = new Map(prods.map(p => [p.id, p]));
  const slots = mealsOf(trip, P);
  const cells = menu.days.flatMap(d => slots.map(s => ({ s, e: d[s.id] })));
  const counted = cells.filter(c => !c.e?.personal), filled = counted.filter(c => c.e?.items?.length);
  const items = menu.days.flatMap(d => Object.values(d).flatMap(e => (e?.items || []).filter(i => !i.skip)));
  const factK = sum(menu.days, d => sum(Object.values(d), e => itemsKcal(e?.items || [], prods))) / n / days;
  const factP = sum(items, i => (byId.get(i.pid)?.p || 0) * i.g / 100) / n / days;
  const goalK = S.kcalPerPersonDay, goalP = sum(calc.days, d => d.mac.p) / calc.days.length;
  const buyG = sum(rows, r => r.buy), cost = sum(rows, r => r.price), reserveG = sum(rows, r => r.reserve + (r.resG || 0));
  const dayRatio = calc.days.map((cd, i) => ({ day: i + 1, r: cd.target ? sum(Object.values(menu.days[i] || {}), e => itemsKcal(e?.items || [], prods)) / cd.target : 1 })), lowDays = dayRatio.filter(x => x.r < 0.85);
  const ratio = goalK ? factK / goalK : 0, okK = ratio >= 0.9 && ratio <= 1.1 && !lowDays.length; // среднее может скрыть день без завтрака или ужина
  const noPrice = rows.filter(r => !r.p.price), noPack = rows.filter(r => !r.p.pack), noKcal = rows.filter(r => r.p.kcal == null);
  const noRecipe = counted.filter(c => c.e && !c.e.empty && c.e.name && !c.e.items?.length);
  const personal = cells.filter(c => c.e?.personal).length;

  const indicators = [
    { label: 'Участников, чел.', value: n },
    { label: 'Дней, суток', value: days },
    { label: 'Цель энергии, ккал/чел/день', value: Math.round(goalK) },
    { label: 'Факт энергии, ккал/чел/день', value: Math.round(factK) },
    { label: 'Цель белка, г/чел/день', value: Math.round(goalP) },
    { label: 'Факт белка, г/чел/день', value: Math.round(factP) },
    { label: 'Вес закупки, кг', value: +(buyG / 1000).toFixed(1) },
    { label: 'Вода (питьё), л/чел/день (оценка)', value: +(S.water / n / days).toFixed(1) },
    { label: 'Вода на готовку, л на группу за поход', value: +(sum(menu.days.flatMap(d => Object.values(d).flatMap(e => e?.items || [])).filter(i => i.water), i => i.g) / 1000).toFixed(1) },
    { label: 'Топливо на поход, г', value: Math.round(S.fuel) },
    { label: `Общая стоимость, ${currency}`, value: cost ? Math.round(cost) : null },
    { label: `Стоимость, ${currency}/чел/день`, value: cost ? Math.round(cost / n / days) : null },
    { label: 'Заполненных приёмов меню', value: `${filled.length} из ${counted.length}` },
    { label: 'Статус калорий', value: okK ? 'OK' : 'Проверить', status: okK ? 'ok' : 'warn', note: `факт ${Math.round(ratio * 100)}% от цели (допустимо 90–110%)${lowDays.length ? `; дни ниже 85% цели: ${lowDays.map(x => `${x.day} (${Math.round(x.r * 100)}%)`).join(', ')}` : ''}` },
  ];
  const check = (label, bad, okText = 'OK') => ({ label, ok: !bad.length, text: bad.length ? `${bad.length}: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? '…' : ''}` : okText });
  const checks = [
    check('Все блюда имеют рецепт', noRecipe.map(c => c.e.name)),
    check('Все продукты имеют цену', noPrice.map(r => r.p.name)),
    check('Все упаковки заполнены', noPack.map(r => r.p.name)),
    check('У всех продуктов есть КБЖУ', noKcal.map(r => r.p.name)),
    { label: 'Меню не пустое', ok: filled.length > 0, text: filled.length ? 'OK' : 'нет ни одного приёма' },
    { label: 'Каждый день не ниже 85% цели', ok: !lowDays.length, text: lowDays.length ? lowDays.slice(0, 6).map(x => `день ${x.day} — ${Math.round(x.r * 100)}%`).join(', ') + (lowDays.length > 6 ? '…' : '') : 'OK' },
    { label: 'Резерв закупки', ok: true, text: `${trip.food?.reservePct ?? 0}% от количества + аварийный запас ${P.reserve_days} дн. (всего ≈ ${buyG ? Math.round(reserveG / Math.max(1, buyG - reserveG) * 100) : 0}% к рациону)` },
  ];
  if (personal) checks.push({ label: 'Приёмы «в личке»', ok: true, text: `${personal} (в раскладку не входят)` });
  const warnings = menu.warnings || [];
  if (warnings.length) checks.push({ label: 'Предупреждения меню', ok: false, text: `${warnings.length}: см. «Расчёт»` });

  const cat = new Map();
  rows.forEach(r => { const c = cat.get(r.p.cat) || { cat: r.p.cat, name: CAT_RU[r.p.cat] || r.p.cat, g: 0, cost: 0 }; c.g += r.buy; c.cost += r.price; cat.set(r.p.cat, c); });
  const byCategory = CATS.map(([k]) => cat.get(k)).concat([...cat.values()].filter(c => !CAT_RU[c.cat])).filter(Boolean).map(c => ({ name: c.name, kg: +(c.g / 1000).toFixed(2), cost: c.cost ? Math.round(c.cost) : null }));
  const notes = groupNotes(trip);
  return { indicators, checks, byCategory, totalKg: +(buyG / 1000).toFixed(2), totalCost: cost ? Math.round(cost) : null, currency, notes, name: trip.name || 'Поход' };
}

// Строки для Excel и текста
export function summaryRows(s) {
  const v = x => (x == null ? '' : x);
  return [
    { name: 'Сводка', rows: [['Сводка расчёта: ' + s.name], [], ['Показатель', 'Значение', 'Примечание'], ...s.indicators.map(i => [i.label, v(i.value), i.note || '']), [], ['Проверка', 'Результат'], ...s.checks.map(c => [c.label, c.text]), ...(s.notes.length ? [[], ['Заметки группы'], ...s.notes.map(x => [x])] : [])] },
    { name: 'Закупка по категориям', rows: [['Категория', 'Купить, кг', `Стоимость, ${s.currency}`], ...s.byCategory.map(c => [c.name, c.kg, v(c.cost)]), ['Итого', s.totalKg, v(s.totalCost)]] },
  ];
}
export function summaryText(s) {
  const f = x => (typeof x === 'number' ? x.toLocaleString('ru') : x ?? '—');
  return [`Сводка расчёта: ${s.name}`, '', ...s.indicators.map(i => `${i.label}: ${f(i.value)}${i.note ? ` (${i.note})` : ''}`), '', 'Проверки:', ...s.checks.map(c => `  ${c.ok ? '✓' : '✗'} ${c.label}: ${c.text}`), '', 'Закупка по категориям:', ...s.byCategory.map(c => `  ${c.name}: ${f(c.kg)} кг${c.cost != null ? `, ${f(c.cost)} ${s.currency}` : ''}`), `  Итого: ${f(s.totalKg)} кг${s.totalCost != null ? `, ${f(s.totalCost)} ${s.currency}` : ''}`, ...(s.notes.length ? ['', 'Заметки группы:', ...s.notes.map(x => '  ' + x)] : [])].join('\n');
}
