// Экран «Меню»: вкладки-наборы меню, список блюд по приёмам пищи, редактор блюда, проверка продуктов, импорт и шаблон.
import { repo, MEAL_NAMES, COND } from './mstore.js';
import { repo as prepo } from './pstore.js';
import { menuProblems, altNames } from './menu.js';
import { tabsHtml, bindTabs } from './tabsui.js';
import { readTable, writeXlsx, download } from './xlsx.js';
import { esc, modal } from './ui.js';
import { openLoad } from './loadview.js';

const ui = { id: null };
export const focusSet = id => { ui.id = id; }; // открыть вкладку «Меню» на нужном наборе (кнопка «Настроить» в «Поход»)
export const MCOLS = ['Набор', 'Приём пищи', 'Блюдо', 'Продукт', 'Г_на_чел', 'Мин_г', 'Макс_г', 'Условия', 'Варка_мин'];
const MEAL_KEY = { завтрак: 'b', обед: 'l', ужин: 'd', перекус: 's', карпит: 's' };
const norm = s => String(s ?? '').toLowerCase().replace(/[\s_]/g, '');
const condName = k => (COND.find(c => c[0] === k) || [, k])[1];
const condKey = t => { const x = String(t).trim().toLowerCase(); return (COND.find(c => c[1] === x || c[0] === x) || (x.includes('3000') ? ['alt3000'] : x.startsWith('перв') ? ['first2'] : []))[0]; };

export function menuRows(set) {
  const rows = [MCOLS];
  set.dishes.forEach(d => d.ing.forEach((i, k) => rows.push([set.name, MEAL_NAMES[d.meal], d.name, i.name, i.g, i.min ?? '', i.max ?? '', k === 0 ? (d.cond || []).map(condName).join(', ') : '', k === 0 ? d.cook ?? '' : ''])));
  return rows;
}

// Файл → наборы меню; errors построчно
export function parseMenu(rows) {
  const hdr = (rows[0] || []).map(norm), at = n => hdr.indexOf(norm(n)), errors = [], sets = new Map(), dishes = new Map();
  for (const n of ['Приём пищи', 'Блюдо', 'Продукт', 'Г_на_чел']) if (at(n) < 0) errors.push(`нет колонки «${n}»`);
  if (errors.length) return { sets: [], errors };
  rows.slice(1).forEach((r, i) => {
    const ln = i + 2, g = n => (at(n) >= 0 ? r[at(n)] : ''), num = n => { const v = g(n); return v === '' || v == null ? null : +String(v).replace(',', '.'); };
    if (!r.some(v => v !== '' && v != null)) return;
    const mk = MEAL_KEY[String(g('Приём пищи')).trim().toLowerCase()]; if (!mk) { errors.push(`строка ${ln}: неизвестный приём пищи «${g('Приём пищи')}»`); return; }
    const dn = String(g('Блюдо') ?? '').trim(); if (!dn) { errors.push(`строка ${ln}: нет названия блюда`); return; }
    const pn = String(g('Продукт') ?? '').trim(); if (!pn) { errors.push(`строка ${ln}: нет продукта`); return; }
    const gr = num('Г_на_чел'); if (gr == null || isNaN(gr) || gr <= 0) { errors.push(`строка ${ln}: нет граммов на человека`); return; }
    const sn = String(g('Набор') || 'Из файла').trim(), key = sn + '|' + mk + '|' + dn;
    if (!sets.has(sn)) sets.set(sn, { name: sn, dishes: [] });
    let d = dishes.get(key);
    if (!d) { d = { id: 'd' + dishes.size + Date.now().toString(36), meal: mk, name: dn, cook: num('Варка_мин') || 0, cond: [], on: true, ing: [] }; dishes.set(key, d); sets.get(sn).dishes.push(d); }
    const cs = String(g('Условия') || '').split(/[,;]/).map(condKey).filter(Boolean); if (cs.length) d.cond = [...new Set([...d.cond, ...cs])];
    d.ing.push({ name: pn, g: gr, min: num('Мин_г') ?? Math.round(gr * .7), max: num('Макс_г') ?? Math.round(gr * 1.5) });
  });
  dishes.forEach(d => { if (!d.cond.length) d.cond = ['any']; });
  return { sets: [...sets.values()], errors };
}

