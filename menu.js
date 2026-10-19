// Генератор меню: блюдо = шаблон из слотов, подбор с ротацией, учётом ограничений, свежести и закреплённых блюд.
// Слот: [роль, ключевые слова через | (по названию продукта) или cat:категория, доля ккал блюда, необязательный, фикс [г на группу, г на человека]]
// Приёмы: b завтрак, c обед холодный, h обед горячий, d ужин, s перекусы на ходу.
const S = (role, kw, frac, opt = 0, fixed = null) => ({ role, kw, frac, opt, fixed });
const D = (id, name, meal, tags, ...slots) => ({ id, name, meal, tags, slots });

export const MEALS = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекусы' };
export const DISHES = [
  // завтраки молочные
  D('b1', 'Овсянка с молоком и сухофруктами', 'b', 'milk', S('основа', 'Овсяные хлопья|Овсянка быстрого', .55), S('молоко', 'Молоко сухое', .15), S('сладкое', 'Курага|Изюм|Чернослив|Финики', .2), S('жир', 'Масло топлёное|Масло сливочное', .1), S('соль', 'Соль', 0, 0, [3, 0.5])),
  D('b2', 'Манная каша с вареньем', 'b', 'milk', S('основа', 'Манка', .55), S('молоко', 'Молоко сухое', .2), S('сладкое', 'Варенье|Мёд', .15), S('жир', 'Масло топлёное|Масло сливочное', .1)),
  D('b3', 'Рисовая каша с изюмом', 'b', 'milk', S('основа', 'Рис круглозёрный', .55), S('молоко', 'Молоко сухое', .2), S('сладкое', 'Изюм|Курага', .15), S('жир', 'Масло топлёное|Масло сливочное', .1)),
  D('b4', 'Пшённая каша с курагой', 'b', 'milk', S('основа', 'Пшено', .55), S('молоко', 'Молоко сухое', .15), S('сладкое', 'Курага|Изюм', .2), S('жир', 'Масло топлёное|Масло сливочное', .1)),
  D('b5', 'Мюсли с молоком и орехами', 'b', 'milk', S('основа', 'Мюсли|Овсянка быстрого', .6), S('молоко', 'Молоко сухое', .2), S('орехи', 'Грецкий|Арахис|Миндаль', .2)),
  D('b6', 'Кукурузная каша с сыром', 'b', 'milk', S('основа', 'Кукурузная крупа', .55), S('сыр', 'Сыр твёрдый|Сыр плавленый', .25), S('жир', 'Масло топлёное|Масло сливочное', .2)),
  D('b7', 'Каша быстрая с молоком', 'b', 'milk', S('основа', 'Каша быстрая в пакете|Овсянка быстрого', .8), S('молоко', 'Молоко сухое', .2)),
  // завтраки мясные
  D('b8', 'Гречка с тушёнкой', 'b', 'meat', S('основа', 'Гречка', .5), S('мясо', 'Тушёнка', .35), S('жир', 'Масло топлёное|Масло подсолнечное', .15), S('лук', 'Лук репчатый', 0, 1, [50, 10])),
  D('b9', 'Рис с колбасой', 'b', 'meat', S('основа', 'Рис', .5), S('мясо', 'Колбаса сырокопчёная|Казы|Колбаса сыровяленая', .35), S('жир', 'Масло топлёное|Масло подсолнечное', .15)),
  D('b10', 'Лапша с яйцом и сыром', 'b', 'meat', S('основа', 'Лапша быстрого|Вермишель', .55), S('сыр', 'Сыр твёрдый|Сыр плавленый', .25), S('жир', 'Масло топлёное|Масло подсолнечное', .2)),
  D('b11', 'Пюре с салом и сухарями', 'b', 'meat', S('основа', 'Картофельное пюре', .5), S('сало', 'Сало', .3), S('хлеб', 'Сухари', .2)),
  // обед холодный
  D('c1', 'Бутерброды: сухари, сыр, колбаса', 'c', '', S('хлеб', 'Сухари|Лаваш|Лепёшка', .4), S('сыр', 'Сыр твёрдый|Сыр копчёный|Сыр плавленый', .3), S('мясо', 'Колбаса сырокопчёная|Казы|Шұжық|Колбаса сыровяленая', .3)),
  D('c2', 'Лепёшка с халвой и орехами', 'c', '', S('хлеб', 'Лаваш|Лепёшка|Сухари', .4), S('сладкое', 'Халва', .35), S('орехи', 'Арахис|Грецкий|Миндаль', .25)),
  D('c3', 'Хлебцы с паштетом и сыром', 'c', '', S('хлеб', 'Хлебцы|Крекер', .4), S('паштет', 'Паштет', .3), S('сыр', 'Сыр твёрдый|Сыр плавленый', .3)),
  D('c4', 'Курт с сухарями и сухофруктами', 'c', '', S('хлеб', 'Сухари', .4), S('сыр', 'Курт|Иримшик', .3), S('сладкое', 'Курага|Изюм|Финики', .3)),
  D('c5', 'Крекеры с салом и чесноком', 'c', 'pork', S('хлеб', 'Крекер|Сухари', .4), S('сало', 'Сало|Грудинка', .5), S('чеснок', 'Чеснок', 0, 1, [20, 3])),
  D('c6', 'Лаваш с сыром и мёдом', 'c', '', S('хлеб', 'Лаваш|Лепёшка|Сухари', .45), S('сыр', 'Сыр твёрдый|Брынза|Сыр плавленый', .3), S('мёд', 'Мёд|Варенье', .25)),
  // обед горячий (супы)
  D('h1', 'Гороховый суп с копчёностями', 'h', 'hot', S('основа', 'Суп в пакете (гороховый)', .55), S('мясо', 'Грудинка|Колбаса сырокопчёная|Сало', .3), S('хлеб', 'Сухари', .15)),
  D('h2', 'Лапша куриная с сухарями', 'h', 'hot', S('основа', 'Суп в пакете (куриный', .6), S('хлеб', 'Сухари', .2), S('сыр', 'Сыр твёрдый', .2)),
  D('h3', 'Борщ из пакета', 'h', 'hot', S('основа', 'Борщ в пакете', .5), S('мясо', 'Тушёнка|Сало', .3), S('хлеб', 'Сухари', .2)),
  D('h4', 'Харчо с лавашом', 'h', 'hot', S('основа', 'Харчо в пакете', .55), S('мясо', 'Тушёнка|Колбаса', .25), S('хлеб', 'Лаваш|Сухари', .2)),
  // ужины
  D('d1', 'Гречка с тушёнкой', 'd', 'hot', S('основа', 'Гречка', .45), S('мясо', 'Тушёнка говяжья', .35), S('жир', 'Масло топлёное|Масло подсолнечное', .15), S('сыр', 'Сыр твёрдый', .05, 1), S('лук', 'Лук репчатый', 0, 1, [100, 15]), S('соль', 'Соль', 0, 0, [3, 0.5])),
  D('d2', 'Плов с тушёнкой', 'd', 'hot', S('основа', 'Рис', .5), S('мясо', 'Тушёнка', .3), S('жир', 'Масло подсолнечное|Масло топлёное', .2), S('морковь', 'Морковь', 0, 1, [100, 20]), S('лук', 'Лук репчатый', 0, 1, [100, 15])),
  D('d3', 'Макароны по-флотски', 'd', 'hot', S('основа', 'Макароны', .5), S('мясо', 'Тушёнка', .35), S('жир', 'Масло подсолнечное|Масло топлёное', .15), S('томат', 'Томатная паста', 0, 1, [30, 5])),
  D('d4', 'Пшено с тушёнкой и луком', 'd', 'hot', S('основа', 'Пшено', .5), S('мясо', 'Тушёнка', .35), S('жир', 'Масло топлёное|Масло подсолнечное', .15), S('лук', 'Лук репчатый', 0, 1, [100, 15])),
  D('d5', 'Булгур с копчёностями', 'd', 'hot', S('основа', 'Булгур|Кускус', .5), S('мясо', 'Колбаса|Казы|Грудинка', .3), S('жир', 'Масло топлёное|Масло подсолнечное', .2), S('овощи', 'Овощи сушёные', 0, 1, [20, 5])),
  D('d6', 'Чечевичная похлёбка с салом', 'd', 'hot', S('основа', 'Чечевица красная', .5), S('сало', 'Сало|Грудинка', .3), S('хлеб', 'Сухари', .2), S('лук', 'Лук репчатый', 0, 1, [100, 15])),
  D('d7', 'Картофельное пюре с тушёнкой', 'd', 'hot', S('основа', 'Картофельное пюре', .5), S('мясо', 'Тушёнка', .35), S('жир', 'Масло топлёное|Масло сливочное', .15)),
  D('d8', 'Лапша с тушёнкой и сыром', 'd', 'hot', S('основа', 'Макароны|Вермишель|Лапша быстрого', .5), S('мясо', 'Тушёнка|Колбаса', .3), S('сыр', 'Сыр твёрдый', .2)),
  D('d9', 'Рис с грибами и сыром', 'd', 'hot', S('основа', 'Рис', .5), S('грибы', 'Грибы сушёные', .05, 1), S('сыр', 'Сыр твёрдый|Сыр копчёный', .25), S('жир', 'Масло топлёное|Масло подсолнечное', .2)),
  D('d10', 'Фасоль с томатом и сухарями', 'd', 'hot', S('основа', 'Фасоль|Нут', .5), S('мясо', 'Колбаса|Сало|Тушёнка', .25), S('жир', 'Масло подсолнечное|Масло топлёное', .15), S('хлеб', 'Сухари', .1)),
  D('d11', 'Горячее из соевого мяса с рисом', 'd', 'hot veg', S('основа', 'Рис', .55), S('соя', 'Соевое мясо', .2), S('жир', 'Масло подсолнечное|Масло топлёное', .25)),
  D('d12', 'Овощное рагу с булгуром', 'd', 'hot veg', S('основа', 'Булгур|Кускус', .55), S('овощи', 'Овощи сушёные|Картофель сушёный', .1), S('жир', 'Масло подсолнечное|Масло топлёное', .2), S('сыр', 'Сыр твёрдый', .15, 1)),
  // перекусы
  D('s1', 'Орехи и сухофрукты', 's', '', S('орехи', 'Грецкий|Арахис|Миндаль|Смесь орехов', .5), S('сухофрукты', 'Курага|Изюм|Финики|Чернослив|Инжир', .5)),
  D('s2', 'Шоколад и козинаки', 's', '', S('шоколад', 'Шоколад', .5), S('козинаки', 'Козинаки|Халва', .5)),
  D('s3', 'Батончики и печенье', 's', '', S('батончик', 'Батончик', .5), S('печенье', 'Печенье', .5)),
  D('s4', 'Халва и леденцы', 's', '', S('халва', 'Халва', .7), S('леденцы', 'Леденцы|Конфеты', .3)),
  D('s5', 'Курага с грецким орехом и шоколадом', 's', '', S('курага', 'Курага|Инжир', .35), S('орех', 'Грецкий|Миндаль', .35), S('шоколад', 'Шоколад', .3)),
  D('s6', 'Зефир, мёд и орехи', 's', '', S('сладкое', 'Зефир|Мёд|Щербет', .5), S('орехи', 'Арахис|Фундук|Грецкий', .5)),
];

