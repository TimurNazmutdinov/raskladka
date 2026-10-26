// Отчёт-проверка встроенных блюд (раздел 6.5) и тест генератора на 5 человек × 7 дней. Запуск: node tests/report_dishes.mjs
import { builtinProductSets, builtinMenuSets } from '../src/builtin.js';
import { PARAMS } from '../src/defaults.js';
import * as E from '../src/engine.js';
import * as M from '../src/menu.js';

const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const psets = builtinProductSets(), msets = builtinMenuSets();
const MIN = { b: [P.min_b, 0], l: [P.min_l, P.min_l_g], d: [P.min_d, 0] };
let bad = 0; const fail = s => { bad++; console.log('  НАРУШЕНИЕ:', s); };

for (const ms of msets) {
  const ps = psets.find(p => p.id === ms.productSetId), byName = new Map(ps.items.map(p => [p.name.toLowerCase(), p]));
  console.log(`\n=== Набор меню «${ms.name}» / продуктов «${ps.name}» (${ps.items.length} продуктов, ${ms.dishes.length} блюд)`);
  console.log('блюдо'.padEnd(46), 'ккал'.padStart(5), 'г'.padStart(5), 'Б/Ж/У %'.padStart(11));
  for (const d of ms.dishes) {
    const f = M.dishFacts(d, byName), tot = f.p * 4 + f.f * 9 + f.c * 4 || 1;
    console.log((d.meal + ' ' + d.name).padEnd(46), String(Math.round(f.kcal)).padStart(5), String(Math.round(f.g)).padStart(5), `${Math.round(f.p * 400 / tot)}/${Math.round(f.f * 900 / tot)}/${Math.round(f.c * 400 / tot)}`.padStart(11));
    const miss = d.ing.filter(i => !M.altNames(i).some(n => byName.has(n)));
    if (miss.length) fail(`${d.name}: нет продуктов в наборе: ${miss.map(i => i.name).join(', ')}`);
    const mn = MIN[d.meal]; if (mn && (f.kcal < mn[0] || f.g < mn[1])) fail(`${d.name}: ${Math.round(f.kcal)} ккал / ${Math.round(f.g)} г ниже минимума ${mn[0]} ккал / ${mn[1]} г`);
    if (d.meal === 'l' && !(d.cond.includes('rest') && !d.cond.includes('any'))) { const g = M.lunchGroups(f.items); if (g.carb < P.lunch_carb || g.prot < P.lunch_prot || g.sweet < P.lunch_sweet) fail(`${d.name}: группы обеда ${JSON.stringify(g)}`); }
  }
  ps.items.forEach(p => { if (/(^|[\s(])(лук|чеснок)/i.test(p.name)) fail('в наборе есть лук/чеснок: ' + p.name); });
  ms.dishes.forEach(d => d.ing.forEach(i => { if (/лук|чеснок/i.test(i.name)) fail(`лук/чеснок в блюде ${d.name}`); }));

  // генерация: 5 человек, 7 дней
  const grp = [['М', 'M', 82, 180, 41, 1], ['М', 'M', 75, 178, 35, 1], ['Ж', 'F', 58, 165, 34, .7], ['Ж', 'F', 62, 168, 29, .7], ['М', 'M', 90, 185, 45, 1]].map(([name, sex, weight, height, age, share]) => ({ name, sex, weight, height, age, share, appetite: 1, gear: 9 }));
  const days = Array.from({ length: 7 }, (_, i) => ({ type: i === 2 ? 'Днёвка' : i === 5 ? 'Штурмовой' : 'Ходовой', km: 14, up: 700, down: 400, hours: 7, cover: 'trail', maxAlt: i === 5 ? 3400 : 1800, tdmin: 8, tdmax: i === 1 ? 28 : 16, tnmin: i === 3 ? -3 : 3, tnmax: 6 }));
  const trip = { group: grp, days, gear: { common: 14 }, food: { hot: '2', lunchHot: false }, prefs: { mode: 'std' } };
  const calc = E.computeTrip(trip, P), menu = M.buildMenu(trip, calc, ms, ps, P, null, 0), n = 5;
  console.log(`\nМеню 5 чел × 7 дней (${ms.name}):`);
  menu.days.forEach((d, i) => {
    const kc = m => Math.round(M.itemsKcal(d[m]?.items || [], ps.items) / n), per = ['b', 's', 'l', 's2', 'd'].map(kc);
    console.log(`день ${i + 1} ${days[i].type.padEnd(10)}`, ['b', 'l', 'd'].map(m => (d[m]?.name || '—').slice(0, 26).padEnd(27)).join(''), 'ккал/чел завтрак/перекус/обед/перекус/ужин:', per.join('/'), ' цель', Math.round(calc.days[i].target / n));
    ['b', 'l', 'd'].forEach((m, k) => { const mn = MIN[m]; if (d[m] && !d[m].empty && kc(m) < mn[0] - 5) fail(`день ${i + 1} ${m}: ${kc(m)} < ${mn[0]}`); if (d[m]?.empty) fail(`день ${i + 1} ${m}: нет блюда`); });
    ['b', 'l', 'd'].forEach(m => { if (i && d[m]?.dish && d[m].dish === menu.days[i - 1][m]?.dish) fail(`день ${i + 1} ${m}: блюдо повторяется два дня подряд`); });
    ['s', 's2'].forEach(k => (d[k]?.items || []).forEach(it => { if (/лук|чеснок/i.test(ps.items.find(p => p.id === it.pid)?.name)) fail('лук в перекусе'); }));
  });
  console.log('предупреждения генератора:', menu.warnings.length ? menu.warnings : 'нет');
}
console.log(bad ? `\nИТОГО нарушений: ${bad}` : '\nИТОГО: нарушений нет');
process.exitCode = bad ? 1 : 0;
