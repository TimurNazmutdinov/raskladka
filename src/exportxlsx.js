// Выгрузка в Excel по шаблону: берём встроенный шаблон (lib/template.js), заменяем данные и размеры диапазонов,
// остальное (оформление, диаграмма, таблицы, проверки данных) сохраняется, формулы пересчитывает Excel при открытии.
import { opts } from './params.js';
import { tempText } from './engine.js';
import { xmlEsc, colName, download } from './xlsx.js';

const MEAL_RU = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const TCAT = { grain: 'Крупы/макароны', legume: 'Сухие продукты', bread: 'Выпечка', meat: 'Белок', cheese: 'Молочное', dairy: 'Молочное', fat: 'Жиры', veg: 'Овощи', spice: 'Бакалея', soup: 'Сухие продукты', sweet: 'Перекусы', nuts: 'Перекусы', drink: 'Напитки', fresh: 'Овощи' };
const tcat = p => (/соус|паста томатная|томатная паста/i.test(p.name) ? 'Соусы' : TCAT[p.cat] || 'Бакалея');
const CALC_ROWS = 25; // строк калькуляции на одну строку меню (как в шаблоне)

// ---------- работа с XML листов ----------
const cellStr = (ref, s, v) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
const cellNum = (ref, s, v) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}><v>${v}</v></c>`;
const cellF = (ref, s, f) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}><f>${xmlEsc(f)}</f></c>`;
const cellE = (ref, s) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}/>`;
const mkCell = (ref, s, v) => (v == null || v === '' ? cellE(ref, s) : typeof v === 'number' ? cellNum(ref, s, v) : typeof v === 'object' ? cellF(ref, s, v.f) : cellStr(ref, s, v));
const rowXml = (r, cells) => `<row r="${r}">${cells.join('')}</row>`;

// стили по колонкам из образцовой строки шаблона
function styles(xml, rowNo) {
  const m = new RegExp(`<row r="${rowNo}"[^>]*>(.*?)</row>`, 's').exec(xml), out = {};
  if (m) for (const c of m[1].matchAll(/<c r="([A-Z]+)\d+"(?: s="(\d+)")?/g)) out[c[1]] = c[2] != null ? +c[2] : null;
  return out;
}
// строки шаблона до номера last включительно (шапка листа)
function head(xml, last) {
  return [...xml.matchAll(/<row r="(\d+)"[^>]*?(?:\/>|>.*?<\/row>)/gs)].filter(m => +m[1] <= last).map(m => m[0]).join('');
}
const setSheetData = (xml, rows, dim) => xml.replace(/<sheetData>.*<\/sheetData>|<sheetData\/>/s, `<sheetData>${rows}</sheetData>`).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="${dim}"/>`);
const setMerges = (xml, refs) => xml.replace(/<mergeCells[^>]*>.*?<\/mergeCells>/s, `<mergeCells count="${refs.length}">${refs.map(r => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>`);

// ---------- данные ----------
function prepare(D) {
  const { trip, calc, menu, pset } = D, n = calc.summary.n, prods = pset.items;
  const used = new Set(); menu.days.forEach(d => ['b', 'l', 'd', 's'].forEach(m => (d[m]?.items || []).forEach(it => used.add(it.pid))));
  const list = prods.filter(p => p.on || used.has(p.id));
  const idOf = new Map(list.map((p, i) => [p.id, i + 1]));
  // рецепты: по одному на уникальный состав блюда (граммы на человека)
  const recipes = [], byKey = new Map(), names = new Map(), rows = [];
  menu.days.forEach((day, i) => ['b', 'l', 'd', 's'].forEach(m => {
    const e = day[m]; if (!e || !e.items?.length) return;
    const ings = e.items.filter(it => it.pid || it.name).map(it => ({ pid: it.pid ?? it.name, name: it.name || prods.find(p => p.id === it.pid)?.name || '?', unit: it.unit || 'г', g: Math.round((it.perPortion ?? it.g / n) * 100) / 100 }));
    const base = (e.name || (m === 's' ? 'Перекус' : 'Блюдо')).trim(), key = base + '|' + ings.map(x => x.pid + ':' + x.g).join(',');
    let rec = byKey.get(key);
    if (!rec) {
      const k = (names.get(base) || 0) + 1; names.set(base, k);
      rec = { id: 'R' + String(recipes.length + 1).padStart(3, '0'), name: m === 's' ? `Перекус · день ${i + 1}` : (k > 1 ? `${base} (вариант ${k})` : base), desc: `${MEAL_RU[m]}.${e.cook ? ` Варка ${e.cook} мин.` : ''} Граммы на одного человека.`, ings };
      if (m === 's' && recipes.some(r => r.name === rec.name)) rec.name += ` (${recipes.length + 1})`;
      byKey.set(key, rec); recipes.push(rec);
    }
    rows.push({ day: i + 1, meal: MEAL_RU[m], dish: rec.name, note: m === 'l' && trip.prefs.lunchSplit > 1 ? `${trip.prefs.lunchSplit} пакета в течение дня` : '' });
  }));
  return { n, list, idOf, recipes, menuRows: rows };
}

