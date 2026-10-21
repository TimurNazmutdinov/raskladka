// Простой шаблон загрузки: заполняем пример и проверяем, что он разбирается; выгрузка из приложения грузится обратно без потерь.
import { simpleFormSheets, formSheets, parseBook, SIMPLE_HEAD } from '../src/formio.js';
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const book = sheets => Object.fromEntries(sheets.map(s => [s.name, s.rows]));

const blank = simpleFormSheets();
ok('листы шаблона', blank.map(s => s.name).join() === 'Как заполнять,Продукты,Блюда,План');
ok('пустой шаблон ничего не загружает', parseBook(book(blank)).blocks.every(b => !(b.items || b.dishes || b.rows).length && !b.errors.length));

const filled = book(blank);
filled['Продукты'] = [SIMPLE_HEAD.products, ['Гречка', 313, 12.6, 3.3, 62.1, 'Крупы', 800, 95], ['Масло сливочное', 748, 0.5, 82.5, 0.8, 'Жиры', null, null]];
filled['Блюда'] = [SIMPLE_HEAD.dishes, ['Каша гречневая', 'Завтрак', 'Гречка', 80], ['Каша гречневая', 'Завтрак', 'Масло сливочное', 10]];
filled['План'] = [SIMPLE_HEAD.plan, [1, 'Завтрак', 'Каша гречневая']];
const p = parseBook(filled), by = k => p.blocks.find(b => b.kind === k);
ok('найдены три блока', ['products', 'dishes', 'plan'].every(k => by(k)));
ok('продукты: 2, без ошибок', by('products').items.length === 2 && !by('products').errors.length);
ok('числа как в файле', by('products').items[0].kcal === 313 && by('products').items[0].f === 3.3 && by('products').items[0].pack === 800 && by('products').items[1].pack === null);
ok('блюдо: 2 строки состава, граммы на человека', by('dishes').dishes.length === 1 && by('dishes').dishes[0].ing.map(i => i.g).join() === '80,10' && !by('dishes').dishes[0].ing[0].perGroup);
ok('приём пищи распознан', by('dishes').dishes[0].meal === 'b');
ok('план: день 1, завтрак', by('plan').rows.length === 1 && by('plan').rows[0].day === 1 && by('plan').rows[0].mealKey === 'b');
ok('«Как заполнять» не попадает в данные', !p.blocks.some(b => b.sheet === 'Как заполнять'));

// туда-обратно: выгрузка расширенной формы → разбор
const pset = { items: by('products').items.map(x => ({ ...x })) }, dset = { dishes: by('dishes').dishes.map(d => ({ ...d })) }, plan = { rows: by('plan').rows.map(r => ({ ...r })) };
const back = parseBook(book(formSheets({ pset, dset, plan, params: null })));
const get = k => back.blocks.find(b => b.kind === k);
ok('туда-обратно: продукты', get('products').items.length === 2 && get('products').items[0].kcal === 313);
ok('туда-обратно: блюда', get('dishes').dishes[0].ing.length === 2 && get('dishes').dishes[0].ing[1].g === 10);
ok('туда-обратно: план', get('plan').rows.length === 1);
