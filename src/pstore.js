// Наборы продуктов. Продукты похода — это включённые продукты выбранного набора (trip.productSet).
import * as store from './store.js';
import { makeRepo } from './setrepo.js';
import { builtinProductSets, REMOVED } from './builtin.js';

export const repo = makeRepo('products', builtinProductSets, s => { if (!s.builtin) return false; const n = s.items.length; s.items = s.items.filter(p => !REMOVED.products.includes(p.name)); return s.items.length !== n; });
let activeId = null;

// Однократная очистка при переходе на v2: удаляем старые продукты, блюда и меню, остальное не трогаем
async function cleanV2() {
  if (await store.get('settings', 'v2clean')) return;
  await store.clear('products');
  await store.del('settings', 'productsDone');
  const opts = await store.get('settings', 'opts'); if (opts) { delete opts.ratings; await store.put('settings', 'opts', opts); }
  for (const [k, t] of await store.entries('trips')) {
    ['menu', 'bought', 'customDishes', 'dishOff', 'ratings'].forEach(f => delete t[f]);
    if (t.adj) delete t.adj.product;
    if (t.fb) delete t.fb.dishes;
    await store.put('trips', k, t);
  }
  await store.put('settings', 'v2clean', true);
}
export async function loadProducts() { await cleanV2(); return repo.load(); }
export function setActive(id) { activeId = repo.get(id) ? id : repo.first()?.id; return activeId; }
export const activeSet = () => repo.get(activeId) || repo.first();
export const products = () => activeSet()?.items || [];
export const byId = id => products().find(p => p.id === id);
export const byName = n => products().find(p => p.name.toLowerCase() === String(n).trim().toLowerCase());
export const enabled = () => products().filter(p => p.on);
export const saveSet = s => repo.save(s);
