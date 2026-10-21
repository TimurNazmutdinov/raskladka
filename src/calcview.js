// Вкладка «Расчёт»: слева сводка и дни с «Почему столько?», справа сетка меню (день × приём). Наборы переключаются сразу.
import { allParams } from './params.js';
import { computeTrip, tempText, isRest } from './engine.js';
import { MEALS, buildMenu, itemsKcal, mealFor, possibleFor, menuProblems } from './menu.js';
import { repo as prepo, setActive } from './pstore.js';
import { repo as mrepo } from './mstore.js';
import { repo as plrepo } from './plstore.js';
import { planMenu, skippedCount } from './plan.js';
import { openLoad } from './loadview.js';
import { getTrip, saveTrip } from './trip.js';
import { exportExcel, buildWorkbook } from './exportxlsx.js';
import { esc, modal } from './ui.js';

const n0 = x => Math.round(x).toLocaleString('ru');
const kg = g => (g / 1000).toFixed(1).replace('.', ',');
const M4 = ['b', 'l', 'd', 's'];

export const activePlan = trip => (trip.planId ? plrepo.get(trip.planId) : null);
export function sets(trip) {
  const pl = activePlan(trip);
  if (pl) { const ps = prepo.get(pl.productSetId) || prepo.get(trip.productSet) || prepo.first(), ms = mrepo.get(pl.dishSetId) || mrepo.first(); setActive(ps?.id); return { pset: ps, mset: ms }; }
  const pset = prepo.get(trip.productSet) || prepo.first(), mset = mrepo.get(trip.menuSet) || mrepo.get(pset && mrepo.list().find(m => m.productSetId === pset.id)?.id) || mrepo.first();
  setActive(pset?.id); return { pset, mset };
}
export function sig(trip, pset, mset, P) {
  return JSON.stringify([trip.group.map(p => [p.weight, p.height, p.age, p.sex, p.appetite, p.share, p.gear, p.veg, p.allergy, p.dislike]), trip.days, trip.prefs, trip.food, trip.gear, trip.adj, pset?.id, pset?.items.map(p => (p.on ? 1 : 0) + p.id).join(), mset?.id, mset?.dishes, P, activePlan(trip)?.id, activePlan(trip)?.rows]);
}

// Возвращает {calc, menu, P, pset, mset}; пересобирает меню, если исходные данные изменились (закреплённое остаётся)
export function ensure(force = false) {
  const trip = getTrip(), P = allParams(), calc = computeTrip(trip, P), { pset, mset } = sets(trip);
  if (!calc.summary) return { calc, menu: null, P, pset, mset };
  const s = sig(trip, pset, mset, P);
  if (force || !trip.menu || trip.menu.sig !== s || trip.menu.days.length !== trip.days.length) {
    const seed = force ? (trip.menu?.seed || 0) + 1 : (trip.menu?.seed || 0), pl = activePlan(trip);
    if (pl) {
      const pm = planMenu(trip, calc, pl, mset, pset);
      // оригинал — только план, без генерации; обычный план закрепляет ячейки, генератор заполняет пустые
      trip.menu = { ...(pl.readonly ? pm : { ...buildMenu(trip, calc, mset, pset, P, pm, seed), warnings: [...pm.warnings] }), sig: s, fromPlan: pl.id };
    } else trip.menu = { ...buildMenu(trip, calc, mset, pset, P, trip.menu?.fromPlan ? null : trip.menu, seed), sig: s };
    saveTrip();
  }
  return { calc, menu: trip.menu, P, pset, mset };
}

// Данные для выгрузки в Excel (null, если меню ещё нет)
export function exportData() { const e = ensure(); return e.menu && e.calc.summary ? { trip: getTrip(), ...e } : null; }
if (typeof window !== 'undefined') window.RK = { buildWorkbook, exportData };

export const menuKcal = (day, prods) => M4.reduce((s, m) => s + itemsKcal(day[m]?.items || [], prods), 0);
export const menuGrams = day => M4.reduce((s, m) => s + (day[m]?.items || []).reduce((a, i) => a + (i.skip ? 0 : i.g), 0), 0);
const itemName = (it, prods) => it.name || prods.find(p => p.id === it.pid)?.name || '?';

