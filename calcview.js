// Вкладка «Расчёт»: сводка, дни с пояснением «Почему столько?», меню (сетка день × приём), замена блюд.
import { allParams, opts } from './params.js';
import { computeTrip } from './engine.js';
import { MEALS, buildMenu, mealFor, possibleFor, findDish, itemsKcal, menuWarnings } from './menu.js';
import { products, byId } from './pstore.js';
import { getTrip, saveTrip } from './trip.js';
import { esc } from './ui.js';

const n0 = x => Math.round(x).toLocaleString('ru');
const kg = g => (g / 1000).toFixed(1).replace('.', ',');
const M4 = ['b', 'l', 'd', 's'];

export function sig(trip) {
  return JSON.stringify([trip.group.map(p => [p.weight, p.height, p.age, p.sex, p.appetite, p.share, p.gear, p.veg, p.allergy, p.dislike]), trip.days.map(d => [d.type, d.km, d.up, d.down, d.hours, d.cover, d.snow, d.maxAlt, d.tday, d.tnight, d.melt]), trip.prefs, trip.food, trip.gear, trip.adj, trip.dishOff, products().filter(p => p.on).length, allParams()]);
}

// Возвращает {calc, menu, P}; пересобирает меню, если исходные данные изменились (закреплённое остаётся)
export function ensure(force = false) {
  const trip = getTrip(), P = allParams(), calc = computeTrip(trip, P);
  trip.ratings = opts.ratings || {};
  if (!calc.summary) return { calc, menu: null, P };
  const s = sig(trip);
  if (force || !trip.menu || trip.menu.sig !== s || trip.menu.days.length !== trip.days.length) {
    const seed = force ? (trip.menu?.seed || 0) + 1 : (trip.menu?.seed || 0);
    trip.menu = { ...buildMenu(trip, calc, products(), P, trip.menu, seed), sig: s };
    saveTrip();
  }
  return { calc, menu: trip.menu, P };
}

export const menuKcal = (day, prods) => M4.reduce((s, m) => s + itemsKcal(day[m]?.items || [], prods), 0);
export const menuGrams = day => M4.reduce((s, m) => s + (day[m]?.items || []).reduce((a, i) => a + i.g, 0), 0);

function why(cd, P) {
  const rows = cd.per.map(x => `<tr><td>${esc(x.p.name || 'Участник')}</td><td>${n0(x.bmr)}</td><td>${n0(x.walk)}</td><td>${n0(x.camp)}</td><td>${n0(x.cold)}</td><td>×${x.altK.toFixed(2)}</td><td>×${x.personal.toFixed(2)}${x.general !== 1 ? ' ×' + x.general.toFixed(2) : ''}</td><td><b>${n0(x.total)}</b></td></tr>`).join('');
  const x = cd.per[0], parts = x.parts.map(p => `${p.name}: ${n0(p.watts)} Вт, ${p.hours.toFixed(1)} ч, ${n0(p.kcal)} ккал`).join('; ');
  return `<details><summary>Почему столько?</summary><div class="why"><div class="tbl"><table><tr><th></th><th>Обмен</th><th>Ходьба</th><th>Остаток суток</th><th>Холод</th><th>Высота</th><th>Личн.</th><th>Итого</th></tr>${rows}</table></div>
    <p class="muted small">Обмен — расход покоя за сутки (Миффлин — Сан Жеор). Ходьба — по Пандольфу с учётом рюкзака (${x.L.toFixed(1)} кг у ${esc(x.p.name || 'первого участника')}), покрытия и поправки на недооценку. ${parts ? 'Участки у него: ' + esc(parts) + '. ' : ''}Остаток суток — ${cd.d.type === 'Днёвка' ? 'днёвка: обмен × ' + P.rest_k : 'остаток часов × обмен × ' + P.camp_k}. Холод — ${P.cold_k} ккал на градус ниже ${P.cold_t0} °C${x.t != null ? ` (сегодня ${x.t.toFixed(0)} °C)` : ', температура не задана'}. Высота — +${P.alt_pct}% на 1000 м выше ${P.alt_start} м. Личный — коэффициент аппетита и общая поправка ${P.general_pct}%.</p>
    <p class="small">Цель раскладки = потребность × покрытие${cd.appetite < 1 ? ` × аппетит на высоте ${cd.appetite}` : ''}: <b>${n0(cd.target)} ккал</b> на группу. БЖУ на человека: Б ${n0(cd.mac.p)} · Ж ${n0(cd.mac.f)} · У ${n0(cd.mac.c)} г.</p></div></details>`;
}

