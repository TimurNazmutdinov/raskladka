// Экран «Продукты»: вкладки-наборы, выделение, таблица, импорт из файла, добавление через Open Food Facts.
import { CATS } from './products.js';
import { repo } from './pstore.js';
import { tabsHtml, bindTabs } from './tabsui.js';
import { readTable, writeXlsx, download } from './xlsx.js';
import { form, bindForm, esc, modal } from './ui.js';
import { openLoad } from './loadview.js';

const ui = { id: null, cat: 'all', q: '' };
const catName = k => (CATS.find(c => c[0] === k) || [, k])[1];
const PF = [
  { k: 'name', label: 'Название' }, { k: 'cat', label: 'Категория', type: 'select', opts: CATS },
  { k: 'kcal', label: 'Ккал на 100 г', type: 'number' }, { k: 'p', label: 'Белки на 100 г', type: 'number' },
  { k: 'f', label: 'Жиры на 100 г', type: 'number' }, { k: 'c', label: 'Углеводы на 100 г', type: 'number' },
  { k: 'pack', label: 'Типовая упаковка', type: 'number', unit: 'г' }, { k: 'unit', label: 'Ед. закупки (пачка, банка…)' },
  { k: 'shelf', label: 'Хранится без холодильника', type: 'number', unit: 'дн', help: 'Сколько дней продукт выдерживает без холодильника. 999 — практически не портится.' },
  { k: 'fresh', label: 'Свежий продукт', type: 'check', help: 'Свежие продукты ставятся в меню только в первые дни, по сроку хранения.' },
  { k: 'price', label: 'Цена упаковки', type: 'number' }, { k: 'tags', label: 'Теги (gluten lactose meat pork nuts spicy)' },
];
export const COLS = ['Название', 'Категория', 'Ккал', 'Белки', 'Жиры', 'Углеводы', 'Упаковка_г', 'Хранение_дней', 'Свежий', 'Цена', 'Теги'];
const norm = s => String(s ?? '').toLowerCase().replace(/[\s_]/g, '');
const yes = v => /^(да|yes|y|1|true|\+)$/i.test(String(v ?? '').trim());

export const productRows = items => [COLS, ...items.map(p => [p.name, catName(p.cat), p.kcal, p.p, p.f, p.c, p.pack ?? '', p.shelf ?? '', p.fresh ? 'да' : 'нет', p.price ?? '', p.tags || ''])];

