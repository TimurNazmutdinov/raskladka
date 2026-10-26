// Наборы меню (блюда с продуктами на человека). Набор привязан к набору продуктов (productSetId).
import { makeRepo } from './setrepo.js';
import { builtinMenuSets, REMOVED } from './builtin.js';

export const repo = makeRepo('menus', builtinMenuSets, s => { if (!s.builtin) return false; const n = s.dishes.length; s.dishes = s.dishes.filter(d => !REMOVED.dishes.includes(d.name)); return s.dishes.length !== n; });
export const MEAL_NAMES = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
export const COND = [['any', 'любой день'], ['rest', 'днёвка'], ['hot', 'жара'], ['cold', 'холод'], ['alt3000', 'высота > 3000'], ['first2', 'первые 2 дня']];
export const loadMenus = () => repo.load();
export const menuSet = id => repo.get(id) || repo.first();
