// Хранилище продуктов: при первом запуске заполняется встроенной базой, правки хранятся в IndexedDB.
import { SEED } from './products.js';
import * as store from './store.js';

let list = [];
export const products = () => list;
export async function loadProducts() {
  list = await store.getAll('products');
  if (!list.length) { for (const p of SEED) await store.put('products', p.id, p); list = SEED.map(p => ({ ...p })); }
  return list;
}
export const saveProduct = p => store.put('products', p.id, p);
export async function addProduct(p) { list.push(p); await saveProduct(p); }
export async function deleteProduct(id) { list = list.filter(p => p.id !== id); await store.del('products', id); }
export const seedOf = id => SEED.find(p => p.id === id);
export const byId = id => list.find(p => p.id === id);
export const enabled = () => list.filter(p => p.on);
