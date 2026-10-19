// Вкладка «Покупки»: список, фасовка, рюкзаки, топливо и вода, экспорт.
import { allParams, opts, saveOpts } from './params.js';
import { SHOP_DEPT } from './products.js';
import { MEALS, findDish, allowed } from './menu.js';
import { products, byId } from './pstore.js';
import { getTrip, saveTrip, setTrip, newTrip } from './trip.js';
import { ensure, menuGrams } from './calcview.js';
import { esc } from './ui.js';

const M4 = ['b', 'l', 'd', 's'], n0 = x => Math.round(x).toLocaleString('ru'), kg = g => (g / 1000).toFixed(1).replace('.', ',');
const DEPT_ORDER = ['Овощи', 'Хлеб', 'Мясо', 'Молочный отдел', 'Бакалея', 'Специи', 'Сладкое', 'Сухофрукты и орехи', 'Напитки', 'Прочее'];

// Аварийный запас: калорийные продукты на reserve_days дней
function reserveItems(trip, calc, P) {
  const parts = [['Грецкий|Арахис|Миндаль', .3], ['Шоколад', .25], ['Халва|Козинаки', .25], ['Масло топлёное|Сало', .2]], out = [];
  const kcal = calc.summary.reserveKcal;
  parts.forEach(([kw, f]) => {
    const p = products().find(x => x.on && kw.split('|').some(k => x.name.includes(k)) && allowed(x, trip.group));
    if (p && p.kcal > 0) out.push({ pid: p.id, g: Math.round(kcal * f / p.kcal * 100 / 10) * 10 });
  });
  return out;
}

export function shopData() {
  const trip = getTrip(), { calc, menu, P } = ensure();
  if (!menu) return null;
  const n = calc.summary.n, need = {}, add = (pid, g, tag) => { need[pid] ??= { g: 0, reserve: 0 }; need[pid][tag || 'g'] += g; };
  menu.days.forEach(d => M4.forEach(m => (d[m]?.items || []).forEach(it => add(it.pid, it.g))));
  const extra = (name, g) => { const p = products().find(x => x.on && x.name === name); if (p && g > 0) add(p.id, g); };
  extra('Чай чёрный', P.tea_g * n * menu.days.length);
  if (trip.prefs.sugar === 'common') extra('Сахар', P.sugar_g * n * menu.days.length);
  extra('Соль', P.salt_fix + P.salt_pp * n * menu.days.length);
  const reserve = reserveItems(trip, calc, P);
  reserve.forEach(it => add(it.pid, it.g, 'reserve'));
  const rows = Object.entries(need).map(([pid, v]) => {
    const p = byId(pid); if (!p) return null;
    const total = v.g + v.reserve, packs = p.pack ? Math.ceil(total / p.pack - 1e-9) : null;
    return { p, g: v.g, reserve: v.reserve, total, packs, buy: opts.round && packs ? packs * p.pack : total, price: p.price && packs ? packs * p.price : (p.price ? p.price * total / (p.pack || 100) : 0), dept: SHOP_DEPT[p.cat] || 'Прочее' };
  }).filter(Boolean);
  return { trip, calc, menu, P, rows, n, reserve };
}

const bought = t => (t.bought ||= {});
const fuelDays = (calc, P) => calc.days.map(d => d.fuel);

function weights(D) {
  const { trip, calc, menu } = D, g = calc.days[0].per.map(x => x.p), shareSum = g.reduce((s, p) => s + (p.share || 1), 0);
  const dayFood = menu.days.map((d, i) => menuGrams(d) + calc.days[i].fuel + 0);
  const menuG = menu.days.reduce((t, d) => t + menuGrams(d), 0), resTotal = D.rows.reduce((t, r) => t + r.reserve, 0);
  const extras = Math.max(0, D.rows.reduce((t, r) => t + r.total - r.reserve, 0) - menuG);
  const drops = (trip.drops || []).map(d => +d.after).filter(Boolean).sort((a, b) => a - b);
  const common = trip.gear.common || 0;
  return g.map(p => {
    const sh = (p.share || 1) / shareSum, byDay = dayFood.map((_, d) => {
      const end = drops.find(a => a >= d + 1 && a < dayFood.length) ?? dayFood.length;
      const seg = dayFood.slice(d, end).reduce((a, b) => a + b, 0) + resTotal;
      return ((p.gear || 0) + common * sh) + (seg + extras) * sh / 1000;
    });
    return { p, sh, byDay };
  });
}

