// Excel-форма для загрузки и выгрузки данных: листы «Продукты», «Блюда», «План», «Параметры».
// Данные читаются и записываются без изменений: названия символ в символ, числа как есть, пустое остаётся пустым.
// Словарь синонимов заголовков — в одном месте (SYN): дополняйте его здесь.
import { CATS } from './products.js';

export const SYN = {
  // продукты
  name: ['название', 'продукт', 'наименование'], cat: ['категория', 'группа'], kcal: ['ккал', 'ккална100г', 'ккал100г', 'калорийность', 'энергия', 'ккал/100г'],
  p: ['белки', 'белкина100г', 'белок', 'б', 'белок100г'], f: ['жиры', 'жирына100г', 'жир', 'ж', 'жир100г'], c: ['углеводы', 'углеводына100г', 'угл', 'у', 'угл100г'],
  baseUnit: ['базоваяед', 'базоваяединица'], pack: ['размеруп', 'размерупаковки', 'упаковка', 'упаковкаг'], unitBuy: ['едзакупки', 'единицазакупки'], price: ['ценазаупаковку', 'цена', 'ценауп'],
  inPurchase: ['взакупку', 'взакупку?'], shelf: ['хранениедней', 'хранение', 'хранениедн'], fresh: ['свежийданет', 'свежий'], tags: ['теги'], note: ['примечание'], id: ['id', 'идентификатор'], src: ['источник'],
  // блюда
  dish: ['блюдо', 'рецепт'], meal: ['приёмпищи', 'приемпищи', 'трапеза', 'приём'], product: ['продукт', 'ингредиент'], qty: ['колвона1человека', 'гначел', 'норма', 'весначел', 'гчел', 'колвонапорцию', 'колвопорция', 'граммына1человека', 'граммына1чел'],
  qtyGroup: ['всего', 'награппу'], unit: ['ед', 'единица'], min: ['мин', 'минг'], max: ['макс', 'максг'], cond: ['условия'], cook: ['варкамин', 'варка'], desc: ['описаниеблюда', 'описание'], lineNote: ['примечаниекстроке'], dishId: ['idблюда', 'рецептid'],
  // план
  day: ['день', 'дата'], portions: ['порций', 'порции'], comment: ['комментарий'],
};
export const norm = s => String(s ?? '').toLowerCase().replace(/[\s_.,:;()\\/\-+]+/g, '').replace(/[?!]/g, '');
const SYNN = Object.fromEntries(Object.entries(SYN).map(([k, v]) => [k, v.map(norm)]));
const isNum = v => typeof v === 'number';
const num = v => (v == null || v === '' ? null : isNum(v) ? v : (isFinite(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : NaN));
const txt = v => (v == null ? '' : String(v));
export const MEAL_KEY = { завтрак: 'b', обед: 'l', ужин: 'd', перекус: 's', карпит: 's' };
const COND_WORDS = { 'любойдень': 'any', 'any': 'any', 'днёвка': 'rest', 'дневка': 'rest', 'жара': 'hot', 'холод': 'cold', 'первые2дня': 'first2' };
const condKeys = t => String(t || '').split(/[,;]/).map(x => { const n = norm(x); return COND_WORDS[n] || (n.startsWith('высота') ? 'alt3000' : n.startsWith('перв') ? 'first2' : null); }).filter(Boolean);

// Соответствие категорий (текст из файла → ключ приложения). Оригинальный текст сохраняется в catOrig.
const CAT_MAP = { 'крупы/макароны': 'grain', 'крупы': 'grain', 'сухие продукты': 'legume', 'белок': 'meat', 'жиры': 'fat', 'перекусы': 'sweet', 'выпечка': 'bread', 'напитки': 'drink', 'бакалея': 'spice', 'овощи': 'veg', 'фрукты': 'fresh', 'соусы': 'fat', 'молочное': 'dairy', 'специи': 'spice', 'вода': 'drink' };
export function catKey(t) { const n = String(t || '').trim().toLowerCase(); return CAT_MAP[n] || (CATS.find(c => c[0] === n || c[1].toLowerCase() === n) || [])[0] || 'spice'; }

// ---- разбор листа в таблицу по заголовкам ----
function tableOf(rows, wanted) {
  for (let h = 0; h < Math.min(12, rows.length); h++) {
    const hdr = (rows[h] || []).map(norm), cols = {};
    for (const f of wanted) { const i = hdr.findIndex(x => SYNN[f].includes(x)); if (i >= 0) cols[f] = i; }
    if (Object.keys(cols).length >= 2) return { h, cols, rows: rows.slice(h + 1).map((r, k) => ({ r, ln: h + 2 + k })) };
  }
  return null;
}
const PROD_F = ['name', 'cat', 'kcal', 'p', 'f', 'c', 'baseUnit', 'pack', 'unitBuy', 'price', 'inPurchase', 'shelf', 'fresh', 'tags', 'note', 'id', 'src'];
const DISH_F = ['dish', 'meal', 'product', 'qty', 'qtyGroup', 'unit', 'min', 'max', 'cond', 'cook', 'desc', 'lineNote', 'dishId', 'src'];
const PLAN_F = ['day', 'meal', 'dish', 'portions', 'comment', 'dishId', 'src'];

export function detect(rows, sheetName) {
  const nm = norm(sheetName), tp = tableOf(rows, PROD_F), td = tableOf(rows, DISH_F), tl = tableOf(rows, PLAN_F);
  if (nm.startsWith('параметр') || nm === 'ввод') return 'params';
  if (nm.startsWith('эталон') || nm.startsWith('пересч') || nm.startsWith('диагност') || nm.startsWith('инструкц') || nm.startsWith('какзаполн')) return null;
  const isProd = tp && tp.cols.name != null && tp.cols.kcal != null, isDish = td && td.cols.dish != null && td.cols.product != null && (td.cols.qty != null || td.cols.qtyGroup != null), isPlan = tl && tl.cols.day != null && tl.cols.dish != null && td?.cols.product == null;
  if (nm.startsWith('продукт') && isProd) return 'products';
  if ((nm.startsWith('блюд') || nm.startsWith('рецепт')) && isDish) return 'dishes';
  if ((nm === 'план' || nm.startsWith('меню')) && isPlan) return 'plan';
  return isProd ? 'products' : isDish ? 'dishes' : isPlan ? 'plan' : null;
}

export function parseProducts(rows, sheet) {
  const t = tableOf(rows, PROD_F), items = [], errors = [];
  if (!t || t.cols.name == null) return { items, errors: ['нет колонки «Название»'] };
  const g = (r, f) => (t.cols[f] == null ? undefined : r[t.cols[f]]);
  for (const { r, ln } of t.rows) {
    if (!r.some(v => v != null && v !== '')) continue;
    const name = g(r, 'name');
    if (name == null || name === '') { errors.push(`лист ${sheet}, строка ${ln}: нет названия`); continue; }
    const bad = ['kcal', 'p', 'f', 'c', 'pack', 'price', 'shelf'].find(f => t.cols[f] != null && isNaN(num(g(r, f))));
    if (bad) { errors.push(`лист ${sheet}, строка ${ln}: поле «${bad}» не число`); continue; }
    const catO = g(r, 'cat'), pur = g(r, 'inPurchase');
    items.push({ name: txt(name), catOrig: catO == null ? null : txt(catO), cat: catKey(catO), kcal: num(g(r, 'kcal')), p: num(g(r, 'p')), f: num(g(r, 'f')), c: num(g(r, 'c')), baseUnit: g(r, 'baseUnit') == null ? null : txt(g(r, 'baseUnit')), pack: num(g(r, 'pack')), unit: g(r, 'unitBuy') == null ? null : txt(g(r, 'unitBuy')), price: num(g(r, 'price')), inPurchase: pur == null ? null : /^(да|yes|1|true|\+)$/i.test(txt(pur).trim()), shelf: num(g(r, 'shelf')), fresh: /^(да|yes|1|true)$/i.test(txt(g(r, 'fresh')).trim()), tags: txt(g(r, 'tags')), note: g(r, 'note') == null ? null : txt(g(r, 'note')), srcId: g(r, 'id') ?? null, srcCell: g(r, 'src') == null ? `${sheet}, строка ${ln}` : txt(g(r, 'src')), ln });
  }
  return { items, errors };
}

export function parseDishes(rows, sheet) {
  const t = tableOf(rows, DISH_F), errors = [], byKey = new Map(), dishes = [];
  if (!t || t.cols.dish == null || t.cols.product == null) return { dishes, errors: ['нет колонок «Блюдо» и «Продукт»'] };
  const g = (r, f) => (t.cols[f] == null ? undefined : r[t.cols[f]]);
  for (const { r, ln } of t.rows) {
    if (!r.some(v => v != null && v !== '')) continue;
    const dn = g(r, 'dish'), pn = g(r, 'product');
    if (dn == null || dn === '') { errors.push(`лист ${sheet}, строка ${ln}: нет названия блюда`); continue; }
    if (pn == null || pn === '') { errors.push(`лист ${sheet}, строка ${ln}: нет продукта`); continue; }
    const q = num(g(r, 'qty') ?? undefined), qg = num(g(r, 'qtyGroup') ?? undefined), qq = q ?? qg;
    if (qq == null || isNaN(qq)) { errors.push(`лист ${sheet}, строка ${ln}: нет граммов`); continue; }
    const key = txt(dn) + '\u0001' + txt(g(r, 'dishId') ?? '');
    let d = byKey.get(key);
    if (!d) {
      const mk = MEAL_KEY[norm(g(r, 'meal'))] || '';
      d = { name: txt(dn), meal: mk, mealOrig: g(r, 'meal') == null ? null : txt(g(r, 'meal')), desc: g(r, 'desc') == null ? null : txt(g(r, 'desc')), srcId: g(r, 'dishId') ?? null, cook: num(g(r, 'cook') ?? undefined) || 0, cond: condKeys(g(r, 'cond')), ing: [], ln };
      if (!d.cond.length) d.cond = ['any'];
      byKey.set(key, d); dishes.push(d);
    }
    d.ing.push({ name: txt(pn), g: qq, unit: g(r, 'unit') == null ? null : txt(g(r, 'unit')), note: g(r, 'lineNote') == null ? null : txt(g(r, 'lineNote')), min: num(g(r, 'min') ?? undefined), max: num(g(r, 'max') ?? undefined), perGroup: q == null && qg != null, srcCell: g(r, 'src') == null ? `${sheet}, строка ${ln}` : txt(g(r, 'src')) });
  }
  return { dishes, errors };
}

export function parsePlan(rows, sheet) {
  const t = tableOf(rows, PLAN_F), errors = [], out = [];
  if (!t || t.cols.day == null || t.cols.dish == null) return { rows: out, errors: ['нет колонок «День» и «Блюдо»'] };
  const g = (r, f) => (t.cols[f] == null ? undefined : r[t.cols[f]]);
  for (const { r, ln } of t.rows) {
    if (!r.some(v => v != null && v !== '')) continue;
    const day = g(r, 'day'), dish = g(r, 'dish'), meal = g(r, 'meal');
    const dn = num(typeof day === 'string' ? day.replace(/^[^\d]*/, '') : day);
    if (dn == null || isNaN(dn)) { errors.push(`лист ${sheet}, строка ${ln}: нет номера дня`); continue; }
    if (dish == null || dish === '') { errors.push(`лист ${sheet}, строка ${ln}: нет блюда`); continue; }
    const mk = MEAL_KEY[norm(meal)];
    if (!mk) { errors.push(`лист ${sheet}, строка ${ln}: неизвестный приём пищи «${meal ?? ''}»`); continue; }
    out.push({ day: dn, meal: txt(meal), mealKey: mk, dish: txt(dish), portions: num(g(r, 'portions') ?? undefined), comment: g(r, 'comment') == null ? null : txt(g(r, 'comment')), srcId: g(r, 'dishId') || null, srcCell: g(r, 'src') == null ? `${sheet}, строка ${ln}` : txt(g(r, 'src')) });
  }
  return { rows: out, errors };
}

export function parseParams(rows) {
  const out = [];
  let start = rows.findIndex(r => norm(r[0]) === 'параметр');
  for (const r of rows.slice(start + 1)) if (r.some(v => v != null && v !== '')) out.push({ name: r[0], value: r[1] ?? null, note: r[2] ?? null, formula: r[3] ?? null, src: r[4] ?? null });
  return out;
}

// Разбор всей книги: блоки, найденные по названиям листов, заголовкам и форме данных
export function parseBook(sheets) {
  const blocks = [], unused = [];
  for (const [name, rows] of Object.entries(sheets)) {
    const kind = detect(rows, name);
    if (!kind) { unused.push(name); continue; }
    if (kind === 'products') blocks.push({ kind, sheet: name, ...parseProducts(rows, name) });
    else if (kind === 'dishes') blocks.push({ kind, sheet: name, ...parseDishes(rows, name) });
    else if (kind === 'plan') blocks.push({ kind, sheet: name, ...parsePlan(rows, name) });
    else if (kind === 'params') blocks.push({ kind, sheet: name, params: parseParams(rows), errors: [] });
  }
  return { blocks, unused };
}

// ---- выгрузка в ту же форму ----
export const FORM_HEAD = {
  products: ['Название', 'Категория', 'Ккал на 100 г', 'Белки на 100 г', 'Жиры на 100 г', 'Углеводы на 100 г', 'Базовая ед.', 'Размер упаковки', 'Ед. закупки', 'Цена за упаковку', 'В закупку?', 'Хранение, дней', 'Свежий (да/нет)', 'Теги', 'Примечание', 'ID', 'Источник'],
  dishes: ['Блюдо', 'Приём пищи', 'Продукт', 'Кол-во на 1 человека', 'Ед.', 'Мин', 'Макс', 'Условия', 'Варка, мин', 'Описание блюда', 'Примечание к строке', 'ID блюда', 'Источник'],
  plan: ['День', 'Приём пищи', 'Блюдо', 'Порций', 'Комментарий', 'ID блюда', 'Источник'],
  params: ['Параметр', 'Значение', 'Примечание', 'Формула (как в источнике)', 'Источник'],
};
// Простой шаблон для пользователя: только нужные колонки + лист «Как заполнять». Загрузчик по-прежнему понимает и расширенные колонки (FORM_HEAD).
export const SIMPLE_HEAD = {
  products: ['Название', 'Ккал на 100 г', 'Белки на 100 г', 'Жиры на 100 г', 'Углеводы на 100 г', 'Категория', 'Упаковка, г', 'Цена'],
  dishes: ['Блюдо', 'Приём пищи', 'Продукт', 'Граммы на 1 человека'],
  plan: ['День', 'Приём пищи', 'Блюдо'],
};
export const simpleFormSheets = () => [
  { name: 'Как заполнять', rows: [
    ['Как заполнять шаблон'], [],
    ['1. Заполните только те листы, которые нужны: «Продукты», «Блюда», «План». Остальные оставьте пустыми.'],
    ['2. Заголовки (первая строка) не меняйте. Строки с ошибками пропускаются, остальное загружается.'],
    ['3. Этот лист при загрузке игнорируется.'], [],
    ['Лист «Продукты»: что за продукт и сколько в нём энергии на 100 г.'],
    ['   Обязательно: Название, Ккал. Остальное можно не заполнять. Пример: Гречка | 313 | 12,6 | 3,3 | 62,1 | Крупы | 800 | 95'],
    ['Лист «Блюда»: одна строка = один продукт в блюде, количество на 1 человека в граммах.'],
    ['   Пример: Каша гречневая | Завтрак | Гречка | 80    и    Каша гречневая | Завтрак | Масло сливочное | 10'],
    ['   Приём пищи: Завтрак, Обед, Ужин или Перекус. Название продукта пишите как в листе «Продукты».'],
    ['Лист «План»: какое блюдо в какой день и приём пищи. Пример: 1 | Завтрак | Каша гречневая'],
    ['   Название блюда — как в листе «Блюда».'], [],
    ['Килограммы, штуки, ложки и «на группу» программа сама не пересчитывает: при загрузке она предложит выбрать пересчёт.'],
  ] },
  { name: 'Продукты', rows: [SIMPLE_HEAD.products] },
  { name: 'Блюда', rows: [SIMPLE_HEAD.dishes] },
  { name: 'План', rows: [SIMPLE_HEAD.plan] },
];
const MEAL_RU = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' }, COND_RU = { any: 'любой день', rest: 'днёвка', hot: 'жара', cold: 'холод', alt3000: 'высота > 3000', first2: 'первые 2 дня' };
const nz = v => (v == null ? null : v);
export function formSheets({ pset, dset, plan, params }) {
  const out = [];
  if (params?.length) out.push({ name: 'Параметры', rows: [FORM_HEAD.params, ...params.map(p => [nz(p.name), nz(p.value), nz(p.note), nz(p.formula), nz(p.src)])] });
  if (pset) out.push({ name: 'Продукты', rows: [FORM_HEAD.products, ...pset.items.map(p => [p.name, nz(p.catOrig ?? (CATS.find(c => c[0] === p.cat) || [])[1]), nz(p.kcal), nz(p.p), nz(p.f), nz(p.c), nz(p.baseUnit), nz(p.pack), nz(p.unit), nz(p.price), p.inPurchase == null ? null : p.inPurchase ? 'Да' : 'Нет', nz(p.shelf), p.fresh ? 'да' : null, p.tags || null, nz(p.note), nz(p.srcId), nz(p.srcCell)])] });
  if (dset) {
    const rows = [FORM_HEAD.dishes];
    for (const d of dset.dishes) for (const i of d.ing) rows.push([d.name, d.mealOrig ?? (d.meal ? MEAL_RU[d.meal] : null), i.name, i.g, nz(i.unit), nz(i.min), nz(i.max), d.condOrig ?? (d.cond && !(d.cond.length === 1 && d.cond[0] === 'any') ? d.cond.map(k => COND_RU[k]).join(', ') : null), d.cook || null, nz(d.desc), nz(i.note), nz(d.srcId), nz(i.srcCell)]);
    out.push({ name: 'Блюда', rows });
  }
  if (plan) out.push({ name: 'План', rows: [FORM_HEAD.plan, ...plan.rows.map(r => [r.day, r.meal, r.dish, nz(r.portions), nz(r.comment), nz(r.srcId), nz(r.srcCell)])] });
  return out;
}
