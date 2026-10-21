// Пересчёт единиц при загрузке блюд — только по явному выбору пользователя (по умолчанию «как в файле»).
const norm = u => String(u ?? '').trim().toLowerCase().replace(/\.$/, '');
export const isKg = u => ['кг', 'kg'].includes(norm(u));
export const isPcs = u => ['шт', 'штука', 'штуки', 'pcs'].includes(norm(u));
export const isMl = u => ['мл', 'л', 'ml', 'l'].includes(norm(u));
const isG = u => !u || ['г', 'гр', 'g'].includes(norm(u));

// Что нестандартного в блоках блюд: счётчики и продукты со штуками
export function scanUnits(blocks) {
  const r = { kg: 0, pcs: 0, ml: 0, group: 0, other: 0, pieceNames: [] };
  const names = new Set();
  for (const b of blocks) if (b.kind === 'dishes') for (const d of b.dishes) for (const i of d.ing) {
    if (isKg(i.unit)) r.kg++; else if (isPcs(i.unit)) { r.pcs++; names.add(i.name); } else if (isMl(i.unit)) r.ml++; else if (!isG(i.unit)) r.other++;
    if (i.perGroup) r.group++;
  }
  r.pieceNames = [...names];
  return r;
}

// opts: { kg: bool, pcs: {название: вес 1 шт, г}, group: число человек или null }. Исходные блоки не меняются.
export function applyUnits(blocks, opts) {
  const n = opts.group > 0 ? opts.group : null, w = opts.pcs || {};
  return blocks.map(b => {
    if (b.kind !== 'dishes') return b;
    return { ...b, dishes: b.dishes.map(d => ({ ...d, ing: d.ing.map(i => {
      let { g, min, max, unit, perGroup } = i; const was = [];
      const scale = k => { g = g * k; if (min != null) min = min * k; if (max != null) max = max * k; };
      if (perGroup && n) { scale(1 / n); perGroup = false; was.push(`на группу ${i.g}, ÷${n} чел`); }
      if (opts.kg && isKg(unit)) { scale(1000); unit = 'г'; was.push(`из ${i.g} кг`); }
      else if (isPcs(unit) && w[i.name] > 0) { scale(w[i.name]); unit = 'г'; was.push(`из ${i.g} шт × ${w[i.name]} г`); }
      if (!was.length) return i;
      return { ...i, g: Math.round(g * 1e6) / 1e6, min, max, unit, perGroup, conv: was.join('; '), note: [i.note, 'пересчитано ' + was.join('; ')].filter(Boolean).join(' · ') };
    }) })) };
  });
}