function dishDialog(set, dish, done) {
  if (set.readonly) return;
  const isNew = !set.dishes.includes(dish), names = (prepo.get(set.productSetId) || prepo.first()).items.map(p => p.name);
  modal(() => ({
    title: isNew ? 'Новое блюдо' : dish.name,
    html: `<datalist id="pn">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="fld"><label>Название</label><div class="ctl"><input data-f="name" value="${esc(dish.name)}" style="width:240px;text-align:left"></div></div>
      <div class="fld"><label>Приём пищи</label><div class="ctl"><select data-f="meal">${Object.entries(MEAL_NAMES).map(([k, n]) => `<option value="${k}"${dish.meal === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div class="fld"><label>Время варки</label><div class="ctl"><input type="number" data-f="cook" value="${dish.cook ?? 0}"><span class="muted unit">мин</span></div></div>
      <div class="fld"><label>Включено</label><div class="ctl"><input type="checkbox" data-f="on" ${dish.on ? 'checked' : ''}></div></div>
      <h3>Условия применения</h3><div class="chips">${COND.map(([k, n]) => `<button data-c="${k}" class="${(dish.cond || []).includes(k) ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="muted small">Блюдо подходит, если выполняется любое отмеченное условие.</p>
      <h3>Продукты, г на человека</h3><div class="tbl"><table class="dtable"><tr><th>Продукт (можно «А|Б»)</th><th>База</th><th>Мин</th><th>Макс</th><th></th></tr>
      ${dish.ing.map((i, k) => `<tr><td><input list="pn" data-i="${k}:name" value="${esc(i.name)}" style="width:230px"></td><td><input type="number" data-i="${k}:g" value="${i.g}" style="width:64px"></td><td><input type="number" data-i="${k}:min" value="${i.min ?? ''}" style="width:64px"></td><td><input type="number" data-i="${k}:max" value="${i.max ?? ''}" style="width:64px"></td><td><button class="mini" data-x="${k}">×</button></td></tr>`).join('')}</table></div>
      <button class="mini" id="addi">+ Продукт</button>
      <div class="btnrow"><button class="btn" id="sv">Сохранить</button>${isNew ? '' : '<button class="btn danger" id="del">Удалить блюдо</button>'}<button class="btn ghost" id="cn">Закрыть</button></div>`,
    bind(root, refresh, close) {
      root.querySelectorAll('[data-f]').forEach(el => el.onchange = () => { const k = el.dataset.f; dish[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value; });
      root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const k = b.dataset.c; const c = new Set(dish.cond || []); if (k === 'any') { c.clear(); c.add('any'); } else { c.delete('any'); c.has(k) ? c.delete(k) : c.add(k); } dish.cond = c.size ? [...c] : ['any']; refresh(); });
      root.querySelectorAll('[data-i]').forEach(el => el.onchange = () => { const [k, f] = el.dataset.i.split(':'); const v = f === 'name' ? el.value : (el.value === '' ? null : +el.value); dish.ing[+k][f] = v; });
      root.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { dish.ing.splice(+b.dataset.x, 1); refresh(); });
      root.querySelector('#addi').onclick = () => { dish.ing.push({ name: '', g: 50, min: 35, max: 75 }); refresh(); };
      root.querySelector('#sv').onclick = async () => { if (!dish.name.trim()) return; dish.ing = dish.ing.filter(i => i.name.trim() && i.g > 0); if (isNew) set.dishes.push(dish); await repo.save(set); close(); done(); };
      root.querySelector('#del')?.addEventListener('click', async () => { set.dishes = set.dishes.filter(d => d !== dish); await repo.save(set); close(); done(); });
      root.querySelector('#cn').onclick = close;
    },
  }));
}

function problemsDialog(set, done) {
  modal(() => {
    const pset = prepo.get(set.productSetId) || prepo.first(), pr = menuProblems(set, pset), all = pset.items;
    return {
      title: `Проверка: «${set.name}» и набор продуктов «${pset.name}»`,
      html: pr.length ? `<p class="muted">Этих продуктов нет в наборе продуктов или они не выбраны. Включите продукт или замените его в блюде.</p>
        <div class="tbl"><table class="dtable"><tr><th>Блюдо</th><th>Продукт</th><th>Действие</th></tr>${pr.map((p, k) => `<tr><td>${esc(p.dish.name)}</td><td>${esc(p.ing.name)}</td><td>${p.alts.filter(a => a.state === 'off').map(a => `<button class="mini" data-on="${a.id}">Включить «${esc(all.find(x => x.id === a.id)?.name)}»</button>`).join(' ')}<select data-rep="${k}"><option value="">Заменить на…</option>${all.filter(x => x.on).map(x => `<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>` : '<p class="good"><b>Проблем нет:</b> все продукты блюд есть в наборе и выбраны.</p>',
      bind(root, refresh) {
        root.querySelectorAll('[data-on]').forEach(b => b.onclick = async () => { const p = all.find(x => x.id === b.dataset.on); p.on = true; await prepo.save(pset); done(); refresh(); });
        root.querySelectorAll('[data-rep]').forEach(s => s.onchange = async () => { if (!s.value) return; pr[+s.dataset.rep].ing.name = s.value; await repo.save(set); done(); refresh(); });
      },
    };
  });
}

function importDialog(done) {
  let res = null, err = '';
  modal(() => ({
    title: 'Набор меню из файла',
    html: `<p class="muted">Файл .xlsx, .csv или .json, колонки: ${MCOLS.join('; ')}. Одна строка — один продукт блюда. Условия через запятую: ${COND.map(c => c[1]).join(', ')}.</p>
      <div class="btnrow"><label class="btn ghost filebtn">Выбрать файл<input type="file" id="f" accept=".xlsx,.csv,.json" hidden></label><button class="btn ghost" id="tpl">Скачать шаблон</button></div><p class="warnmsg">${esc(err)}</p>
      ${res ? `<h3>Предпросмотр: наборов ${res.sets.length}, блюд ${res.sets.reduce((s, x) => s + x.dishes.length, 0)}${res.errors.length ? `, ошибок ${res.errors.length}` : ''}</h3>
        ${res.errors.length ? `<ul class="warnlist">${res.errors.slice(0, 30).map(e => `<li>${esc(e)}</li>`).join('')}</ul><p class="muted small">Строки с ошибками не загрузятся.</p>` : ''}
        <ul class="list">${res.sets.map(s => `<li><span>${esc(s.name)}</span><span class="muted">${s.dishes.length} блюд</span></li>`).join('')}</ul>
        <div class="btnrow"><button class="btn" id="load" ${res.sets.length ? '' : 'disabled'}>Загрузить</button></div>` : ''}`,
    bind(root, refresh, close) {
      root.querySelector('#tpl').onclick = async () => download('Шаблон_набора_меню.xlsx', await writeXlsx([{ name: 'Меню', rows: [MCOLS, ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Гречка', 90, 63, 135, 'любой день', 20], ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Тушёнка говяжья', 70, 49, 105, '', ''], ['Мой набор', 'Обед', 'Горячий обед', 'Суп в пакете', 25, 18, 38, 'днёвка, холод', 10]] }]));
      root.querySelector('#f').onchange = async e => { const f = e.target.files[0]; if (!f) return; err = ''; try { res = parseMenu(await readTable(f)); } catch (x) { err = x.message; res = null; } refresh(); };
      root.querySelector('#load')?.addEventListener('click', async () => {
        let last = null;
        for (const s of res.sets) { if (!repo.canAdd()) { alert('Достигнут максимум 10 наборов меню.'); break; } last = await repo.add({ id: repo.uid(), name: s.name, productSetId: prepo.first().id, dishes: s.dishes }); }
        close(); if (last) done(last.id);
      });
    },
  }));
}

function addSetDialog(cur, done, rerender, ctx) {
  modal(() => ({
    title: 'Новый набор меню',
    html: `<ul class="list"><li><button data-k="empty">Пустой набор<span>›</span></button></li><li><button data-k="copy">Копия текущего («${esc(cur.name)}»)<span>›</span></button></li><li><button data-k="file">Из файла (.xlsx, .csv, .json)<span>›</span></button></li><li><button data-k="manual">Вручную, по одному блюду<span>›</span></button></li></ul>`,
    bind(root, refresh, close) {
      root.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
        const k = b.dataset.k; close();
        if (k === 'file') return openLoad(ctx, { only: 'dishes', after: rerender }); // общее окно загрузки; старое importDialog больше не вызывается
        const name = prompt('Название набора', k === 'copy' ? cur.name + ' (копия)' : 'Новый набор'); if (!name) return;
        const s = await repo.add({ id: repo.uid(), name: name.trim(), productSetId: cur.productSetId, dishes: k === 'copy' ? JSON.parse(JSON.stringify(cur.dishes)) : [] });
        done(s.id); if (k === 'manual') setTimeout(() => dishDialog(s, { id: 'd' + Date.now().toString(36), meal: 'd', name: '', cook: 0, cond: ['any'], on: true, ing: [{ name: '', g: 80, min: 56, max: 120 }] }, rerender), 50);
      });
    },
  }));
}

