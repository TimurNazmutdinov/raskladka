// Окно «Загрузка из файла»: форма Excel (или .csv/.json) → наборы продуктов, блюд и план. Предпросмотр, выбор вкладок, дубли, отмена.
import { repo as prepo } from './pstore.js';
import { repo as mrepo } from './mstore.js';
import { repo as plrepo } from './plstore.js';
import { parseBook, detect, parseProducts, parseDishes, parsePlan, simpleFormSheets, formSheets } from './formio.js';
import { readXlsxAll, parseCsv, writeXlsx, download } from './xlsx.js';
import { esc, modal } from './ui.js';
import * as store from './store.js';
import { scanUnits, applyUnits } from './units.js';
import { danglingProducts, danglingDishes, foundInFile, addAliases } from './links.js';

const REPOS = { products: prepo, dishes: mrepo, plan: plrepo }, KIND_RU = { products: 'Продукты', dishes: 'Блюда', plan: 'План (меню)', params: 'Параметры' };
let uid = 0; const nid = p => p + Date.now().toString(36) + (uid++);
const clone = o => JSON.parse(JSON.stringify(o));

export async function readAny(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.xlsx')) return readXlsxAll(await file.arrayBuffer());
  if (n.endsWith('.xls')) throw new Error('Старый формат .xls не поддерживается: сохраните файл как .xlsx');
  if (n.endsWith('.csv')) return { [file.name.replace(/\.[^.]+$/, '')]: parseCsv(await file.text()) };
  if (n.endsWith('.json')) {
    const j = JSON.parse(await file.text()), out = {};
    const tab = arr => { if (!arr.length) return []; const keys = Object.keys(arr[0]); return [keys, ...arr.map(o => keys.map(k => o[k] ?? null))]; };
    if (Array.isArray(j)) out[file.name.replace(/\.[^.]+$/, '')] = tab(j);
    else for (const [k, v] of Object.entries(j)) if (Array.isArray(v)) out[k] = tab(v);
    return out;
  }
  throw new Error('Поддерживаются файлы .xlsx, .csv, .json');
}

export const blankForm = () => writeXlsx(simpleFormSheets());
export const formBook = parts => writeXlsx(formSheets(parts));

// ---- построение наборов из блока ----
function mkProductSet(b, name, readonly, meta) {
  return { id: nid('p'), name, readonly, meta, items: b.items.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false })) };
}
function mkDish(d) { return { id: nid('d'), name: d.name, meal: d.meal, mealOrig: d.mealOrig, desc: d.desc, srcId: d.srcId, cook: d.cook, cond: d.cond, on: true, ing: d.ing }; }

function prep(parsed) { parsed.params = (parsed.blocks.find(b => b.kind === 'params') || {}).params || null; parsed.blocks = parsed.blocks.filter(b => b.kind !== 'params' && ((b.items || b.dishes || b.rows || []).length || b.errors.length)); return parsed; }

