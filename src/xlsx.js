// Минимальное чтение и запись .xlsx (первый лист, значения) и CSV. Нужна библиотека lib/jszip.min.js (глобальный JSZip).
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const colIdx = ref => { let n = 0; for (const ch of ref.replace(/\d/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
export const colName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
export const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Все листы книги: {имя листа: строки}. Значения как в файле (числа — числами, текст — как есть).
export async function readXlsxAll(buf) {
  const z = await JSZip.loadAsync(buf), dp = new DOMParser();
  const wb = dp.parseFromString(await z.file('xl/workbook.xml').async('string'), 'application/xml');
  const rels = dp.parseFromString(await z.file('xl/_rels/workbook.xml.rels').async('string'), 'application/xml');
  const ss = [];
  if (z.file('xl/sharedStrings.xml')) {
    const d = dp.parseFromString(await z.file('xl/sharedStrings.xml').async('string'), 'application/xml');
    for (const si of d.getElementsByTagNameNS(NS, 'si')) ss.push([...si.getElementsByTagNameNS(NS, 't')].map(t => t.textContent).join(''));
  }
  const out = {};
  for (const sh of wb.getElementsByTagNameNS(NS, 'sheet')) {
    const rid = sh.getAttributeNS(RNS, 'id');
    let target = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === rid).getAttribute('Target');
    target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    const sd = dp.parseFromString(await z.file(target).async('string'), 'application/xml'), rows = [];
    for (const r of sd.getElementsByTagNameNS(NS, 'row')) {
      const row = [];
      for (const c of r.getElementsByTagNameNS(NS, 'c')) {
        const v = c.getElementsByTagNameNS(NS, 'v')[0], t = c.getAttribute('t');
        let val = null;
        if (t === 'inlineStr') val = [...c.getElementsByTagNameNS(NS, 't')].map(x => x.textContent).join('');
        else if (v && v.textContent !== '') val = t === 's' ? ss[+v.textContent] : t === 'str' || t === 'b' ? v.textContent : (isFinite(+v.textContent) ? +v.textContent : v.textContent);
        row[colIdx(c.getAttribute('r'))] = val;
      }
      rows[+r.getAttribute('r') - 1] = row;
    }
    out[sh.getAttribute('name')] = Array.from(rows, r => r || []);
  }
  return out;
}
export async function readXlsx(buf) { const all = await readXlsxAll(buf); return Object.values(all)[0] || []; }

// sheets: [{name, rows:[[...]]}] → Blob .xlsx (строки и числа, ширина колонок по содержимому)
export async function writeXlsx(sheets) {
  const z = new JSZip();
  const ct = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${ct}</Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${RNS}"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${RNS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`);
  sheets.forEach((s, i) => {
    const w = []; s.rows.forEach(r => r.forEach((v, c) => { w[c] = Math.max(w[c] || 8, Math.min(60, String(v ?? '').length + 2)); }));
    const rows = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, c) => v == null || v === '' ? '' : typeof v === 'number' ? `<c r="${colName(c)}${ri + 1}"><v>${v}</v></c>` : `<c r="${colName(c)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('');
    z.file(`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><cols>${w.map((x, c) => `<col min="${c + 1}" max="${c + 1}" width="${x}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`);
  });
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split('\n')[0], sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v !== '')).map(r => r.map(v => (v !== '' && isFinite(+v.replace(',', '.')) ? +v.replace(',', '.') : v)));
}
export const toCsv = rows => '﻿' + rows.map(r => r.map(v => { v = v ?? ''; return /[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v; }).join(';')).join('\r\n');

export function download(name, data, mime = 'application/octet-stream') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Файл → массив строк (первая строка — заголовки); поддерживает .xlsx, .csv, .json (массив объектов)
export async function readTable(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.xlsx')) return readXlsx(await file.arrayBuffer());
  if (n.endsWith('.csv')) return parseCsv(await file.text());
  if (n.endsWith('.json')) {
    const j = JSON.parse(await file.text()), arr = Array.isArray(j) ? j : (j.items || j.rows || []);
    if (!arr.length) return [];
    const keys = Object.keys(arr[0]); return [keys, ...arr.map(o => keys.map(k => o[k] ?? ''))];
  }
  throw new Error('Поддерживаются файлы .xlsx, .csv, .json');
}