// ---- ограничения и свежесть ----
const has = (txt, w) => w && txt.toLowerCase().includes(w.toLowerCase());
export function allowed(prod, group) {
  const tags = (prod.tags || '').split(/\s+/), nm = prod.name;
  return group.every(p => !((p.veg && tags.includes('meat')) || (p.allergy && p.allergy.split(/[,;]/).some(a => a.trim() && (has(nm, a.trim()) || tags.includes(a.trim().toLowerCase()))))
    || (p.dislike && p.dislike.split(/[,;]/).some(a => a.trim() && has(nm, a.trim())))));
}
const freshOk = (prod, dayIdx, temp, P) => !prod.fresh || dayIdx + 1 <= ((temp ?? 15) > 20 ? prod.hot : prod.cool);

function resolve(slot, ctx, salt) {
  const list = slot.kw.split('|').flatMap(k => ctx.prods.filter(p => p.on && p.name.toLowerCase().includes(k.toLowerCase())));
  const uniq = [...new Set(list)].filter(p => allowed(p, ctx.group) && freshOk(p, ctx.dayIdx, ctx.temp));
  if (!uniq.length) return null;
  return uniq[(ctx.dayIdx + salt) % uniq.length];
}

export function dishPossible(dish, ctx) {
  if (ctx.prefs.dislikes && ctx.prefs.dislikes.split(/[,;]/).some(a => a.trim() && has(dish.name, a.trim()))) return false;
  return dish.slots.every(s => s.opt || resolve(s, ctx, 0));
}

