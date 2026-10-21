// Окно «Загрузка из файла»: форма Excel (или .csv/.json) → наборы продуктов, блюд и план. Предпросмотр, выбор вкладок, дубли, отмена.
import { repo as prepo } from './pstore.js';
import { repo as mrepo } from './mstore.js';
import { repo as plrepo } from './plstore.js';
import { parseBook, detect, parseProducts, parseDishes, parsePlan, FORM_HEAD, formSheets } from './formio.js';
import { readXlsxAll, parseCsv, writeXlsx, download } from './xlsx.js';
import { esc, modal } from './ui.js';
import * as store from './store.js';

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

export const blankForm = () => writeXlsx([{ name: 'Параметры', rows: [FORM_HEAD.params] }, { name: 'Продукты', rows: [FORM_HEAD.products] }, { name: 'Блюда', rows: [FORM_HEAD.dishes] }, { name: 'План', rows: [FORM_HEAD.plan] }]);
export const formBook = parts => writeXlsx(formSheets(parts));

// ---- построение наборов из блока ----
function mkProductSet(b, name, readonly, meta) {
  return { id: nid('p'), name, readonly, meta, items: b.items.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false })) };
}
function mkDish(d) { return { id: nid('d'), name: d.name, meal: d.meal, mealOrig: d.mealOrig, desc: d.desc, srcId: d.srcId, cook: d.cook, cond: d.cond, on: true, ing: d.ing }; }

function prep(parsed) { parsed.params = (parsed.blocks.find(b => b.kind === 'params') || {}).params || null; parsed.blocks = parsed.blocks.filter(b => b.kind !== 'params'); return parsed; }

export function openLoad(ctx, { only = null, after } = {}) {
  let parsed = null, fname = '', err = '', log = null, st = {}, readonly = false;
  const kinds = only ? [only] : ['products', 'dishes', 'plan'];
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
      html: `<p class="muted">Форма Excel (листы «Продукты», «Блюда», «План», «Параметры»), а также .csv и .json. Данные грузятся как в файле: ничего не исправляется и не пересчитывается. Текущий поход не меняется.</p>
        <div class="btnrow"><label class="btn filebtn2">Выбрать файл<input type="file" id="f" accept=".xlsx,.xls,.csv,.json" hidden></label><button class="btn ghost" id="blank">Скачать пустую форму</button>${undo ? `<button class="btn ghost" id="undo">Отменить последнюю загрузку</button>` : ''}</div>
        <p class="warnmsg">${esc(err)}</p>
        ${log ? `<h3>Готово</h3><ul class="list">${log.map(l => `<li><span>${esc(l)}</span></li>`).join('')}</ul><div class="btnrow"><button class="btn" id="done">Закрыть</button></div>` : ''}
        ${parsed && !log ? `<h3>Файл «${esc(fname)}» — что найдено</h3>
          ${blocks.length ? `<div class="tbl"><table class="dtable"><tr><th></th><th>Блок</th><th>Куда и как</th><th>Проверка</th></tr>${blockHtml}</table></div>` : '<p class="warnmsg">Ни продуктов, ни блюд, ни плана не найдено. Проверьте названия листов и заголовки колонок (см. пустую форму).</p>'}
          <div class="fld"><label>Пометить новые вкладки «оригинал, только чтение»</label><div class="ctl"><input type="checkbox" id="ro" ${readonly ? 'checked' : ''}></div></div>
          <p class="muted small"><b>Единицы:</b> оставлены как в файле. Строки с шт, мл, л, «на группу» и продукты без КБЖУ загружаются, но в расчёте помечаются «не считается» и не подменяются.</p>
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
            if (!parsed.blocks.length) { // таблица без названий листов: пробуем по типу кнопки
              const only1 = Object.entries(sheets)[0];
              if (only && only1) { const fn = { products: parseProducts, dishes: parseDishes, plan: parsePlan }[only], r = fn(only1[1], only1[0]); parsed.blocks.push({ kind: only, sheet: only1[0], ...r }); }
            }
            st = {}; parsed.blocks.forEach((b, i) => { st[i] = { include: !only || b.kind === only, target: REPOS[b.kind].canAdd() ? 'new' : (REPOS[b.kind].list().find(x => !x.readonly)?.id || 'new'), mode: 'add', dup: 'update', name: f.name.replace(/\.[^.]+$/, '') + (parsed.blocks.filter(x => x.kind === b.kind).length > 1 ? ' ' + b.sheet : '') }; });
            readonly = false; parsed.blocks.forEach(b => { if ((b.items || b.dishes || b.rows || []).some(x => /\S+!/.test(x.srcCell || ''))) readonly = true; });
          } catch (x) { err = x.message; parsed = null; }
          refresh();
        };
        if (!parsed || log) return;
        root.querySelectorAll('[data-inc]').forEach(c => c.onchange = () => { st[c.dataset.inc].include = c.checked; refresh(); });
        root.querySelectorAll('[data-tg]').forEach(c => c.onchange = () => { st[c.dataset.tg].target = c.value; refresh(); });
        root.querySelectorAll('[data-nm]').forEach(c => c.onchange = () => { st[c.dataset.nm].name = c.value; });
        root.querySelectorAll('[data-md]').forEach(c => c.onchange = () => { st[c.dataset.md].mode = c.value; refresh(); });
        root.querySelectorAll('[data-dp]').forEach(c => c.onchange = () => { st[c.dataset.dp].dup = c.value; });
        root.querySelector('#ro').onchange = e => { readonly = e.target.checked; };
        root.querySelector('#go').onclick = async () => {
          try { log = await execute(ctx, parsed, st, readonly, fname); } catch (x) { err = 'Не удалось загрузить: ' + x.message; }
          refresh();
        };
      },
    };
  });
}

// Загрузка: создаёт/обновляет наборы и запоминает, как отменить
async function execute(ctx, parsed, st, readonly, fname) {
  const undo = { created: [], replaced: [], file: fname, at: Date.now() }, out = [];
  const snapshot = (kind, set) => undo.replaced.push({ kind, old: clone(set) });
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
      await rp.add(set); undo.created.push({ kind, id: set.id });
      out.push(`${KIND_RU[kind]}: новая вкладка «${set.name}» — ${kind === 'products' ? set.items.length + ' продуктов' : kind === 'dishes' ? set.dishes.length + ' блюд' : set.rows.length + ' строк'}${readonly ? ' (оригинал, только чтение)' : ''}`);
    } else {
      const set = rp.get(s.target); snapshot(kind, set);
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