function why(cd, P) {
  const rows = cd.per.map(x => `<tr><td>${esc(x.p.name || 'Участник')}</td><td>${n0(x.bmr)}</td><td>${n0(x.walk)}</td><td>${n0(x.camp)}</td><td>${n0(x.cold)}</td><td>×${x.altK.toFixed(2)}</td><td>×${x.personal.toFixed(2)}${x.general !== 1 ? ' ×' + x.general.toFixed(2) : ''}</td><td><b>${n0(x.total)}</b></td></tr>`).join('');
  const x = cd.per[0], parts = x.parts.map(p => `${p.name}: ${n0(p.watts)} Вт, ${p.hours.toFixed(1)} ч, ${n0(p.kcal)} ккал`).join('; ');
  return `<details><summary>Почему столько?</summary><div class="why"><div class="tbl"><table class="dtable"><tr><th></th><th>Обмен</th><th>Ходьба</th><th>Остаток суток</th><th>Холод</th><th>Высота</th><th>Личн.</th><th>Итого</th></tr>${rows}</table></div>
    <p class="muted small">Обмен — расход покоя за сутки (Миффлин — Сан Жеор). Ходьба — по Пандольфу с учётом рюкзака (${x.L.toFixed(1)} кг у ${esc(x.p.name || 'первого участника')}), покрытия и поправки на недооценку. ${parts ? 'Участки у него: ' + esc(parts) + '. ' : ''}Остаток суток — ${isRest(cd.d) ? 'днёвка: обмен × ' + P.rest_k : 'остаток часов × обмен × ' + P.camp_k}. Холод — ${P.cold_k} ккал на градус ниже ${P.cold_t0} °C${x.t != null ? ` (сегодня ${x.t.toFixed(0)} °C)` : ', температура не задана'}. Высота — +${P.alt_pct}% на 1000 м выше ${P.alt_start} м. Личный — коэффициент аппетита и общая поправка ${P.general_pct}%.</p>
    <p class="small">Цель раскладки = потребность × покрытие${cd.appetite < 1 ? ` × аппетит на высоте ${cd.appetite}` : ''}: <b>${n0(cd.target)} ккал</b> на группу. БЖУ на человека: Б ${n0(cd.mac.p)} · Ж ${n0(cd.mac.f)} · У ${n0(cd.mac.c)} г.</p></div></details>`;
}

