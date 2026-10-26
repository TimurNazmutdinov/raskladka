// Общая обвязка для test_sanity.mjs и test_fixes.mjs: IndexedDB в памяти, синтетический набор (8 придуманных продуктов, 3 блюда) и помощники.

// --- минимальная замена IndexedDB в памяти, чтобы запускать trip/shop/calcview в Node ---
const data = {};
globalThis.indexedDB = { open() {
  const r = {};
  setTimeout(() => {
    r.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction(store) {
      data[store] ||= new Map(); const t = {};
      t.objectStore = () => ({ get: k => ({ get result() { return data[store].get(k); } }), put: (v, k) => { data[store].set(k, JSON.parse(JSON.stringify(v))); return {}; }, delete: k => { data[store].delete(k); return {}; }, clear: () => { data[store].clear(); return {}; }, openCursor: () => { const r = {}, es = [...data[store].entries()]; let i = 0; const step = () => { r.result = i < es.length ? { key: es[i][0], value: es[i][1], continue: () => { i++; setTimeout(step, 0); } } : null; r.onsuccess?.(); }; setTimeout(step, 0); return r; }, getAll: () => ({ get result() { return [...data[store].values()]; } }) });
      setTimeout(() => t.oncomplete?.(), 0); return t;
    } };
    r.onupgradeneeded?.(); r.onsuccess?.();
  }, 0); return r;
} };

const { repo: prepo, loadProducts } = await import('../src/pstore.js');
const { repo: mrepo, loadMenus } = await import('../src/mstore.js');
const { repo: plrepo, loadPlans } = await import('../src/plstore.js');
const T = await import('../src/trip.js');
const { shopData } = await import('../src/shop.js');
const C = await import('../src/calcview.js');
const M = await import('../src/menu.js');
const E = await import('../src/engine.js');
const F = await import('../src/formio.js');
const { planMenu } = await import('../src/plan.js');
const { PARAMS } = await import('../src/defaults.js');
const { buildSummary } = await import('../src/summary.js');
const fs = await import('node:fs');
const { defaultSimple, virtualGroup } = await import('../src/simple.js');
const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
await loadProducts(); await loadMenus(); await loadPlans();


// --- синтетический набор: придуманные продукты и 3 блюда ---
const prod = (id, name, kcal, o = {}) => ({ id, name, cat: 'grain', kcal, p: 10, f: 5, c: 60, pack: 500, shelf: 999, unit: 'пачка', on: true, tags: '', price: 100, ...o });
const PRODUCTS = [prod('a1', 'Крупа Альфа', 350), prod('a2', 'Тушёнка Бета', 230, { cat: 'meat', pack: 340, f: 15, c: 0 }), prod('a3', 'Сыр Гамма', 370, { cat: 'cheese', pack: 200 }), prod('a4', 'Пряник Дельта', 380, { cat: 'bread', pack: 400, unit: 'пачка' }), prod('a5', 'Чай Эпсилон', 2, { cat: 'drink', pack: 100 }), prod('a6', 'Хлеб Дзета', 250, { cat: 'bread', pack: 400 }), prod('a7', 'Сахар Эта', 399, { cat: 'sweet', pack: 1000 }), prod('a8', 'Масло Тета', 890, { cat: 'fat', pack: 200 })];
const ing = (name, g, unit) => ({ name, g, ...(unit ? { unit } : {}) });
const dish = (id, meal, name, ings, extra = {}) => ({ id, meal, name, cook: 10, cond: ['any'], on: true, ing: ings, ...extra });
const DISHES = [
  dish('d1', 'b', 'Каша Альфа', [ing('Крупа Альфа', 90), ing('Масло Тета', 15), ing('Сахар Эта', 15)]),
  dish('d2', 'l', 'Лёгкий обед', [ing('Хлеб Дзета', 120), ing('Сыр Гамма', 60), ing('Пряник Дельта', 50), ing('Чай Эпсилон', 3)]),
  dish('d3', 'd', 'Ужин Бета', [ing('Крупа Альфа', 100), ing('Тушёнка Бета', 120), ing('Масло Тета', 10)]),
];
const setP = { id: 'sp', name: 'Синтетика', items: PRODUCTS }, setM = { id: 'sm', name: 'Синтетика', productSetId: 'sp', dishes: DISHES };
await prepo.add(setP); await mrepo.add(setM);

const mkTrip = (over = {}) => {
  const t = T.newTrip(); Object.assign(t, { productSet: 'sp', menuSet: 'sm', simple: { ...defaultSimple(), on: true, n: 4 }, group: virtualGroup({ ...defaultSimple(), n: 4 }, { appetite: 1, shareM: 1, shareF: 0.8 }), days: [{ type: 'Ходовой' }, { type: 'Ходовой' }], gear: {}, drops: [] }, over);
  t.prefs = { ...t.prefs, kcalGoal: 3000, restPct: 100, ...(over.prefs || {}) }; t.food = { ...t.food, reservePct: 0, reserveDays: 0 };
  T.setTrip(t); return t;
};
const setDishes = d => { setM.dishes = d; const s = mrepo.get('sm'); s.dishes = d; };
const fresh = async (dishes = DISHES, products = PRODUCTS, tripOver = {}) => { const s = prepo.get('sp'); s.items = products.map(p => ({ ...p })); setDishes(dishes.map(d => ({ ...d, ing: d.ing.map(i => ({ ...i })) }))); const t = mkTrip(tripOver); delete t.menu; return t; };
const sumMenu = menu => { const m = new Map(); menu.days.forEach(d => Object.values(d).forEach(e => (e?.items || []).forEach(i => { if (!i.water && i.pid) m.set(i.pid, (m.get(i.pid) || 0) + i.g); }))); return m; };
const rowOf = (D, id) => D.rows.find(r => r.p.id === id);


export { prepo, mrepo, plrepo, T, shopData, C, M, E, F, planMenu, P, buildSummary, fs, PRODUCTS, DISHES, setP, setM, prod, dish, ing, mkTrip, setDishes, fresh, sumMenu, rowOf, defaultSimple, virtualGroup };
