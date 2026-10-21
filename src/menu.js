// Генератор меню: собирает меню ТОЛЬКО из готовых блюд выбранного набора меню и продуктов выбранного набора продуктов.
// Блюдо: {id, meal b|l|d|s, name, cook, cond[], on, ing:[{name (допустимо «А|Б»), g, min, max}]} — граммы на человека при «стандарте».
export const MEALS = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const ORDER = ['b', 'l', 'd'];
const ONION = /(^|[\s(])(лук|чеснок)/i; // лук и чеснок отдельными продуктами не предлагаем

const has = (txt, w) => w && txt.toLowerCase().includes(w.toLowerCase());
// Подходит ли продукт всем участникам (вегетарианство, аллергии, «не ест»)
export function allowed(prod, group) {
  const tags = (prod.tags || '').split(/\s+/), nm = prod.name;
  return group.every(p => !((p.veg && tags.includes('meat')) || (p.allergy && p.allergy.split(/[,;]/).some(a => a.trim() && (has(nm, a.trim()) || tags.includes(a.trim().toLowerCase()))))
    || (p.dislike && p.dislike.split(/[,;]/).some(a => a.trim() && has(nm, a.trim())))));
}
export const itemsKcal = (items, prods) => items.reduce((s, it) => s + (it.skip ? 0 : (prods.find(p => p.id === it.pid)?.kcal || 0) * it.g / 100), 0);
const norm = s => String(s).trim().toLowerCase();
export const altNames = ing => String(ing.name).split('|').map(norm).filter(Boolean);

function dayFlags(cd, i, P) {
  const d = cd.d, tavg = cd.per[0]?.t, tmax = d.tdmax ?? d.tday;
  return { rest: d.type === 'Днёвка' || d.type === 'Запасной', hot: tmax != null && tmax > P.hot_t, cold: tavg != null && tavg < P.cold_cond_t, alt3000: (d.maxAlt || 0) > 3000, first2: i < P.fresh_days, assault: d.type === 'Штурмовой' };
}
const condOk = (dish, f) => { const c = dish.cond || []; return !c.length || c.includes('any') || c.some(k => f[k]); };
const isHotLunch = d => d.meal === 'l' && !(d.cond || []).includes('any') && (d.cond || []).some(k => k === 'rest' || k === 'cold');

function freshOk(p, i, flags) { return !p.fresh || i + 1 <= Math.round((p.shelf ?? 999) * (flags.hot ? 1 : 1.5)); }
function candidates(ing, ctx) {
  const names = altNames(ing);
  return names.map(n => ctx.byName.get(n)).filter(p => p && p.on && !ONION.test(p.name) && allowed(p, ctx.group) && freshOk(p, ctx.i, ctx.flags));
}
function pick(ing, ctx, salt) {
  const c = candidates(ing, ctx); if (!c.length) return null;
  if (c.length > 1) {
    if (ctx.flags.hot) { const h = c.find(p => (p.tags || '').includes('heat')); if (h) return h; }
    else { const nh = c.filter(p => !(p.tags || '').includes('heat')); if (nh.length) return nh[(ctx.i + salt) % nh.length]; }
  }
  return c[(ctx.i + salt) % c.length];
}
const lim = (ing, k, def) => (ing[k] != null && ing[k] !== '' ? +ing[k] : def);

// Масштабирование блюда под бюджет (ккал на человека). Возвращает {items(на 1 чел), kcal, grams} или null.
// lunchP — параметры, если нужно соблюсти группы холодного обеда (порция растёт, пока правило не выполнится).
function scale(dish, ctx, perPerson, salt, minKcal, lunchP = null) {
  const base = dish.ing.map((ing, k) => ({ ing, p: pick(ing, ctx, salt + k) }));
  if (base.some(b => !b.p)) return null;
  const nong = b => b.ing.unit && b.ing.unit !== 'г';
  const ratio = (b, f) => { if (nong(b)) return 1; const g = b.ing.g; return Math.max(lim(b.ing, 'min', g * .7) / g, Math.min(lim(b.ing, 'max', g * 1.5) / g, f)); };
  const kc = f => base.reduce((s, b) => s + (nong(b) ? 0 : b.ing.g * ratio(b, f) * (b.p.kcal || 0) / 100), 0);
  const itemsAt = f => base.map(b => ({ pid: b.p.id, g: b.ing.g * ratio(b, f), cat: b.p.cat, tags: b.p.tags || '', name: b.p.name, unit: b.ing.unit || 'г', skip: nong(b) ? `единица «${b.ing.unit}», не граммы` : null }));
  const k0 = kc(1) || 1; let f = Math.max(.3, Math.min(3, perPerson / k0)), guard = 0;
  const fail = () => (minKcal && kc(f) < minKcal) || (lunchP && !lunchOk(itemsAt(f), lunchP));
  while (fail() && f < 3 && guard++ < 80) f += .05;
  if (fail()) return null;
  const items = itemsAt(f);
  return { items, kcal: kc(f), grams: items.reduce((s, i) => s + i.g, 0) };
}
const gsum = (items, cats, tag) => items.filter(i => cats.includes(i.cat) || (tag && i.tags.includes(tag))).reduce((s, i) => s + i.g, 0);
// Правило обеда-перекуса: углеводная основа ≥50 г, белок/жир ≥40 г, сладкое ≥30 г (для холодного обеда)
export const lunchGroups = items => ({ carb: gsum(items, ['bread']), prot: gsum(items, ['meat', 'cheese'], 'protein'), sweet: gsum(items, ['sweet']) });
const lunchOk = (items, P) => { const g = lunchGroups(items); return g.carb >= P.lunch_carb && g.prot >= P.lunch_prot && g.sweet >= P.lunch_sweet; };
const carbShare = items => { let c = 0, t = 0; items.forEach(i => { t += i.g; if (['sweet', 'bread', 'grain', 'nuts'].includes(i.cat)) c += i.g; }); return t ? c / t : 0; };
const round5 = g => Math.max(1, g < 20 ? Math.round(g) : Math.round(g / 5) * 5);

function minFor(m, P, covK) {
  const k = Math.max(.8, Math.min(1, covK));
  return { b: P.min_b * k, l: P.min_l * k, d: P.min_d * k, s: 0 }[m];
}

function usable(dish, m, ctx, perPerson, P, covK) {
  if (!dish.on || dish.meal !== m || !condOk(dish, ctx.flags)) return null;
  const sc = scale(dish, ctx, perPerson, ctx.i, minFor(m, P, covK) * 1.02, m === 'l' && !isHotLunch(dish) ? P : null);
  if (!sc) return null;
  if (m === 'l' && sc.grams < P.min_l_g) return null;
  return sc;
}

const mainGrain = (dish, ctx) => { const ing = dish.ing[0]; if (!ing) return null; const p = pick(ing, ctx, ctx.i); return p && p.cat === 'grain' ? p.id : null; };

function toEntry(dish, sc, n, ctx) {
  const items = sc.items.map(it => ({ pid: it.pid, g: it.skip ? Math.round(it.g * n * 100) / 100 : round5(it.g * n), unit: it.unit, skip: it.skip }));
  return { dish: dish.id, name: dish.name, items, cook: dish.cook || 0, perKcal: Math.round(sc.kcal), perGrams: Math.round(sc.grams), pin: false };
}

// Полная сборка меню. old — прежнее меню (закреплённые блюда сохраняются)
export function buildMenu(trip, calc, mset, pset, P, old = null, seed = 0) {
  const group = trip.group, n = calc.summary.n, prods = pset?.items || [], warnings = [], days = [];
  if (!mset || !prods.length) return { days: calc.days.map(() => ({})), warnings: ['Не выбран набор меню или набор продуктов.'], seed };
  const byName = new Map(prods.map(p => [norm(p.name), p]));
  const usage = {}, lastMeal = {};
  const cov = calc.days.length ? calc.days[0].cover : 0.67, covK = cov / 0.67;
  const hotLunchAlways = trip.food.lunchHot || String(trip.food.hot) === '3';
  calc.days.forEach((cd, i) => {
    const flags = dayFlags(cd, i, P), ctx = { i, flags, byName, group, n }, day = {}, used = new Set(), perDay = cd.target / n;
    const split = { b: P.split_b, l: P.split_l, d: P.split_d, s: P.split_s };
    const adj = m => ((trip.adj?.meal?.[m] ?? 0) / 100 + 1) * ((trip.adj?.dayType?.[cd.d.type] ?? 0) / 100 + 1);
    ORDER.forEach((m, mi) => {
      const budget = perDay * split[m] / 100 * adj(m), prev = old?.days?.[i]?.[m];
      if (prev?.fixed) { day[m] = prev; return; }
      if (prev?.empty) { day[m] = { empty: true, items: [] }; return; }
      let dishes = mset.dishes.filter(d => d.meal === m);
      if (prev?.pin && prev.dish) { const d = dishes.find(x => x.id === prev.dish); const sc = d && scale(d, ctx, budget, i, 0); if (sc) { day[m] = { ...toEntry(d, sc, n, ctx), pin: true }; usage[d.id] = (usage[d.id] || 0) + 1; lastMeal[m] = d.id; const g = mainGrain(d, ctx); if (g) used.add(g); return; } }
      let cand = dishes.map(d => ({ d, sc: usable(d, m, ctx, budget, P, covK) })).filter(x => x.sc);
      if (m === 'l') {
        const hot = cand.filter(x => isHotLunch(x.d)), cold = cand.filter(x => !isHotLunch(x.d));
        if (hotLunchAlways && hot.length) cand = hot; else if ((flags.rest || flags.cold) && hot.length) cand = hot; else if (cold.length) cand = cold;
      }
      if (flags.assault) { const q = cand.filter(x => (x.d.cook || 0) <= P.assault_cook); cand = q.length ? q : [...cand].sort((a, b) => (a.d.cook || 0) - (b.d.cook || 0)).slice(0, 2); }
      const fresh = cand.filter(x => x.d.id !== lastMeal[m]); if (fresh.length) cand = fresh;
      const nograin = cand.filter(x => { const g = mainGrain(x.d, ctx); return !g || !used.has(g); }); if (nograin.length) cand = nograin;
      const recent = id => menuRecent(days, i, m, id, P.rot_days);
      const h = id => { let x = 0; for (const ch of id + seed + i + m) x = (x * 31 + ch.charCodeAt(0)) % 997; return x % 10; };
      cand.sort((a, b) => {
        const sc = x => (usage[x.d.id] || 0) * 4 + (recent(x.d.id) ? 20 : 0) + h(x.d.id) + Math.abs(x.sc.kcal - budget) / 40 + ((flags.alt3000 && (m === 'l')) ? -carbShare(x.sc.items) * 12 : 0) - (trip.ratings?.[x.d.id] || 0) * 3;
        return sc(a) - sc(b);
      });
      const best = cand[0];
      if (!best) { day[m] = { empty: true, items: [], none: true }; warnings.push(`День ${i + 1}, ${MEALS[m].toLowerCase()}: нет подходящего блюда в наборе (проверьте продукты и условия блюд)`); return; }
      usage[best.d.id] = (usage[best.d.id] || 0) + 1; lastMeal[m] = best.d.id; const g = mainGrain(best.d, ctx); if (g) used.add(g);
      day[m] = toEntry(best.d, best.sc, n, ctx);
    });
    // перекусы: остаток дневной цели
    const eaten = ORDER.reduce((s, m) => s + itemsKcal(day[m]?.items || [], prods), 0);
    const rem = Math.max(0, cd.target - eaten) * adj('s');
    day.s = buildSnack(rem, n, ctx, prods, mset, P, i);
    days.push(day);
  });
  // проверки минимумов по каждому дню
  days.forEach((d, i) => ORDER.forEach(m => { const e = d[m]; if (!e || e.empty) return; const per = itemsKcal(e.items, prods) / n, mn = minFor(m, P, covK); if (per < mn * 0.97) warnings.push(`День ${i + 1}, ${MEALS[m].toLowerCase()}: ${Math.round(per)} ккал на человека, меньше минимума ${Math.round(mn)}`); }));
  return { days, warnings, seed };
}
const menuRecent = (days, i, m, id, k) => days.slice(Math.max(0, i - k + 1)).some(d => d[m]?.dish === id);

function buildSnack(rem, n, ctx, prods, mset, P, i) {
  if (rem < 50 * n) return { items: [], name: 'Перекус', kcalLeft: 0 };
  let cand = prods.filter(p => p.on && ['sweet', 'nuts'].includes(p.cat) && p.kcal > 150 && !/паста/i.test(p.name) && !ONION.test(p.name) && allowed(p, ctx.group) && freshOk(p, i, ctx.flags));
  if (ctx.flags.alt3000) { const sw = cand.filter(p => p.f < 25 || p.c > 55); if (sw.length >= 3) cand = sw; }
  if (!cand.length) return { items: [], name: 'Перекус' };
  cand.sort((a, b) => ((a.name.charCodeAt(0) + i * 7) % 11) - ((b.name.charCodeAt(0) + i * 7) % 11));
  const cap = P.snack_cap * n; let k = Math.min(3, cand.length), items = [];
  for (; k <= Math.min(6, cand.length); k++) {
    items = cand.slice(0, k).map(p => ({ pid: p.id, g: Math.min(cap, round5(rem / k / p.kcal * 100)) }));
    if (itemsKcal(items, prods) >= rem * .93) break;
  }
  return { items, name: 'Перекус из набора', pin: false, dish: null };
}

// Повтор сборки одного приёма с выбранным блюдом (ручная замена)
export function mealFor(trip, calc, mset, pset, P, i, m, dishId) {
  const cd = calc.days[i], n = calc.summary.n, prods = pset.items, byName = new Map(prods.map(p => [norm(p.name), p]));
  const ctx = { i, flags: dayFlags(cd, i, P), byName, group: trip.group, n }, d = mset.dishes.find(x => x.id === dishId);
  const split = { b: P.split_b, l: P.split_l, d: P.split_d }[m], sc = d && scale(d, ctx, cd.target / n * split / 100, i, 0);
  return sc ? { ...toEntry(d, sc, n, ctx), pin: true } : { empty: true, items: [] };
}
export function possibleFor(trip, calc, mset, pset, P, i, m) {
  const n = calc.summary.n, cd = calc.days[i], byName = new Map(pset.items.map(p => [norm(p.name), p]));
  const ctx = { i, flags: dayFlags(cd, i, P), byName, group: trip.group, n }, covK = calc.days[0].cover / 0.67;
  return mset.dishes.filter(d => d.meal === m && usable(d, m, ctx, cd.target / n * ({ b: P.split_b, l: P.split_l, d: P.split_d }[m]) / 100, P, covK));
}
export const findDish = (mset, id) => mset?.dishes.find(d => d.id === id);

// Проблемы набора меню относительно набора продуктов: [{dish, ing, alts:[{name,state}]}], state: ok | off | missing
export function menuProblems(mset, pset) {
  const byName = new Map((pset?.items || []).map(p => [norm(p.name), p])), out = [];
  (mset?.dishes || []).forEach(d => d.ing.forEach(ing => {
    const alts = altNames(ing).map(n => { const p = byName.get(n); return { name: n, id: p?.id, state: !p ? 'missing' : p.on ? 'ok' : 'off' }; });
    if (!alts.some(a => a.state === 'ok')) out.push({ dish: d, ing, alts });
  }));
  return out;
}
export const menuWarnings = menu => menu?.warnings || [];

// Таблица «ккал / граммы / БЖУ на человека» для блюда (для отчёта-проверки)
export function dishFacts(dish, byName) {
  let kcal = 0, g = 0, p = 0, f = 0, c = 0; const items = [];
  for (const ing of dish.ing) { const pr = altNames(ing).map(n => byName.get(n)).find(Boolean); if (!pr) continue; kcal += ing.g * pr.kcal / 100; g += ing.g; p += ing.g * pr.p / 100; f += ing.g * pr.f / 100; c += ing.g * pr.c / 100; items.push({ g: ing.g, cat: pr.cat, tags: pr.tags || '', name: pr.name }); }
  return { kcal, g, p, f, c, items };
}