function mealDialog(i, m, ctx) {
  const trip = getTrip();
  modal(() => {
    const { calc, menu, P, pset, mset } = ensure(), e = menu.days[i][m], prods = pset.items, ro = e.fromPlan && activePlan(trip)?.readonly;
    const opts = m === 's' ? [] : possibleFor(trip, calc, mset, pset, P, i, m).filter(d => d.id !== e.dish);
    return {
      title: `День ${i + 1} · ${MEALS[m]}`,
      html: `<h3>${esc(e.name || (e.empty ? 'Блюдо убрано' : 'Нет подходящего блюда'))}${e.pin ? ' · закреплено' : ''}</h3>
        ${e.perKcal ? `<p class="muted small">На человека ≈ ${e.perKcal} ккал, ${e.perGrams} г. Варка ${e.cook || 0} мин.</p>` : ''}
        ${e.parts ? e.parts.map(pt => `<h3>${esc(pt.name)}${pt.missing ? ' <span class="bad">— блюда нет в наборе</span>' : ''}</h3><ul class="list">${pt.items.map(it => `<li><span>${esc(itemName(it, prods))}${it.skip ? ` <span class="bad small">не считается: ${esc(it.skip)}</span>` : ''}</span><b>${it.g} ${esc(it.unit || 'г')}</b></li>`).join('') || '<li class="muted">Пусто</li>'}</ul>`).join('') : `<ul class="list">${(e.items || []).map(it => `<li><span>${esc(itemName(it, prods))}${it.skip ? ` <span class="bad small">не считается: ${esc(it.skip)}</span>` : ''}</span><b>${it.g} ${esc(it.unit || 'г')}</b></li>`).join('') || '<li class="muted">Пусто</li>'}</ul>`}
        ${e.comments?.length ? `<p class="muted small">Комментарий: ${esc(e.comments.join('; '))}</p>` : ''}
        <p class="muted small">Количества на всю группу${e.fromPlan ? ' (как в плане: на порцию × порции)' : ''}.${ro ? ' План — оригинал, только чтение: скопируйте план, чтобы менять.' : ''}</p>
        ${ro ? '' : `<div class="btnrow">${e.dish || e.fixed ? `<button class="btn" id="pin">${e.pin ? 'Открепить' : 'Закрепить'}</button>` : ''}<button class="btn danger" id="del">Убрать</button></div>`}
        ${!ro && opts.length ? `<h3>Заменить на</h3><ul class="list">${opts.map(d => `<li><button data-rep="${d.id}">${esc(d.name)}<span>›</span></button></li>`).join('')}</ul>` : ''}`,
      bind(root, refresh, close) {
        const set = v => { menu.days[i][m] = v; saveTrip(); ctx.rerender(); refresh(); };
        root.querySelector('#pin')?.addEventListener('click', () => set({ ...e, pin: !e.pin, fixed: e.fixed ? !e.pin ? true : false : e.fixed }));
        root.querySelector('#del')?.addEventListener('click', () => {}); if (!ro) root.querySelector('#del').onclick = () => { menu.days[i][m] = { empty: true, items: [], pin: false }; saveTrip(); ctx.rerender(); close(); };
        root.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => set(mealFor(trip, calc, mset, pset, P, i, m, b.dataset.rep)));
      },
    };
  });
}

function plansDialog(ctx) {
  const trip = getTrip();
  modal(() => ({
    title: 'Меню-планы',
    html: `<ul class="list">${plrepo.list().map(s => `<li><span>${s.readonly ? '🔒 ' : ''}<b>${esc(s.name)}</b> <span class="muted small">· ${s.rows.length} строк${s.id === trip.planId ? ' · применён' : ''}</span></span><span><button class="mini" data-ap="${s.id}">${s.id === trip.planId ? 'Снять' : 'Применить'}</button> <button class="mini" data-cp="${s.id}">Копия</button> ${s.readonly ? '' : `<button class="mini" data-rn="${s.id}">Переименовать</button> `}<button class="mini" data-dl="${s.id}">Удалить</button></span></li>`).join('') || '<li class="muted">Планов пока нет. Загрузите план из файла.</li>'}</ul>`,
    bind(root, refresh) {
      root.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => { const s = plrepo.get(b.dataset.ap); trip.planId = trip.planId === s.id ? null : s.id; if (trip.planId) { if (prepo.get(s.productSetId)) trip.productSet = s.productSetId; if (mrepo.get(s.dishSetId)) trip.menuSet = s.dishSetId; } trip.menu = null; saveTrip(); ctx.rerender(); refresh(); });
      root.querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => { if (!plrepo.canAdd()) { alert('Уже 10 планов.'); return; } const s = plrepo.get(b.dataset.cp); await plrepo.add({ ...JSON.parse(JSON.stringify(s)), id: plrepo.uid(), name: s.name + ' (копия)', readonly: false }); ctx.rerender(); refresh(); });
      root.querySelectorAll('[data-rn]').forEach(b => b.onclick = async () => { const s = plrepo.get(b.dataset.rn), n = prompt('Название плана', s.name); if (n && n.trim()) { s.name = n.trim(); await plrepo.save(s); ctx.rerender(); refresh(); } });
      root.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { const s = plrepo.get(b.dataset.dl); if (!confirm(`Удалить план «${s.name}»?`)) return; await plrepo.remove(s.id); if (trip.planId === s.id) { trip.planId = null; trip.menu = null; saveTrip(); } ctx.rerender(); refresh(); });
    },
  }));
}

