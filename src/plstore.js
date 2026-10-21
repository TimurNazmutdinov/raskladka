// Меню-планы: что в какой день и приём пищи. Хранятся во вкладках (до 10), могут быть «только чтение» (оригинал).
import { makeRepo } from './setrepo.js';

export const repo = makeRepo('plans', null);
export const loadPlans = () => repo.load();
