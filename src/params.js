// Текущие значения параметров = значения по умолчанию + твои правки из Настроек.
import { PARAMS } from './defaults.js';
import * as store from './store.js';

let over = {};
export const opts = { round: true, currency: '₸', dark: false };
export const loadParams = async () => { over = (await store.get('settings', 'params')) || {}; Object.assign(opts, await store.get('settings', 'opts')); };
export const saveOpts = () => store.put('settings', 'opts', opts);
export const getParam = id => (id in over ? over[id] : PARAMS.find(p => p.id === id).def);
export const isChanged = id => id in over;
export async function setParam(id, v) {
  const def = PARAMS.find(p => p.id === id).def;
  if (v === null || v === def) delete over[id]; else over[id] = v;
  await store.put('settings', 'params', over);
}
export async function resetParams(ids) {
  for (const id of ids) delete over[id];
  await store.put('settings', 'params', over);
}
export const changedCount = () => Object.keys(over).length;
export const allParams = () => Object.fromEntries(PARAMS.map(p => [p.id, getParam(p.id)]));
