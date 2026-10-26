// Простой шаблон загрузки: две вкладки (Продукты, Блюда); можно заполнить обе или одну. Выгрузка из приложения грузится обратно без потерь.
import { simpleFormSheets, formSheets, parseBook, SIMPLE_HEAD } from '../src/formio.js';
const ok = (n, c) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const book = sheets => Object.fromEntries(sheets.map(s => [s.name, s.rows]));
const kinds = p => p.blocks.map(b => b.kind).sort().join();

const blank = simpleFormSheets();
ok('листы шаблона: Продукты и Блюда', blank.map(s => s.name).join() === 'Продукты,Блюда');
ok('пустой шаблон ничего не загружает', parseBook(book(blank)).blocks.every(b => !(b.items || b.dishes || b.rows).length && !b.errors.length));

const prodRows = [SIMPLE_HEAD.products, ['Гречка', 313, 12.6, 3.3, 62.1, 'Крупы', 800, 95], ['Масло сливочное', 748, 0.5, 82.5, 0.8, 'Жиры', null, null]];
const dishRows = [SIMPLE_HEAD.dishes, ['Каша гречневая', 'Завтрак', 'Гречка', 80], ['Каша гречневая', 'Завтрак', 'Масло сливочное', 10]];
const both = parseBook({ Продукты: prodRows, Блюда: dishRows }), by = k => both.blocks.find(b => b.kind === k);
ok('заполнены обе вкладки: продукты и блюда', kinds(both) === 'dishes,products');
ok('продукты: 2, числа как в файле', by('products').items.length === 2 && by('products').items[0].kcal === 313 && by('products').items[0].f === 3.3 && by('products').items[0].pack === 800 && by('products').items[1].pack === null);
ok('блюдо: 2 строки состава, граммы на человека, приём распознан', by('dishes').dishes.length === 1 && by('dishes').dishes[0].ing.map(i => i.g).join() === '80,10' && !by('dishes').dishes[0].ing[0].perGroup && by('dishes').dishes[0].meal === 'b');

// только одна вкладка заполнена, вторая пустая или удалена
const onlyP = parseBook({ Продукты: prodRows, Блюда: [SIMPLE_HEAD.dishes] }), onlyD = parseBook({ Продукты: [SIMPLE_HEAD.products], Блюда: dishRows });
ok('только продукты', onlyP.blocks.filter(b => (b.items || b.dishes).length).map(b => b.kind).join() === 'products');
ok('только блюда', onlyD.blocks.filter(b => (b.items || b.dishes).length).map(b => b.kind).join() === 'dishes');
ok('файл с одним листом «Блюда»', kinds(parseBook({ Блюда: dishRows })) === 'dishes' && kinds(parseBook({ Продукты: prodRows })) === 'products');
ok('лист «Как заполнять» (старый шаблон) не попадает в данные', !parseBook({ 'Как заполнять': [['Как заполнять шаблон'], ['1. Заполните только те листы']], Продукты: prodRows }).blocks.some(b => b.sheet === 'Как заполнять'));
ok('лист «План» по-прежнему понимается', kinds(parseBook({ План: [SIMPLE_HEAD.plan, [1, 'Завтрак', 'Каша гречневая']] })) === 'plan');

// файл пользователя: шаблон, к которому дописана колонка без заголовка (описание блюда), лишние пустые колонки и листы «Как заполнять» и «План»
const mine = parseBook({
  'Как заполнять': [['Как заполнять шаблон']],
  Продукты: [[...SIMPLE_HEAD.products], ['Овсяные хлопья', 360, 12, 6, 62, 'Крупы/макароны', 500]],
  Блюда: [[...SIMPLE_HEAD.dishes.slice(0, 4)], ['Щи', 'Обед', 'Вода', 400, null, 'Суп на обед, мясной.'], ['Щи', 'Обед', 'Капуста', 200, null, 'Суп на обед, мясной.']],
  План: [SIMPLE_HEAD.plan],
});
const md = mine.blocks.find(b => b.kind === 'dishes');
ok('безымянная колонка прочитана как описание блюда', md.dishes[0].desc === 'Суп на обед, мясной.' && md.dishes[0].ing.length === 2 && md.errors.length === 0);
ok('в предпросмотр уходит пояснение про эту колонку', md.notes.length === 1 && /колонка F/.test(md.notes[0]));
ok('пустой лист «План» не мешает', mine.blocks.filter(b => (b.items || b.dishes || b.rows).length).map(b => b.kind).sort().join() === 'dishes,products');
const named = parseBook({ Блюда: [[...SIMPLE_HEAD.dishes], ['Щи', 'Обед', 'Вода', 400, 'Описание из шаблона']] }).blocks[0];
ok('колонка «Описание блюда» из шаблона читается без пояснений', named.dishes[0].desc === 'Описание из шаблона' && named.notes.length === 0);

// туда-обратно: выгрузка расширенной формы → разбор
const pset = { items: by('products').items.map(x => ({ ...x })) }, dset = { dishes: by('dishes').dishes.map(d => ({ ...d })) };
const back = parseBook(book(formSheets({ pset, dset, plan: null, params: null }))), get = k => back.blocks.find(b => b.kind === k);
ok('туда-обратно: продукты', get('products').items.length === 2 && get('products').items[0].kcal === 313);
ok('туда-обратно: блюда', get('dishes').dishes[0].ing.length === 2 && get('dishes').dishes[0].ing[1].g === 10);