const SEASON = d => { const m = d ? +d.slice(5, 7) : 7; return m === 12 || m < 3 ? 'Зима' : m < 6 ? 'Весна' : m < 9 ? 'Лето' : 'Осень'; };

export function inputValues(D, X) {
  const { trip, calc } = D, S = calc.summary, days = trip.days;
  const avg = f => calc.days.reduce((s, d) => s + f(d), 0) / calc.days.length;
  const tdmin = Math.min(...days.map(d => d.tdmin ?? d.tday ?? 99)), tdmax = Math.max(...days.map(d => d.tdmax ?? d.tday ?? -99)), tnmin = Math.min(...days.map(d => d.tnmin ?? d.tnight ?? 99));
  const weather = days.some(d => (d.tdmax ?? d.tday) != null) ? `днём ${tdmin < 99 ? Math.round(tdmin) : '—'}…${Math.round(tdmax)} °C, ночью от ${tnmin < 99 ? Math.round(tnmin) : '—'} °C; осадки: ${[...new Set(days.map(d => ({ rain: 'дождь', snow: 'снег' }[d.precip] || 'нет')))].join(', ')}` : '';
  const restr = trip.group.map(p => [p.veg && 'вегетарианец', p.allergy && 'аллергия: ' + p.allergy, p.dislike && 'не ест: ' + p.dislike].filter(Boolean).join(', ') && `${p.name || 'участник'} — ${[p.veg && 'вегетарианец', p.allergy && 'аллергия: ' + p.allergy, p.dislike && 'не ест: ' + p.dislike].filter(Boolean).join(', ')}`).filter(Boolean);
  const mode = { hungry: 'голодная', std: 'стандарт', full: 'сытая', custom: 'своя' }[trip.prefs.mode];
  return {
    B4: X.n, B5: days.length, B6: Math.round(S.reserveKcal / (S.kcal || 1) * 1000) / 1000 || 0, B7: Math.round(avg(d => d.target / S.n)), B8: Math.round(avg(d => d.mac.p)), B9: Math.round(avg(d => d.mac.f)), B10: Math.round(avg(d => d.mac.c)),
    B11: opts.currency === '₸' ? 'KZT' : opts.currency, B12: SEASON(trip.plan?.start), B13: weather, B14: `Режим раскладки: ${mode}.${restr.length ? ' ' + restr.join('; ') + '.' : ''}`,
  };
}