// Строит позиции блюда на бюджет ккал группы (kcal) и n человек
export function buildItems(dish, kcal, ctx, salt = 0, adj = {}) {
  const items = [];
  dish.slots.forEach((s, k) => {
    const p = resolve(s, ctx, salt + k);
    if (!p) return;
    let g;
    if (s.fixed) g = s.fixed[0] + s.fixed[1] * ctx.n;
    else g = p.kcal > 0 ? kcal * s.frac / p.kcal * 100 : 0;
    if (adj[p.id]) g += adj[p.id] * ctx.n;
    if (g > 0) items.push({ pid: p.id, g: Math.max(5, Math.round(g / (g > 400 ? 10 : 5)) * (g > 400 ? 10 : 5)), role: s.role });
  });
  return items;
}

export const itemsKcal = (items, prods) => items.reduce((s, it) => s + (prods.find(p => p.id === it.pid)?.kcal || 0) * it.g / 100, 0);

// Полная сборка меню. calc — результат computeTrip; старое меню (закреплённое сохраняется)
export function buildMenu(trip, calc, prods, P, old = null, seed = 0) {
  const group = trip.group, n = group.filter(p => p.weight).length || 1, pr = trip.prefs;
  const split = { b: P.split_b, l: P.split_l, d: P.split_d, s: P.split_s };
  const lunchHot = trip.food.lunchHot || String(trip.food.hot) === '3';
  const usage = {}, last = {}, menu = [], adj = trip.adj?.product || {};
  const mealDishes = m => DISHES.filter(d => !(trip.dishOff || []).includes(d.id) && (m === 'l' ? d.meal === (lunchHot ? 'h' : 'c') : d.meal === m)).concat((trip.customDishes || []).filter(d => (m === 'l' ? d.meal === (lunchHot ? 'h' : 'c') : d.meal === m)));
  calc.days.forEach((cd, i) => {
    const day = { };
    const rest = cd.d.type === 'Днёвка';
    const ctx = { prods, group, dayIdx: i, temp: cd.d.tday, n, prefs: pr };
    ['b', 'l', 'd', 's'].forEach((m, mi) => {
      const prev = old?.days?.[i]?.[m];
      const budget = budgetOf(trip, cd, m, P);
      if (prev?.pin && prev.dish) { day[m] = { ...prev, items: prev.custom ? prev.items : buildItems(findDish(trip, prev.dish), budget, ctx, seed, adj) }; if (!day[m].items.length) day[m].items = prev.items; usage[prev.dish] = (usage[prev.dish] || 0) + 1; last[m] = prev.dish; return; }
      if (prev?.empty) { day[m] = { empty: true, items: [] }; return; }
      let cands = mealDishes(m).filter(d => dishPossible(d, ctx));
      if (m === 'b') { const pref = cands.filter(d => d.tags.includes(pr.breakfast)); if (pref.length) cands = pref; }
      if (n && group.some(p => p.veg)) { const v = cands.filter(d => !d.tags.includes('meat') || d.tags.includes('veg')); if (v.length) cands = v; }
      cands.sort((a, b) => {
        const pa = (usage[a.id] || 0) >= P.base_max ? 100 : 0, pb = (usage[b.id] || 0) >= P.base_max ? 100 : 0;
        const ra = recent(menu, i, a.id, P.rot_days) ? 50 : 0, rb = recent(menu, i, b.id, P.rot_days) ? 50 : 0;
        const rating = id => -(trip.ratings?.[id] || 0) * 5;
        const h = id => ((id.charCodeAt(0) * 31 + id.length * 7 + i * 13 + mi * 5 + seed * 17 + (id.charCodeAt(1) || 0) * 3) % 10);
        return (pa + ra + (usage[a.id] || 0) * 3 + rating(a.id) + h(a.id)) - (pb + rb + (usage[b.id] || 0) * 3 + rating(b.id) + h(b.id));
      });
      // основа не повторяется два приёма подряд
      const dish = cands.find(d => d.id !== last[m] && !sameBase(d, last)) || cands[0];
      if (!dish) { day[m] = { empty: true, items: [], dish: null }; return; }
      usage[dish.id] = (usage[dish.id] || 0) + 1; last[m] = dish.id; last._prevBase = baseOf(dish);
      day[m] = { dish: dish.id, items: buildItems(dish, budget, ctx, seed + i, adj), pin: false };
    });
    // добор до цели перекусами
    const eaten = ['b', 'l', 'd', 's'].reduce((s, m) => s + itemsKcal(day[m]?.items || [], prods), 0);
    const diff = cd.target - eaten;
    if (day.s?.items?.length && Math.abs(diff) > cd.target * .02) {
      const sk = itemsKcal(day.s.items, prods), f = Math.max(0.3, Math.min(2.5, (sk + diff) / (sk || 1)));
      day.s.items = day.s.items.map(it => ({ ...it, g: Math.max(5, Math.round(it.g * f / 5) * 5) }));
    }
    menu.push(day);
  });
  return { days: menu, seed };
}
const baseOf = d => d.slots[0]?.kw;
const sameBase = (d, last) => last._prevBase && baseOf(d) === last._prevBase;
const recent = (menu, i, id, k) => menu.slice(Math.max(0, i - k + 1)).some(day => ['b', 'l', 'd', 's'].some(m => day[m]?.dish === id));
export const findDish = (trip, id) => DISHES.find(d => d.id === id) || (trip.customDishes || []).find(d => d.id === id);
export const dishesFor = (trip, m) => {
  const lunchHot = trip.food.lunchHot || String(trip.food.hot) === '3';
  const t = m === 'l' ? (lunchHot ? 'h' : 'c') : m;
  return [...DISHES, ...(trip.customDishes || [])].filter(d => d.meal === t && !(trip.dishOff || []).includes(d.id));
};

