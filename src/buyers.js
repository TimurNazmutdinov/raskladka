// Закупщики: у похода может быть несколько. Продукт попадает к закупщику по исключению для позиции (buyItem) или по отделу (buyDept).
// Список закупщиков — trip.buyers [{id, name, note}], назначения — trip.buyDept {отдел: id}, trip.buyItem {id продукта: id}.
export const ensureBuyers = t => { t.buyers ||= []; t.buyDept ||= {}; t.buyItem ||= {}; return t; };

export function addBuyer(t, name = '') {
  ensureBuyers(t);
  let k = t.buyers.length + 1; while (t.buyers.some(b => b.id === 'z' + k)) k++;
  const b = { id: 'z' + k, name: name || `Закупщик ${t.buyers.length + 1}`, note: '' };
  t.buyers.push(b); return b;
}
export function removeBuyer(t, id) {
  ensureBuyers(t); t.buyers = t.buyers.filter(b => b.id !== id);
  for (const m of [t.buyDept, t.buyItem]) for (const k of Object.keys(m)) if (m[k] === id) delete m[k];
}
export function assign(t, kind, key, id) { ensureBuyers(t); const m = kind === 'dept' ? t.buyDept : t.buyItem; if (id) m[key] = id; else delete m[key]; }

// Закупщик строки списка покупок: сначала исключение для позиции, затем отдел; если закупщик удалён — не назначено
export function buyerOf(t, row) {
  ensureBuyers(t);
  const id = t.buyItem[row.p.id] ?? t.buyDept[row.dept] ?? null;
  return id && t.buyers.some(b => b.id === id) ? id : null;
}

// rows — строки shopData (p, total, buy, packs, price, dept). Возвращает группы по закупщикам и «не назначено»
export function splitByBuyer(t, rows) {
  ensureBuyers(t);
  const groups = t.buyers.map(b => ({ buyer: b, rows: [], sum: 0 })), none = { buyer: null, rows: [], sum: 0 };
  for (const r of rows) { const id = buyerOf(t, r), g = groups.find(x => x.buyer.id === id) || none; g.rows.push(r); g.sum += r.price || 0; }
  return { groups, none };
}

const n0 = x => Math.round(x).toLocaleString('ru');
const line = (r, round) => `  ${r.p.name} — ${r.packs && round ? `${r.packs} уп. по ${r.p.pack} г (${n0(r.buy)} г)` : `${n0(r.total)} г`}${r.price ? `, ≈ ${n0(r.price)}` : ''}`;
// Текст листа закупщика. info: { trip, n, days, currency, round, notes, order (порядок отделов) }
export function buyerText(g, info) {
  const t = info.trip, head = g.buyer ? `Закупщик: ${g.buyer.name}${g.buyer.note ? ` (${g.buyer.note})` : ''}` : 'Не назначено';
  const out = [`${t.name || 'Поход'} — ${info.n} чел., ${info.days} дн.${t.start ? `, ${t.start}${t.end ? ' — ' + t.end : ''}` : ''}`, head, ''];
  for (const dep of info.order) { const r = g.rows.filter(x => x.dept === dep); if (r.length) { out.push(dep + ':'); r.slice().sort((a, b) => a.p.name.localeCompare(b.p.name)).forEach(x => out.push(line(x, info.round))); } }
  out.push('', `Позиций: ${g.rows.length}${g.sum ? `, итого ≈ ${n0(g.sum)} ${info.currency}` : ''}`);
  if (info.notes?.length) out.push('', 'О группе:', ...info.notes.map(x => '  ' + x));
  return out.join('\n');
}
export const buyerCsv = g => '﻿Товар;Нужно, г;Упаковок;Купить, г;Цена;Отдел\n' + g.rows.map(r => [r.p.name, Math.round(r.total), r.packs ?? '', Math.round(r.buy), r.price ? Math.round(r.price) : '', r.dept].join(';')).join('\n');
