// Общее хранилище «наборов» (продуктов или меню): до 10 штук, порядок вкладок, переименование, дубли, удаление.
import * as store from './store.js';

export const MAX_SETS = 10;
// migrate(набор) — необязательная правка уже сохранённых наборов при загрузке; возвращает true, если набор изменён.
export function makeRepo(storeName, seed, migrate = null) {
  let list = [];
  const sorted = () => list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const persist = s => store.put(storeName, s.id, s);
  return {
    async load() {
      list = (await store.getAll(storeName)).filter(s => s && s.id && Array.isArray(s.items || s.dishes || s.rows));
      if (!list.length && seed) { list = seed().map((s, i) => ({ ...s, order: i })); for (const s of list) await persist(s); }
      if (migrate) for (const s of list) if (migrate(s)) await persist(s);
      sorted(); return list;
    },
    list: () => sorted(),
    get: id => list.find(s => s.id === id),
    first: () => sorted()[0],
    save: persist,
    async put(s) { const k = list.findIndex(x => x.id === s.id); if (k >= 0) list[k] = s; else list.push(s); await persist(s); },
    async add(s) { s.order = list.length ? Math.max(...list.map(x => x.order ?? 0)) + 1 : 0; list.push(s); await persist(s); return s; },
    async remove(id) { list = list.filter(s => s.id !== id); await store.del(storeName, id); },
    async reorder(ids) { ids.forEach((id, i) => { const s = list.find(x => x.id === id); if (s) { s.order = i; } }); for (const s of list) await persist(s); sorted(); },
    canAdd: () => list.length < MAX_SETS,
    uid: () => storeName[0] + Date.now().toString(36) + Math.floor(Math.random() * 1000),
  };
}