export const views = {
  menus(_, ctx) {
    const trip = ctx.trip(), sets = repo.list();
    if (!repo.get(ui.id)) ui.id = (repo.get(trip.menuSet) || repo.first()).id;
    const set = repo.get(ui.id), pset = prepo.get(set.productSetId) || prepo.first(), pr = menuProblems(set, pset);
    return {
      html: `<h2>Меню</h2>${tabsHtml(sets, set.id, trip.menuSet)}
        <div class="btnrow">${set.readonly ? '' : '<button class="mini" id="ren">Переименовать</button>'}<button class="mini" id="dup" ${repo.canAdd() ? '' : 'disabled'}>Дублировать</button><button class="mini" id="del">Удалить</button><button class="mini" id="exp">В файл</button><button class="mini" id="tpl">Скачать шаблон</button><button class="mini" id="use">${set.id === trip.menuSet ? 'Используется в походе ✓' : 'Использовать в походе'}</button></div>
        <div class="fld"><label>Набор продуктов для этого меню</label><div class="ctl"><select id="psel">${prepo.list().map(s => `<option value="${s.id}"${s.id === pset.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div></div>
        <div class="btnrow"><button class="btn ${pr.length ? '' : 'ghost'}" id="chk">Проверка продуктов${pr.length ? ` · проблем: ${pr.length}` : ' · ок'}</button>${set.readonly ? '' : '<button class="btn" id="addd" style="margin-left:auto">Добавить блюдо</button>'}</div>
        <div class="btnrow"><button class="btn ghost" id="ldd">Загрузить блюда</button><button class="btn ghost" id="ldl">Загрузить меню (план)</button><button class="btn ghost" id="lda">Загрузить всё из файла</button>${set.readonly ? '<span class="muted small">🔒 Оригинал, только чтение: скопируйте набор («Дублировать»), чтобы менять.</span>' : ''}</div>
        ${pr.length ? `<p class="warnmsg small">В меню есть продукты, которых нет в наборе «${esc(pset.name)}» или они выключены. Нажмите «Проверка продуктов».</p>` : ''}
        ${[...Object.entries(MEAL_NAMES), ['', 'Без приёма пищи (его задаёт план)']].filter(([m]) => m || set.dishes.some(d => !d.meal)).map(([m, n]) => { const ds = set.dishes.filter(d => (d.meal || '') === m); return `<h3>${n} · ${ds.length}</h3>${ds.length ? `<div class="tbl"><table class="dtable"><tr><th></th><th>Блюдо</th><th>Состав, г на человека</th><th>Условия</th><th>Варка</th></tr>${ds.map(d => `<tr data-d="${d.id}" class="${d.on ? '' : 'off'}"><td><input type="checkbox" data-on="${d.id}" ${d.on ? 'checked' : ''}${set.readonly ? ' disabled' : ''}></td><td>${esc(d.name)}</td><td class="muted small" style="white-space:normal">${d.ing.map(i => `${esc(String(i.name).split('|')[0])} ${i.g}${i.unit && i.unit !== 'г' ? ' ' + esc(i.unit) : ''}`).join(', ')}</td><td>${(d.cond || []).map(condName).join(', ')}</td><td>${d.cook || 0} мин</td></tr>`).join('')}</table></div>` : '<p class="muted small">Блюд нет.</p>'}`; }).join('')}`,
      bind(root) {
        const re = () => ctx.rerender();
        bindTabs(root, { repo, rerender: re, onSelect: id => { ui.id = id; re(); }, onAdd: () => addSetDialog(set, id => { ui.id = id; re(); }, re, ctx) });
        root.querySelector('#psel').onchange = async e => { set.productSetId = e.target.value; await repo.save(set); re(); };
        root.querySelector('#chk').onclick = () => problemsDialog(set, re);
        root.querySelector('#ldd').onclick = () => openLoad(ctx, { only: 'dishes', after: re });
        root.querySelector('#ldl').onclick = () => openLoad(ctx, { only: 'plan', after: re });
        root.querySelector('#lda').onclick = () => openLoad(ctx, { after: re });
        root.querySelector('#addd')?.addEventListener('click', () => dishDialog(set, { id: 'd' + Date.now().toString(36), meal: 'd', name: '', cook: 0, cond: ['any'], on: true, ing: [{ name: '', g: 80, min: 56, max: 120 }] }, re));
        root.querySelectorAll('[data-on]').forEach(c => c.onchange = async () => { set.dishes.find(d => d.id === c.dataset.on).on = c.checked; await repo.save(set); re(); });
        root.querySelectorAll('tr[data-d]').forEach(tr => tr.onclick = e => { if (e.target.tagName !== 'INPUT') dishDialog(set, set.dishes.find(d => d.id === tr.dataset.d), re); });
        root.querySelector('#ren')?.addEventListener('click', async () => { const n = prompt('Название набора', set.name); if (n && n.trim()) { set.name = n.trim(); await repo.save(set); re(); } });
        root.querySelector('#dup').onclick = async () => { const s = await repo.add({ ...JSON.parse(JSON.stringify(set)), id: repo.uid(), name: set.name + ' (копия)', builtin: false }); ui.id = s.id; re(); };
        root.querySelector('#del').onclick = async () => { if (sets.length < 2) { alert('Последний набор удалить нельзя.'); return; } if (!confirm(`Удалить набор «${set.name}»?`)) return; await repo.remove(set.id); if (trip.menuSet === set.id) { trip.menuSet = repo.first().id; ctx.saveTrip(); } ui.id = repo.first().id; re(); };
        root.querySelector('#exp').onclick = async () => download(`Меню_${set.name}.xlsx`, await writeXlsx([{ name: 'Меню', rows: menuRows(set) }]));
        root.querySelector('#tpl').onclick = async () => download('Шаблон_набора_меню.xlsx', await writeXlsx([{ name: 'Меню', rows: [MCOLS, ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Гречка', 90, 63, 135, 'любой день', 20], ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Тушёнка говяжья', 70, 49, 105, '', '']] }]));
        root.querySelector('#use').onclick = () => { trip.menuSet = set.id; if (prepo.get(set.productSetId)) trip.productSet = set.productSetId; ctx.saveTrip(); re(); };
      },
    };
  },
};
