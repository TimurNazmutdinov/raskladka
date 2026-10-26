import * as M from '../src/menu.js';
import * as E from '../src/engine.js';
import { PARAMS } from '../src/defaults.js';
import { builtinProductSets, builtinMenuSets } from '../src/builtin.js';
import { buildSummary, summaryRows, summaryText } from '../src/summary.js';
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };

const pset = builtinProductSets()[0], mset = builtinMenuSets()[0];
const grp = [['M', 82, 180, 41], ['F', 58, 165, 34]].map(([sex, weight, height, age], i) => ({ name: 'p' + i, sex, weight, height, age, appetite: 1, share: 1, gear: 5 }));
const days = Array.from({ length: 3 }, () => ({ type: 'Ходовой', km: 14, up: 700, down: 400, hours: 7, cover: 'trail', maxAlt: 1800, tdmin: 8, tdmax: 20 }));
const trip = { name: 'Тест', group: grp, days, gear: { common: 14 }, food: { hot: '2' }, prefs: { mode: 'std', likes: 'плов' } };
const calc = E.computeTrip(trip, P), menu = M.buildMenu(trip, calc, mset, pset, P, null, 0);
// список покупок как в shop.js: граммы по продуктам, упаковки, цена
const need = {}; menu.days.forEach(d => Object.values(d).forEach(e => (e.items || []).forEach(it => { need[it.pid] = (need[it.pid] || 0) + it.g; })));
const rows = Object.entries(need).map(([pid, g]) => { const p = pset.items.find(x => x.id === pid), packs = Math.ceil(g / p.pack); return { p, g, reserve: 0, total: g, packs, buy: packs * p.pack, price: 0 }; });
const S = buildSummary({ trip, calc, menu, P, pset, rows, currency: '₸' });
const val = l => S.indicators.find(i => i.label.startsWith(l))?.value;

ok('участники и дни', val('Участников') === 2 && val('Дней') === 3);
ok('цель и факт энергии — числа', val('Цель энергии') > 1500 && val('Факт энергии') > 1500);
ok('факт энергии = ккал меню / чел / день', Math.abs(val('Факт энергии') - menu.days.reduce((s, d) => s + Object.values(d).reduce((a, e) => a + M.itemsKcal(e.items || [], pset.items), 0), 0) / 2 / 3) < 1);
ok('белок: цель и факт > 0', val('Цель белка') > 30 && val('Факт белка') > 30);
ok('вес закупки по упаковкам, кг', Math.abs(val('Вес закупки') - rows.reduce((s, r) => s + r.buy, 0) / 1000) < 0.06);
ok('цен нет → стоимость пусто', val('Общая стоимость') === null && S.totalCost === null);
ok('приёмов: 5 в день × 3 дня', val('Заполненных') === '15 из 15');
ok('статус калорий есть', ['OK', 'Проверить'].includes(val('Статус калорий')));
const chk = l => S.checks.find(c => c.label.startsWith(l));
ok('проверка цен: ничего не указано', !chk('Все продукты имеют цену').ok);
ok('проверка упаковок и меню OK', chk('Все упаковки').ok && chk('Меню не пустое').ok && chk('Все блюда').ok);
ok('категории: сумма кг = итого', Math.abs(S.byCategory.reduce((s, c) => s + c.kg, 0) - S.totalKg) < 0.05);
ok('заметки: любимые блюда', S.notes.join().includes('плов'));

const priced = rows.map(r => ({ ...r, price: r.packs * 100 })), S2 = buildSummary({ trip, calc, menu, P, pset, rows: priced, currency: '₸' });
ok('стоимость и на человека в день', S2.totalCost === rows.reduce((s, r) => s + r.packs * 100, 0) && S2.indicators.find(i => i.label.startsWith('Стоимость')).value === Math.round(S2.totalCost / 2 / 3));

const personal = M.buildMenu({ ...trip, prefs: { ...trip.prefs, snacks: 'personal' } }, calc, mset, pset, P, null, 0);
const S3 = buildSummary({ trip: { ...trip, prefs: { ...trip.prefs, snacks: 'personal' } }, calc, menu: personal, P, pset, rows, currency: '₸' });
ok('перекусы в личке: не считаются пустыми', S3.indicators.find(i => i.label.startsWith('Заполненных')).value === '9 из 9' && S3.checks.some(c => c.label.startsWith('Приёмы «в личке»')));
ok('строки для Excel и текст', summaryRows(S).length === 2 && summaryText(S).includes('Сводка расчёта: Тест') && summaryRows(S)[1].rows.at(-1)[0] === 'Итого');