// ---------- сборка ----------
export async function buildWorkbook(D) {
  if (!window.TEMPLATE_B64) throw new Error('нет шаблона: запустите tools\\update-template.ps1');
  const X = prepare(D), zip = await JSZip.loadAsync(window.TEMPLATE_B64, { base64: true });
  const wbx = await zip.file('xl/workbook.xml').async('string'), rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const path = {};
  for (const m of wbx.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) { const t = new RegExp(`<Relationship [^>]*Id="${m[2]}"[^>]*Target="([^"]+)"|<Relationship [^>]*Target="([^"]+)"[^>]*Id="${m[2]}"`).exec(rels); path[m[1]] = 'xl/' + (t[1] || t[2]).replace(/^\/?(xl\/)?/, ''); }
  const rd = n => zip.file(path[n]).async('string'), put = (n, s) => zip.file(path[n], s);
  const N = X.list.length, Mn = X.menuRows.length, lastP = 5 + N, lastM = 5 + Mn, lastC = 5 + CALC_ROWS * Mn;

  // --- Продукты ---
  let sx = await rd('Продукты'); const ps = styles(sx, 6);
  const used = new Set(X.menuRows.length ? [] : []);
  const usedMeals = new Map(); X.recipes.forEach(r => r.ings.forEach(i => { const s = usedMeals.get(i.pid) || new Set(); s.add(r.desc.split('.')[0]); usedMeals.set(i.pid, s); }));
  let rows = head(sx, 5);
  X.list.forEach((p, i) => {
    const r = 6 + i, use = usedMeals.get(p.id);
    const v = [i + 1, tcat(p), p.name, p.unit || 'пачка', p.pack || 100, 'г', p.kcal, p.p, p.f, p.c, p.price ?? null, use ? 'Да' : 'Нет', use ? [...use].join(', ') : ''];
    rows += rowXml(r, 'ABCDEFGHIJKLM'.split('').map((c, k) => mkCell(c + r, ps[c], v[k])));
  });
  sx = setSheetData(sx, rows, `A1:M${Math.max(lastP, 6)}`).replace(/(<dataValidation [^>]*sqref=")L6:L\d+/, `$1L6:L${lastP}`); put('Продукты', sx);

  // --- Рецепты ---
  let rx = await rd('Рецепты'); const hs = { hdrA: 4, hdrB: 5, name: 31, desc: 29, colh: 19, ingA: 5, ingB: 7, ing: 5, blank: 3, tech: 8, techL: 9, id: 2 };
  const ps8 = styles(rx, 8), ps5 = styles(rx, 5), ps7 = styles(rx, 7), ps6 = styles(rx, 6);
  const lastTech = () => 0;
  let r0 = 5; const blocks = [], merges = ['A1:N1', 'A3:G3', 'H3:N3'], units = [];
  let rrows = head(rx, 4); const body = new Map(); const put2 = (r, c, x) => { if (!body.has(r)) body.set(r, {}); body.get(r)[c] = x; };
  X.recipes.forEach((rec, k) => { blocks.push(r0); r0 += 4 + Math.max(1, rec.ings.length) + 1; });
  const lastR = blocks.length ? blocks[blocks.length - 1] + 3 + Math.max(1, X.recipes.at(-1).ings.length) - 1 : 6;
  X.recipes.forEach((rec, k) => {
    const b = blocks[k], nI = Math.max(1, rec.ings.length), endI = b + 2 + nI;
    put2(b, 'A', cellStr(`A${b}`, hs.hdrA, 'Рецепт_ID')); put2(b, 'B', cellStr(`B${b}`, hs.hdrB, rec.id)); put2(b, 'C', cellStr(`C${b}`, 31, rec.name));
    ['D', 'E', 'F', 'G'].forEach(c => put2(b, c, cellE(`${c}${b}`, 31)));
    put2(b + 1, 'A', cellStr(`A${b + 1}`, hs.desc, rec.desc)); ['B', 'C', 'D', 'E', 'F', 'G'].forEach(c => put2(b + 1, c, cellE(`${c}${b + 1}`, hs.desc)));
    ['Продукт', 'Кол-во/порция', 'Ед.', 'Примечание'].forEach((t, i) => put2(b + 2, 'ABCD'[i], cellStr(`${'ABCD'[i]}${b + 2}`, 19, t))); ['E', 'F', 'G'].forEach(c => put2(b + 2, c, cellE(`${c}${b + 2}`, 3)));
    merges.push(`C${b}:G${b}`, `A${b + 1}:G${b + 1}`);
    rec.ings.forEach((ing, i) => {
      const r = b + 3 + i; units.push(`C${r}`);
      put2(r, 'A', cellStr(`A${r}`, 5, ing.name)); put2(r, 'B', cellNum(`B${r}`, 7, ing.g)); put2(r, 'C', cellStr(`C${r}`, 5, ing.unit || 'г')); put2(r, 'D', cellE(`D${r}`, 5)); ['E', 'F', 'G'].forEach(c => put2(r, c, cellE(`${c}${r}`, 3)));
      put2(r, 'I', cellF(`I${r}`, 8, `$C$${b}`)); put2(r, 'J', cellF(`J${r}`, 8, `IFERROR(INDEX(Продукты!$A$6:$A$${lastP},MATCH($A${r},Продукты!$C$6:$C$${lastP},0)),"")`)); put2(r, 'K', cellF(`K${r}`, 8, `$A${r}`)); put2(r, 'L', cellF(`L${r}`, 9, `$B${r}`)); put2(r, 'M', cellF(`M${r}`, 8, `$C${r}`)); put2(r, 'N', cellF(`N${r}`, 8, `$D${r}`));
    });
    for (let r = b + 1; r <= endI; r++) put2(r, 'H', cellF(`H${r}`, 8, `$B$${b}`));
    put2(5 + k, 'P', cellF(`P${5 + k}`, 2, `$B$${b}`)); put2(5 + k, 'Q', cellF(`Q${5 + k}`, 2, `$C$${b}`));
  });
  // шапка технической таблицы в строке 5
  ['Рецепт_ID', 'Рецепт', 'Продукт_ID', 'Продукт', 'Кол-во/порцию', 'Ед.', 'Примечание'].forEach((t, i) => put2(5, 'HIJKLMN'[i], cellStr(`${'HIJKLMN'[i]}5`, 19, t)));
  const maxRow = Math.max(5, ...body.keys());
  for (let r = 5; r <= maxRow; r++) { const cells = body.get(r); if (cells) rrows += rowXml(r, Object.keys(cells).sort((a, b) => a.length - b.length || a.localeCompare(b)).map(c => cells[c])); }
  rx = setSheetData(rx, rrows, `A1:Q${maxRow}`); rx = setMerges(rx, merges);
  rx = rx.replace(/<dataValidation [^>]*sqref="C8:C24[^"]*"/, m => m.replace(/sqref="[^"]*"/, `sqref="${units.join(' ') || 'C8'}"`));
  put('Рецепты', rx);
  const lastT = maxRow;

  // --- Меню ---
  let mx = await rd('Меню'); const ms = styles(mx, 6); rows = head(mx, 5);
  X.menuRows.forEach((m, i) => {
    const r = 6 + i;
    rows += rowXml(r, [mkCell(`A${r}`, ms.A, m.day), mkCell(`B${r}`, ms.B, m.meal), mkCell(`C${r}`, ms.C, m.dish), mkCell(`D${r}`, ms.D, { f: `IFERROR(INDEX(Рецепты!$P$5:$P$${4 + Math.max(1, X.recipes.length)},MATCH($C${r},Рецепты!$Q$5:$Q$${4 + Math.max(1, X.recipes.length)},0)),"")` }), mkCell(`E${r}`, ms.E, { f: `IF($C${r}="","",Ввод!$B$4)` }), mkCell(`F${r}`, ms.F, m.note)]);
  });
  mx = setSheetData(mx, rows, `A1:F${Math.max(lastM, 6)}`).replace(/sqref="A6:A95"/g, `sqref="A6:A${Math.max(lastM, 6)}"`).replace(/sqref="B6:B95"/g, `sqref="B6:B${Math.max(lastM, 6)}"`).replace(/sqref="E6:E95"/g, `sqref="E6:E${Math.max(lastM, 6)}"`).replace(/"Завтрак,Обед,Ужин"/g, '"Завтрак,Обед,Ужин,Перекус"');
  put('Меню', mx);

  // --- Калькуляция ---
  let cx = await rd('Калькуляция'); const cs = styles(cx, 6); rows = head(cx, 5);
  const RH = `Рецепты!$H$6:$H$${lastT}`, rng = c => `Рецепты!$${c}$6:$${c}$${lastT}`, PR = c => `Продукты!$${c}$6:$${c}$${Math.max(lastP, 6)}`;
  for (let mi = 0; mi < Mn; mi++) {
    const mr = 6 + mi;
    for (let k = 0; k < CALC_ROWS; k++) {
      const r = 6 + CALC_ROWS * mi + k, M = `MATCH(Меню!$D$${mr},${RH},0)+${k}`, same = c => `IFERROR(IF(IFERROR(INDEX(${RH},${M})=Меню!$D$${mr},FALSE),INDEX(${rng(c)},${M}),""),"")`;
      const f = {
        A: `IF($E${r}="","",Меню!$A$${mr})`, B: `IF($E${r}="","",Меню!$B$${mr})`, C: `IF($E${r}="","",Меню!$C$${mr})`, D: `IF($E${r}="","",Меню!$D$${mr})`,
        E: same('J'), F: `IF($E${r}="","",INDEX(${rng('K')},${M}))`, G: `IF($E${r}="","",INDEX(${rng('M')},${M}))`,
        H: `IFERROR(IF(IFERROR(INDEX(${RH},${M})=Меню!$D$${mr},FALSE),INDEX(${rng('L')},${M}),0),0)`, I: `IF($F${r}="","",Меню!$E$${mr})`, J: `IFERROR($H${r}*$I${r},0)`,
        K: `IFERROR($J${r}/100*INDEX(${PR('G')},MATCH($E${r},${PR('A')},0)),0)`, L: `IFERROR($J${r}/100*INDEX(${PR('H')},MATCH($E${r},${PR('A')},0)),0)`, M: `IFERROR($J${r}/100*INDEX(${PR('I')},MATCH($E${r},${PR('A')},0)),0)`, N: `IFERROR($J${r}/100*INDEX(${PR('J')},MATCH($E${r},${PR('A')},0)),0)`,
        O: same('N'),
      };
      rows += rowXml(r, 'ABCDEFGHIJKLMNO'.split('').map(c => cellF(c + r, cs[c], f[c])));
    }
  }
  cx = setSheetData(cx, rows, `A1:O${Math.max(lastC, 6)}`); put('Калькуляция', cx);

  // --- Раскладка ---
  let lx = await rd('Раскладка'); const ls = styles(lx, 6); rows = head(lx, 5);
  const CR = c => `Калькуляция!$${c}$6:$${c}$${Math.max(lastC, 6)}`;
  for (let i = 0; i < N; i++) {
    const r = 6 + i, f = { A: `Продукты!A${r}`, B: `Продукты!C${r}`, C: `Продукты!F${r}`, D: `SUMIF(${CR('E')},$A${r},${CR('J')})`, E: `$D${r}*Ввод!$B$6`, F: `IF($L${r}="Да",ROUNDUP(($D${r}+$E${r})/$H${r},0)*$H${r},0)`, G: `Продукты!D${r}`, H: `Продукты!E${r}`, I: `IFERROR(ROUNDUP(($D${r}+$E${r})/$H${r},0),0)`, J: `Продукты!K${r}`, K: `$I${r}*$J${r}`, L: `Продукты!L${r}`, M: `Продукты!M${r}` };
    rows += rowXml(r, 'ABCDEFGHIJKLM'.split('').map(c => cellF(c + r, ls[c], f[c])));
  }
  lx = setSheetData(lx, rows, `A1:M${Math.max(lastP, 6)}`).replace(/sqref="F6:F31"/g, `sqref="F6:F${Math.max(lastP, 6)}"`); put('Раскладка', lx);

  // --- Ввод, Сводка (правка отдельных ячеек) ---
  const dp = new DOMParser(), ser = new XMLSerializer(), NSM = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const setCell = (doc, ref, val) => {
    const rn = +ref.replace(/\D/g, ''), sd = doc.getElementsByTagNameNS(NSM, 'sheetData')[0];
    let row = [...sd.getElementsByTagNameNS(NSM, 'row')].find(x => +x.getAttribute('r') === rn);
    if (!row) { row = doc.createElementNS(NSM, 'row'); row.setAttribute('r', rn); const after = [...sd.getElementsByTagNameNS(NSM, 'row')].find(x => +x.getAttribute('r') > rn); sd.insertBefore(row, after || null); }
    let c = [...row.getElementsByTagNameNS(NSM, 'c')].find(x => x.getAttribute('r') === ref);
    if (!c) { c = doc.createElementNS(NSM, 'c'); c.setAttribute('r', ref); const idx = s => s.replace(/\d/g, '').split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0); const after = [...row.getElementsByTagNameNS(NSM, 'c')].find(x => idx(x.getAttribute('r')) > idx(ref)); row.insertBefore(c, after || null); }
    while (c.firstChild) c.removeChild(c.firstChild); c.removeAttribute('t');
    if (val == null || val === '') return;
    if (typeof val === 'number') { const v = doc.createElementNS(NSM, 'v'); v.textContent = val; c.appendChild(v); }
    else if (typeof val === 'object') { const f = doc.createElementNS(NSM, 'f'); f.textContent = val.f; c.appendChild(f); }
    else { c.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(NSM, 'is'), t = doc.createElementNS(NSM, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = val; is.appendChild(t); c.appendChild(is); }
  };
  const doc1 = dp.parseFromString(await rd('Ввод'), 'application/xml'), iv = inputValues(D, X);
  Object.entries(iv).forEach(([ref, v]) => setCell(doc1, ref, v)); put('Ввод', ser.serializeToString(doc1));

  const doc2 = dp.parseFromString(await rd('Сводка'), 'application/xml'), Pn = Math.max(lastP, 6);
  const RK = `Раскладка!$F$6:$F$${Pn}`, RU = `Раскладка!$C$6:$C$${Pn}`, RDn = `Раскладка!$D$6:$D$${Pn}`, RKs = `Раскладка!$K$6:$K$${Pn}`, PCAT = `Продукты!$B$6:$B$${Pn}`;
  const sv = {
    B4: { f: 'Ввод!B4' }, B5: { f: 'Ввод!B5' }, B6: { f: 'Ввод!B7' }, B7: { f: `SUM(${'Калькуляция!$K$6:$K$' + Math.max(lastC, 6)})/Ввод!B4/Ввод!B5` }, B8: { f: 'Ввод!B8' }, B9: { f: `SUM(Калькуляция!$L$6:$L$${Math.max(lastC, 6)})/Ввод!B4/Ввод!B5` },
    B10: { f: `SUMIFS(${RK},${RU},"г")/1000` }, B11: { f: `SUMIFS(${RK},${RU},"мл")/1000` }, B12: { f: `SUM(${RKs})` }, B13: { f: 'B12/Ввод!B4/Ввод!B5' }, B14: { f: `COUNTA(Меню!$C$6:$C$${Math.max(lastM, 6)})` },
  };
  Object.entries(sv).forEach(([ref, v]) => setCell(doc2, ref, v));
  for (let r = 20; r <= 31; r++) { setCell(doc2, `B${r}`, { f: `SUMPRODUCT((${PCAT}=$A${r})*(${RU}="г")*${RK})/1000` }); setCell(doc2, `C${r}`, { f: `SUMPRODUCT((${PCAT}=$A${r})*${RKs})` }); }
  setCell(doc2, 'B32', { f: `SUMIFS(${RK},${RU},"мл")/1000` }); setCell(doc2, 'C32', 0);
  put('Сводка', ser.serializeToString(doc2));

  // --- таблицы, диаграмма, расчёт при открытии ---
  const tfix = async (name, from, to) => { const p = Object.keys(zip.files).filter(f => /^xl\/tables\/table\d+\.xml$/.test(f)); for (const f of p) { let t = await zip.file(f).async('string'); if (t.includes(`name="${name}"`)) { t = t.replace(new RegExp(from, 'g'), to); zip.file(f, t); } } };
  await tfix('ProductsTableV2', 'A5:M31', `A5:M${Math.max(lastP, 6)}`); await tfix('PackingTableV2', 'A5:M31', `A5:M${Math.max(lastP, 6)}`);
  await tfix('MenuTable', 'A5:F95', `A5:F${Math.max(lastM, 6)}`); await tfix('CalculationTable', 'A5:O725', `A5:O${Math.max(lastC, 6)}`);
  const cf = Object.keys(zip.files).find(f => /^xl\/charts\/chart\d+\.xml$/.test(f)); if (cf) zip.file(cf, (await zip.file(cf).async('string')).replace(/\$27\b/g, '$32'));
  zip.remove('xl/calcChain.xml');
  zip.file('[Content_Types].xml', (await zip.file('[Content_Types].xml').async('string')).replace(/<Override [^>]*calcChain[^>]*\/>/, ''));
  zip.file('xl/_rels/workbook.xml.rels', rels.replace(/<Relationship [^>]*calcChain[^>]*\/>/, ''));
  zip.file('xl/workbook.xml', /<calcPr/.test(wbx) ? wbx.replace(/<calcPr([^>]*?)\/>/, (m, a) => `<calcPr${a.replace(/ fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wbx.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
}

export async function exportExcel(D) {
  if (!D) throw new Error('нет данных для выгрузки: заполните поход');
  const blob = await buildWorkbook(D), d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  download(`Раскладка_${(D.trip.name || 'поход').replace(/[\\/:*?"<>|]/g, '').trim()}_${stamp}.xlsx`, blob);
}
