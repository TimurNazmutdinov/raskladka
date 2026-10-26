// Проверка на типовые ошибки калькуляторов раскладки (см. PROMPT_check_errors.md). ТОЛЬКО ПРОВЕРКА: логику приложения не меняет.
// Каждая проверка печатает «ok» (ошибка у нас не воспроизводится) или «ДЫРА» (воспроизводится: известная проблема, отражена в QUESTIONS.md).
// «ДЫРА» не роняет набор тестов (код выхода 0), кроме пунктов из globalThis.__STRICT (их проверяет test_fixes.mjs: после исправлений они обязаны быть «ok»).
// Данные — только синтетические.
import { prepo, mrepo, plrepo, T, shopData, C, M, E, F, planMenu, P, buildSummary, fs, PRODUCTS, DISHES, setP, setM, prod, dish, ing, mkTrip, setDishes, fresh, sumMenu, rowOf, defaultSimple, virtualGroup } from './_harness.mjs';

let holes = 0;
const STRICT = new Set(globalThis.__STRICT || []);
const check = (num, name, safe, detail = '') => { if (!safe) { holes++; if (STRICT.has(String(num))) process.exitCode = 1; } console.log(`${safe ? 'ok   ' : 'ДЫРА '} №${num} ${name}${detail ? ' — ' + detail : ''}`); };
// ═══ №6 штуки/мл/кг в рецепте ═══
{
  const dsh = [DISHES[0], dish('d2', 'l', 'Обед со штуками', [ing('Хлеб Дзета', 120), ing('Сыр Гамма', 60), ing('Пряник Дельта', 4, 'шт'), ing('Чай Эпсилон', 3)]), DISHES[2]];
  await fresh(dsh); const D = shopData(); const e = D.menu.days[0].l, line = e.items.find(i => i.pid === 'a4');
  check('6a', 'штуки без веса одной штуки не считаются как граммы (строка помечена, калории не начислены)', !!line?.skip && /не граммы/.test(line.skip), `skip=${line?.skip}`);
  const kc = M.itemsKcal(e.items, PRODUCTS);
  check('6b', 'калории приёма не включают штучный продукт', Math.abs(kc - e.items.filter(i => !i.skip).reduce((s, i) => s + i.g * PRODUCTS.find(p => p.id === i.pid).kcal / 100, 0)) < 1);
  // кг в рецепте
  const dkg = [DISHES[0], dish('d2', 'l', 'Обед с кг', [ing('Хлеб Дзета', 0.12, 'кг'), ing('Сыр Гамма', 60), ing('Чай Эпсилон', 3)]), DISHES[2]];
  await fresh(dkg); const E2 = shopData().menu.days[0].l; const bread = E2.items.find(i => i.pid === 'a6');
  check('6c', 'кг в рецепте не принимаются за граммы (строка помечена)', !!bread?.skip, `skip=${bread?.skip}`);
}
// мл/л в рецепте (жидкость вместо граммов) ведут себя как штуки и кг
{
  const dml = [DISHES[0], dish('d2', 'l', 'Обед с мл', [ing('Хлеб Дзета', 120), ing('Сыр Гамма', 60), ing('Чай Эпсилон', 300, 'мл')]), DISHES[2]];
  await fresh(dml); const it = shopData().menu.days[0].l.items.find(i => i.pid === 'a5');
  check('6d', 'мл в рецепте не принимаются за граммы (строка помечена)', !!it?.skip, `skip=${it?.skip}`);
}
// ═══ №7 и №8 закупка штучных продуктов, сверка меню и закупки ═══
{
  const dsh = [DISHES[0], dish('d2', 'l', 'Обед со штуками', [ing('Хлеб Дзета', 120), ing('Сыр Гамма', 60), ing('Пряник Дельта', 6, 'шт'), ing('Чай Эпсилон', 3)]), DISHES[2]];
  await fresh(dsh); const D = shopData(), row = rowOf(D, 'a4'), pieces = 6 * 4 * 2;
  check('7', 'штучный продукт (6 пряников × 4 чел × 2 дня = 48 шт) не превращается в «48 г» в закупке', !row || Math.abs(row.total - pieces) > 1, `в закупке ${row ? row.total + ' г → ' + row.packs + ' уп. по ' + row.p.pack + ' г' : '—'}, в меню ${pieces} шт`);
  // кг: 0.12 кг на человека × 4 человека = 0.48 «г» в закупке
  const dkg = [DISHES[0], dish('d2', 'l', 'Обед с кг', [ing('Хлеб Дзета', 0.12, 'кг'), ing('Сыр Гамма', 60), ing('Чай Эпсилон', 3)]), DISHES[2]];
  await fresh(dkg); const D2 = shopData(), r2 = rowOf(D2, 'a6');
  check('7b', 'продукт в кг в рецепте не занижается в закупке в 1000 раз', !r2 || r2.total >= 400, `нужно 0,12 кг × 4 чел × 2 дня ≈ 960 г, в закупке ${r2 ? r2.total + ' г' : '—'}`);
}
// ═══ №8 автосверка меню и закупки на обычных данных ═══
{
  await fresh(); const D = shopData(), menuG = sumMenu(D.menu);
  const lacks = [...menuG].filter(([pid, g]) => !(rowOf(D, pid) && rowOf(D, pid).total >= g - 0.5));
  const extra = D.rows.filter(r => !menuG.has(r.p.id) && r.reserve === 0 && r.resG === 0 && r.p.name !== 'Соль');
  check('8', 'закупка ≥ меню по каждому продукту, лишних продуктов нет (на обычных данных)', !lacks.length && !extra.length, `недобор: ${lacks.map(l => l[0]).join(',')}; лишнее: ${extra.map(r => r.p.name).join(',')}`);
}
// ═══ №15 вода ═══
{
  const dsh = [dish('d1', 'b', 'Каша Альфа', [ing('Вода техническая', 300), ing('Крупа Альфа', 90), ing('Масло Тета', 15), ing('Сахар Эта', 15)]), DISHES[1], DISHES[2]];
  await fresh(dsh); const D = shopData(), pn = D.rows.map(r => r.p.name);
  check('15a', '«Вода техническая» не попадает в закупку', !pn.some(n => /вода/i.test(n)));
  const g0 = C.menuGrams(D.menu.days[0]), g1 = (await (async () => { await fresh(); return C.menuGrams(shopData().menu.days[0]); })());
  check('15b', 'вода не входит в вес раскладки (и рюкзаков): вес с водой в рецепте = вес без неё', Math.abs(g0 - g1) < 30, `${g0} против ${g1}`);
  check('15c', 'вода считается отдельно (вода на готовку > 0)', C.menuWater(D.menu.days[0]) > 0);
}
// ═══ №16 ручная цель ниже расчётной потребности ═══
{
  const day = { type: 'Ходовой', km: 20, up: 1500, down: 700, hours: 10, cover: 'trail', maxAlt: 3200, tdmin: -5, tdmax: 8 };
  const mk = goal => ({ simple: { ...defaultSimple(), on: false }, group: virtualGroup({ ...defaultSimple(), n: 4 }, { appetite: 1, shareM: 1, shareF: 0.8 }), days: [{ ...day }, { ...day }], gear: { common: 10 }, drops: [], food: {}, prefs: { mode: 'std', kcalGoal: goal, restPct: 100 } });
  const lo = E.computeTrip(mk(1800), P), ok1 = E.computeTrip(mk(3500), P), simple = E.computeTrip({ ...mk(1800), simple: { ...defaultSimple(), on: true } }, P);
  check('16a', 'полноценный поход: цель 1800 при потребности ≈4600 вызывает предупреждение', lo.warnings.some(w => /покрытие/.test(w)), lo.warnings.join('; ') || 'предупреждений нет');
  check('16b', 'цель 3500 (≈76% потребности) не считается ошибкой', !ok1.warnings.some(w => /покрытие/.test(w)));
  check('16c', 'простой выезд: цель 1800 ккал не вызывает никаких вопросов (потребность не считается)', simple.warnings.length > 0, 'предупреждений нет — цель принимается как есть');
}
// ═══ №1 одно место хранения: что меняется после правки блюда / продукта ═══
{
  await fresh(); let D = shopData(); const a0 = rowOf(D, 'a1').total;
  const edited = DISHES.map(d => (d.id === 'd3' ? { ...d, ing: d.ing.map(i => (i.name === 'Крупа Альфа' ? { ...i, g: 160 } : i)) } : { ...d }));
  setDishes(edited.map(d => ({ ...d, ing: d.ing.map(i => ({ ...i })) }))); D = shopData(); const a1 = rowOf(D, 'a1').total;
  check('1a', 'правка рецепта блюда сразу меняет меню и закупку', a1 !== a0, `крупа в закупке: было ${a0} г, стало ${a1} г`);
  await fresh(); D = shopData(); const b0 = rowOf(D, 'a1').total;
  prepo.get('sp').items.find(p => p.id === 'a1').kcal = 700; // калорийность крупы выросла вдвое
  D = shopData(); const b1 = rowOf(D, 'a1').total;
  check('1b', 'правка калорийности продукта пересчитывает меню (граммы продукта меняются)', b1 !== b0, `крупа в закупке: было ${b0} г, стало ${b1} г — меню осталось прежним, хотя калорий в граммах стало вдвое больше`);
  const stale = C.menuKcal(D.menu.days[0], prepo.get('sp').items) / 4;
  check('1c', 'после правки продукта «ккал на человека» по меню не уходит от цели', Math.abs(stale / 3000 - 1) < 0.15, `меню даёт ${Math.round(stale)} ккал/чел при цели 3000`);
}
// ═══ №2 дубли строк ═══
{
  const r = F.parseDishes([['Блюдо', 'Приём пищи', 'Продукт', 'Граммы на 1 человека'], ['Каша', 'Завтрак', 'Крупа Альфа', 90], ['Каша', 'Завтрак', 'Крупа Альфа', 90], ['Каша', 'Завтрак', 'Крупа Альфа', 90]], 'Блюда');
  check('2a', 'один продукт трижды в блюде при загрузке: есть предупреждение о дубле', r.errors.length > 0 || (r.notes || []).some(n => /дубл|повтор/i.test(n)), `строк в блюде ${r.dishes[0].ing.length}, ошибок ${r.errors.length}, пояснений ${(r.notes || []).length}`);
  const p = F.parseProducts([['Название', 'Ккал на 100 г'], ['Сыр Гамма', 370], ['сыр гамма ', 999]], 'Продукты');
  check('2b', 'два продукта с одним названием при загрузке: есть предупреждение', p.errors.length > 0 || (p.notes || []).some(n => /дубл|повтор/i.test(n)), `продуктов ${p.items.length}, ошибок ${p.errors.length}`);
  const nm = M.nameMap([{ name: 'Сыр', kcal: 370 }, { name: 'сыр ', kcal: 999 }]);
  check('2c', 'какой из одинаковых продуктов берёт расчёт, предсказуемо и заметно', false, `молча берётся ${nm.get('сыр').kcal} ккал (последний), второй игнорируется`);
}
// ═══ №3 сдвиг строк между блюдами при загрузке ═══
{
  const rows = [['Блюдо', 'Приём пищи', 'Продукт', 'Граммы на 1 человека'], ['Каша', 'Завтрак', 'Крупа Альфа', 90], ['Каша', 'Завтрак', 'Масло Тета', 15], [], ['Блюдо', 'Приём пищи', 'Продукт', 'Граммы на 1 человека'], ['Суп', 'Ужин', 'Тушёнка Бета', 100], [null, 'Ужин', 'Хлеб Дзета', 50], ['Суп', 'Ужин', 'Сыр Гамма', 20]];
  const r = F.parseDishes(rows, 'Блюда'), by = n => (r.dishes.find(d => d.name === n)?.ing || []).map(i => i.name).join('+');
  check('3a', 'блоки друг под другом: строки не переходят между блюдами', by('Каша') === 'Крупа Альфа+Масло Тета' && by('Суп') === 'Тушёнка Бета+Сыр Гамма' && !r.dishes.some(d => /^Блюдо$/.test(d.name)), `Каша: ${by('Каша')}; Суп: ${by('Суп')}`);
  check('3b', 'строка без названия блюда не присоединяется к соседнему блюду, а попадает в список ошибок', r.errors.some(e => /нет названия блюда/.test(e)) && by('Суп') !== 'Тушёнка Бета+Хлеб Дзета+Сыр Гамма', r.errors.join('; '));
}
// ═══ №4, №10, №14 меню-план: пустое блюдо, перекос, переименованное блюдо ═══
{
  const plan = (readonly, rows) => ({ id: 'pl1', name: 'План', readonly, dishSetId: 'sm', productSetId: 'sp', rows });
  const row = (day, meal, mealKey, dishName, portions = 4) => ({ day, meal, mealKey, dish: dishName, portions, comment: null, srcId: null });
  const mkDishes = [...DISHES, dish('d4', 'b', 'Пустышка', [ing('Чай Эпсилон', 3)]), dish('d5', 'd', 'Пустое', [])];
  const run2 = async (pl, dishes = mkDishes) => { await fresh(dishes); const t = T.getTrip(); await plrepo.put(pl); t.planId = 'pl1'; delete t.menu; return { D: shopData(), t }; };
  // №4 блюдо без ингредиентов и блюдо на 6 ккал в плане-оригинале
  let r = await run2(plan(true, [row(1, 'Завтрак', 'b', 'Пустышка'), row(1, 'Обед', 'l', 'Лёгкий обед'), row(1, 'Ужин', 'd', 'Пустое'), row(2, 'Завтрак', 'b', 'Каша Альфа'), row(2, 'Обед', 'l', 'Лёгкий обед'), row(2, 'Ужин', 'd', 'Ужин Бета')]));
  const w4 = r.D.menu.warnings.join(' | ');
  check('4a', 'в плане блюдо без ингредиентов («Пустое») даёт предупреждение', /Пустое/.test(w4), w4 || 'предупреждений нет — в ячейке 0 ккал');
  check('4b', 'в плане блюдо на ~6 ккал на человека («Пустышка», завтрак) даёт предупреждение', /Пустышка|меньше минимума|завтрак/i.test(w4), w4 || 'предупреждений нет');
  // №10 перекос: план-оригинал только с обедами, без завтраков, ужинов и перекусов
  r = await run2(plan(true, [row(1, 'Обед', 'l', 'Лёгкий обед'), row(2, 'Обед', 'l', 'Лёгкий обед')]), DISHES);
  const w10 = r.D.menu.warnings.join(' | '), kc = C.menuKcal(r.D.menu.days[0], prepo.get('sp').items) / 4;
  check('10a', 'план только из обедов (≈' + Math.round(kc) + ' ккал/чел вместо 3000, без завтрака, ужина и перекусов) даёт предупреждение о перекосе или недоборе', w10.length > 0, w10 || 'предупреждений нет');
  const S = buildSummary({ trip: r.t, calc: r.D.calc, menu: r.D.menu, P, pset: prepo.get('sp'), rows: r.D.rows, currency: '₸' });
  check('10b', 'в сводке для такого плана статус калорий «Проверить»', S.indicators.find(i => i.label === 'Статус калорий').value === 'Проверить');
  // план не-оригинал: генератор достраивает пустые ячейки, предупреждения те же, что для сгенерированного меню
  r = await run2(plan(false, [row(1, 'Завтрак', 'b', 'Пустышка')]), mkDishes);
  check('4c', 'план не-оригинал с «Пустышкой»: недобор завтрака замечен', r.D.menu.warnings.some(w => /завтрак/i.test(w)), r.D.menu.warnings.join(' | ') || 'предупреждений нет');
  // №14 блюдо переименовали / удалили, а план ссылается на старое имя
  const renamed = DISHES.map(d => (d.id === 'd2' ? { ...d, name: 'Лёгкий обед (новый)' } : d));
  r = await run2(plan(true, [row(1, 'Обед', 'l', 'Лёгкий обед')]), renamed);
  check('14a', 'переименованное блюдо: план сообщает, что блюда нет в наборе', r.D.menu.warnings.some(w => /нет в наборе блюд/.test(w)), r.D.menu.warnings.join(' | '));
  // лишнее блюдо в наборе не влияет на закупку по плану-оригиналу
  const base = await run2(plan(true, [row(1, 'Обед', 'l', 'Лёгкий обед')]), DISHES), tot0 = base.D.rows.reduce((s, x) => s + x.total, 0);
  const extra2 = await run2(plan(true, [row(1, 'Обед', 'l', 'Лёгкий обед')]), [...DISHES, dish('d9', 'd', 'Лишнее блюдо', [ing('Тушёнка Бета', 500), ing('Сыр Гамма', 500)])]), tot1 = extra2.D.rows.reduce((s, x) => s + x.total, 0);
  check('14b', 'блюдо, которого нет в плане-оригинале, не влияет на закупку', tot0 === tot1, `${tot0} г и ${tot1} г`);
  await plrepo.remove('pl1'); T.getTrip().planId = null;
}
// ═══ №5 правдоподобие блюд ═══
{
  const tiny = dish('t1', 'b', 'Каша на 4 ккал', [ing('Чай Эпсилон', 200)]), huge = dish('t2', 'b', 'Напиток на 900 ккал', [ing('Масло Тета', 100)]);
  const pr = M.menuProblems({ dishes: [tiny, huge] }, { items: PRODUCTS });
  check('5', 'набор с «кашей на 4 ккал» и «напитком на 900 ккал»: приложение предупреждает о неправдоподобных блюдах', pr.length > 0, 'проверка есть только на отсутствующие продукты, о калорийности блюда по его типу приёма не сообщается');
}
// ═══ №9 средние значения скрывают провалы ═══
{
  await fresh(DISHES, PRODUCTS, { days: Array.from({ length: 10 }, () => ({ type: 'Ходовой' })) });
  const D = shopData(); D.menu.days[3].d = { empty: true, items: [] }; // убрали ужин в 4-й день
  const S = buildSummary({ trip: D.trip, calc: D.calc, menu: D.menu, P, pset: prepo.get('sp'), rows: D.rows, currency: '₸' });
  const day4 = C.menuKcal(D.menu.days[3], prepo.get('sp').items) / 4;
  check('9', '10 дней, в 4-м нет ужина (≈' + Math.round(day4) + ' ккал вместо 3000): сводка не говорит «OK», а показывает проваленный день', S.indicators.find(i => i.label === 'Статус калорий').value !== 'OK' || S.checks.some(c => !c.ok && /день|приём/i.test(c.label + c.text)), `статус «${S.indicators.find(i => i.label === 'Статус калорий').value}»: среднее ${S.indicators.find(i => i.label.startsWith('Факт энергии')).value} ккал`);
}
// ═══ №11 видны ли предупреждения везде ═══
{
  const src = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
  check('11a', 'на экране «Расчёт» предупреждения выводятся', /Предупреждения/.test(src('calcview.js')));
  check('11b', 'на экране «Покупки» предупреждения о меню видны (нельзя выгрузить закупку, не увидев их)', /warnings/.test(src('shop.js')), 'в shop.js предупреждения не используются');
  check('11c', 'Excel-выгрузка содержит предупреждения или не даёт выгрузить при критических', /warnings/.test(src('exportxlsx.js')), 'в exportxlsx.js предупреждения не используются');
}

console.log(`\nИтог: воспроизводится ${holes} из проверенных пунктов (подробности — QUESTIONS.md, «Проверка на типовые ошибки»).`);
