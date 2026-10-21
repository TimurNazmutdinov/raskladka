// Связи при загрузке: продукты в блюдах, которых нет в наборе продуктов, и блюда в плане, которых нет в наборе блюд.
// Названия в данных не меняются: «связать» добавляет целевому продукту/блюду список aliases.
const nrm = s => String(s ?? '').trim().toLowerCase();
const alts = name => String(name).split('|').map(nrm).filter(Boolean);

const itemKeys = x => [x.name, ...(x.aliases || [])].map(nrm);

// Продукты из блюд, которых нет среди items (учитываются варианты через «|» и aliases). Возвращает названия как в файле.
export function danglingProducts(dishBlocks, items) {
  const have = new Set(items.flatMap(itemKeys)), seen = new Set(), out = [];
  for (const b of dishBlocks) for (const d of b.dishes) for (const i of d.ing) {
    if (seen.has(i.name)) continue; seen.add(i.name);
    if (!alts(i.name).some(a => have.has(a))) out.push(i.name);
  }
  return out;
}

// Блюда из плана, которых нет среди dishes (как в расчёте: по точному названию строки плана или alias).
export function danglingDishes(planBlocks, dishes) {
  const have = new Set(dishes.flatMap(d => [d.name, ...(d.aliases || [])])), seen = new Set(), out = [];
  for (const b of planBlocks) for (const r of b.rows) { if (r.dish == null || seen.has(r.dish)) continue; seen.add(r.dish); if (!have.has(r.dish)) out.push(r.dish); }
  return out;
}

// Что из недостающего есть в самом файле (items — продукты файла, по названию без учёта регистра и пробелов по краям)
export function foundInFile(names, fileItems, key = 'name') {
  const by = new Map(fileItems.map(x => [nrm(x[key]), x]));
  return names.map(n => alts(n).map(a => by.get(a)).find(Boolean)).filter(Boolean);
}

// target — набор, links — { название из файла: название существующего элемента }. Возвращает число добавленных связей.
export function addAliases(list, links, key = 'name') {
  let n = 0;
  for (const [from, to] of Object.entries(links)) {
    if (!to) continue;
    const t = list.find(x => x[key] === to); if (!t) continue;
    t.aliases = t.aliases || [];
    for (const a of key === 'name' && from.includes('|') ? from.split('|').map(s => s.trim()).filter(Boolean) : [from]) if (!t.aliases.includes(a)) { t.aliases.push(a); n++; }
  }
  return n;
}
