// Строгая проверка исправлений пяти опасных пунктов (7, 4/10, 1, 9, 11) из QUESTIONS.md «Проверка на типовые ошибки».
// Запускает проверки test_sanity.mjs для этих пунктов в строгом режиме (должны быть «ok») и добавляет точные утверждения.
globalThis.__STRICT = ['6a', '6b', '6c', '6d', '7', '7b', '8', '1a', '1b', '1c', '4a', '4b', '4c', '10a', '10b', '9', '11a', '11b', '11c', '14a', '14b', '15a', '15b', '15c'];
await import('./test_sanity.mjs');
const H = await import('./_harness.mjs');
const { shopData, C, M, P, fresh, dish, ing, DISHES, PRODUCTS, prepo, plrepo, T, buildSummary, fs } = H;
const ok = (n, c, extra = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : ' — ' + extra)); if (!c) process.exitCode = 1; };
const src = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');

console.log('\n— точные проверки исправлений —');
// №7: строки не в граммах не попадают в закупку, а выводятся отдельным списком
{
  const dsh = [DISHES[0], dish('d2', 'l', 'Обед со штуками', [ing('Хлеб Дзета', 120), ing('Сыр Гамма', 60), ing('Пряник Дельта', 6, 'шт'), ing('Чай Эпсилон', 3), ing('Масло Тета', 0.05, 'кг')]), DISHES[2]];
  await fresh(dsh); const D = shopData(), u = n => D.uncounted.find(x => x.name === n);
  ok('7: пряники (48 шт) в списке «не посчитано» с единицей', u('Пряник Дельта')?.qty === 48 && u('Пряник Дельта')?.unit === 'шт', JSON.stringify(D.uncounted));
  ok('7: кг тоже в списке «не посчитано» (0,05 кг × 4 × 2)', Math.abs((D.uncounted.find(x => x.unit === 'кг')?.qty || 0) - 0.4) < 0.01, JSON.stringify(D.uncounted));
  ok('7: в закупке пряников нет, а граммовые продукты не затронуты', !D.rows.some(r => r.p.id === 'a4') && D.rows.some(r => r.p.id === 'a6'));
  ok('7: у меню есть предупреждение о непосчитанных строках', D.menu.warnings.some(w => /не посчитано/.test(w)), D.menu.warnings.join(' | '));
  ok('7: текстовая выгрузка и экран «Покупки» содержат блок «Не посчитано»', /НЕ ПОСЧИТАНО В ГРАММАХ/.test(src('shop.js')) && /Не посчитано в закупке/.test(src('shop.js')));
}
// №1: правка калорийности продукта пересчитывает меню
{
  await fresh(); let D = shopData(); const before = D.rows.find(r => r.p.id === 'a1').total;
  prepo.get('sp').items.find(p => p.id === 'a1').kcal = 700; D = shopData(); const after = D.rows.find(r => r.p.id === 'a1').total;
  ok('1: после удвоения калорийности крупы её граммы в закупке уменьшились', after < before * 0.85, `${before} → ${after}`);
  const k = C.menuKcal(D.menu.days[0], prepo.get('sp').items) / 4;
  ok('1: меню остаётся около цели 3000 (±12%)', Math.abs(k / 3000 - 1) < 0.12, `${Math.round(k)}`);
}
// №4/№10: предупреждения для планов (и оригинал, и обычный)
{
  const mk = (readonly, rows) => ({ id: 'plx', name: 'План', readonly, dishSetId: 'sm', productSetId: 'sp', rows });
  const row = (day, meal, key, name) => ({ day, meal, mealKey: key, dish: name, portions: 4, comment: null, srcId: null });
  const dishes = [...DISHES, dish('d4', 'b', 'Пустышка', [ing('Чай Эпсилон', 3)]), dish('d5', 'd', 'Пустое', [])];
  for (const ro of [true, false]) {
    await fresh(dishes); const t = T.getTrip(); await plrepo.put(mk(ro, [row(1, 'Завтрак', 'b', 'Пустышка'), row(1, 'Ужин', 'd', 'Пустое')])); t.planId = 'plx'; delete t.menu;
    const w = shopData().menu.warnings.join(' | ');
    ok(`4: ${ro ? 'план-оригинал' : 'обычный план'}: блюдо без продуктов и блюдо на ~6 ккал названы в предупреждениях`, /Пустое/.test(w) && /Пустышка/.test(w), w || 'предупреждений нет');
  }
  await fresh(DISHES); const t = T.getTrip(); await plrepo.put(mk(true, [row(1, 'Обед', 'l', 'Лёгкий обед'), row(2, 'Обед', 'l', 'Лёгкий обед')])); t.planId = 'plx'; delete t.menu;
  const w = shopData().menu.warnings.join(' | ');
  ok('10: план только из обедов: предупреждения о недоборе по дням', /День 1: меню даёт только/.test(w) && /День 2: меню даёт только/.test(w), w);
  await plrepo.remove('plx'); T.getTrip().planId = null;
}
// №9: проваленный день не прячется за средним
{
  await fresh(DISHES, PRODUCTS, { days: Array.from({ length: 10 }, () => ({ type: 'Ходовой' })) });
  const D = shopData(); D.menu.days[3].d = { empty: true, items: [] };
  const S = buildSummary({ trip: D.trip, calc: D.calc, menu: D.menu, P, pset: prepo.get('sp'), rows: D.rows, currency: '₸' });
  const st = S.indicators.find(i => i.label === 'Статус калорий'), ck = S.checks.find(c => /Каждый день/.test(c.label));
  ok('9: статус «Проверить» и номер проваленного дня указан', st.value === 'Проверить' && /4 \(\d+%\)/.test(st.note), `${st.value}: ${st.note}`);
  ok('9: отдельная проверка «каждый день не ниже 85%» не пройдена и называет день 4', ck && !ck.ok && /день 4/.test(ck.text), JSON.stringify(ck));
  const D2 = (await fresh(DISHES), shopData()), S2 = buildSummary({ trip: D2.trip, calc: D2.calc, menu: D2.menu, P, pset: prepo.get('sp'), rows: D2.rows, currency: '₸' });
  ok('9: на целом меню новая проверка не мешает (статус OK или только перебор)', S2.checks.find(c => /Каждый день/.test(c.label)).ok);
}
// №11: предупреждения перед выгрузкой
{
  ok('11: экран «Покупки» показывает число предупреждений меню', /warnbox/.test(src('shop.js')) && /В меню предупреждений/.test(src('shop.js')));
  const X = await import('../src/exportxlsx.js'); let asked = '';
  globalThis.confirm = msg => { asked = msg; return false; };
  await X.exportExcel({ menu: { warnings: ['Тестовое предупреждение 1', 'Тестовое предупреждение 2'] }, trip: {} });
  ok('11: перед выгрузкой в Excel спрашивают подтверждение и показывают предупреждения; отказ отменяет выгрузку', /Тестовое предупреждение 1/.test(asked) && /предупреждений: 2/.test(asked), asked);
  let threw = false; globalThis.confirm = () => true; try { await X.exportExcel({ menu: { warnings: ['x'] }, trip: {} }); } catch { threw = true; }
  ok('11: при согласии выгрузка продолжается (здесь упадёт на отсутствии шаблона в Node — значит, дошла до сборки файла)', threw);
  delete globalThis.confirm;
}
// checkMenu напрямую
{
  await fresh(); const D = shopData(), n = D.calc.summary.n;
  const days = D.menu.days.map(d => ({ ...d })); days[0].b = { name: 'Пустое блюдо', items: [] };
  const w = M.checkMenu(D.trip, D.calc, prepo.get('sp'), P, days);
  ok('checkMenu: блюдо без продуктов найдено, пустая (убранная) ячейка не ругается', w.some(x => /Пустое блюдо/.test(x)) && !M.checkMenu(D.trip, D.calc, prepo.get('sp'), P, D.menu.days.map(d => ({ ...d, b: { empty: true, items: [] } }))).some(x => /Пустое блюдо/.test(x)));
}