export function openLoad(ctx, { only = null, after } = {}) {
  let parsed = null, fname = '', err = '', log = null, st = {}, readonly = false;
  let sc = null, us = { kg: false, pcs: false, w: {}, rem: true, grp: false, n: 12 }, savedW = {};
  const kinds = only ? [only] : ['products', 'dishes', 'plan'];
  Promise.resolve(store.get('settings', 'pieceWeights')).then(v => { savedW = v || {}; }).catch(() => {});
  // ---- связи: что есть в наборе, к которому будут привязаны блюда / план этого файла ----
  let lk = { prod: { mode: 'warn', map: {} }, dish: { mode: 'warn', map: {} } };
  const incl = (kind, f = () => true) => (parsed ? parsed.blocks : []).map((b, i) => [b, i]).filter(([b, i]) => b.kind === kind && st[i]?.include && f(b, i));
  const tieProd = () => {
    const d = incl('dishes')[0]; if (!d) return null; const s = st[d[1]]; let set = null, items = [];
    if (s.target === 'new') { const pj = incl('products', (b, i) => st[i].target === 'new').pop(); if (pj) items = pj[0].items; else { set = prepo.first(); items = set?.items || []; } }
    else { set = prepo.get(mrepo.get(s.target)?.productSetId); items = set?.items || []; incl('products', (b, i) => st[i].target === set?.id).forEach(([b, i]) => { items = st[i].mode === 'replace' ? b.items : [...items, ...b.items]; }); }
    return { set, items, blocks: d ? incl('dishes').map(x => x[0]) : [] };
  };
  const tieDish = () => {
    const p = incl('plan')[0]; if (!p) return null; const s = st[p[1]]; let set = null, items = [];
    if (s.target === 'new') { const dj = incl('dishes', (b, i) => st[i].target === 'new').pop(); if (dj) items = dj[0].dishes; else { set = mrepo.first(); items = set?.dishes || []; } }
    else { set = mrepo.get(plrepo.get(s.target)?.dishSetId); items = set?.dishes || []; incl('dishes', (b, i) => st[i].target === set?.id).forEach(([b, i]) => { items = st[i].mode === 'replace' ? b.dishes : [...items, ...b.dishes]; }); }
    return { set, items, blocks: incl('plan').map(x => x[0]) };
  };
  const linkInfo = () => {
    const tp = tieProd(), td = tieDish(), fileItems = (parsed ? parsed.blocks : []).filter(b => b.kind === 'products').flatMap(b => b.items), fileDishes = (parsed ? parsed.blocks : []).filter(b => b.kind === 'dishes').flatMap(b => b.dishes);
    const prod = tp && !readonly ? (() => { const names = danglingProducts(tp.blocks, tp.items); return { names, items: tp.items, locked: !!tp.set?.readonly, found: foundInFile(names, fileItems).length, setName: tp.set?.name }; })() : null;
    const dish = td && !readonly ? (() => { const names = danglingDishes(td.blocks, td.items); return { names, items: td.items, locked: !!td.set?.readonly, found: foundInFile(names, fileDishes, 'name').length, setName: td.set?.name }; })() : null;
    return { prod: prod?.names.length ? prod : null, dish: dish?.names.length ? dish : null };
  };
  const linkBlock = (key, info, title, what) => {
    const l = lk[key], r = (v, t) => `<label><input type="radio" name="lk${key}" value="${v}" ${l.mode === v ? 'checked' : ''} ${info.locked && v !== 'warn' ? 'disabled' : ''}> ${t}</label>`;
    const opts = sel => `<option value="">— не связывать</option>${info.items.map(x => `<option value="${esc(x.name)}"${sel === x.name ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}`;
    return `<p><b>${title}:</b> ${info.names.length}. <span class="muted small">${info.names.slice(0, 6).map(esc).join(', ')}${info.names.length > 6 ? '…' : ''}</span></p>
      <p>${r('warn', 'оставить с предупреждением')} &nbsp; ${r('create', `создать из этого файла (найдено ${info.found} из ${info.names.length})`)} &nbsp; ${r('link', 'связать с существующим')}</p>
      ${info.locked ? `<p class="muted small">Набор «${esc(info.setName || '')}» — «оригинал, только чтение»: менять его нельзя.</p>` : ''}
      ${l.mode === 'link' && !info.locked ? `<div class="tbl"><table class="dtable">${info.names.map(n => `<tr><td>${esc(n)}</td><td><select data-lk="${key}" data-n="${esc(n)}">${opts(l.map[n])}</select></td></tr>`).join('')}</table></div><p class="muted small">Название в данных не меняется: к существующему ${what} добавляется второе имя.</p>` : ''}`;
  };
  const linksHtml = () => {
    if (!parsed || readonly) return '';
    const i = linkInfo(); if (!i.prod && !i.dish) return '';
    return `<h3>Связи</h3>${i.prod ? linkBlock('prod', i.prod, 'Продуктов из блюд нет в наборе продуктов', 'продукту') : ''}${i.dish ? linkBlock('dish', i.dish, 'Блюд из плана нет в наборе блюд', 'блюду') : ''}`;
  };
  const unitsHtml = () => {
    if (!sc || !(sc.kg || sc.pcs || sc.group)) return '<p class="muted small"><b>Единицы:</b> оставлены как в файле. Строки с шт, мл, л, «на группу» и продукты без КБЖУ загружаются, но в расчёте помечаются «не считается» и не подменяются.</p>';
    if (readonly) return '<p class="muted small"><b>Единицы:</b> для набора «оригинал, только чтение» пересчёт отключён: всё как в файле.</p>';
    const row = (cnt, label, body) => `<tr><td>${label} <span class="muted small">(${cnt})</span></td><td>${body}</td></tr>`;
    return `<h3>Единицы</h3><p class="muted small">По умолчанию — как в файле: такие строки не считаются и помечаются. Пересчёт только если выбрать ниже.</p><div class="tbl"><table class="dtable">
      ${sc.kg ? row(sc.kg, 'кг', `<label><input type="radio" name="ukg" value="0" ${us.kg ? '' : 'checked'}> как в файле</label> <label><input type="radio" name="ukg" value="1" ${us.kg ? 'checked' : ''}> перевести в граммы</label>`) : ''}
      ${sc.pcs ? row(sc.pcs, 'шт', `<label><input type="radio" name="upc" value="0" ${us.pcs ? '' : 'checked'}> как в файле</label> <label><input type="radio" name="upc" value="1" ${us.pcs ? 'checked' : ''}> вес 1 шт, г:</label>
        ${us.pcs ? `<br>${sc.pieceNames.map(n => `${esc(n)} <input data-pw="${esc(n)}" type="number" min="0" step="any" style="width:70px" value="${us.w[n] ?? ''}">`).join(' &nbsp; ')}<br><label><input type="checkbox" id="urem" ${us.rem ? 'checked' : ''}> запомнить для следующих загрузок</label>` : ''}`) : ''}
      ${sc.ml ? row(sc.ml, 'мл / л', 'как в файле (пересчёт не предусмотрен)') : ''}
      ${sc.group ? row(sc.group, '«на группу»', `<label><input type="radio" name="ugr" value="0" ${us.grp ? '' : 'checked'}> как в файле</label> <label><input type="radio" name="ugr" value="1" ${us.grp ? 'checked' : ''}> разделить на</label> <input id="ugn" type="number" min="1" step="1" style="width:60px" value="${us.n}"> чел`) : ''}
    </table></div>`;
  };
  modal(() => {
    const undo = ctx.undoInfo;
    const blocks = parsed ? parsed.blocks : [];
    const blockHtml = blocks.map((b, i) => {
      const s = st[i], cnt = b.kind === 'products' ? b.items.length : b.kind === 'dishes' ? b.dishes.length : b.rows.length, rp = REPOS[b.kind];
      const lines = b.kind === 'dishes' ? ` · строк ${b.dishes.reduce((a, d) => a + d.ing.length, 0)}` : '';
      const nonG = b.kind === 'products' ? b.items.filter(x => (x.baseUnit && x.baseUnit !== 'г') || x.kcal == null).length : b.kind === 'dishes' ? b.dishes.reduce((a, d) => a + d.ing.filter(x => (x.unit && x.unit !== 'г') || x.perGroup).length, 0) : 0;
      return `<tr><td><input type="checkbox" data-inc="${i}" ${s.include ? 'checked' : ''} ${(only && !kinds.includes(b.kind)) ? '' : ''}></td><td><b>${KIND_RU[b.kind]}</b>: ${cnt}${lines}<br><span class="muted small">лист «${esc(b.sheet)}»</span></td>
        <td><select data-tg="${i}"><option value="new"${s.target === 'new' ? ' selected' : ''}${rp.canAdd() ? '' : ' disabled'}>новая вкладка</option>${rp.list().filter(x => !x.readonly).map(x => `<option value="${x.id}"${s.target === x.id ? ' selected' : ''}>в «${esc(x.name)}»</option>`).join('')}</select>
        ${s.target === 'new' ? `<input data-nm="${i}" value="${esc(s.name)}" style="width:150px">` : `<select data-md="${i}"><option value="add"${s.mode === 'add' ? ' selected' : ''}>добавить к существующим</option><option value="replace"${s.mode === 'replace' ? ' selected' : ''}>заменить вкладку целиком</option></select>`}
        ${s.target !== 'new' && s.mode === 'add' && b.kind !== 'plan' ? `<br><select data-dp="${i}"><option value="update"${s.dup === 'update' ? ' selected' : ''}>совпадения: обновить</option><option value="skip"${s.dup === 'skip' ? ' selected' : ''}>совпадения: пропустить</option><option value="both"${s.dup === 'both' ? ' selected' : ''}>совпадения: сохранить оба</option></select>` : ''}</td>
        <td class="small">${b.errors.length ? `<span class="warnmsg">ошибок: ${b.errors.length}</span>` : '<span class="good">ошибок нет</span>'}${nonG ? `<br><span class="muted">не считаются (единицы/КБЖУ): ${nonG}</span>` : ''}</td></tr>`;
    }).join('');
    const errs = blocks.flatMap(b => b.errors);
    return {
      title: 'Загрузка из файла',
      html: `<p class="muted">Шаблон Excel (листы «Продукты», «Блюда», «План»; скачайте «пустую форму»), а также .csv и .json. Файлы .xls сначала сохраните как .xlsx. Данные грузятся как в файле: ничего не исправляется и не пересчитывается. Текущий поход не меняется.</p>
        <div class="btnrow"><label class="btn filebtn2">Выбрать файл<input type="file" id="f" accept=".xlsx,.xls,.csv,.json" hidden></label><button class="btn ghost" id="blank">Скачать пустую форму</button>${undo ? `<button class="btn ghost" id="undo">Отменить последнюю загрузку</button>` : ''}</div>
        <p class="warnmsg">${esc(err)}</p>
        ${log ? `<h3>Готово</h3><ul class="list">${log.map(l => `<li><span>${esc(l)}</span></li>`).join('')}</ul><div class="btnrow"><button class="btn" id="done">Закрыть</button></div>` : ''}
        ${parsed && !log ? `<h3>Файл «${esc(fname)}» — что найдено</h3>
          ${blocks.length ? `<div class="tbl"><table class="dtable"><tr><th></th><th>Блок</th><th>Куда и как</th><th>Проверка</th></tr>${blockHtml}</table></div>` : '<p class="warnmsg">В файле нет данных для загрузки. Заполните строки под заголовками на листах «Продукты», «Блюда» или «План» (пример — на листе «Как заполнять») и выберите файл снова. Если данные есть, проверьте названия листов и заголовки колонок.</p>'}
          <div class="fld"><label>Пометить новые вкладки «оригинал, только чтение»</label><div class="ctl"><input type="checkbox" id="ro" ${readonly ? 'checked' : ''}></div></div>
          ${unitsHtml()}
          ${linksHtml()}
          ${errs.length ? `<h3>Ошибки (плохие строки пропускаются, остальное грузится)</h3><ul class="warnlist">${errs.slice(0, 25).map(e => `<li>${esc(e)}</li>`).join('')}${errs.length > 25 ? `<li>…и ещё ${errs.length - 25}</li>` : ''}</ul>` : ''}
          ${parsed.unused.length ? `<h3>Не использовано</h3><p class="muted small">Листы: ${parsed.unused.map(esc).join(', ')}</p>` : ''}
          <div class="btnrow"><button class="btn" id="go" ${blocks.some((b, i) => st[i].include) ? '' : 'disabled'}>Загрузить</button><button class="btn ghost" id="cancel">Отмена</button></div>` : ''}`,
      bind(root, refresh, close) {
        root.querySelector('#blank').onclick = async () => download('Форма_для_загрузки_пустая.xlsx', await blankForm());
        root.querySelector('#cancel')?.addEventListener('click', close); root.querySelector('#done')?.addEventListener('click', () => { close(); after?.(); });
        root.querySelector('#undo')?.addEventListener('click', async () => { await ctx.undoLoad(); close(); after?.(); });
        root.querySelector('#f').onchange = async e => {
          const f = e.target.files[0]; if (!f) return; err = ''; log = null;
          try {
            const sheets = await readAny(f); fname = f.name; parsed = prep(parseBook(sheets));
            us = { kg: false, pcs: false, w: {}, rem: true, grp: false, n: 12 }; lk = { prod: { mode: 'warn', map: {} }, dish: { mode: 'warn', map: {} } };
            if (!parsed.blocks.length) { // таблица без названий листов: пробуем по типу кнопки
              const only1 = Object.entries(sheets)[0];
              if (only && only1) { const fn = { products: parseProducts, dishes: parseDishes, plan: parsePlan }[only], r = fn(only1[1], only1[0]); parsed.blocks.push({ kind: only, sheet: only1[0], ...r }); }
            }
            st = {}; parsed.blocks.forEach((b, i) => { st[i] = { include: !only || b.kind === only, target: REPOS[b.kind].canAdd() ? 'new' : (REPOS[b.kind].list().find(x => !x.readonly)?.id || 'new'), mode: 'add', dup: 'update', name: f.name.replace(/\.[^.]+$/, '') + (parsed.blocks.filter(x => x.kind === b.kind).length > 1 ? ' ' + b.sheet : '') }; });
            readonly = false; parsed.blocks.forEach(b => { if ((b.items || b.dishes || b.rows || []).some(x => /\S+!/.test(x.srcCell || ''))) readonly = true; });
            sc = scanUnits(parsed.blocks); sc.pieceNames.forEach(n => { if (savedW[n] > 0) us.w[n] = savedW[n]; });
          } catch (x) { err = x.message; parsed = null; }
          refresh();
        };
        if (!parsed || log) return;
        root.querySelectorAll('[data-inc]').forEach(c => c.onchange = () => { st[c.dataset.inc].include = c.checked; refresh(); });
        root.querySelectorAll('[data-tg]').forEach(c => c.onchange = () => { st[c.dataset.tg].target = c.value; refresh(); });
        root.querySelectorAll('[data-nm]').forEach(c => c.onchange = () => { st[c.dataset.nm].name = c.value; });
        root.querySelectorAll('[data-md]').forEach(c => c.onchange = () => { st[c.dataset.md].mode = c.value; refresh(); });
        root.querySelectorAll('[data-dp]').forEach(c => c.onchange = () => { st[c.dataset.dp].dup = c.value; });
        root.querySelector('#ro').onchange = e => { readonly = e.target.checked; refresh(); };
        const radio = (nm, fn) => root.querySelectorAll(`input[name="${nm}"]`).forEach(c => c.onchange = () => { fn(c.value === '1'); refresh(); });
        radio('ukg', v => { us.kg = v; }); radio('upc', v => { us.pcs = v; }); radio('ugr', v => { us.grp = v; });
        root.querySelectorAll('[data-pw]').forEach(c => c.onchange = () => { us.w[c.dataset.pw] = parseFloat(String(c.value).replace(',', '.')) || 0; });
        for (const k of ['prod', 'dish']) root.querySelectorAll(`input[name="lk${k}"]`).forEach(c => c.onchange = () => { lk[k].mode = c.value; refresh(); });
        root.querySelectorAll('[data-lk]').forEach(c => c.onchange = () => { lk[c.dataset.lk].map[c.dataset.n] = c.value; });
        root.querySelector('#urem')?.addEventListener('change', e => { us.rem = e.target.checked; });
        root.querySelector('#ugn')?.addEventListener('change', e => { us.n = Math.max(1, parseInt(e.target.value) || 1); });
        root.querySelector('#go').onclick = async () => {
          try {
            const p2 = readonly ? parsed : { ...parsed, blocks: applyUnits(parsed.blocks, { kg: us.kg, pcs: us.pcs ? us.w : {}, group: us.grp ? us.n : null }) };
            const li = readonly ? { prod: null, dish: null } : linkInfo();
            const lk2 = { prod: { mode: li.prod ? lk.prod.mode : 'warn', map: lk.prod.map, names: li.prod?.names || [] }, dish: { mode: li.dish ? lk.dish.mode : 'warn', map: lk.dish.map, names: li.dish?.names || [] } };
            log = await execute(ctx, p2, st, readonly, fname, lk2);
            if (us.pcs && us.rem && !readonly) { savedW = { ...savedW, ...Object.fromEntries(Object.entries(us.w).filter(([, v]) => v > 0)) }; await store.put('settings', 'pieceWeights', savedW); }
          } catch (x) { err = 'Не удалось загрузить: ' + x.message; }
          refresh();
        };
      },
    };
  });
}

// Загрузка: создаёт/обновляет наборы и запоминает, как отменить
async function execute(ctx, parsed, st, readonly, fname, lk = null) {
  const undo = { created: [], replaced: [], file: fname, at: Date.now() }, out = [], setOf = {};
  const snapshot = (kind, set) => { if (undo.created.some(c => c.id === set.id) || undo.replaced.some(r => r.old.id === set.id)) return; undo.replaced.push({ kind, old: clone(set) }); };
  const meta = { file: fname, loaded: new Date().toISOString(), params: parsed.params || null };
  let newP = null, newD = null;
  const blocks = parsed.blocks;
  for (const kind of ['products', 'dishes', 'plan']) for (const [i, b] of blocks.entries()) {
    const s = st[i]; if (b.kind !== kind || !s.include) continue;
    const rp = REPOS[kind];
    if (s.target === 'new') {
      if (!rp.canAdd()) throw new Error(`Нет места: уже 10 вкладок («${KIND_RU[kind]}»). Выберите существующую вкладку.`);
      let set;
      if (kind === 'products') { set = mkProductSet(b, s.name || fname, readonly, meta); newP = set; }
      else if (kind === 'dishes') { set = { id: nid('m'), name: s.name || fname, readonly, meta, productSetId: newP?.id || prepo.first()?.id, dishes: b.dishes.map(mkDish) }; newD = set; }
      else set = { id: nid('l'), name: s.name || fname, readonly, meta, dishSetId: newD?.id || mrepo.first()?.id, productSetId: newP?.id || newD?.productSetId || prepo.first()?.id, rows: b.rows };
      await rp.add(set); undo.created.push({ kind, id: set.id }); setOf[i] = set;
      out.push(`${KIND_RU[kind]}: новая вкладка «${set.name}» — ${kind === 'products' ? set.items.length + ' продуктов' : kind === 'dishes' ? set.dishes.length + ' блюд' : set.rows.length + ' строк'}${readonly ? ' (оригинал, только чтение)' : ''}`);
    } else {
      const set = rp.get(s.target); snapshot(kind, set); setOf[i] = set;
      if (kind === 'products') {
        const add = b.items.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false }));
        if (s.mode === 'replace') set.items = add; else for (const x of add) { const k = set.items.findIndex(y => y.name === x.name); if (k < 0) set.items.push(x); else if (s.dup === 'update') set.items[k] = { ...x, id: set.items[k].id }; else if (s.dup === 'both') set.items.push({ ...x, name: x.name + ' (2)' }); }
      } else if (kind === 'dishes') {
        const add = b.dishes.map(mkDish);
        if (s.mode === 'replace') set.dishes = add; else for (const x of add) { const k = set.dishes.findIndex(y => y.name === x.name); if (k < 0) set.dishes.push(x); else if (s.dup === 'update') set.dishes[k] = { ...x, id: set.dishes[k].id }; else if (s.dup === 'both') set.dishes.push({ ...x, name: x.name + ' (2)' }); }
      } else { set.rows = s.mode === 'replace' ? b.rows : [...set.rows, ...b.rows]; }
      await rp.save(set); out.push(`${KIND_RU[kind]}: обновлена вкладка «${set.name}» (${s.mode === 'replace' ? 'заменена целиком' : 'добавлено'})`);
    }
  }
  if (!out.length) throw new Error('Ничего не выбрано.');
  if (lk) {
    const fileItems = blocks.filter(b => b.kind === 'products').flatMap(b => b.items), fileDishes = blocks.filter(b => b.kind === 'dishes').flatMap(b => b.dishes);
    const di = blocks.findIndex((b, i) => b.kind === 'dishes' && setOf[i]), pi = blocks.findIndex((b, i) => b.kind === 'plan' && setOf[i]);
    if (di >= 0 && lk.prod.mode !== 'warn') {
      const ps = prepo.get(setOf[di].productSetId);
      if (ps && !ps.readonly) {
        snapshot('products', ps);
        if (lk.prod.mode === 'create') { const add = foundInFile(lk.prod.names, fileItems).filter((x, k, a) => a.indexOf(x) === k); ps.items.push(...add.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false }))); out.push(`Связи: в набор продуктов «${ps.name}» добавлено из файла: ${add.length}`); }
        else { const n = addAliases(ps.items, lk.prod.map); out.push(`Связи: продукты связаны с «${ps.name}»: ${n}`); }
        await prepo.save(ps);
      }
    }
    if (pi >= 0 && lk.dish.mode !== 'warn') {
      const ds = mrepo.get(setOf[pi].dishSetId);
      if (ds && !ds.readonly) {
        snapshot('dishes', ds);
        if (lk.dish.mode === 'create') { const add = foundInFile(lk.dish.names, fileDishes).filter((x, k, a) => a.indexOf(x) === k); ds.dishes.push(...add.map(mkDish)); out.push(`Связи: в набор блюд «${ds.name}» добавлено из файла: ${add.length}`); }
        else { const n = addAliases(ds.dishes, lk.dish.map); out.push(`Связи: блюда связаны с «${ds.name}»: ${n}`); }
        await mrepo.save(ds);
      }
    }
  }
  const bad = blocks.reduce((a, b) => a + b.errors.length, 0); if (bad) out.push(`Пропущено строк с ошибками: ${bad}`);
  await ctx.saveUndo(undo); return out;
}

// ---- отмена последней загрузки ----
export async function saveUndo(u) { await store.put('settings', 'lastLoad', u); }
export const getUndo = () => store.get('settings', 'lastLoad');
export async function undoLoad() {
  const u = await store.get('settings', 'lastLoad'); if (!u) return false;
  for (const c of u.created) { const rp = REPOS[c.kind]; if (rp.get(c.id)) await rp.remove(c.id); }
  for (const r of u.replaced) await REPOS[r.kind].put(r.old);
  await store.del('settings', 'lastLoad'); return true;
}

// Для проверок: загрузить весь файл в новые вкладки без окон
export async function loadFileAll(ctx, file, readonly = false) {
  const parsed = prep(parseBook(await readAny(file))), st = {};
  parsed.blocks.forEach((b, i) => { st[i] = { include: true, target: 'new', mode: 'add', dup: 'update', name: file.name.replace(/\.[^.]+$/, '') }; });
  return execute(ctx, parsed, st, readonly, file.name);
}