// Разбор таблицы в продукты; возвращает {items, errors}
export function parseProducts(rows) {
  const hdr = (rows[0] || []).map(norm), at = n => hdr.indexOf(norm(n)), errors = [], items = [];
  for (const need of ['Название', 'Категория', 'Ккал']) if (at(need) < 0) errors.push(`нет колонки «${need}»`);
  if (errors.length) return { items, errors };
  rows.slice(1).forEach((r, i) => {
    const ln = i + 2, g = n => r[at(n)], num = n => { const v = g(n); return v === '' || v == null ? null : (typeof v === 'number' ? v : (isFinite(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : NaN)); };
    if (!r.some(v => v !== '' && v != null)) return;
    const name = String(g('Название') ?? '').trim();
    if (!name) { errors.push(`строка ${ln}: нет названия`); return; }
    const kc = num('Ккал'); if (kc == null) { errors.push(`строка ${ln}: нет ккал`); return; } if (isNaN(kc)) { errors.push(`строка ${ln}: ккал не число`); return; }
    const cn = norm(g('Категория')), cat = (CATS.find(c => c[0] === cn || norm(c[1]) === cn) || CATS.find(c => norm(c[1]).startsWith(cn) && cn.length > 2) || [])[0];
    if (!cat) { errors.push(`строка ${ln}: неизвестная категория «${g('Категория')}»`); return; }
    const bad = ['Белки', 'Жиры', 'Углеводы', 'Упаковка_г', 'Хранение_дней', 'Цена'].find(n => at(n) >= 0 && isNaN(num(n)));
    if (bad) { errors.push(`строка ${ln}: поле «${bad}» не число`); return; }
    const shelf = at('Хранение_дней') >= 0 ? num('Хранение_дней') : null, fresh = at('Свежий') >= 0 ? yes(g('Свежий')) : false;
    items.push({ id: 'i' + Date.now().toString(36) + items.length, name, cat, kcal: kc, p: (at('Белки') >= 0 && num('Белки')) || 0, f: (at('Жиры') >= 0 && num('Жиры')) || 0, c: (at('Углеводы') >= 0 && num('Углеводы')) || 0, pack: at('Упаковка_г') >= 0 ? num('Упаковка_г') : null, shelf: shelf ?? 365, fresh, price: at('Цена') >= 0 ? num('Цена') : null, tags: at('Теги') >= 0 ? String(g('Теги') ?? '') : '', unit: 'пачка', src: 'файл', check: false, on: true, custom: true });
  });
  return { items, errors };
}

export async function searchOff(q) {
  const enc = encodeURIComponent(q), tries = [
    [`https://search.openfoodfacts.org/search?q=${enc}&page_size=12&fields=product_name,nutriments,quantity,brands`, j => j.hits],
    [`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,nutriments,quantity,brands`, j => j.products],
  ];
  let list = null, last = '';
  for (const [url, pick] of tries) {
    try { const r = await fetch(url); if (r.ok) { list = pick(await r.json()) || []; break; } last = 'ошибка ' + r.status; } catch (e) { last = 'нет связи'; }
  }
  if (!list) throw new Error('Open Food Facts: ' + last);
  return list.filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null).map(mapOff);
}
const mapOff = p => {
  const n = p.nutriments, m = /([\d.,]+)\s*(kg|кг|g|г)/i.exec(p.quantity || ''), br = Array.isArray(p.brands) ? p.brands[0] : (p.brands || '').split(',')[0];
  return { name: (p.product_name || 'Продукт') + (br ? ` (${br})` : ''), kcal: Math.round(n['energy-kcal_100g'] || 0), p: +(n.proteins_100g || 0).toFixed(1), f: +(n.fat_100g || 0).toFixed(1), c: +(n.carbohydrates_100g || 0).toFixed(1), pack: m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/k|к/i.test(m[2]) ? 1000 : 1)) : null };
};
export async function byBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments,quantity,brands`);
  const j = await r.json(); if (j.status !== 1 || !j.product?.nutriments) throw new Error('Продукт с таким штрихкодом не найден');
  return mapOff(j.product);
}
async function scan(video, onCode) {
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream; await video.play();
  (async function loop() {
    if (!stream.active) return;
    try { const r = await det.detect(video); if (r[0]) { stream.getTracks().forEach(t => t.stop()); onCode(r[0].rawValue); return; } } catch { /* кадр не готов */ }
    setTimeout(loop, 300);
  })();
}

const blank = (o = {}, src = 'вручную') => ({ id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 99), name: '', cat: 'sweet', kcal: 0, p: 0, f: 0, c: 0, pack: null, shelf: 365, fresh: false, tags: '', unit: 'пачка', price: null, src, check: false, on: true, custom: true, ...o });

function editProduct(set, p, done) {
  if (set.readonly) return;
  const isNew = !set.items.includes(p);
  modal(() => ({
    title: isNew ? 'Новый продукт' : p.name,
    html: `<p class="muted small">Источник: ${esc(p.src)}</p>${form(PF, p)}<div class="btnrow"><button class="btn" id="sv">Сохранить</button>${isNew ? '' : '<button class="btn danger" id="del">Удалить</button>'}<button class="btn ghost" id="cn">Закрыть</button></div>`,
    bind(root, refresh, close) {
      bindForm(root, PF, p, () => {}, refresh);
      root.querySelector('#sv').onclick = async () => { if (!p.name.trim()) return; if (isNew) set.items.push(p); await repo.save(set); close(); done(); };
      root.querySelector('#del')?.addEventListener('click', async () => { set.items = set.items.filter(x => x !== p); await repo.save(set); close(); done(); });
      root.querySelector('#cn').onclick = close;
    },
  }));
}

function addProductDialog(set, done) {
  let found = null, msg = '';
  modal(() => ({
    title: 'Добавить продукт',
    html: `<p class="muted">Введите название — поищем в Open Food Facts и заполним КБЖУ. Нужен интернет.</p>
      <div class="two"><input id="name" class="search" placeholder="Например: гречка"><button class="btn" id="find" style="width:auto;margin:0">Найти</button></div>
      <p class="warnmsg">${esc(msg)}</p>
      ${found ? `<ul class="list">${found.map((f, i) => `<li><button data-pick="${i}"><span>${esc(f.name)}</span><span class="muted">${f.kcal} ккал · Б${f.p} Ж${f.f} У${f.c}</span></button></li>`).join('') || '<li class="muted">Ничего не нашлось</li>'}</ul>` : ''}
      <h3>Штрихкод</h3><div class="two"><input id="code" class="search" inputmode="numeric" placeholder="Номер под штрихкодом"><button class="btn" id="bc" style="width:auto;margin:0">Найти</button></div>
      ${'BarcodeDetector' in window ? '<button class="btn ghost" id="cam">Сканировать камерой</button><video id="vid" playsinline muted style="width:100%;display:none"></video>' : '<p class="muted small">Сканирование камерой есть в Chrome на Android; здесь можно ввести номер.</p>'}
      <button class="btn ghost" id="manual">Ввести вручную</button>`,
    bind(root, refresh, close) {
      const open = (o, src) => { close(); editProduct(set, blank(o, src), done); };
      root.querySelector('#find').onclick = async () => { const n = root.querySelector('#name').value.trim(); if (!n) return; msg = 'Ищу…'; refresh(); try { found = await searchOff(n); msg = ''; } catch (e) { msg = e.message + '. Проверьте интернет или введите вручную.'; found = null; } refresh(); };
      root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => open(found[+b.dataset.pick], 'Open Food Facts'));
      const useCode = async code => { msg = 'Ищу…'; refresh(); try { open(await byBarcode(code), 'Open Food Facts'); } catch (e) { msg = e.message; refresh(); } };
      root.querySelector('#bc').onclick = () => { const c = root.querySelector('#code').value.trim(); if (c) useCode(c); };
      root.querySelector('#cam')?.addEventListener('click', async () => { const v = root.querySelector('#vid'); v.style.display = 'block'; try { await scan(v, useCode); } catch { msg = 'Нет доступа к камере'; refresh(); } });
      root.querySelector('#manual').onclick = () => open({ name: root.querySelector('#name').value.trim() || 'Новый продукт' }, 'вручную');
    },
  }));
}

function importDialog(done) {
  let res = null, fname = '', err = '';
  modal(() => ({
    title: 'Набор из файла',
    html: `<p class="muted">Файл .xlsx, .csv или .json с колонками: ${COLS.join('; ')}. Обязательные: Название, Категория, Ккал.</p>
      <div class="btnrow"><label class="btn ghost filebtn">Выбрать файл<input type="file" id="f" accept=".xlsx,.csv,.json" hidden></label><button class="btn ghost" id="tpl">Скачать шаблон</button></div>
      <p class="warnmsg">${esc(err)}</p>
      ${res ? `<h3>Предпросмотр: найдено продуктов ${res.items.length}${res.errors.length ? `, ошибок ${res.errors.length}` : ''}</h3>
        ${res.errors.length ? `<ul class="warnlist">${res.errors.slice(0, 30).map(e => `<li>${esc(e)}</li>`).join('')}${res.errors.length > 30 ? `<li>…и ещё ${res.errors.length - 30}</li>` : ''}</ul><p class="muted small">Строки с ошибками не загрузятся.</p>` : ''}
        <div class="tbl"><table class="dtable"><tr><th>Название</th><th>Категория</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th></tr>${res.items.slice(0, 8).map(p => `<tr><td>${esc(p.name)}</td><td>${catName(p.cat)}</td><td>${p.kcal}</td><td>${p.p}</td><td>${p.f}</td><td>${p.c}</td></tr>`).join('')}</table></div>
        <div class="fld"><label>Название набора</label><div class="ctl"><input id="nm" value="${esc(fname)}" style="width:220px;text-align:left"></div></div>
        <div class="btnrow"><button class="btn" id="load" ${res.items.length ? '' : 'disabled'}>Загрузить ${res.items.length} продуктов</button></div>` : ''}`,
    bind(root, refresh, close) {
      root.querySelector('#tpl').onclick = async () => download('Шаблон_набора_продуктов.xlsx', await writeXlsx([{ name: 'Продукты', rows: [COLS, ['Гречка', 'Крупы и макароны', 313, 12.6, 3.3, 62.1, 800, 999, 'нет', 120, '']] }]));
      root.querySelector('#f').onchange = async e => {
        const f = e.target.files[0]; if (!f) return; err = '';
        try { res = parseProducts(await readTable(f)); fname = f.name.replace(/\.[^.]+$/, ''); } catch (x) { err = x.message; res = null; } refresh();
      };
      root.querySelector('#load')?.addEventListener('click', async () => {
        const s = await repo.add({ id: repo.uid(), name: root.querySelector('#nm').value.trim() || fname || 'Из файла', items: res.items }); close(); done(s.id);
      });
    },
  }));
}

export const views = {
  products(_, ctx) {
    const trip = ctx.trip(), sets = repo.list();
    if (!repo.get(ui.id)) ui.id = (repo.get(trip.productSet) || repo.first()).id;
    const set = repo.get(ui.id), q = ui.q.trim().toLowerCase();
    const scope = set.items.filter(p => ui.cat === 'all' || p.cat === ui.cat);
    const list = scope.filter(p => !q || p.name.toLowerCase().includes(q));
    const sel = set.items.filter(p => p.on).length;
    return {
      html: `<h2>Продукты</h2>${tabsHtml(sets, set.id, trip.productSet)}
        <div class="btnrow">${set.readonly ? '' : '<button class="mini" id="ren">Переименовать</button>'}<button class="mini" id="dup" ${repo.canAdd() ? '' : 'disabled'}>Дублировать</button><button class="mini" id="del">Удалить</button><button class="mini" id="exp">В файл</button><button class="mini" id="use">${set.id === trip.productSet ? 'Используется в походе ✓' : 'Использовать в походе'}</button></div>
        <input id="q" class="search" placeholder="Поиск по названию" value="${esc(ui.q)}">
        <div class="chips"><button data-c="all" class="${ui.cat === 'all' ? 'on' : ''}">Все</button>${CATS.map(([k, n]) => `<button data-c="${k}" class="${ui.cat === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="btnrow"><button class="btn ghost" data-sel="all">Выбрать все</button><button class="btn ghost" data-sel="none">Снять все выделение</button><button class="btn ghost" data-sel="inv">Инвертировать</button><span class="muted">${ui.cat === 'all' ? 'для всех продуктов' : 'для категории «' + catName(ui.cat) + '»'} · <b>выбрано ${sel} из ${set.items.length}</b></span>${set.readonly ? '' : '<button class="btn" id="addp" style="margin-left:auto">Добавить продукт</button>'}</div>
        <div class="btnrow"><button class="btn ghost" id="ldp">Загрузить продукты</button><button class="btn ghost" id="lda">Загрузить всё из файла</button>${set.readonly ? '<span class="muted small">🔒 Оригинал, только чтение: скопируйте набор («Дублировать»), чтобы менять.</span>' : ''}</div>
        <div class="tbl"><table class="dtable ptable"><tr><th></th><th>Название</th><th>Категория</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th><th>Упак., г</th><th>Хран., дн</th><th>Цена</th></tr>
        ${list.map(p => `<tr data-p="${p.id}"><td><input type="checkbox" data-on="${p.id}"${p.on ? ' checked' : ''}${set.readonly ? ' disabled' : ''}></td><td>${esc(p.name)}${p.check ? ' <span class="dot">?</span>' : ''}${p.kcal == null || (p.baseUnit && p.baseUnit !== 'г') ? ' <span class="bad small">не считается</span>' : ''}${p.fresh ? ' <span class="muted small">свежий</span>' : ''}</td><td>${esc(p.catOrig ?? catName(p.cat))}</td><td>${p.kcal ?? ''}</td><td>${p.p ?? ''}</td><td>${p.f ?? ''}</td><td>${p.c ?? ''}</td><td>${p.pack ?? ''}${p.baseUnit && p.baseUnit !== 'г' ? ` <span class="muted small">${esc(p.baseUnit)}</span>` : ''}</td><td>${p.shelf == null ? '' : p.shelf >= 999 ? '∞' : p.shelf}</td><td>${p.price ?? ''}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Ничего не найдено</td></tr>'}</table></div>`,
      bind(root) {
        const re = () => ctx.rerender();
        bindTabs(root, { repo, rerender: re, onSelect: id => { ui.id = id; ui.cat = 'all'; re(); }, onAdd: () => addSetDialog(set, id => { ui.id = id; re(); }, re) });
        const q2 = root.querySelector('#q'); q2.oninput = () => { ui.q = q2.value; const pos = q2.selectionStart; re(); const n = document.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); };
        root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { ui.cat = b.dataset.c; re(); });
        root.querySelectorAll('[data-on]').forEach(c => c.onchange = async () => { set.items.find(p => p.id === c.dataset.on).on = c.checked; await repo.save(set); re(); });
        root.querySelectorAll('[data-sel]').forEach(b => b.onclick = async () => { if (set.readonly) return; const m = b.dataset.sel; scope.forEach(p => { p.on = m === 'all' ? true : m === 'none' ? false : !p.on; }); await repo.save(set); re(); });
        root.querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = e => { if (e.target.tagName !== 'INPUT') editProduct(set, set.items.find(p => p.id === tr.dataset.p), re); });
        root.querySelector('#addp')?.addEventListener('click', () => addProductDialog(set, re));
        root.querySelector('#ldp').onclick = () => openLoad(ctx, { only: 'products', after: re });
        root.querySelector('#lda').onclick = () => openLoad(ctx, { after: re });
        root.querySelector('#ren')?.addEventListener('click', async () => { const n = prompt('Название набора', set.name); if (n && n.trim()) { set.name = n.trim(); await repo.save(set); re(); } });
        root.querySelector('#dup').onclick = async () => { const s = await repo.add({ ...JSON.parse(JSON.stringify(set)), id: repo.uid(), name: set.name + ' (копия)', builtin: false }); ui.id = s.id; re(); };
        root.querySelector('#del').onclick = async () => {
          if (sets.length < 2) { alert('Последний набор удалить нельзя.'); return; }
          if (!confirm(`Удалить набор «${set.name}»?`)) return;
          await repo.remove(set.id); if (trip.productSet === set.id) { trip.productSet = repo.first().id; ctx.saveTrip(); } ui.id = repo.first().id; re();
        };
        root.querySelector('#exp').onclick = async () => download(`Продукты_${set.name}.xlsx`, await writeXlsx([{ name: 'Продукты', rows: productRows(set.items) }]));
        root.querySelector('#use').onclick = () => { trip.productSet = set.id; ctx.saveTrip(); re(); };
      },
    };
  },
};

function addSetDialog(cur, done, rerender) {
  modal(() => ({
    title: 'Новый набор продуктов',
    html: `<ul class="list"><li><button data-k="empty">Пустой набор<span>›</span></button></li><li><button data-k="copy">Копия текущего («${esc(cur.name)}»)<span>›</span></button></li><li><button data-k="file">Из файла (.xlsx, .csv, .json)<span>›</span></button></li><li><button data-k="manual">Вручную, по одному продукту<span>›</span></button></li></ul>`,
    bind(root, refresh, close) {
      root.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
        const k = b.dataset.k; close();
        if (k === 'file') return importDialog(done);
        const name = prompt('Название набора', k === 'copy' ? cur.name + ' (копия)' : 'Новый набор'); if (!name) return;
        const s = await repo.add({ id: repo.uid(), name: name.trim(), items: k === 'copy' ? JSON.parse(JSON.stringify(cur.items)) : [] });
        done(s.id); if (k === 'manual') setTimeout(() => addProductDialog(s, rerender), 50);
      });
    },
  }));
}