// Проверки меню: повторы основы подряд, аллергии, порча
export function menuWarnings(trip, menu, prods, P) {
  const w = [], pid = id => prods.find(p => p.id === id);
  menu.days.forEach((day, i) => {
    const t = trip.days[i]?.tday;
    ['b', 'l', 'd', 's'].forEach(m => (day[m]?.items || []).forEach(it => {
      const p = pid(it.pid); if (!p) return;
      if (!allowed(p, trip.group)) w.push(`День ${i + 1}, ${MEALS[m].toLowerCase()}: «${p.name}» не подходит кому-то из группы`);
      if (p.fresh && i + 1 > ((t ?? 15) > 20 ? p.hot : p.cool)) w.push(`«${p.name}» испортится к дню ${i + 1}${t != null ? ` при ${Math.round(t)} °C` : ''}`);
    }));
    if (i && day.d?.dish && day.d.dish === menu.days[i - 1].d?.dish) w.push(`Ужин повторяется в днях ${i} и ${i + 1}`);
  });
  return [...new Set(w)];
}

export const budgetOf = (trip, cd, m, P) => cd.target * ({ b: P.split_b, l: P.split_l, d: P.split_d, s: P.split_s }[m]) / 100 * ((trip.adj?.meal?.[m] ?? 0) / 100 + 1) * ((trip.adj?.dayType?.[cd.d.type] ?? 0) / 100 + 1);

// Новое блюдо на один приём (ручная замена / пересборка блюда)
export function mealFor(trip, calc, prods, P, i, m, dishId, salt = 0) {
  const cd = calc.days[i], n = trip.group.filter(p => p.weight).length || 1;
  const ctx = { prods, group: trip.group, dayIdx: i, temp: cd.d.tday, n, prefs: trip.prefs };
  return { dish: dishId, items: buildItems(findDish(trip, dishId), budgetOf(trip, cd, m, P), ctx, salt, trip.adj?.product || {}), pin: true };
}
export const possibleFor = (trip, prods, i, m) => dishesFor(trip, m).filter(d => dishPossible(d, { prods, group: trip.group, dayIdx: i, temp: trip.days[i]?.tday, n: 1, prefs: trip.prefs }));