export const views = {
  calc(_, ctx) {
    const trip = getTrip(), { calc, menu, P, pset, mset } = ensure();
    const sel = `<div class="btnrow selrow"><label>Набор продуктов <select id="selp">${prepo.list().map(s => `<option value="${s.id}"${s.id === pset?.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>Набор меню <select id="selm">${mrepo.list().map(s => `<option value="${s.id}"${s.id === mset?.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>Меню (план) <select id="selpl"><option value="">— нет (генератор) —</option>${plrepo.list().map(s => `<option value="${s.id}"${s.id === trip.planId ? ' selected' : ''}>${s.readonly ? '🔒 ' : ''}${esc(s.name)}</option>`).join('')}</select></label>
      <button class="btn ghost" id="loadpl">Загрузить меню (план)</button><button class="btn ghost" id="mgpl">Планы…</button>
      <button class="btn" id="xl" style="margin-left:auto">Выгрузить в Excel</button></div>`;
    const bindSel = root => {
      root.querySelector('#selp').onchange = e => { trip.productSet = e.target.value; const m = mrepo.list().find(x => x.productSetId === e.target.value); if (m && mrepo.get(trip.menuSet)?.productSetId !== e.target.value) trip.menuSet = m.id; saveTrip(); ctx.rerender(); };
      root.querySelector('#selm').onchange = e => { trip.menuSet = e.target.value; const m = mrepo.get(e.target.value); if (m?.productSetId && prepo.get(m.productSetId)) trip.productSet = m.productSetId; saveTrip(); ctx.rerender(); };
      root.querySelector('#selpl').onchange = e => { const pl = plrepo.get(e.target.value); trip.planId = pl ? pl.id : null; if (pl) { if (prepo.get(pl.productSetId)) trip.productSet = pl.productSetId; if (mrepo.get(pl.dishSetId)) trip.menuSet = pl.dishSetId; } trip.menu = null; saveTrip(); ctx.rerender(); };
      root.querySelector('#loadpl').onclick = () => openLoad(ctx, { only: 'plan', after: () => ctx.rerender() });
      root.querySelector('#mgpl').onclick = () => plansDialog(ctx);
      root.querySelector('#xl').onclick = () => exportExcel(exportData()).catch(err => alert('Не удалось выгрузить: ' + err.message));
    };
    if (!calc.summary) return { html: `<h2>Расчёт</h2>${sel}${calc.warnings.map(w => `<p class="warnmsg">${esc(w)}</p>`).join('')}<p class="empty">Заполните вкладку «Поход»: участники с возрастом, ростом и весом и дни.</p>`, bind: bindSel };
    const prods = pset.items, S = calc.summary;
    const totG = menu.days.reduce((s, d) => s + menuGrams(d), 0), totK = menu.days.reduce((s, d) => s + menuKcal(d, prods), 0);
    const cov = S.need ? totK / S.need : 0, gpd = totG / S.n / S.days, covPct = Math.round(cov * 100);
    const problems = trip.planId ? [] : menuProblems(mset, pset), warns = [...calc.warnings, ...(menu.warnings || [])];
    if (problems.length) warns.push(`В наборе меню есть продукты, которых нет в наборе продуктов или они выключены: ${new Set(problems.map(p => p.ing.name)).size}. Откройте «Меню» → «Проверка».`);
    if (trip.planId && skippedCount(menu)) warns.push(`План применён как в файле: строк «не считается» (единицы не граммы, нет КБЖУ или продукта): ${skippedCount(menu)}. Они не входят в ккал и граммы.`);
    if (covPct < P.cov_warn) warns.push(`Общее покрытие ${covPct}% ниже порога ${P.cov_warn}%`);
    const slider = Math.round(trip.prefs.mode === 'custom' ? (trip.prefs.custom ?? P.cov_custom) : { hungry: P.cov_hungry, std: P.cov_std, full: P.cov_full }[trip.prefs.mode]);
    const cards = calc.days.map((cd, i) => {
      const day = menu.days[i], k = menuKcal(day, prods), c = cd.need ? Math.round(k / cd.need * 100) : 0, d = cd.d;
      return `<section class="dcard"><div class="dh"><b>День ${i + 1} · ${esc(d.type)}</b><span class="muted">${d.km ? d.km + ' км · ' : ''}${d.maxAlt ? Math.round(d.maxAlt) + ' м · ' : ''}${tempText(d)}</span></div>
        <div class="nums"><div><span class="big">${n0(cd.need)}</span><span class="muted small">потребность, ккал</span></div><div><span class="big">${n0(k)}</span><span class="muted small">даёт раскладка, ккал</span></div><div><span class="big ${c < P.cov_warn ? 'bad' : 'good'}">${c}%</span><span class="muted small">покрытие</span></div><div><span class="big">${n0(menuGrams(day))}</span><span class="muted small">граммов на группу</span></div></div>
        <p class="muted small">На человека: ${cd.per.map(x => `${esc(x.p.name || '—')} ${n0(x.total)}`).join(' · ')} ккал</p>${why(cd, P)}</section>`;
    }).join('');
    const grid = `<div class="tbl"><table class="dtable mgrid"><tr><th>День</th>${M4.map(m => `<th>${MEALS[m]}</th>`).join('')}</tr>${menu.days.map((day, i) => `<tr><td><b>${i + 1}</b><br><span class="muted small">${esc(calc.days[i].d.type)}</span></td>${M4.map(m => { const e = day[m] || {}; return `<td class="mcell" data-m="${i}:${m}">${e.pin ? '📌 ' : ''}${esc(e.name || (e.empty ? 'убрано' : '—'))}${(e.items || []).length ? `<br><span class="muted small">${n0((e.items || []).reduce((a, it) => a + (it.skip ? 0 : it.g), 0))} г · ${n0(itemsKcal(e.items, prods))} ккал${(e.items || []).some(it => it.skip) ? ` · <span class="bad">не считается: ${(e.items || []).filter(it => it.skip).length} стр.</span>` : ''}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>`;
    return {
      html: `<h2>Расчёт</h2>${sel}
        <div class="metrics"><div><span class="big">${S.days}</span><span class="muted small">дней</span></div><div><span class="big">${kg(totG)} кг</span><span class="muted small">вся раскладка</span></div><div><span class="big">${n0(gpd)} г</span><span class="muted small">на чел. в день</span></div><div><span class="big">${n0(totK / S.n / S.days)}</span><span class="muted small">ккал на чел.</span></div><div><span class="big ${covPct < P.cov_warn ? 'bad' : 'good'}">${covPct}%</span><span class="muted small">покрытие</span></div><div><span class="big">${kg(S.fuel)} кг</span><span class="muted small">газ</span></div></div>
        <p class="muted small">Ориентиры на человека в день: ${P.ref_hungry} г — голодно, ${P.ref_std} г — стандарт, ${P.ref_full} г — сытно. Оценки приблизительные и настраиваются.</p>
        <div class="fld"><label>Сытость: <b id="sv">${slider}%</b> от потребности</label><div class="ctl"><input type="range" id="slide" min="40" max="100" value="${slider}" style="width:150px"></div></div>
        <div class="btnrow"><button class="btn" id="rebuild">Пересобрать меню</button><span class="muted small">Закреплённые блюда не меняются.</span></div>
        ${warns.length ? `<h3>Предупреждения</h3><ul class="warnlist">${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        <div class="cols2"><div><h3>Дни</h3>${cards}</div><div class="menupanel"><h3>Меню</h3>${grid}<p class="muted small">Нажмите на ячейку: заменить, закрепить или убрать блюдо.</p></div></div>`,
      bind(root) {
        bindSel(root);
        const sl = root.querySelector('#slide');
        sl.oninput = () => { root.querySelector('#sv').textContent = sl.value + '%'; };
        sl.onchange = () => { trip.prefs.mode = 'custom'; trip.prefs.custom = +sl.value; saveTrip(); ctx.rerender(); };
        root.querySelector('#rebuild').onclick = () => { ensure(true); ctx.rerender(); };
        root.querySelectorAll('.mcell').forEach(td => td.onclick = () => { const [i, m] = td.dataset.m.split(':'); mealDialog(+i, m, ctx); });
      },
    };
  },
};