function textExport(D) {
  const { trip, rows, calc } = D, t = [`Раскладка: ${trip.name || 'поход'}`, `${calc.summary.days} дн., ${calc.summary.n} чел.`, '', 'СПИСОК ПОКУПОК'];
  DEPT_ORDER.forEach(dep => { const r = rows.filter(x => x.dept === dep); if (r.length) { t.push(dep + ':'); r.forEach(x => t.push(`  ${x.p.name} — ${x.packs && opts.round ? `${x.packs} уп. (${n0(x.buy)} г)` : n0(x.total) + ' г'}`)); } });
  t.push('', 'ПО ДНЯМ');
  D.menu.days.forEach((d, i) => { t.push(`День ${i + 1}`); M4.forEach(m => { const e = d[m]; if (e?.items?.length) t.push(`  ${MEALS[m]}: ${findDish(trip, e.dish)?.name || ''} — ${e.items.map(it => `${byId(it.pid)?.name} ${it.g} г`).join(', ')}`); }); });
  return t.join('\n');
}
const csvExport = D => '﻿Товар;Нужно, г;Резерв, г;Упаковка, г;Упаковок;Купить, г;Отдел\n' + D.rows.map(r => [r.p.name, r.g, r.reserve, r.p.pack || '', r.packs ?? '', r.buy, r.dept].join(';')).join('\n');
function download(name, text, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

export const views = {
  shop(_, ctx) {
    const D = shopData();
    if (!D) return { html: '<h2>Покупки</h2><p class="empty">Список появится после расчёта: заполните поход и продукты.</p>' };
    const tab = ctx.state.shopTab || 'list', { trip, calc, menu, P, rows, n } = D, b = bought(trip);
    const tabs = [['list', 'Список'], ['pack', 'Фасовка'], ['bags', 'Рюкзаки'], ['fuel', 'Топливо'], ['exp', 'Экспорт']];
    let body = '';
    if (tab === 'list') {
      const sum = rows.reduce((s, r) => s + r.price, 0);
      body = `<div class="fld"><label>Крупный шрифт (для магазина)</label><div class="ctl"><input type="checkbox" id="big"${ctx.state.big ? ' checked' : ''}></div></div>
        ${DEPT_ORDER.map(dep => { const r = rows.filter(x => x.dept === dep).sort((a, b) => a.p.name.localeCompare(b.p.name)); return r.length ? `<h3>${dep}</h3><ul class="list shop">${r.map(x => `<li class="${b[x.p.id] ? 'done' : ''}"><label><input type="checkbox" data-buy="${x.p.id}"${b[x.p.id] ? ' checked' : ''}><span><b>${esc(x.p.name)}</b><br><span class="muted small">нужно ${n0(x.total)} г${x.reserve ? ` (в т.ч. запас ${n0(x.reserve)})` : ''}${x.packs && opts.round ? ` → ${x.packs} × ${x.p.pack} г = ${n0(x.buy)} г` : ''}</span></span></label>${x.price ? `<span>${n0(x.price)} ${opts.currency}</span>` : ''}</li>`).join('')}</ul>` : ''; }).join('')}
        ${sum ? `<p><b>Итого ${n0(sum)} ${opts.currency}</b> · с человека ${n0(sum / n)} ${opts.currency}</p>` : '<p class="muted small">Цены не заданы. Их можно указать в карточке продукта.</p>'}
        <p class="muted small">Аварийный запас на ${P.reserve_days} дн. включён в список.</p>`;
    } else if (tab === 'pack') {
      body = menu.days.map((d, i) => `<h3>День ${i + 1}</h3>` + M4.map(m => { const e = d[m]; return e?.items?.length ? `<div class="pk"><b>${MEALS[m]}</b> · ${esc(findDish(trip, e.dish)?.name || '')}<br><span class="muted">${e.items.map(it => `${esc(byId(it.pid)?.name)} ${it.g} г`).join(', ')}</span></div>` : ''; }).join('')).join('') + '<button class="btn" id="print">Печать этикеток</button>';
    } else if (tab === 'bags') {
      const W = weights(D), lim = p => (p.sex === 'F' ? trip.gear.maxF : trip.gear.maxM);
      body = `<p class="muted small">Вес рюкзака в начале каждого дня (личное снаряжение + доля общего + продукты и газ до ближайшей заброски). Продукты делятся по «Доле общего груза».</p>` + W.map(w => `<h3>${esc(w.p.name || 'Участник')} <span class="muted">· доля ${(w.sh * 100).toFixed(0)}%${lim(w.p) ? ` · лимит ${lim(w.p)} кг` : ''}</span></h3>
        <div class="tbl"><table><tr>${w.byDay.map((_, i) => `<th>Д${i + 1}</th>`).join('')}</tr><tr>${w.byDay.map(x => `<td class="${lim(w.p) && x > lim(w.p) ? 'bad' : ''}">${x.toFixed(1)}</td>`).join('')}</tr></table></div>
        <details><summary>Что нести</summary><ul class="list">${rows.slice().sort((a, b) => b.total - a.total).map(r => `<li><span>${esc(r.p.name)}</span><b>${n0(Math.round(r.buy * w.sh / 10) * 10)} г</b></li>`).join('')}</ul></details>`).join('');
    } else if (tab === 'fuel') {
      const fd = fuelDays(calc, P), tot = fd.reduce((a, b) => a + b, 0), water = calc.days.map(d => d.water);
      body = `<div class="metrics"><div><span class="big">${n0(tot)} г</span><span class="muted small">газ на поход</span></div><div><span class="big">${Math.ceil(tot / P.canister_g)}</span><span class="muted small">баллонов по ${P.canister_g} г</span></div><div><span class="big">${(water.reduce((a, b) => a + b, 0) / water.length).toFixed(1).replace('.', ',')} л</span><span class="muted small">воды на группу в день</span></div></div>
        <div class="tbl"><table><tr><th>День</th><th>Газ, г</th><th>Вода, л</th></tr>${fd.map((f, i) => `<tr><td>${i + 1}</td><td>${n0(f)}</td><td>${water[i].toFixed(1)}</td></tr>`).join('')}</table></div>
        <p class="muted small">Газ — по нормам из Настроек (без снега, с топкой снега, мороз/высота). Вода: ${P.water_ml} мл на кг веса, в жару плюс ${P.hot_l} л.</p>`;
    } else {
      body = `<div class="two"><button class="btn" id="share">Поделиться текстом</button><button class="btn ghost" id="print">Печать / PDF</button></div>
        <div class="two"><button class="btn ghost" id="csv">Скачать CSV</button><button class="btn ghost" id="json">Сохранить поход (JSON)</button></div>
        <label class="btn ghost filebtn">Загрузить поход (JSON)<input type="file" id="load" accept=".json" hidden></label><p class="warnmsg" id="msg"></p>`;
    }
    return {
      html: `<h2>Покупки</h2><div class="subtabs">${tabs.map(([k, n]) => `<button data-st="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="${ctx.state.big && tab === 'list' ? 'bigfont' : ''}">${body}</div>`,
      bind(root) {
        root.querySelectorAll('[data-st]').forEach(x => x.onclick = () => { ctx.state.shopTab = x.dataset.st; ctx.rerender(); });
        root.querySelector('#big')?.addEventListener('change', e => { ctx.state.big = e.target.checked; ctx.rerender(); });
        root.querySelectorAll('[data-buy]').forEach(c => c.onchange = () => { b[c.dataset.buy] = c.checked; saveTrip(); ctx.rerender(); });
        root.querySelector('#print')?.addEventListener('click', () => window.print());
        root.querySelector('#csv')?.addEventListener('click', () => download('raskladka.csv', csvExport(D), 'text/csv'));
        root.querySelector('#json')?.addEventListener('click', () => download('pohod.json', JSON.stringify(trip), 'application/json'));
        root.querySelector('#share')?.addEventListener('click', async () => {
          const text = textExport(D), msg = root.querySelector('#msg');
          try { if (navigator.share) await navigator.share({ title: trip.name || 'Раскладка', text }); else { await navigator.clipboard.writeText(text); msg.textContent = 'Скопировано, можно вставлять в мессенджер.'; } } catch (e) { if (e.name !== 'AbortError') { msg.textContent = 'Не удалось поделиться. Скачайте CSV.'; } }
        });
        root.querySelector('#load')?.addEventListener('change', async e => {
          try { const j = JSON.parse(await e.target.files[0].text()); if (!j.days || !j.group) throw 0; setTrip({ ...newTrip(), ...j }); ctx.rerender(); } catch { root.querySelector('#msg').textContent = 'Файл не похож на сохранённый поход.'; }
        });
      },
    };
  },
};