export const views = {
  calc(_, ctx) {
    const trip = getTrip(), { calc, menu, P } = ensure(), prods = products();
    if (!calc.summary) return { html: `<h2>Расчёт</h2>${calc.warnings.map(w => `<p class="warnmsg">${esc(w)}</p>`).join('')}<p class="empty">Заполните вкладку «Поход» (участники с возрастом, ростом и весом, дни) и «Продукты».</p>` };
    const S = calc.summary, enough = prods.filter(p => p.on).length > 10;
    const totG = menu.days.reduce((s, d) => s + menuGrams(d), 0), totK = menu.days.reduce((s, d) => s + menuKcal(d, prods), 0);
    const cov = S.need ? totK / S.need : 0, gpd = totG / S.n / S.days, covPct = Math.round(cov * 100);
    const warns = [...calc.warnings, ...menuWarnings(trip, menu, prods, P)];
    if (!enough) warns.push('Включено мало продуктов — меню может получиться неполным.');
    if (covPct < P.cov_warn) warns.push(`Общее покрытие ${covPct}% ниже порога ${P.cov_warn}%`);
    const slider = Math.round(trip.prefs.mode === 'custom' ? (trip.prefs.custom ?? P.cov_custom) : { hungry: P.cov_hungry, std: P.cov_std, full: P.cov_full }[trip.prefs.mode]);
    const cards = calc.days.map((cd, i) => {
      const day = menu.days[i], k = menuKcal(day, prods), c = cd.need ? Math.round(k / cd.need * 100) : 0, d = cd.d;
      return `<section class="dcard"><div class="dh"><b>День ${i + 1} · ${esc(d.type)}</b><span class="muted">${d.km ? d.km + ' км · ' : ''}${d.maxAlt ? Math.round(d.maxAlt) + ' м' : ''}${d.tday != null ? ` · ${Math.round(d.tday)}°/${d.tnight != null ? Math.round(d.tnight) : '—'}°` : ''}</span></div>
        <div class="nums"><div><span class="big">${n0(cd.need)}</span><span class="muted small">потребность, ккал</span></div><div><span class="big">${n0(k)}</span><span class="muted small">даёт раскладка, ккал</span></div><div><span class="big ${c < P.cov_warn ? 'bad' : 'good'}">${c}%</span><span class="muted small">покрытие</span></div><div><span class="big">${n0(menuGrams(day))}</span><span class="muted small">граммов на группу</span></div></div>
        <p class="muted small">На человека: ${cd.per.map(x => `${esc(x.p.name || '—')} ${n0(x.total)}`).join(' · ')} ккал</p>${why(cd, P)}
        <div class="meals">${M4.map(m => { const e = day[m]; const dish = e?.dish && findDish(trip, e.dish); return `<button class="meal" data-go="meal" data-arg="${i}:${m}"><span class="mh">${MEALS[m]}${e?.pin ? ' · закреплено' : ''}</span><span class="mn">${esc(dish ? dish.name : (e?.empty ? 'Убрано' : 'Нет подходящего'))}</span><span class="mi muted small">${(e?.items || []).map(it => `${esc(byId(it.pid)?.name || '?')} ${it.g} г`).join(', ')}</span></button>`; }).join('')}</div></section>`;
    }).join('');
    return {
      html: `<h2>Расчёт</h2>
        <div class="metrics"><div><span class="big">${S.days}</span><span class="muted small">дней</span></div><div><span class="big">${kg(totG)} кг</span><span class="muted small">вся раскладка</span></div><div><span class="big">${n0(gpd)} г</span><span class="muted small">на чел. в день</span></div><div><span class="big">${n0(totK / S.n / S.days)}</span><span class="muted small">ккал на чел.</span></div><div><span class="big ${covPct < P.cov_warn ? 'bad' : 'good'}">${covPct}%</span><span class="muted small">покрытие</span></div><div><span class="big">${kg(S.fuel)} кг</span><span class="muted small">газ</span></div></div>
        <p class="muted small">Ориентиры на человека в день: ${P.ref_hungry} г — голодно, ${P.ref_std} г — стандарт, ${P.ref_full} г — сытно. Оценки приблизительные и настраиваются.</p>
        <div class="fld"><label>Сытость: <b id="sv">${slider}%</b> от потребности</label><div class="ctl"><input type="range" id="slide" min="40" max="100" value="${slider}" style="width:150px"></div></div>
        <button class="btn" id="rebuild">Пересобрать меню</button><p class="muted small">Закреплённые блюда не меняются.</p>
        ${warns.length ? `<h3>Предупреждения</h3><ul class="warnlist">${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        ${cards}`,
      bind(root) {
        const sl = root.querySelector('#slide');
        sl.oninput = () => { root.querySelector('#sv').textContent = sl.value + '%'; };
        sl.onchange = () => { trip.prefs.mode = 'custom'; trip.prefs.custom = +sl.value; saveTrip(); ctx.rerender(); };
        root.querySelector('#rebuild').onclick = () => { ensure(true); ctx.rerender(); };
      },
    };
  },

  meal(arg, ctx) {
    const [i, m] = arg.split(':'), trip = getTrip(), { calc, menu, P } = ensure(), e = menu.days[i][m], prods = products();
    const dish = e.dish && findDish(trip, e.dish), opts = possibleFor(trip, prods, +i, m).filter(d => d.id !== e.dish);
    return {
      html: `<button class="back" data-go="calc">‹ Расчёт</button><h2>День ${+i + 1} · ${MEALS[m]}</h2><h3>${esc(dish?.name || (e.empty ? 'Блюдо убрано' : 'Нет подходящего блюда'))}</h3>
        <ul class="list">${(e.items || []).map(it => `<li><span>${esc(byId(it.pid)?.name || '?')}</span><b>${it.g} г</b></li>`).join('')}</ul>
        <p class="muted small">Граммы указаны на всю группу. ≈ ${Math.round(itemsKcal(e.items || [], prods))} ккал.</p>
        <div class="two">${dish ? `<button class="btn" id="pin">${e.pin ? 'Открепить' : 'Закрепить'}</button><button class="btn ghost" id="again">Другие продукты</button>` : ''}<button class="btn danger" id="del">Убрать</button></div>
        <h3>Заменить на</h3><ul class="list">${opts.map(d => `<li><button data-rep="${d.id}">${esc(d.name)}<span>›</span></button></li>`).join('') || '<li class="muted">Других подходящих блюд нет</li>'}</ul>`,
      bind(root) {
        const set = v => { menu.days[i][m] = v; saveTrip(); ctx.go('meal', arg); };
        root.querySelector('#pin')?.addEventListener('click', () => set({ ...e, pin: !e.pin }));
        root.querySelector('#again')?.addEventListener('click', () => set(mealFor(trip, calc, prods, P, +i, m, e.dish, Math.floor(Math.random() * 50) + 1)));
        root.querySelector('#del').onclick = () => { menu.days[i][m] = { empty: true, items: [], pin: false }; saveTrip(); ctx.go('calc'); };
        root.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => set(mealFor(trip, calc, prods, P, +i, m, b.dataset.rep)));
      },
    };
  },
};
