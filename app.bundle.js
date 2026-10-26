// ФАЙЛ СОБИРАЕТСЯ АВТОМАТИЧЕСКИ из src/ командой node tools/build.mjs — не правьте вручную.
(function () {
const __m = {};
__m['defaults.js'] = (() => {
// Все числа и версии приложения. Каждый параметр расчёта: id, группа, название, единица, значение по умолчанию, подсказка.
// Меняются в Настройках → Параметры расчёта. Новые этапы добавляют свои параметры сюда же.
const APP_VERSION = '3.0';
const TERMS_VERSION = '1';
const DB_NAME = 'raskladka';
const DB_VERSION = 3;

const GROUPS = [
  ['walk', 'Ходьба'], ['cover', 'Покрытие'], ['day', 'Сутки'], ['alt', 'Высота'], ['food', 'Раскладка'], ['menu', 'Меню'], ['fuel', 'Топливо и вода'],
];

const P = (id, group, label, unit, def, hint = '') => ({ id, group, label, unit, def, hint });

const PARAMS = [
  P('pandolf_corr', 'walk', 'Поправка на недооценку Пандольфа', '×', 1.2),
  P('kcal_per_wh', 'walk', 'Перевод ватт-часов в ккал', 'ккал/Вт·ч', 0.86),
  P('slope_clip', 'walk', 'Предел уклона', '%', 40, 'Уклон ограничивается диапазоном от −предел до +предел.'),
  P('seg_step', 'walk', 'Шаг участка трека', 'м', 75, 'Расчёт идёт по участкам такой длины (50–100 м).'),
  P('tobler_base', 'walk', 'Базовая скорость по Тоблеру', 'км/ч', 5, 'Скорость по ровному месту с рюкзаком, когда в треке нет меток времени. Значение выбрано как стартовое.'),
  P('split_up', 'walk', 'Нагрузка дня: набор делится на', 'м', 100, 'Эквивалент нагрузки дня = км + набор/это число + сброс/следующее число. Нужен для разбивки трека на дни поровну.'),
  P('split_down', 'walk', 'Нагрузка дня: сброс делится на', 'м', 200),
  P('smooth_thr', 'walk', 'Порог сглаживания высот', 'м', 5, 'Изменения высоты меньше порога считаются шумом GPS.'),
  P('descent_th_low', 'walk', 'Спуск: мягкий до уклона', '%', 10),
  P('descent_th_high', 'walk', 'Спуск: крутой от уклона', '%', 20),
  P('descent_k_low', 'walk', 'Спуск мягкий: к стоимости ровного', '×', 0.85),
  P('descent_k_mid', 'walk', 'Спуск средний: к стоимости ровного', '×', 1.0),
  P('descent_k_high', 'walk', 'Спуск крутой: к стоимости ровного', '×', 1.15, 'Тормозящая работа мышц.'),

  P('eta_asphalt', 'cover', 'Асфальт, η', '', 1.0),
  P('eta_dirt', 'cover', 'Грунтовка, η', '', 1.1),
  P('eta_trail', 'cover', 'Тропа / лёгкие кусты, η', '', 1.2),
  P('eta_bush', 'cover', 'Густые кусты / курумник, η', '', 1.5),
  P('eta_swamp', 'cover', 'Болото, η', '', 1.8),
  P('eta_sand', 'cover', 'Песок, η', '', 2.1),
  P('eta_snow_a', 'cover', 'Снег: базовая часть, η', '', 1.3, 'η снега = базовая + коэффициент × глубина в см.'),
  P('eta_snow_b', 'cover', 'Снег: коэффициент на 1 см', '', 0.082),

  P('camp_k', 'day', 'Бытовая активность в лагере', '×BMR', 1.3),
  P('rest_k', 'day', 'Днёвка', '×BMR', 1.6),
  P('cold_k', 'day', 'Холод', 'ккал/°C', 29),
  P('cold_t0', 'day', 'Температура, ниже которой считаем холод', '°C', 15),
  P('general_pct', 'day', 'Общая поправка «по опыту»', '%', 0, 'Прибавка к потребности. Например 10 — на десять процентов больше.'),
  P('share_m', 'day', 'Доля общего груза по умолчанию: М', '', 1.0),
  P('share_f', 'day', 'Доля общего груза по умолчанию: Ж', '', 0.7),
  P('appetite_def', 'day', 'Коэффициент аппетита по умолчанию', '', 1.0),

  P('alt_start', 'alt', 'Высота, с которой растёт расход', 'м', 2500),
  P('alt_pct', 'alt', 'Прибавка расхода на каждые 1000 м выше порога', '%', 5),
  P('app_alt1', 'alt', 'Аппетит выше 3000 м', '×', 0.9, 'Множитель объёма еды в первые дни на новой высоте.'),
  P('app_alt2', 'alt', 'Аппетит выше 4000 м', '×', 0.8),
  P('app_alt3', 'alt', 'Аппетит выше 5000 м', '×', 0.7),
  P('app_days', 'alt', 'Сколько первых дней действует снижение аппетита', 'дн', 3),
  P('macro_alt', 'alt', 'Высота сдвига БЖУ к углеводам', 'м', 4000),
  P('macro_f_low', 'alt', 'БЖУ ниже: жиры (белки = 1)', '', 1),
  P('macro_c_low', 'alt', 'БЖУ ниже: углеводы', '', 4),
  P('macro_f_high', 'alt', 'БЖУ выше: жиры', '', 0.7),
  P('macro_c_high', 'alt', 'БЖУ выше: углеводы', '', 5),

  P('cov_hungry', 'food', 'Покрытие: голодная', '%', 55),
  P('cov_std', 'food', 'Покрытие: стандарт', '%', 67),
  P('cov_full', 'food', 'Покрытие: сытая', '%', 80),
  P('cov_custom', 'food', 'Покрытие: своя', '%', 67),
  P('cov_warn', 'food', 'Порог предупреждения о покрытии', '%', 67),
  P('kcal100', 'food', 'Калорийность меню (до расчёта по продуктам)', 'ккал/100 г', 400, 'Для оценки граммов, пока меню не собрано (380–420).'),
  P('ref_hungry', 'food', 'Ориентир: голодно', 'г/чел·день', 500),
  P('ref_std', 'food', 'Ориентир: стандарт', 'г/чел·день', 600),
  P('ref_full', 'food', 'Ориентир: сытно', 'г/чел·день', 850),
  { ...P('reserve_days', 'food', 'Аварийный запас', 'дн', 1), hidden: true }, // задаётся в «Питание и заброски» у похода (значение по умолчанию — это)

  P('split_b', 'menu', 'Доля ккал: завтрак', '%', 25),
  P('split_l', 'menu', 'Доля ккал: обед-перекус', '%', 25),
  P('split_d', 'menu', 'Доля ккал: ужин', '%', 30),
  P('split_s', 'menu', 'Доля ккал: каждый перекус', '%', 10, 'Доли по умолчанию для нового плана питания (завтрак, перекус, обед, перекус, ужин). Сумма по приёмам дня должна быть 100%; свой план питания — в «Питание и заброски».'),
  P('min_b', 'menu', 'Минимум завтрака', 'ккал/чел', 550, 'Ниже минимума блюдо не используется или порция увеличивается в пределах мин/макс.'),
  P('min_l', 'menu', 'Минимум обеда-перекуса', 'ккал/чел', 600),
  P('min_l_g', 'menu', 'Минимум обеда-перекуса по весу', 'г/чел', 150),
  P('min_d', 'menu', 'Минимум ужина', 'ккал/чел', 800),
  P('lunch_carb', 'menu', 'Обед: углеводная основа не меньше', 'г', 50),
  P('lunch_prot', 'menu', 'Обед: белок/жир не меньше', 'г', 40),
  P('lunch_sweet', 'menu', 'Обед: сладкое не меньше', 'г', 30),
  P('cold_cond_t', 'menu', 'Условие «холод»: средняя температура ниже', '°C', 5),
  P('fresh_days', 'menu', 'Условие «первые дни» и свежее', 'дн', 2),
  P('assault_cook', 'menu', 'Штурмовой день: варка не дольше', 'мин', 10),
  P('snack_cap', 'menu', 'Перекус: не больше одного продукта на человека', 'г', 60, 'Значение выбрано как стартовое.'),
  P('rot_days', 'menu', 'Цикл ротации блюд', 'дн', 3, 'Одна основа не повторяется чаще, чем раз в цикл (3–4 дня).'),
  P('base_max', 'menu', 'Сколько раз за поход можно повторить основу', 'раз', 3, 'Значение выбрано как стартовое.'),

  P('fuel_nosnow', 'fuel', 'Газ без снега', 'г/чел·день', 45),
  P('fuel_snow', 'fuel', 'Газ с топкой снега', 'г/чел·день', 65),
  P('fuel_cold', 'fuel', 'Газ в мороз или выше порога высоты', 'г/чел·день', 90),
  P('fuel_cold_alt', 'fuel', 'Высота порога для «мороз»', 'м', 4000),
  P('fuel_wind_pct', 'fuel', 'Прибавка газа при сильном ветре', '%', 20, 'Значение выбрано как стартовое.'),
  P('long_min', 'fuel', 'Круп, варящихся дольше', 'мин', 20),
  P('long_g', 'fuel', 'Добавка газа за долгую варку', 'г/чел·день', 5, 'Значение выбрано как стартовое.'),
  P('canister_g', 'fuel', 'Газа в баллоне', 'г', 230),
  P('salt_fix', 'fuel', 'Соль: на группу на поход', 'г', 20),
  P('salt_pp', 'fuel', 'Соль: на человека в день', 'г', 2),
  P('water_ml', 'fuel', 'Вода на кг веса', 'мл/кг', 30),
  P('hot_t', 'fuel', 'Жара: максимальная температура выше', '°C', 25),
  P('hot_l', 'fuel', 'Добавка воды в жару', 'л', 2, 'От 1 до 3 литров.'),
];

const COVERS = [
  ['asphalt', 'Асфальт'], ['dirt', 'Грунтовка'], ['trail', 'Тропа'], ['bush', 'Кусты / курумник'],
  ['swamp', 'Болото'], ['sand', 'Песок'], ['snow', 'Снег'],
];
const DAY_TYPES = ['Подходной', 'Ходовой', 'Штурмовой', 'Днёвка', 'Запасной', 'Выход', 'Полудень'];
const CATEGORIES = ['н/к', '1 к.с.', '2 к.с.', '3 к.с.', '4 к.с.', '5 к.с.', '6 к.с.'];

return {APP_VERSION, TERMS_VERSION, DB_NAME, DB_VERSION, GROUPS, PARAMS, COVERS, DAY_TYPES, CATEGORIES};
})();
__m['store.js'] = (() => {
// Обёртка над IndexedDB: хранилища trips, products, settings (ключ-значение).
const {DB_NAME, DB_VERSION} = __m['defaults.js'];

const STORES = ['trips', 'products', 'menus', 'plans', 'settings'];
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}

const get = (store, key) => tx(store, 'readonly', s => s.get(key));
const put = (store, key, val) => tx(store, 'readwrite', s => s.put(val, key));
const del = (store, key) => tx(store, 'readwrite', s => s.delete(key));
const getAll = (store) => tx(store, 'readonly', s => s.getAll());

function entries(store) {
  return open().then(db => new Promise((res, rej) => {
    const out = [], r = db.transaction(store, 'readonly').objectStore(store).openCursor();
    r.onsuccess = () => { const c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
    r.onerror = () => rej(r.error);
  }));
}
const clear = store => tx(store, 'readwrite', s => s.clear());

return {get, put, del, getAll, entries, clear};
})();
__m['params.js'] = (() => {
// Текущие значения параметров = значения по умолчанию + твои правки из Настроек.
const {PARAMS} = __m['defaults.js'];
const store = __m['store.js'];

let over = {};
const opts = { round: true, currency: '₸', dark: false };
const loadParams = async () => { over = (await store.get('settings', 'params')) || {}; Object.assign(opts, await store.get('settings', 'opts')); };
const saveOpts = () => store.put('settings', 'opts', opts);
const getParam = id => (id in over ? over[id] : PARAMS.find(p => p.id === id).def);
const isChanged = id => id in over;
async function setParam(id, v) {
  const def = PARAMS.find(p => p.id === id).def;
  if (v === null || v === def) delete over[id]; else over[id] = v;
  await store.put('settings', 'params', over);
}
async function resetParams(ids) {
  for (const id of ids) delete over[id];
  await store.put('settings', 'params', over);
}
const changedCount = () => Object.keys(over).length;
const allParams = () => Object.fromEntries(PARAMS.map(p => [p.id, getParam(p.id)]));

return {opts, loadParams, saveOpts, getParam, isChanged, setParam, resetParams, changedCount, allParams};
})();
__m['ui.js'] = (() => {
// Общие кусочки интерфейса: экранирование и генератор форм по описанию полей.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Поле: {k, label, type: text|number|date|select|seg|check, opts:[[value,label]], help, show:(obj)=>bool, unit}
function form(fields, obj) {
  return fields.filter(f => !f.show || f.show(obj)).map(f => {
    const v = obj[f.k] ?? '';
    const q = f.help ? `<button class="q" data-help="${f.k}" aria-label="Пояснение">?</button>` : '';
    let ctl;
    if (f.type === 'select') ctl = `<select data-k="${f.k}">${f.opts.map(([a, b]) => `<option value="${esc(a)}"${a == v ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
    else if (f.type === 'seg') ctl = `<div class="seg">${f.opts.map(([a, b]) => `<button data-seg="${f.k}" data-v="${esc(a)}" class="${a == v ? 'on' : ''}">${esc(b)}</button>`).join('')}</div>`;
    else if (f.type === 'check') ctl = `<input type="checkbox" data-k="${f.k}"${obj[f.k] ? ' checked' : ''}>`;
    else ctl = `<input data-k="${f.k}" type="${f.type || 'text'}" ${f.type === 'number' ? 'inputmode="decimal" step="any"' : ''} value="${esc(v)}">${f.unit ? `<span class="muted unit">${f.unit}</span>` : ''}`;
    return `<div class="fld"><label>${esc(f.label)}${q}</label><div class="ctl">${ctl}</div></div>${f.help ? `<p class="help" id="help-${f.k}" hidden>${esc(f.help)}</p>` : ''}`;
  }).join('');
}

// Привязка событий. onChange вызывается после каждого изменения; rerender — если поле влияет на вид формы.
function bindForm(root, fields, obj, onChange, rerender) {
  const type = k => fields.find(f => f.k === k)?.type;
  root.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
    const k = el.dataset.k, t = type(k);
    obj[k] = t === 'check' ? el.checked : t === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
    onChange(k);
    if (t === 'select' || t === 'check') rerender();
  });
  root.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => {
    const k = b.dataset.seg;
    obj[k] = b.dataset.v;
    onChange(k);
    rerender();
  });
  root.querySelectorAll('[data-help]').forEach(b => b.onclick = () => {
    const p = root.querySelector('#help-' + b.dataset.help);
    p.hidden = !p.hidden;
  });
}

// Модальное окно. build() возвращает {title, html, bind(root, refresh, close)}; refresh() перерисовывает окно.
function modal(build, onClose) {
  const ov = document.createElement('div'); ov.className = 'overlay';
  const close = () => { ov.remove(); onClose?.(); };
  const refresh = () => {
    const b = build();
    ov.innerHTML = `<div class="modal" role="dialog"><div class="mh2"><b>${esc(b.title)}</b><button class="icon-btn" data-x aria-label="Закрыть">×</button></div><div class="mbody">${b.html}</div></div>`;
    ov.querySelector('[data-x]').onclick = close;
    b.bind?.(ov.querySelector('.mbody'), refresh, close);
  };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov); refresh();
  return close;
}

return {esc, form, bindForm, modal};
})();
__m['setrepo.js'] = (() => {
// Общее хранилище «наборов» (продуктов или меню): до 10 штук, порядок вкладок, переименование, дубли, удаление.
const store = __m['store.js'];

const MAX_SETS = 10;
// migrate(набор) — необязательная правка уже сохранённых наборов при загрузке; возвращает true, если набор изменён.
function makeRepo(storeName, seed, migrate = null) {
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

return {MAX_SETS, makeRepo};
})();
__m['builtin.js'] = (() => {
// Встроенные наборы: два набора продуктов и два набора меню (раздел 6 задания). Значения КБЖУ — справочные, на 100 г.
// Продукт: название, категория, ккал, белки, жиры, углеводы, упаковка г, хранение дн, ед. закупки, теги, свежий
const PR = (name, cat, kcal, p, f, c, pack, shelf, unit, tags = '', fresh = false) => ({ name, cat, kcal, p, f, c, pack, shelf, unit, tags, fresh });

const BASE = [
  PR('Гречка', 'grain', 313, 12.6, 3.3, 62.1, 800, 999, 'пачка'), PR('Рис', 'grain', 335, 7, 0.6, 77, 800, 999, 'пачка'),
  PR('Овсяные хлопья', 'grain', 366, 12, 6.2, 62, 500, 999, 'пачка', 'gluten'),
  PR('Макароны', 'grain', 350, 11, 1.3, 72, 400, 999, 'пачка', 'gluten'), PR('Вермишель', 'grain', 350, 11, 1.3, 72, 400, 999, 'пачка', 'gluten'),
  PR('Хлеб', 'bread', 242, 8, 1, 48, 400, 2, 'батон', 'gluten', true), PR('Сухари', 'bread', 350, 11, 3, 70, 300, 365, 'пачка', 'gluten'),
  PR('Галеты', 'bread', 380, 10, 7, 70, 200, 365, 'пачка', 'gluten'),
  PR('Тушёнка говяжья', 'meat', 232, 16, 18, 0, 338, 730, 'банка', 'meat'), PR('Тушёнка свиная', 'meat', 349, 14, 32, 0, 338, 730, 'банка', 'meat pork'),
  PR('Колбаса сырокопчёная', 'meat', 440, 25, 38, 1, 300, 60, 'палка', 'meat pork'),
  PR('Сыр твёрдый', 'cheese', 350, 25, 27, 0, 200, 30, 'кусок', 'lactose'),
  PR('Молоко сухое', 'dairy', 480, 25, 25, 39, 400, 365, 'пачка', 'lactose'), PR('Сгущённое молоко', 'dairy', 320, 7.2, 8.5, 56, 380, 365, 'банка', 'lactose'),
  PR('Масло сливочное', 'fat', 748, 0.5, 82.5, 0.8, 180, 10, 'пачка', 'lactose'), PR('Масло топлёное', 'fat', 890, 0.3, 99, 0.6, 180, 365, 'банка', 'lactose heat'),
  PR('Масло подсолнечное', 'fat', 899, 0, 99.9, 0, 500, 365, 'бутылка'),
  PR('Соль', 'spice', 0, 0, 0, 0, 1000, 999, 'пачка'), PR('Сахар', 'spice', 399, 0, 0, 99.8, 1000, 999, 'пачка'),
  PR('Томатная паста', 'spice', 80, 4, 0, 15, 140, 180, 'туба'), PR('Суп в пакете', 'soup', 330, 12, 5, 56, 70, 365, 'пакет', 'gluten'),
  PR('Бульонные кубики', 'spice', 230, 12, 14, 12, 80, 365, 'коробка'), PR('Приправа универсальная', 'spice', 250, 10, 5, 50, 50, 999, 'пакет'),
  PR('Перец чёрный', 'spice', 255, 11, 3, 64, 30, 999, 'пакет'),
  PR('Чай', 'drink', 0, 0, 0, 0, 100, 999, 'пачка'), PR('Кофе растворимый', 'drink', 100, 15, 0, 14, 100, 999, 'банка'), PR('Какао', 'drink', 290, 24, 15, 10, 100, 365, 'пачка'),
  PR('Печенье', 'sweet', 440, 6.5, 14, 72, 300, 90, 'пачка', 'gluten'), PR('Вафли', 'sweet', 520, 4, 28, 62, 200, 90, 'пачка', 'gluten'),
  PR('Пряники', 'sweet', 350, 5, 4, 76, 400, 60, 'пачка', 'gluten'), PR('Шоколад', 'sweet', 540, 7, 30, 56, 90, 180, 'плитка', 'lactose'),
  PR('Карамель', 'sweet', 390, 0, 0, 97, 200, 365, 'пакет'), PR('Халва подсолнечная', 'sweet', 520, 11.6, 29.7, 54, 350, 120, 'упаковка'),
  PR('Арахис', 'nuts', 552, 26, 45, 10, 200, 180, 'пакет', 'nuts'), PR('Изюм', 'nuts', 264, 2.9, 0.6, 66, 200, 365, 'пакет'), PR('Курага', 'nuts', 241, 5.2, 0, 55, 200, 365, 'пакет'),
];
const EXT = [
  PR('Булгур', 'grain', 342, 12.3, 1.3, 75.9, 800, 999, 'пачка', 'gluten'), PR('Кускус', 'grain', 360, 12.8, 0.6, 72.4, 500, 999, 'пачка', 'gluten'),
  PR('Красная чечевица', 'legume', 318, 24, 1.5, 54, 500, 999, 'пачка'), PR('Картофельное пюре быстрого приготовления', 'grain', 340, 6, 1, 76, 250, 365, 'пачка'),
  PR('Лапша быстрого приготовления', 'grain', 440, 9, 18, 60, 75, 365, 'пачка', 'gluten'),
  PR('Лаваш', 'bread', 275, 9, 1.2, 56, 300, 5, 'упаковка', 'gluten'), PR('Хлебцы', 'bread', 310, 10, 2, 60, 200, 365, 'пачка', 'gluten'),
  PR('Казы', 'meat', 400, 20, 35, 0, 500, 14, 'кусок', 'meat'), PR('Шұжық', 'meat', 360, 18, 32, 0, 500, 14, 'кусок', 'meat'),
  PR('Бастурма', 'meat', 280, 40, 12, 2, 150, 60, 'упаковка', 'meat'), PR('Паштет в мягкой упаковке', 'meat', 300, 11, 28, 2, 250, 365, 'упаковка', 'meat'),
  PR('Курица в реторт-пакете', 'meat', 150, 20, 7, 0, 250, 365, 'пакет', 'meat'), PR('Рыбные консервы', 'meat', 280, 17, 24, 0, 240, 730, 'банка'),
  PR('Сыр чечил', 'cheese', 270, 22, 19, 2, 200, 60, 'упаковка', 'lactose'), PR('Курт', 'cheese', 300, 40, 12, 5, 200, 180, 'пакет', 'lactose'),
  PR('Иримшик', 'cheese', 330, 25, 25, 3, 200, 120, 'пакет', 'lactose'), PR('Плавленый сыр в пакетиках', 'cheese', 270, 15, 21, 6, 90, 30, 'упаковка', 'lactose'),
  PR('Мёд', 'sweet', 329, 0.8, 0, 81, 250, 365, 'банка'), PR('Арахисовая паста', 'nuts', 600, 25, 50, 15, 340, 180, 'банка', 'nuts protein'),
  PR('Шоколадная паста', 'sweet', 540, 6, 31, 57, 350, 180, 'банка', 'nuts'),
  PR('Миндаль', 'nuts', 579, 21, 50, 22, 150, 180, 'пакет', 'nuts'), PR('Кешью', 'nuts', 600, 18, 48, 30, 150, 180, 'пакет', 'nuts'),
  PR('Грецкий орех', 'nuts', 654, 15.2, 65.2, 7, 150, 180, 'пакет', 'nuts'), PR('Финики', 'nuts', 280, 2.5, 0.4, 70, 200, 365, 'пакет'), PR('Чернослив', 'nuts', 240, 2.3, 0.7, 57, 200, 365, 'пакет'),
  PR('Жент', 'sweet', 450, 9, 20, 58, 300, 120, 'пакет'), PR('Козинаки', 'sweet', 520, 10, 30, 52, 150, 180, 'упаковка', 'nuts'),
  PR('Батончик мюсли', 'sweet', 400, 6, 12, 68, 40, 180, 'шт', 'gluten'), PR('Гематоген', 'sweet', 360, 6, 3, 76, 50, 365, 'шт'),
  PR('Кисель', 'drink', 360, 0.5, 0, 88, 100, 365, 'пачка'), PR('Изотоник', 'drink', 380, 0, 0, 95, 50, 999, 'пакет'),
  PR('Масло оливковое', 'fat', 899, 0, 99.9, 0, 250, 365, 'бутылка'), PR('Соевый соус в стиках', 'spice', 60, 10, 0, 6, 100, 365, 'упаковка'),
];
const mk = (id, name, list) => ({ id, name, builtin: true, items: list.map((p, i) => ({ ...p, id: id + i, price: null, src: 'справочник', check: p.name === 'Жент', on: true, custom: false })) });
// Исключено по решению пользователя (2026-10-26): продукты и блюда, которые без них не готовятся. Нужно для миграции уже сохранённых встроенных наборов.
const REMOVED = { products: ['Пшено', 'Сало солёное'], dishes: ['Пшённая каша со сгущёнкой', 'Обед-перекус 2: сухари, сало, халва', 'Кулеш'] };
const builtinProductSets =() => [mk('sb', 'Базовый', BASE), mk('se', 'Расширенный', [...BASE, ...EXT])];

// ---- меню ----
// Условия: any, rest (днёвка), hot (жара), cold (холод), alt3000, first2 (первые 2 дня)
const I = (name, g, min, max) => ({ name, g, min: min ?? Math.round(g * 0.7), max: max ?? Math.round(g * 1.5) });
const T = '|';
const dish = (id, meal, name, cook, cond, ing) => ({ id, meal, name, cook, cond, on: true, ing: ing.map(([n, g]) => I(n, g)) });
const TEA = [['Чай', 2, 1, 4], ['Сахар', 10]];
const SUPPER_ADD = [['Суп в пакете', 20], ['Вермишель', 15], ['Сухари', 30], ['Печенье' + T + 'Карамель' + T + 'Вафли', 30], ['Чай', 2], ['Сахар', 15]];
const SUPPER_ADD_NOSOUP = SUPPER_ADD.filter(([n]) => n !== 'Суп в пакете' && n !== 'Вермишель');
const BUT = 'Масло сливочное' + T + 'Масло топлёное';

const BASE_DISHES = [
  dish('b1', 'b', 'Овсяная каша на молоке', 7, ['any'], [['Овсяные хлопья', 70], ['Молоко сухое', 20], ['Сахар', 25], ['Изюм', 15], [BUT, 10], ['Сухари', 30], ['Сыр твёрдый', 30], ['Чай', 2]]),
  dish('b2', 'b', 'Рисовая молочная каша', 25, ['any'], [['Рис', 70], ['Молоко сухое', 25], ['Сахар', 15], [BUT, 10], ['Сухари', 30], ['Сыр твёрдый', 30], ['Какао', 10]]),
  dish('b4', 'b', 'Гречка с тушёнкой', 20, ['any'], [['Гречка', 75], ['Тушёнка говяжья' + T + 'Тушёнка свиная', 60], ['Сухари', 30], ['Кофе растворимый', 2], ['Сахар', 10], ['Пряники', 30]]),
  dish('l1', 'l', 'Обед-перекус 1: галеты, сыр, колбаса', 0, ['any'], [['Галеты', 60], ['Сыр твёрдый', 40], ['Колбаса сырокопчёная', 40], ['Шоколад', 30], ['Арахис', 30], ['Изюм', 20], ['Чай', 2], ['Сахар', 15]]),
  dish('l3', 'l', 'Обед-перекус 3: хлеб, колбаса, сыр', 0, ['first2'], [['Хлеб', 90], ['Колбаса сырокопчёная', 50], ['Сыр твёрдый', 40], ['Вафли', 40], ['Арахис', 30], ['Чай', 2], ['Сахар', 15]]),
  dish('l4', 'l', 'Обед-перекус 4: галеты, сыр, пряники', 0, ['any'], [['Галеты', 60], ['Сыр твёрдый', 50], ['Пряники', 50], ['Шоколад', 25], ['Изюм', 25], ['Чай', 2], ['Сахар', 15]]),
  dish('lh', 'l', 'Горячий обед: суп с вермишелью', 10, ['rest', 'cold'], [['Суп в пакете', 25], ['Вермишель', 30], ['Сухари', 40], ['Сыр твёрдый', 30], ['Печенье', 30], ['Чай', 2], ['Сахар', 10]]),
  dish('d1', 'd', 'Макароны по-флотски', 12, ['any'], [['Макароны', 100], ['Тушёнка говяжья' + T + 'Тушёнка свиная', 70], ['Томатная паста', 15], ...SUPPER_ADD]),
  dish('d2', 'd', 'Гречка с тушёнкой (ужин)', 20, ['any'], [['Гречка', 90], ['Тушёнка говяжья' + T + 'Тушёнка свиная', 70], [BUT, 10], ...SUPPER_ADD]),
  dish('d3', 'd', 'Рис с тушёнкой в томате', 20, ['any'], [['Рис', 90], ['Тушёнка говяжья' + T + 'Тушёнка свиная', 70], ['Томатная паста', 15], ...SUPPER_ADD]),
];
const EXT_DISHES = [
  dish('b5', 'b', 'Овсянка с финиками и орехами', 7, ['any'], [['Овсяные хлопья', 70], ['Молоко сухое', 20], ['Финики', 25], ['Грецкий орех', 15], ['Мёд', 15], ['Сухари', 30], ['Чай', 2]]),
  dish('b6', 'b', 'Манная каша с какао', 8, ['any'], [['Манка', 60], ['Молоко сухое', 25], ['Какао', 8], ['Сахар', 15], [BUT, 10], ['Лаваш', 40], ['Сыр твёрдый', 30]]),
  dish('b7', 'b', 'Булгур с казы', 15, ['any'], [['Булгур', 70], ['Казы', 40], ['Сыр твёрдый', 30], ['Сухари', 30], ['Чай', 2], ['Сахар', 10]]),
  dish('b8', 'b', 'Бутерброды с паштетом', 5, ['any'], [['Хлебцы', 40], ['Паштет в мягкой упаковке', 50], ['Сыр твёрдый', 30], ['Овсяные хлопья', 50], ['Чай', 2], ['Сахар', 10]]),
  dish('l5', 'l', 'Обед-перекус 5: лаваш, казы, чечил', 0, ['any'], [['Лаваш', 70], ['Казы', 40], ['Сыр чечил', 40], ['Жент', 40], ['Курт', 15], ['Финики', 25], ['Чай', 2], ['Сахар', 15]]),
  dish('l6', 'l', 'Обед-перекус 6: хлебцы, паштет, батончик', 0, ['any'], [['Хлебцы', 50], ['Паштет в мягкой упаковке', 50], ['Плавленый сыр в пакетиках', 30], ['Батончик мюсли', 40], ['Миндаль', 30], ['Чай', 2], ['Сахар', 15]]),
  dish('l7', 'l', 'Обед-перекус 7: лаваш, паста, бастурма', 0, ['any'], [['Лаваш', 70], ['Арахисовая паста', 35], ['Мёд', 20], ['Бастурма', 30], ['Курага', 25], ['Козинаки', 30], ['Чай', 2], ['Сахар', 15]]),
  dish('lh2', 'l', 'Горячий обед: лапша с шұжық', 5, ['rest', 'cold'], [['Лапша быстрого приготовления', 70], ['Шұжық', 50], ['Сыр твёрдый', 30], ['Печенье', 30], ['Чай', 2], ['Сахар', 10]]),
  dish('d5', 'd', 'Плов из булгура с бастурмой', 15, ['any'], [['Булгур', 90], ['Бастурма', 40], [BUT, 10], ...SUPPER_ADD]),
  dish('d6', 'd', 'Кускус с курицей', 7, ['any'], [['Кускус', 90], ['Курица в реторт-пакете', 80], ['Масло оливковое', 10], ...SUPPER_ADD]),
  dish('d7', 'd', 'Чечевичная похлёбка с лавашом', 15, ['any'], [['Красная чечевица', 70], ['Рис', 30], ['Шұжық', 40], ['Лаваш', 40], ...SUPPER_ADD_NOSOUP]),
  dish('d8', 'd', 'Пюре с казы', 5, ['any'], [['Картофельное пюре быстрого приготовления', 75], ['Казы', 60], ['Сыр твёрдый', 20], ...SUPPER_ADD]),
  dish('d9', 'd', 'Паста с сыром и паштетом', 12, ['any'], [['Макароны', 100], ['Паштет в мягкой упаковке', 50], ['Сыр твёрдый', 30], ...SUPPER_ADD]),
];
// Манка нужна блюду «Манная каша с какао»: добавляем в расширенный набор продуктов
EXT.push(PR('Манка', 'grain', 328, 10.3, 1, 70.6, 700, 999, 'пачка', 'gluten'));

const builtinMenuSets = () => [
  { id: 'mb', name: 'Базовое', builtin: true, productSetId: 'sb', dishes: BASE_DISHES.map(d => JSON.parse(JSON.stringify(d))) },
  { id: 'me', name: 'Расширенное', builtin: true, productSetId: 'se', dishes: [...BASE_DISHES, ...EXT_DISHES].map(d => JSON.parse(JSON.stringify(d))) },
];

return {REMOVED, builtinProductSets, builtinMenuSets};
})();
__m['pstore.js'] = (() => {
// Наборы продуктов. Продукты похода — это включённые продукты выбранного набора (trip.productSet).
const store = __m['store.js'];
const {makeRepo} = __m['setrepo.js'];
const {builtinProductSets, REMOVED} = __m['builtin.js'];

const repo = makeRepo('products', builtinProductSets, s => { if (!s.builtin) return false; const n = s.items.length; s.items = s.items.filter(p => !REMOVED.products.includes(p.name)); return s.items.length !== n; });
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
async function loadProducts() { await cleanV2(); return repo.load(); }
function setActive(id) { activeId = repo.get(id) ? id : repo.first()?.id; return activeId; }
const activeSet = () => repo.get(activeId) || repo.first();
const products = () => activeSet()?.items || [];
const byId = id => products().find(p => p.id === id);
const byName = n => products().find(p => p.name.toLowerCase() === String(n).trim().toLowerCase());
const enabled = () => products().filter(p => p.on);
const saveSet = s => repo.save(s);

return {repo, loadProducts, setActive, activeSet, products, byId, byName, enabled, saveSet};
})();
__m['mstore.js'] = (() => {
// Наборы меню (блюда с продуктами на человека). Набор привязан к набору продуктов (productSetId).
const {makeRepo} = __m['setrepo.js'];
const {builtinMenuSets, REMOVED} = __m['builtin.js'];

const repo = makeRepo('menus', builtinMenuSets, s => { if (!s.builtin) return false; const n = s.dishes.length; s.dishes = s.dishes.filter(d => !REMOVED.dishes.includes(d.name)); return s.dishes.length !== n; });
const MEAL_NAMES = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const COND = [['any', 'любой день'], ['rest', 'днёвка'], ['hot', 'жара'], ['cold', 'холод'], ['alt3000', 'высота > 3000'], ['first2', 'первые 2 дня']];
const loadMenus = () => repo.load();
const menuSet = id => repo.get(id) || repo.first();

return {repo, MEAL_NAMES, COND, loadMenus, menuSet};
})();
__m['engine.js'] = (() => {
// Движок расчёта: только чистые функции. Все коэффициенты приходят в объекте P (из defaults.js + правки пользователя).

const isRest = d => d.type === 'Днёвка' || d.type === 'Запасной';
const mean = (a, b) => (a != null && b != null ? (a + b) / 2 : (a ?? b ?? null));
// Средняя температура суток: днём и ночью по среднему мин/макс; запасной вариант — старые поля tday/tnight
const tavgOf = d => { const td = mean(d.tdmin, d.tdmax) ?? d.tday ?? null, tn = mean(d.tnmin, d.tnmax) ?? d.tnight ?? null; return td != null && tn != null ? (td + tn) / 2 : (td ?? tn); };
const tmaxOf = d => d.tdmax ?? d.tday ?? null;
const tempText = d => { const f = (a, b) => (a != null && b != null && a !== b ? `${Math.round(a)}…${Math.round(b)}` : (b ?? a) != null ? `${Math.round(b ?? a)}` : '—'); return `${f(d.tdmin, d.tdmax ?? d.tday)}/${f(d.tnmin, d.tnmax ?? d.tnight)}°`; };
const bmr = p => 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'F' ? -161 : 5);

function eta(cover, snowCm, P) {
  if (cover === 'snow') return P.eta_snow_a + P.eta_snow_b * (snowCm || 0);
  return { asphalt: P.eta_asphalt, dirt: P.eta_dirt, trail: P.eta_trail, bush: P.eta_bush, swamp: P.eta_swamp, sand: P.eta_sand }[cover] ?? P.eta_trail;
}

// Пандольф: W вес тела кг, L рюкзак кг, v м/с, G уклон % (≥0 для формулы), et — η. Возвращает ватты.
function pandolf(W, L, v, G, et) {
  return 1.5 * W + 2 * (W + L) * (L / W) ** 2 + et * (W + L) * (1.5 * v * v + 0.35 * v * G);
}

// η дня: если задано несколько участков покрытия с км — средневзвешенно по км
function etaDay(day, P) {
  const seg = (day.covers || []).filter(s => s.cover && s.km > 0);
  if (!seg.length) return eta(day.cover, day.snow, P);
  const tot = seg.reduce((s, x) => s + x.km, 0);
  return seg.reduce((s, x) => s + eta(x.cover, x.snow, P) * x.km, 0) / tot;
}
const descentK = (g, P) => { const a = Math.abs(g); return a <= P.descent_th_low ? P.descent_k_low : a <= P.descent_th_high ? P.descent_k_mid : P.descent_k_high; };
const clip = (g, P) => Math.max(-P.slope_clip, Math.min(P.slope_clip, g));

// Ходьба за день по сводным данным дня: условно делим путь на подъём и спуск с одинаковой скоростью
function walkKcal(day, W, L, P) {
  const hours = day.hours || 0, D = (day.km || 0) * 1000;
  if (!hours || !D) return { kcal: 0, parts: [] };
  const v = D / (hours * 3600), up = day.up || 0, down = day.down || 0, et = etaDay(day, P);
  const sum = up + down, Du = sum ? D * up / sum : D / 2, Dd = D - Du;
  const parts = []; let kcal = 0;
  const add = (name, dist, g, mult) => {
    if (dist <= 0) return;
    const gc = clip(g, P), h = hours * dist / D;
    const w = (mult ? pandolf(W, L, v, 0, et) * mult : pandolf(W, L, v, gc, et));
    const k = w * h * P.kcal_per_wh * P.pandolf_corr;
    kcal += k; parts.push({ name, watts: w, hours: h, kcal: k, slope: gc });
  };
  add('Подъём', Du, Du ? up / Du * 100 : 0);
  add('Спуск', Dd, Dd ? -down / Dd * 100 : 0, descentK(Dd ? down / Dd * 100 : 0, P));
  return { kcal, parts, v };
}

const tavg = tavgOf;

// Потребность участника на день с разбивкой по шагам
function personNeed(person, day, L, P) {
  const B = bmr(person), rest = isRest(day), hours = rest ? 0 : (day.hours || 0);
  const w = rest ? { kcal: 0, parts: [] } : walkKcal(day, person.weight, L, P);
  const camp = rest ? B * P.rest_k : Math.max(0, 24 - hours) * B / 24 * P.camp_k;
  const t = tavg(day), cold = t != null ? P.cold_k * Math.max(0, P.cold_t0 - t) : 0;
  const base = w.kcal + camp + cold;
  const altK = day.maxAlt > P.alt_start ? 1 + P.alt_pct / 100 * (day.maxAlt - P.alt_start) / 1000 : 1;
  const personal = person.appetite || 1, general = 1 + P.general_pct / 100;
  const total = base * altK * personal * general;
  return { bmr: B, walk: w.kcal, parts: w.parts, camp, cold, t, base, altK, personal, general, total, rest };
}

const coverage = (mode, custom, P) => ({ hungry: P.cov_hungry, std: P.cov_std, full: P.cov_full, custom: custom ?? P.cov_custom })[mode] ?? P.cov_std;

// Множитель аппетита по дням: в первые app_days дней на новой высоте
function appetiteFactors(days, P) {
  const band = d => (d.maxAlt >= 5000 ? 3 : d.maxAlt >= 4000 ? 2 : d.maxAlt >= 3000 ? 1 : 0);
  const mult = [1, P.app_alt1, P.app_alt2, P.app_alt3];
  let top = 0, entry = -99, ebands = 0;
  return days.map((d, i) => {
    const b = band(d);
    if (b > top) { top = b; entry = i; ebands = b; }
    return (i - entry < P.app_days && ebands > 0) ? mult[ebands] : 1;
  });
}

function macros(kcal, alt, P) {
  const f = alt > P.macro_alt ? P.macro_f_high : P.macro_f_low, c = alt > P.macro_alt ? P.macro_c_high : P.macro_c_low;
  const p = kcal / (4 + 9 * f + 4 * c);
  return { p, f: p * f, c: p * c };
}

function fuelPerPerson(day, P) {
  const k = day.wind ? 1 + P.fuel_wind_pct / 100 : 1;
  if (isRest(day) && !day.melt) return P.fuel_nosnow * k;
  if (day.maxAlt > P.fuel_cold_alt || (tavg(day) ?? 99) < -10) return P.fuel_cold * k;
  return (day.melt || day.cover === 'snow' || day.precip === 'snow' ? P.fuel_snow : P.fuel_nosnow) * k;
}

const waterLiters = (person, day, P) => person.weight * P.water_ml / 1000 + ((tmaxOf(day) ?? -99) > P.hot_t ? P.hot_l : 0);

// Полный расчёт похода. Возвращает {days, summary, warnings}
function computeTrip(trip, P) {
  const g = trip.group.filter(p => p.weight && p.height && p.age), n = g.length, days = trip.days;
  const warnings = [];
  if (!n) return { days: [], summary: null, warnings: ['Добавьте участников с возрастом, ростом и весом.'] };
  if (!days.length) return { days: [], summary: null, warnings: ['Добавьте дни похода.'] };
  const cov = coverage(trip.prefs.mode, trip.prefs.custom, P) / 100;
  const goal = trip.prefs.kcalGoal > 0 ? trip.prefs.kcalGoal : null, restK = (trip.prefs.restPct ?? 80) / 100; // цель по калориям задана вручную (ккал/чел/день)
  const apf = appetiteFactors(days, P), shareSum = g.reduce((s, p) => s + (p.share || 1), 0);
  const out = days.map((d, i) => {
    const left = days.length - i + P.reserve_days;
    const foodKg = n * (P.ref_std * cov / 0.67) * left / 1000; // грубая оценка веса еды в рюкзаках до расчёта меню
    const per = g.map(p => {
      const share = (p.share || 1) / shareSum, L = (p.gear || 0) + (trip.gear.common || 0) * share + foodKg * share;
      const nd = personNeed(p, d, L, P), target = goal ? goal * (p.appetite || 1) * (isRest(d) ? restK : 1) : nd.total * cov * apf[i];
      return { p, L, ...nd, target, grams: target / P.kcal100 * 100 };
    });
    const need = per.reduce((s, x) => s + x.total, 0), target = per.reduce((s, x) => s + x.target, 0);
    const tgtGrams = target / P.kcal100 * 100;
    return { i, d, per, need, target, grams: tgtGrams, cover: need ? target / need : 0, appetite: apf[i], fuel: fuelPerPerson(d, P) * n, water: per.reduce((s, x) => s + waterLiters(x.p, d, P), 0), mac: macros(target / n, d.maxAlt || 0, P) };
  });
  const tot = out.reduce((s, x) => s + x.target, 0), totNeed = out.reduce((s, x) => s + x.need, 0), gramsAll = out.reduce((s, x) => s + x.grams, 0);
  out.forEach(x => { if (goal && !(isRest(x.d) || (x.d.km && x.d.hours))) return; /* цель задана, данных о нагрузке нет — покрытие не оцениваем */ if (x.cover * 100 < P.cov_warn - 0.01) warnings.push(`День ${x.i + 1}: покрытие ${Math.round(x.cover * 100)}% ниже порога ${P.cov_warn}%`); });
  g.forEach(p => {
    const lim = p.sex === 'F' ? trip.gear.maxF : trip.gear.maxM;
    const x = out[0].per.find(q => q.p === p);
    if (lim && x.L > lim) warnings.push(`${p.name || 'Участник'}: рюкзак в начале ≈ ${x.L.toFixed(1)} кг при лимите ${lim} кг. Рассмотрите заброску или меньшую граммовку.`);
  });
  const reserveKcal = P.reserve_days * (out.reduce((s, x) => s + x.target, 0) / days.length);
  return {
    days: out, warnings,
    summary: { days: days.length, kcal: tot, need: totNeed, grams: gramsAll, gramsPerPersonDay: gramsAll / n / days.length, kcalPerPersonDay: tot / n / days.length, cover: totNeed ? tot / totNeed : 0, fuel: out.reduce((s, x) => s + x.fuel, 0), water: out.reduce((s, x) => s + x.water, 0), reserveKcal, n },
  };
}

return {isRest, tavgOf, tmaxOf, tempText, bmr, eta, pandolf, etaDay, descentK, walkKcal, personNeed, coverage, appetiteFactors, macros, fuelPerPerson, waterLiters, computeTrip};
})();
__m['gpx.js'] = (() => {
// Чистые функции для трека: разбор GPX, сглаживание, набор/сброс, время, разбивка на дни, запросы Open-Meteo.
// Точка трека: [lat, lon, ele|null, (не используется), номер сегмента]. Время и даты из GPX не берём. Все коэффициенты приходят в P (из параметров).

function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Файл не похож на GPX');
  const pts = []; let seg = 0;
  doc.querySelectorAll('trk').forEach(trk => trk.querySelectorAll('trkseg').forEach(s => {
    s.querySelectorAll('trkpt').forEach(p => {
      const e = p.querySelector('ele');
      pts.push([+p.getAttribute('lat'), +p.getAttribute('lon'), e && isFinite(+e.textContent) ? +e.textContent : null, null, seg]);
    });
    seg++;
  }));
  const wpts = [...doc.querySelectorAll('wpt')].map(w => ({ name: w.querySelector('name')?.textContent || 'Точка', lat: +w.getAttribute('lat'), lon: +w.getAttribute('lon') }));
  return { pts, wpts };
}

function dist(a, b) { // метры
  const R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function downsample(pts, minM = 25) {
  const out = [pts[0]];
  for (const p of pts) if (p[4] !== out.at(-1)[4] || dist(out.at(-1), p) >= minM) out.push(p);
  return out;
}

// Достраивает пропуски высот линейно между известными
function fillEle(pts) {
  const known = pts.map((p, i) => (p[2] == null ? -1 : i)).filter(i => i >= 0);
  if (!known.length) return pts.map(() => 0);
  return pts.map((p, i) => {
    if (p[2] != null) return p[2];
    const a = [...known].reverse().find(k => k < i), b = known.find(k => k > i);
    if (a == null) return pts[b][2];
    if (b == null) return pts[a][2];
    return pts[a][2] + (pts[b][2] - pts[a][2]) * (i - a) / (b - a);
  });
}

function smooth(e, win = 5) {
  const h = win >> 1;
  return e.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - h); j <= Math.min(e.length - 1, i + h); j++) { s += e[j]; n++; } return s / n; });
}

// Набор и сброс с гистерезисом: изменения меньше порога thr не считаются
function gainLoss(e, thr) {
  let up = 0, down = 0, ref = e[0];
  for (const v of e) {
    if (v - ref >= thr) { up += v - ref; ref = v; } else if (ref - v >= thr) { down += ref - v; ref = v; }
  }
  return { up, down };
}

// Подготовка трека: накопленное расстояние (км) и сглаженные высоты
function prep(track, P) {
  const pts = track.pts, ele = smooth(fillEle(pts));
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + (pts[i][4] === pts[i - 1][4] ? dist(pts[i - 1], pts[i]) / 1000 : 0));
  return { pts, ele, d, total: d.at(-1), P };
}

// Скорость км/ч по Тоблеру: на ровном = базовой, на подъёме/спуске падает
function speed(slope, P) {
  const s = Math.max(-P.slope_clip, Math.min(P.slope_clip, slope * 100)) / 100;
  return P.tobler_base * Math.exp(-3.5 * (Math.abs(s + 0.05) - 0.05));
}

function modelHours(T, i0, i1) {
  let h = 0;
  for (let i = i0 + 1; i <= i1; i++) {
    const dk = T.d[i] - T.d[i - 1]; if (dk <= 0) continue;
    h += dk / speed((T.ele[i] - T.ele[i - 1]) / (dk * 1000), T.P);
  }
  return h;
}

const idxAtKm = (T, km) => { const i = T.d.findIndex(v => v >= km); return i < 0 ? T.pts.length - 1 : i; };

function dayStats(T, i0, i1) {
  const e = T.ele.slice(i0, i1 + 1), { up, down } = gainLoss(e, T.P.smooth_thr);
  return {
    km: T.d[i1] - T.d[i0], up, down, maxAlt: Math.max(...e), minAlt: Math.min(...e),
    hours: modelHours(T, i0, i1), endAlt: T.ele[i1],
  };
}

const totalStats = T => ({ ...dayStats(T, 0, T.pts.length - 1), hours: undefined });

// Границы дней: массив [i0,i1] по километрам-ночёвкам cuts
function ranges(T, cuts) {
  const idx = [0, ...[...cuts].filter(k => k > 0 && k < T.total).sort((a, b) => a - b).map(k => idxAtKm(T, k)), T.pts.length - 1];
  const r = []; for (let i = 0; i < idx.length - 1; i++) if (idx[i + 1] > idx[i]) r.push([idx[i], idx[i + 1]]);
  return r;
}

function splitSegs(T) {
  const c = []; T.pts.forEach((p, i) => { if (i && p[4] !== T.pts[i - 1][4]) c.push(T.d[i]); });
  return c;
}
// Разбивка поровну по нагрузке: эквивалент = км + набор/split_up + сброс/split_down
function splitLoad(T, n) {
  if (n < 2) return [];
  const cum = [0];
  for (let i = 1; i < T.pts.length; i++) {
    const de = T.ele[i] - T.ele[i - 1], dk = T.d[i] - T.d[i - 1];
    cum.push(cum[i - 1] + dk + Math.max(0, de) / T.P.split_up + Math.max(0, -de) / T.P.split_down);
  }
  const total = cum.at(-1), cuts = [];
  for (let k = 1; k < n; k++) { const i = cum.findIndex(v => v >= total * k / n); if (i > 0) cuts.push(T.d[i]); }
  return cuts;
}
const hasEle = pts => pts.some(p => p[2] != null);

return {parseGpx, dist, downsample, fillEle, smooth, gainLoss, prep, speed, modelHours, idxAtKm, dayStats, totalStats, ranges, splitSegs, splitLoad, hasEle};
})();
__m['tripdays.js'] = (() => {
// Экран «Поход»: трек (только координаты и высоты), окна «Параметры похода», «Условия», «День N», таблица дней.
const {COVERS, DAY_TYPES, PARAMS} = __m['defaults.js'];
const {allParams} = __m['params.js'];
const {isRest, tempText} = __m['engine.js'];
const G = __m['gpx.js'];
const {form, bindForm, esc, modal} = __m['ui.js'];

const P = () => allParams();
const r1 = x => Math.round(x * 10) / 10;
const KEYS = ['km', 'up', 'down', 'hours'];
const msg = { text: '', opened: false };
const COND0 = { tdmin: null, tdmax: null, tnmin: null, tnmax: null, precip: '', melt: false, cover: 'trail', wind: false };

function ensurePlan(trip) {
  trip.plan ||= { start: '', n: null, rests: [] };
  trip.cond ||= { ...COND0 };
}
const iso = (start, i) => { if (!start) return ''; const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); };
const fmtDate = s => (s ? s.split('-').reverse().join('.') : '');

const blankDay = (cond, kind = 'Ходовой') => ({ type: kind, rest: isRest({ type: kind }), man: {}, covers: [], note: '', cover: cond.cover, tdmin: cond.tdmin, tdmax: cond.tdmax, tnmin: cond.tnmin, tnmax: cond.tnmax, precip: cond.precip, melt: cond.melt, wind: cond.wind });

// Пересобирает список дней из трека/плана, сохраняя ручные правки по дням
function rebuild(trip) {
  ensurePlan(trip);
  const tr = trip.track, pl = trip.plan, cond = trip.cond;
  let autos = null;
  if (tr) {
    const T = G.prep(tr, P()), rs = G.ranges(T, tr.cuts), withEle = G.hasEle(tr.pts);
    autos = rs.map(([a, b]) => { const s = G.dayStats(T, a, b); return { km: r1(s.km), up: withEle ? Math.round(s.up) : null, down: withEle ? Math.round(s.down) : null, hours: r1(s.hours), maxAlt: withEle ? Math.round(s.maxAlt) : null, endAlt: withEle ? Math.round(s.endAlt) : null }; });
    pl.n = autos.length;
  }
  const n = pl.n || 0, oldW = trip.days.filter(d => !d.rest), oldR = trip.days.filter(d => d.rest);
  const out = [];
  for (let j = 0; j < n; j++) {
    const d = oldW[j] || blankDay(cond);
    d.auto = autos ? autos[j] : null; d.rest = false;
    if (isRest(d)) d.type = 'Ходовой';
    for (const k of KEYS) d[k] = d.man?.[k] ?? d.auto?.[k] ?? null;
    d.nightAlt = d.man?.nightAlt ?? d.auto?.endAlt ?? null;
    const alts = [d.man?.maxAlt ?? d.auto?.maxAlt, d.nightAlt].filter(v => v != null);
    d.maxAlt = alts.length ? Math.max(...alts) : null;
    out.push(d);
    (pl.rests || []).forEach((r, ri) => { if (+r.after === j + 1) { const o = oldR.find(x => x.rkey === ri) || blankDay(cond, r.kind); o.rkey = ri; o.rest = true; o.type = r.kind; o.maxAlt = o.man?.maxAlt ?? d.maxAlt; o.nightAlt = o.maxAlt; out.push(o); } });
  }
  out.forEach((d, i) => { d.date = d.dateMan || iso(pl.start, i); });
  trip.days = out;
  trip.start = pl.start; trip.end = out.length ? out.at(-1).date : '';
}

function missing(trip) {
  const m = [];
  if (!trip.days.length) return ['нет дней: задайте количество дней в «Параметрах похода» или загрузите трек'];
  if (trip.prefs?.kcalGoal > 0) return m; // задана цель по калориям: данные по дням (дата, км, набор, сброс, часы, температуры) необязательны
  if (!trip.plan?.start) m.push('дата начала');
  trip.days.forEach((d, i) => {
    const w = [];
    if (!d.type) w.push('тип');
    if (!d.rest) { for (const [k, n] of [['km', 'км'], ['up', 'набор'], ['down', 'сброс'], ['hours', 'часы']]) if (d[k] == null) w.push(n); }
    if (d.tdmax == null && d.tday == null) w.push('температура днём');
    if (d.tnmin == null && d.tnight == null) w.push('температура ночью');
    if (w.length) m.push(`день ${i + 1}: ${w.join(', ')}`);
  });
  return m;
}
const bad = (d, k) => (k === 'td' ? d.tdmax == null && d.tday == null : k === 'tn' ? d.tnmin == null && d.tnight == null : d[k] == null && !d.rest ? true : false);

// ---------- окна ----------
function openParams(trip, save, ctx) {
  ensurePlan(trip);
  const pl = trip.plan, tr = trip.track;
  const close = modal(() => ({
    title: 'Параметры похода',
    html: `<div class="fld"><label>Дата начала</label><div class="ctl"><input type="date" id="pstart" value="${esc(pl.start)}"></div></div>
      <div class="fld"><label>Ходовых дней *</label><div class="ctl"><input type="number" id="pn" min="1" max="60" value="${(tr ? (pl.want ?? pl.n) : pl.n) ?? ''}"></div></div>
      ${tr ? '<p class="muted small">Для трека: укажите число дней и нажмите «Разбить трек на дни».</p>' : ''}
      <h3>Днёвки и запасные дни</h3>
      ${(pl.rests || []).map((r, i) => `<div class="segrow">после дня <input type="number" min="1" data-ra="${i}" value="${r.after}" style="width:60px"> <select data-rk="${i}"><option${r.kind === 'Днёвка' ? ' selected' : ''}>Днёвка</option><option${r.kind === 'Запасной' ? ' selected' : ''}>Запасной</option></select> <button class="mini" data-rd="${i}">Убрать</button></div>`).join('') || '<p class="muted small">Нет</p>'}
      <button class="mini" id="addr">+ Добавить</button>
      ${tr ? `<p class="muted small" style="margin-top:12px">Разбивка поровну по нагрузке: км + набор/${P().split_up} + сброс/${P().split_down} (коэффициенты в Настройках → Параметры расчёта → Ходьба).</p><button class="btn" id="split" ${(pl.want ?? pl.n) ? '' : 'disabled'}>Разбить трек на дни</button>` : ''}
      <div class="btnrow"><button class="btn ghost" id="ok">Закрыть</button></div>`,
    bind(root, refresh, cl) {
      const apply = () => { rebuild(trip); save(); ctx.rerender(); };
      root.querySelector('#pstart').onchange = e => { pl.start = e.target.value; apply(); };
      root.querySelector('#pn').onchange = e => { const v = Math.max(1, Math.min(60, +e.target.value || 1)); if (tr) { pl.want = v; refresh(); } else { pl.n = v; apply(); } };
      root.querySelectorAll('[data-ra]').forEach(i => i.onchange = () => { pl.rests[+i.dataset.ra].after = +i.value; apply(); });
      root.querySelectorAll('[data-rk]').forEach(i => i.onchange = () => { pl.rests[+i.dataset.rk].kind = i.value; apply(); });
      root.querySelectorAll('[data-rd]').forEach(b => b.onclick = () => { pl.rests.splice(+b.dataset.rd, 1); trip.days = trip.days.filter(d => !d.rest); apply(); refresh(); });
      root.querySelector('#addr').onclick = () => { pl.rests.push({ after: 1, kind: 'Днёвка' }); apply(); refresh(); };
      root.querySelector('#ok').onclick = cl;
      root.querySelector('#split')?.addEventListener('click', () => { const T = G.prep(tr, P()); tr.cuts = G.splitLoad(T, pl.want ?? pl.n); delete pl.want; apply(); cl(); });
    },
  }));
}

function openCond(trip, save, ctx) {
  ensurePlan(trip);
  const c = trip.cond, F = [
    { k: 'tdmin', label: 'Днём, °C: минимум', type: 'number' }, { k: 'tdmax', label: 'Днём, °C: максимум', type: 'number' },
    { k: 'tnmin', label: 'Ночью, °C: минимум', type: 'number' }, { k: 'tnmax', label: 'Ночью, °C: максимум', type: 'number' },
    { k: 'precip', label: 'Осадки', type: 'select', opts: [['', 'Нет'], ['rain', 'Дождь'], ['snow', 'Снег']] },
    { k: 'melt', label: 'Топка снега для воды', type: 'check' },
    { k: 'cover', label: 'Покрытие по умолчанию', type: 'select', opts: COVERS },
    { k: 'wind', label: 'Сильный ветер', type: 'check', help: 'Сильный ветер увеличивает расход газа (прибавка в Настройках → Топливо и вода).' },
  ];
  modal(() => ({
    title: 'Условия на весь поход',
    html: `${form(F, c)}<div class="btnrow"><button class="btn" id="all">Применить ко всем дням</button><button class="btn ghost" id="ok">Закрыть</button></div><p class="muted small" id="note"></p>`,
    bind(root, refresh, cl) {
      bindForm(root, F, c, () => save(), refresh);
      root.querySelector('#all').onclick = () => { trip.days.forEach(d => { ['tdmin', 'tdmax', 'tnmin', 'tnmax', 'precip', 'melt', 'wind'].forEach(k => { d[k] = c[k]; }); d.cover = c.cover; if (d.covers?.length) d.covers = []; delete d.tday; delete d.tnight; }); save(); ctx.rerender(); root.querySelector('#note').textContent = `Применено к ${trip.days.length} дн.`; };
      root.querySelector('#ok').onclick = cl;
    },
  }));
}

function openDay(trip, i, save, ctx) {
  const src = trip.days[i], d = JSON.parse(JSON.stringify(src)); d.man ||= {}; d.covers ||= [];
  const F = [
    { k: 'dateMan', label: 'Дата', type: 'date' }, { k: 'type', label: 'Тип дня', type: 'select', opts: DAY_TYPES.map(x => [x, x]) },
    { k: 'tdmin', label: 'Днём, °C: мин', type: 'number' }, { k: 'tdmax', label: 'Днём, °C: макс', type: 'number' },
    { k: 'tnmin', label: 'Ночью, °C: мин', type: 'number' }, { k: 'tnmax', label: 'Ночью, °C: макс', type: 'number' },
    { k: 'precip', label: 'Осадки', type: 'select', opts: [['', 'Нет'], ['rain', 'Дождь'], ['snow', 'Снег']] }, { k: 'melt', label: 'Топка снега для воды', type: 'check' }, { k: 'wind', label: 'Сильный ветер', type: 'check' },
  ];
  d.dateMan = d.dateMan || d.date || '';
  modal(() => {
    const a = d.auto || {};
    const man = (k, lab, unit) => `<div class="fld"><label>${lab}</label><div class="ctl"><input type="number" step="any" data-m="${k}" value="${d.man[k] ?? ''}" placeholder="${a[k] ?? ''}"><span class="muted unit">${unit}</span></div></div>`;
    return {
      title: `День ${i + 1}`,
      html: `${form(F, d)}
        <h3>Покрытие</h3>${d.covers.map((s, j) => `<div class="segrow"><select data-cs="${j}:cover">${COVERS.map(([k, n]) => `<option value="${k}"${s.cover === k ? ' selected' : ''}>${n}</option>`).join('')}</select><input type="number" step="any" data-cs="${j}:km" value="${s.km ?? ''}" placeholder="км"> км${s.cover === 'snow' ? `<input type="number" data-cs="${j}:snow" value="${s.snow ?? ''}" placeholder="см"> см` : ''}<button class="mini" data-cd="${j}">×</button></div>`).join('') || `<p class="muted small">Весь день: ${esc((COVERS.find(c => c[0] === d.cover) || [])[1] || '—')}. Можно добавить участки с км.</p>`}
        <button class="mini" id="addc">+ Участок покрытия</button>
        <h3>Высота и ручная поправка</h3>
        <div class="fld"><label>Высота ночёвки${a.endAlt != null ? ' (из трека)' : ''}</label><div class="ctl"><input type="number" data-m="nightAlt" value="${d.man.nightAlt ?? ''}" placeholder="${a.endAlt ?? ''}"><span class="muted unit">м</span></div></div>
        ${man('km', 'Километры', 'км')}${man('up', 'Набор', 'м')}${man('down', 'Сброс', 'м')}${man('hours', 'Ходовые часы', 'ч')}
        <p class="muted small">Пусто — берётся значение из трека (серое в поле).</p>
        <div class="fld"><label>Заметка</label><div class="ctl"><input data-note value="${esc(d.note || '')}" style="width:220px;text-align:left"></div></div>
        <div class="btnrow"><button class="btn" id="save">Сохранить</button><button class="btn ghost" id="cancel">Отмена</button></div>`,
      bind(root, refresh, cl) {
        bindForm(root, F, d, () => {}, refresh);
        root.querySelectorAll('[data-m]').forEach(el => el.onchange = () => { d.man[el.dataset.m] = el.value === '' ? undefined : +el.value; if (d.man[el.dataset.m] === undefined) delete d.man[el.dataset.m]; });
        root.querySelectorAll('[data-cs]').forEach(el => el.onchange = () => { const [j, k] = el.dataset.cs.split(':'); d.covers[+j][k] = k === 'cover' ? el.value : (el.value === '' ? null : +el.value); if (k === 'cover') refresh(); });
        root.querySelectorAll('[data-cd]').forEach(b => b.onclick = () => { d.covers.splice(+b.dataset.cd, 1); refresh(); });
        root.querySelector('#addc').onclick = () => { d.covers.push({ cover: 'trail', km: null, snow: null }); refresh(); };
        root.querySelector('[data-note]').onchange = e => { d.note = e.target.value; };
        root.querySelector('#cancel').onclick = cl;
        root.querySelector('#save').onclick = () => {
          d.dateMan = d.dateMan === iso(trip.plan.start, i) ? '' : d.dateMan; delete d.tday; delete d.tnight;
          trip.days[i] = d; rebuild(trip); save(); cl(); ctx.rerender();
        };
      },
    };
  });
}

// ---------- секция экрана ----------
function daysSection(trip, save, ctx) {
  ensurePlan(trip);
  const tr = trip.track, miss = missing(trip);
  const goalSet = trip.prefs?.kcalGoal > 0, rq = c => (!goalSet && c ? 'req' : ''); // подсветка «обязательно» только если цели по калориям нет
  let prof = '';
  if (tr) {
    const T = G.prep(tr, P()), tot = G.totalStats(T), noEle = !G.hasEle(tr.pts);
    const W = 800, H = 150, ymin = Math.min(...T.ele), ymax = Math.max(...T.ele), yr = Math.max(1, ymax - ymin);
    const X = km => (km / T.total) * W, Y = e => H - 10 - ((e - ymin) / yr) * (H - 30), step = Math.max(1, Math.floor(T.pts.length / 500));
    const line = T.pts.map((_, i) => i).filter(i => i % step === 0).map(i => `${X(T.d[i]).toFixed(1)},${noEle ? H - 10 : Y(T.ele[i]).toFixed(1)}`).join(' ');
    const mk = tr.cuts.map((k, i) => `<g class="mk" data-i="${i}"><line x1="${X(k)}" x2="${X(k)}" y1="0" y2="${H}"/><circle cx="${X(k)}" cy="12" r="11"/></g>`).join('');
    prof = `<p><b>${r1(T.total)} км</b>${noEle ? '' : ` · +${Math.round(tot.up)} / −${Math.round(tot.down)} м · ${Math.round(tot.minAlt)}–${Math.round(tot.maxAlt)} м`} <span class="muted">· ${esc((tr.files || []).join(', '))}</span></p>
      ${noEle ? '<p class="warnmsg">В треке нет высот: набор и сброс задайте вручную по дням.</p>' : ''}
      <svg id="prof" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Профиль высот"><polygon class="area" points="0,${H} ${line} ${W},${H}"/><polyline class="ln" points="${line}"/>${mk}</svg>
      <div class="fld"><label>Километры ночёвок (можно тянуть маркеры на профиле)</label><div class="ctl"><input id="kms" style="width:240px" value="${tr.cuts.map(r1).join(', ')}"></div></div>`;
  }
  const hdr = '<tr><th>№</th><th>Дата</th><th>Тип</th><th>км</th><th>Набор</th><th>Сброс</th><th>Часы</th><th>Темп. днём/ночью</th><th>Осадки</th><th>Ночёвка, м</th><th></th></tr>';
  const rows = trip.days.map((d, i) => `<tr data-d="${i}"><td>${i + 1}</td><td class="${rq(!d.date)}">${fmtDate(d.date) || '—'}</td><td class="${rq(!d.type)}">${esc(d.type)}</td>${['km', 'up', 'down', 'hours'].map(k => d.rest ? '<td class="rest">—</td>' : `<td class="${rq(d[k] == null)}">${d[k] ?? ''}</td>`).join('')}<td class="${rq(bad(d, 'td') || bad(d, 'tn'))}">${bad(d, 'td') && bad(d, 'tn') ? '' : tempText(d)}</td><td>${{ rain: 'дождь', snow: 'снег' }[d.precip] || 'нет'}</td><td>${d.nightAlt ?? ''}</td><td><button class="mini" data-e="${i}">Изменить</button></td></tr>`).join('');
  return {
    html: `<div class="btnrow"><label class="btn filebtn2">${tr ? 'Заменить GPX-трек' : 'Загрузить GPX-трек'}<input type="file" id="file" accept=".gpx,application/gpx+xml" multiple hidden></label>
      <button class="btn ghost" id="bparams">Параметры похода</button><button class="btn ghost" id="bcond">Условия</button>${tr ? '<button class="btn ghost" id="bclear">Убрать трек</button>' : ''}</div>
      <p class="warnmsg">${esc(msg.text)}</p>${tr ? '' : '<p class="muted">Загрузите трек (нужны только координаты и высоты) или задайте количество дней в «Параметрах похода» и введите дни вручную.</p>'}
      ${prof}
      <h3>Дни${trip.days.length ? `: ${trip.days.length}` : ''}</h3>
      ${trip.days.length ? `<div class="tbl"><table class="dtable">${hdr}${rows}</table></div><p class="muted small">Двойной щелчок по строке открывает окно дня. ${goalSet ? 'Цель по калориям задана: данные по дням необязательны, их можно ввести для уточнения расчёта.' : 'Подсвеченное обязательно заполнить.'}</p>` : '<p class="empty">Дней пока нет.</p>'}
      <div class="btnrow"><button class="btn" id="calc" ${miss.length ? 'disabled' : ''}>Рассчитать</button></div>
      ${miss.length ? `<p class="warnmsg small">Не хватает: ${esc(miss.join('; '))}</p>` : ''}`,
    bind(root) {
      root.querySelector('#bparams').onclick = () => openParams(trip, save, ctx);
      root.querySelector('#bcond').onclick = () => openCond(trip, save, ctx);
      root.querySelector('#calc')?.addEventListener('click', () => { if (!miss.length) { ctx.state.tab = 'calc'; ctx.go(''); } });
      root.querySelectorAll('tr[data-d]').forEach(tr2 => tr2.ondblclick = () => openDay(trip, +tr2.dataset.d, save, ctx));
      root.querySelectorAll('[data-e]').forEach(b => b.onclick = () => openDay(trip, +b.dataset.e, save, ctx));
      root.querySelector('#bclear')?.addEventListener('click', () => { if (confirm('Убрать трек? Дни останутся, их можно править вручную.')) { delete trip.track; trip.days.forEach(d => { d.auto = null; }); rebuild(trip); save(); ctx.rerender(); } });
      root.querySelector('#file').onchange = async e => {
        try {
          let pts = [], wpts = [], seg = 0;
          for (const f of e.target.files) {
            const r = G.parseGpx(await f.text()), maxSeg = Math.max(-1, ...r.pts.map(p => p[4]));
            r.pts.forEach(p => { p[4] += seg; }); seg += maxSeg + 1; pts.push(...r.pts); wpts.push(...r.wpts);
          }
          if (pts.length < 2) throw new Error('В файле нет точек трека');
          pts = G.downsample(pts);
          trip.track = { pts, wpts, cuts: [], files: [...e.target.files].map(f => f.name) };
          msg.text = '';
          const n = trip.plan.n || 5; trip.plan.n = n;
          trip.track.cuts = G.splitLoad(G.prep(trip.track, P()), n);
          rebuild(trip); save(); ctx.rerender();
          if (!G.hasEle(pts)) { msg.text = 'В треке нет высот: набор и сброс задайте вручную по дням.'; ctx.rerender(); }
          openParams(trip, save, ctx);
        } catch (err) { msg.text = err.message; ctx.rerender(); }
      };
      if (!tr) return;
      const T = G.prep(tr, P()), svg = root.querySelector('#prof'), W = 800, X = km => (km / T.total) * W;
      root.querySelector('#kms').onchange = e => { tr.cuts = e.target.value.split(/[,;\s]+/).map(Number).filter(k => k > 0 && k < T.total); rebuild(trip); save(); ctx.rerender(); };
      svg.querySelectorAll('.mk').forEach(g => g.addEventListener('pointerdown', e => {
        e.preventDefault(); const i = +g.dataset.i; g.setPointerCapture(e.pointerId);
        const mv = ev => { const r = svg.getBoundingClientRect(); tr.cuts[i] = Math.max(0.1, Math.min(T.total - 0.1, ((ev.clientX - r.left) / r.width) * T.total)); g.querySelectorAll('line').forEach(l => { l.setAttribute('x1', X(tr.cuts[i])); l.setAttribute('x2', X(tr.cuts[i])); }); g.querySelector('circle').setAttribute('cx', X(tr.cuts[i])); };
        const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); tr.cuts.sort((a, b) => a - b); rebuild(trip); save(); ctx.rerender(); };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
      }));
    },
  };
}

return {ensurePlan, fmtDate, rebuild, missing, daysSection};
})();
__m['products.js'] = (() => {
// Справочник категорий (структура, не данные). Сами продукты живут в наборах (этап 4) и в IndexedDB.
const CATS = [
  ['grain', 'Крупы и макароны'], ['legume', 'Бобовые'], ['bread', 'Хлеб и сухари'], ['meat', 'Мясное и рыба'], ['cheese', 'Сыры'],
  ['dairy', 'Молочное'], ['fat', 'Жиры и соусы'], ['veg', 'Овощи и свежее'], ['spice', 'Приправы'], ['soup', 'Супы в пакетах'],
  ['sweet', 'Сладкое'], ['nuts', 'Орехи и сухофрукты'], ['drink', 'Напитки'], ['fresh', 'Свежее на первые дни'],
];
const SHOP_DEPT = { grain: 'Бакалея', legume: 'Бакалея', bread: 'Хлеб', meat: 'Мясо', cheese: 'Молочный отдел', dairy: 'Молочный отдел', fat: 'Бакалея', veg: 'Овощи', spice: 'Специи', soup: 'Бакалея', sweet: 'Сладкое', nuts: 'Сухофрукты и орехи', drink: 'Напитки', fresh: 'Овощи' };

return {CATS, SHOP_DEPT};
})();
__m['tabsui.js'] = (() => {
// Полоса вкладок-наборов: прокрутка стрелками и колесом мыши, перетаскивание для смены порядка, кнопка «+ Набор» (до 10).
const {MAX_SETS} = __m['setrepo.js'];
const {esc} = __m['ui.js'];

function tabsHtml(sets, activeId, tripId) {
  const full = sets.length >= MAX_SETS;
  return `<div class="tabrow"><button class="tarrow" data-ta="-1" aria-label="Влево">‹</button>
    <div class="tabstrip" id="tstrip">${sets.map(s => `<button class="stab${s.id === activeId ? ' on' : ''}" draggable="true" data-sid="${s.id}">${s.readonly ? '🔒 ' : ''}${esc(s.name)}${s.id === tripId ? ' ✓' : ''}</button>`).join('')}</div>
    <button class="tarrow" data-ta="1" aria-label="Вправо">›</button>
    <button class="btn addset" id="addset" ${full ? 'disabled title="Максимум 10 наборов"' : ''}>+ Набор</button></div>${full ? '<p class="muted small">Максимум 10 наборов: удалите ненужный, чтобы добавить новый.</p>' : ''}`;
}

function bindTabs(root, { repo, onSelect, onAdd, rerender }) {
  const strip = root.querySelector('#tstrip');
  root.querySelectorAll('[data-ta]').forEach(b => b.onclick = () => strip.scrollBy({ left: 160 * +b.dataset.ta, behavior: 'smooth' }));
  strip.addEventListener('wheel', e => { e.preventDefault(); strip.scrollLeft += e.deltaY || e.deltaX; }, { passive: false });
  const on = strip.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  let dragId = null;
  strip.querySelectorAll('.stab').forEach(t => {
    t.onclick = () => onSelect(t.dataset.sid);
    t.ondragstart = e => { dragId = t.dataset.sid; e.dataTransfer.effectAllowed = 'move'; };
    t.ondragover = e => { e.preventDefault(); t.classList.add('over'); };
    t.ondragleave = () => t.classList.remove('over');
    t.ondrop = async e => {
      e.preventDefault(); t.classList.remove('over');
      if (!dragId || dragId === t.dataset.sid) return;
      const ids = repo.list().map(s => s.id), from = ids.indexOf(dragId), to = ids.indexOf(t.dataset.sid);
      ids.splice(to, 0, ids.splice(from, 1)[0]); await repo.reorder(ids); rerender();
    };
  });
  root.querySelector('#addset').onclick = () => { if (repo.canAdd()) onAdd(); };
}

return {tabsHtml, bindTabs};
})();
__m['xlsx.js'] = (() => {
// Минимальное чтение и запись .xlsx (первый лист, значения) и CSV. Нужна библиотека lib/jszip.min.js (глобальный JSZip).
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const colIdx = ref => { let n = 0; for (const ch of ref.replace(/\d/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const colName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Все листы книги: {имя листа: строки}. Значения как в файле (числа — числами, текст — как есть).
async function readXlsxAll(buf) {
  const z = await JSZip.loadAsync(buf), dp = new DOMParser();
  const wb = dp.parseFromString(await z.file('xl/workbook.xml').async('string'), 'application/xml');
  const rels = dp.parseFromString(await z.file('xl/_rels/workbook.xml.rels').async('string'), 'application/xml');
  const ss = [];
  if (z.file('xl/sharedStrings.xml')) {
    const d = dp.parseFromString(await z.file('xl/sharedStrings.xml').async('string'), 'application/xml');
    for (const si of d.getElementsByTagNameNS(NS, 'si')) ss.push([...si.getElementsByTagNameNS(NS, 't')].map(t => t.textContent).join(''));
  }
  const out = {};
  for (const sh of wb.getElementsByTagNameNS(NS, 'sheet')) {
    const rid = sh.getAttributeNS(RNS, 'id');
    let target = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === rid).getAttribute('Target');
    target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    const sd = dp.parseFromString(await z.file(target).async('string'), 'application/xml'), rows = [];
    for (const r of sd.getElementsByTagNameNS(NS, 'row')) {
      const row = [];
      for (const c of r.getElementsByTagNameNS(NS, 'c')) {
        const v = c.getElementsByTagNameNS(NS, 'v')[0], t = c.getAttribute('t');
        let val = null;
        if (t === 'inlineStr') val = [...c.getElementsByTagNameNS(NS, 't')].map(x => x.textContent).join('');
        else if (v && v.textContent !== '') val = t === 's' ? ss[+v.textContent] : t === 'str' || t === 'b' ? v.textContent : (isFinite(+v.textContent) ? +v.textContent : v.textContent);
        row[colIdx(c.getAttribute('r'))] = val;
      }
      rows[+r.getAttribute('r') - 1] = row;
    }
    out[sh.getAttribute('name')] = Array.from(rows, r => r || []);
  }
  return out;
}
async function readXlsx(buf) { const all = await readXlsxAll(buf); return Object.values(all)[0] || []; }

// sheets: [{name, rows:[[...]]}] → Blob .xlsx (строки и числа, ширина колонок по содержимому)
async function writeXlsx(sheets) {
  const z = new JSZip();
  const ct = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${ct}</Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${RNS}"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${RNS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`);
  sheets.forEach((s, i) => {
    const w = []; s.rows.forEach(r => r.forEach((v, c) => { w[c] = Math.max(w[c] || 8, Math.min(60, String(v ?? '').length + 2)); }));
    const rows = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, c) => v == null || v === '' ? '' : typeof v === 'number' ? `<c r="${colName(c)}${ri + 1}"><v>${v}</v></c>` : `<c r="${colName(c)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('');
    z.file(`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><cols>${w.map((x, c) => `<col min="${c + 1}" max="${c + 1}" width="${x}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`);
  });
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split('\n')[0], sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v !== '')).map(r => r.map(v => (v !== '' && isFinite(+v.replace(',', '.')) ? +v.replace(',', '.') : v)));
}
const toCsv = rows => '﻿' + rows.map(r => r.map(v => { v = v ?? ''; return /[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v; }).join(';')).join('\r\n');

function download(name, data, mime = 'application/octet-stream') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Файл → массив строк (первая строка — заголовки); поддерживает .xlsx, .csv, .json (массив объектов)
async function readTable(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.xlsx')) return readXlsx(await file.arrayBuffer());
  if (n.endsWith('.csv')) return parseCsv(await file.text());
  if (n.endsWith('.json')) {
    const j = JSON.parse(await file.text()), arr = Array.isArray(j) ? j : (j.items || j.rows || []);
    if (!arr.length) return [];
    const keys = Object.keys(arr[0]); return [keys, ...arr.map(o => keys.map(k => o[k] ?? ''))];
  }
  throw new Error('Поддерживаются файлы .xlsx, .csv, .json');
}

return {colName, xmlEsc, readXlsxAll, readXlsx, writeXlsx, parseCsv, toCsv, download, readTable};
})();
__m['plstore.js'] = (() => {
// Меню-планы: что в какой день и приём пищи. Хранятся во вкладках (до 10), могут быть «только чтение» (оригинал).
const {makeRepo} = __m['setrepo.js'];

const repo = makeRepo('plans', null);
const loadPlans = () => repo.load();

return {repo, loadPlans};
})();
__m['formio.js'] = (() => {
// Excel-форма для загрузки и выгрузки данных: листы «Продукты», «Блюда», «План», «Параметры».
// Данные читаются и записываются без изменений: названия символ в символ, числа как есть, пустое остаётся пустым.
// Словарь синонимов заголовков — в одном месте (SYN): дополняйте его здесь.
const {CATS} = __m['products.js'];

const SYN = {
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
const norm = s => String(s ?? '').toLowerCase().replace(/[\s_.,:;()\\/\-+]+/g, '').replace(/[?!]/g, '');
const SYNN = Object.fromEntries(Object.entries(SYN).map(([k, v]) => [k, v.map(norm)]));
const isNum = v => typeof v === 'number';
const num = v => (v == null || v === '' ? null : isNum(v) ? v : (isFinite(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : NaN));
const txt = v => (v == null ? '' : String(v));
const MEAL_KEY = { завтрак: 'b', обед: 'l', ужин: 'd', перекус: 's', карпит: 's' };
const COND_WORDS = { 'любойдень': 'any', 'any': 'any', 'днёвка': 'rest', 'дневка': 'rest', 'жара': 'hot', 'холод': 'cold', 'первые2дня': 'first2' };
const condKeys = t => String(t || '').split(/[,;]/).map(x => { const n = norm(x); return COND_WORDS[n] || (n.startsWith('высота') ? 'alt3000' : n.startsWith('перв') ? 'first2' : null); }).filter(Boolean);

// Соответствие категорий (текст из файла → ключ приложения). Оригинальный текст сохраняется в catOrig.
const CAT_MAP = { 'крупы/макароны': 'grain', 'крупы': 'grain', 'сухие продукты': 'legume', 'белок': 'meat', 'жиры': 'fat', 'перекусы': 'sweet', 'выпечка': 'bread', 'напитки': 'drink', 'бакалея': 'spice', 'овощи': 'veg', 'фрукты': 'fresh', 'соусы': 'fat', 'молочное': 'dairy', 'специи': 'spice', 'вода': 'drink' };
function catKey(t) { const n = String(t || '').trim().toLowerCase(); return CAT_MAP[n] || (CATS.find(c => c[0] === n || c[1].toLowerCase() === n) || [])[0] || 'spice'; }

// ---- разбор листа в таблицу по заголовкам ----
function tableOf(rows, wanted) {
  for (let h = 0; h < Math.min(12, rows.length); h++) {
    const hdr = (rows[h] || []).map(norm), cols = {};
    for (const f of wanted) { const i = hdr.findIndex(x => SYNN[f].includes(x)); if (i >= 0) cols[f] = i; }
    if (Object.keys(cols).length >= 2) {
      const data = rows.slice(h + 1), used = new Set(Object.values(cols));
      // колонки без заголовка, в которых есть данные (например, описание блюда, дописанное пользователем): их можно прочитать и сообщить об этом
      const extra = []; for (let i = 0; i < Math.max(hdr.length, ...data.map(r => r.length)); i++) if (!used.has(i) && !hdr[i] && data.some(r => r[i] != null && r[i] !== '')) extra.push(i);
      return { h, cols, extra, rows: data.map((r, k) => ({ r, ln: h + 2 + k })) };
    }
  }
  return null;
}
const colL = i => String.fromCharCode(65 + i); // буква колонки (A…Z)
const PROD_F = ['name', 'cat', 'kcal', 'p', 'f', 'c', 'baseUnit', 'pack', 'unitBuy', 'price', 'inPurchase', 'shelf', 'fresh', 'tags', 'note', 'id', 'src'];
const DISH_F = ['dish', 'meal', 'product', 'qty', 'qtyGroup', 'unit', 'min', 'max', 'cond', 'cook', 'desc', 'lineNote', 'dishId', 'src'];
const PLAN_F = ['day', 'meal', 'dish', 'portions', 'comment', 'dishId', 'src'];

function detect(rows, sheetName) {
  const nm = norm(sheetName), tp = tableOf(rows, PROD_F), td = tableOf(rows, DISH_F), tl = tableOf(rows, PLAN_F);
  if (nm.startsWith('параметр') || nm === 'ввод') return 'params';
  if (nm.startsWith('эталон') || nm.startsWith('пересч') || nm.startsWith('диагност') || nm.startsWith('инструкц') || nm.startsWith('какзаполн')) return null;
  const isProd = tp && tp.cols.name != null && tp.cols.kcal != null, isDish = td && td.cols.dish != null && td.cols.product != null && (td.cols.qty != null || td.cols.qtyGroup != null), isPlan = tl && tl.cols.day != null && tl.cols.dish != null && td?.cols.product == null;
  if (nm.startsWith('продукт') && isProd) return 'products';
  if ((nm.startsWith('блюд') || nm.startsWith('рецепт')) && isDish) return 'dishes';
  if ((nm === 'план' || nm.startsWith('меню')) && isPlan) return 'plan';
  return isProd ? 'products' : isDish ? 'dishes' : isPlan ? 'plan' : null;
}

function parseProducts(rows, sheet) {
  const t = tableOf(rows, PROD_F), items = [], errors = [], notes = [];
  if (!t || t.cols.name == null) return { items, errors: ['нет колонки «Название»'] };
  if (t.cols.note == null && t.extra.length) { t.cols.note = t.extra[0]; notes.push(`колонка ${colL(t.extra[0])} без заголовка прочитана как «Примечание»`); }
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
  return { items, errors, notes };
}

function parseDishes(rows, sheet) {
  const t = tableOf(rows, DISH_F), errors = [], notes = [], byKey = new Map(), dishes = [];
  if (!t || t.cols.dish == null || t.cols.product == null) return { dishes, errors: ['нет колонок «Блюдо» и «Продукт»'] };
  if (t.cols.desc == null && t.extra.length) { t.cols.desc = t.extra[0]; notes.push(`колонка ${colL(t.extra[0])} без заголовка прочитана как «Описание блюда»`); }
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
  return { dishes, errors, notes };
}

function parsePlan(rows, sheet) {
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

function parseParams(rows) {
  const out = [];
  let start = rows.findIndex(r => norm(r[0]) === 'параметр');
  for (const r of rows.slice(start + 1)) if (r.some(v => v != null && v !== '')) out.push({ name: r[0], value: r[1] ?? null, note: r[2] ?? null, formula: r[3] ?? null, src: r[4] ?? null });
  return out;
}

// Разбор всей книги: блоки, найденные по названиям листов, заголовкам и форме данных
function parseBook(sheets) {
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
const FORM_HEAD = {
  products: ['Название', 'Категория', 'Ккал на 100 г', 'Белки на 100 г', 'Жиры на 100 г', 'Углеводы на 100 г', 'Базовая ед.', 'Размер упаковки', 'Ед. закупки', 'Цена за упаковку', 'В закупку?', 'Хранение, дней', 'Свежий (да/нет)', 'Теги', 'Примечание', 'ID', 'Источник'],
  dishes: ['Блюдо', 'Приём пищи', 'Продукт', 'Кол-во на 1 человека', 'Ед.', 'Мин', 'Макс', 'Условия', 'Варка, мин', 'Описание блюда', 'Примечание к строке', 'ID блюда', 'Источник'],
  plan: ['День', 'Приём пищи', 'Блюдо', 'Порций', 'Комментарий', 'ID блюда', 'Источник'],
  params: ['Параметр', 'Значение', 'Примечание', 'Формула (как в источнике)', 'Источник'],
};
// Простой шаблон для пользователя: только нужные колонки. Загрузчик по-прежнему понимает и расширенные колонки (FORM_HEAD).
const SIMPLE_HEAD = {
  products: ['Название', 'Ккал на 100 г', 'Белки на 100 г', 'Жиры на 100 г', 'Углеводы на 100 г', 'Категория', 'Упаковка, г', 'Цена'],
  dishes: ['Блюдо', 'Приём пищи', 'Продукт', 'Граммы на 1 человека', 'Описание блюда'],
  plan: ['День', 'Приём пищи', 'Блюдо'],
};
// Две вкладки: можно заполнить обе или любую одну. Меню-план (лист «План») загрузчик тоже понимает, но в простой шаблон он не входит.
const simpleFormSheets = () => [
  { name: 'Продукты', rows: [SIMPLE_HEAD.products] },
  { name: 'Блюда', rows: [SIMPLE_HEAD.dishes] },
];
const MEAL_RU = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' }, COND_RU = { any: 'любой день', rest: 'днёвка', hot: 'жара', cold: 'холод', alt3000: 'высота > 3000', first2: 'первые 2 дня' };
const nz = v => (v == null ? null : v);
function formSheets({ pset, dset, plan, params }) {
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

return {SYN, norm, MEAL_KEY, catKey, detect, parseProducts, parseDishes, parsePlan, parseParams, parseBook, FORM_HEAD, SIMPLE_HEAD, simpleFormSheets, formSheets};
})();
__m['units.js'] = (() => {
// Пересчёт единиц при загрузке блюд — только по явному выбору пользователя (по умолчанию «как в файле»).
const norm = u => String(u ?? '').trim().toLowerCase().replace(/\.$/, '');
const isKg = u => ['кг', 'kg'].includes(norm(u));
const isPcs = u => ['шт', 'штука', 'штуки', 'pcs'].includes(norm(u));
const isMl = u => ['мл', 'л', 'ml', 'l'].includes(norm(u));
const isG = u => !u || ['г', 'гр', 'g'].includes(norm(u));

// Что нестандартного в блоках блюд: счётчики и продукты со штуками
function scanUnits(blocks) {
  const r = { kg: 0, pcs: 0, ml: 0, group: 0, other: 0, pieceNames: [] };
  const names = new Set();
  for (const b of blocks) if (b.kind === 'dishes') for (const d of b.dishes) for (const i of d.ing) {
    if (isKg(i.unit)) r.kg++; else if (isPcs(i.unit)) { r.pcs++; names.add(i.name); } else if (isMl(i.unit)) r.ml++; else if (!isG(i.unit)) r.other++;
    if (i.perGroup) r.group++;
  }
  r.pieceNames = [...names];
  return r;
}

// opts: { kg: bool, pcs: {название: вес 1 шт, г}, group: число человек или null }. Исходные блоки не меняются.
function applyUnits(blocks, opts) {
  const n = opts.group > 0 ? opts.group : null, w = opts.pcs || {};
  return blocks.map(b => {
    if (b.kind !== 'dishes') return b;
    return { ...b, dishes: b.dishes.map(d => ({ ...d, ing: d.ing.map(i => {
      let { g, min, max, unit, perGroup } = i; const was = [];
      const scale = k => { g = g * k; if (min != null) min = min * k; if (max != null) max = max * k; };
      if (perGroup && n) { scale(1 / n); perGroup = false; was.push(`на группу ${i.g}, ÷${n} чел`); }
      if (opts.kg && isKg(unit)) { scale(1000); unit = 'г'; was.push(`из ${i.g} кг`); }
      else if (isPcs(unit) && w[i.name] > 0) { scale(w[i.name]); unit = 'г'; was.push(`из ${i.g} шт × ${w[i.name]} г`); }
      if (!was.length) return i;
      return { ...i, g: Math.round(g * 1e6) / 1e6, min, max, unit, perGroup, conv: was.join('; '), note: [i.note, 'пересчитано ' + was.join('; ')].filter(Boolean).join(' · ') };
    }) })) };
  });
}

return {isKg, isPcs, isMl, scanUnits, applyUnits};
})();
__m['links.js'] = (() => {
// Связи при загрузке: продукты в блюдах, которых нет в наборе продуктов, и блюда в плане, которых нет в наборе блюд.
// Названия в данных не меняются: «связать» добавляет целевому продукту/блюду список aliases.
const nrm = s => String(s ?? '').trim().toLowerCase();
const alts = name => String(name).split('|').map(nrm).filter(Boolean);

const itemKeys = x => [x.name, ...(x.aliases || [])].map(nrm);

// Продукты из блюд, которых нет среди items (учитываются варианты через «|» и aliases). Возвращает названия как в файле.
function danglingProducts(dishBlocks, items) {
  const have = new Set(items.flatMap(itemKeys)), seen = new Set(), out = [];
  for (const b of dishBlocks) for (const d of b.dishes) for (const i of d.ing) {
    if (seen.has(i.name)) continue; seen.add(i.name);
    if (!alts(i.name).some(a => have.has(a))) out.push(i.name);
  }
  return out;
}

// Блюда из плана, которых нет среди dishes (как в расчёте: по точному названию строки плана или alias).
function danglingDishes(planBlocks, dishes) {
  const have = new Set(dishes.flatMap(d => [d.name, ...(d.aliases || [])])), seen = new Set(), out = [];
  for (const b of planBlocks) for (const r of b.rows) { if (r.dish == null || seen.has(r.dish)) continue; seen.add(r.dish); if (!have.has(r.dish)) out.push(r.dish); }
  return out;
}

// Что из недостающего есть в самом файле (items — продукты файла, по названию без учёта регистра и пробелов по краям)
function foundInFile(names, fileItems, key = 'name') {
  const by = new Map(fileItems.map(x => [nrm(x[key]), x]));
  return names.map(n => alts(n).map(a => by.get(a)).find(Boolean)).filter(Boolean);
}

// target — набор, links — { название из файла: название существующего элемента }. Возвращает число добавленных связей.
function addAliases(list, links, key = 'name') {
  let n = 0;
  for (const [from, to] of Object.entries(links)) {
    if (!to) continue;
    const t = list.find(x => x[key] === to); if (!t) continue;
    t.aliases = t.aliases || [];
    for (const a of key === 'name' && from.includes('|') ? from.split('|').map(s => s.trim()).filter(Boolean) : [from]) if (!t.aliases.includes(a)) { t.aliases.push(a); n++; }
  }
  return n;
}

return {danglingProducts, danglingDishes, foundInFile, addAliases};
})();
__m['loadview.js'] = (() => {
// Окно «Загрузка из файла»: форма Excel (или .csv/.json) → наборы продуктов, блюд и план. Предпросмотр, выбор вкладок, дубли, отмена.
const {repo: prepo} = __m['pstore.js'];
const {repo: mrepo} = __m['mstore.js'];
const {repo: plrepo} = __m['plstore.js'];
const {parseBook, detect, parseProducts, parseDishes, parsePlan, simpleFormSheets, formSheets} = __m['formio.js'];
const {readXlsxAll, parseCsv, writeXlsx, download} = __m['xlsx.js'];
const {esc, modal} = __m['ui.js'];
const store = __m['store.js'];
const {scanUnits, applyUnits} = __m['units.js'];
const {danglingProducts, danglingDishes, foundInFile, addAliases} = __m['links.js'];

const REPOS = { products: prepo, dishes: mrepo, plan: plrepo }, KIND_RU = { products: 'Продукты', dishes: 'Блюда', plan: 'План (меню)', params: 'Параметры' };
let uid = 0; const nid = p => p + Date.now().toString(36) + (uid++);
const clone = o => JSON.parse(JSON.stringify(o));

async function readAny(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.xlsx')) return readXlsxAll(await file.arrayBuffer());
  if (n.endsWith('.xls')) throw new Error('Старый формат .xls не поддерживается: сохраните файл как .xlsx');
  if (n.endsWith('.csv')) return { [file.name.replace(/\.[^.]+$/, '')]: parseCsv(await file.text()) };
  if (n.endsWith('.json')) {
    const j = JSON.parse(await file.text()), out = {};
    const tab = arr => { if (!arr.length) return []; const keys = Object.keys(arr[0]); return [keys, ...arr.map(o => keys.map(k => o[k] ?? null))]; };
    if (Array.isArray(j)) out[file.name.replace(/\.[^.]+$/, '')] = tab(j);
    else for (const [k, v] of Object.entries(j)) if (Array.isArray(v)) out[k] = tab(v);
    return out;
  }
  throw new Error('Поддерживаются файлы .xlsx, .csv, .json');
}

const blankForm = () => writeXlsx(simpleFormSheets());
const formBook = parts => writeXlsx(formSheets(parts));

// ---- построение наборов из блока ----
function mkProductSet(b, name, readonly, meta) {
  return { id: nid('p'), name, readonly, meta, items: b.items.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false })) };
}
function mkDish(d) { return { id: nid('d'), name: d.name, meal: d.meal, mealOrig: d.mealOrig, desc: d.desc, srcId: d.srcId, cook: d.cook, cond: d.cond, on: true, ing: d.ing }; }

function prep(parsed) { parsed.params = (parsed.blocks.find(b => b.kind === 'params') || {}).params || null; parsed.blocks = parsed.blocks.filter(b => b.kind !== 'params' && ((b.items || b.dishes || b.rows || []).length || b.errors.length)); return parsed; }

function openLoad(ctx, { only = null, after } = {}) {
  let parsed = null, fname = '', err = '', log = null, st = {}, readonly = false;
  let sc = null, us = { kg: false, pcs: false, w: {}, rem: true, grp: false, n: 12 }, savedW = {};
  const kinds = only ? [only] : ['products', 'dishes', 'plan'];
  Promise.resolve(store.get('settings', 'pieceWeights')).then(v => { savedW = v || {}; }).catch(() => {});
  // ---- связи: что есть в наборе, к которому будут привязаны блюда / план этого файла ----
  let lk = { prod: { mode: 'warn', map: {} }, dish: { mode: 'warn', map: {} } };
  const incl = (kind, f = () => true) => (parsed ? parsed.blocks : []).map((b, i) => [b, i]).filter(([b, i]) => b.kind === kind && st[i]?.include && f(b, i));
  const tieProd = () => {
    const d = incl('dishes')[0]; if (!d) return null; const s = st[d[1]]; let set = null, items = [];
    if (s.target === 'new') { const pj = incl('products', (b, i) => st[i].target === 'new').pop(); if (pj) items = pj[0].items; else { set = prepo.first(); items = set?.items || []; } }
    else { set = prepo.get(mrepo.get(s.target)?.productSetId); items = set?.items || []; incl('products', (b, i) => st[i].target === set?.id).forEach(([b, i]) => { items = st[i].mode === 'replace' ? b.items : [...items, ...b.items]; }); }
    return { set, items, blocks: d ? incl('dishes').map(x => x[0]) : [] };
  };
  const tieDish = () => {
    const p = incl('plan')[0]; if (!p) return null; const s = st[p[1]]; let set = null, items = [];
    if (s.target === 'new') { const dj = incl('dishes', (b, i) => st[i].target === 'new').pop(); if (dj) items = dj[0].dishes; else { set = mrepo.first(); items = set?.dishes || []; } }
    else { set = mrepo.get(plrepo.get(s.target)?.dishSetId); items = set?.dishes || []; incl('dishes', (b, i) => st[i].target === set?.id).forEach(([b, i]) => { items = st[i].mode === 'replace' ? b.dishes : [...items, ...b.dishes]; }); }
    return { set, items, blocks: incl('plan').map(x => x[0]) };
  };
  const linkInfo = () => {
    const tp = tieProd(), td = tieDish(), fileItems = (parsed ? parsed.blocks : []).filter(b => b.kind === 'products').flatMap(b => b.items), fileDishes = (parsed ? parsed.blocks : []).filter(b => b.kind === 'dishes').flatMap(b => b.dishes);
    const prod = tp && !readonly ? (() => { const names = danglingProducts(tp.blocks, tp.items); return { names, items: tp.items, locked: !!tp.set?.readonly, found: foundInFile(names, fileItems).length, setName: tp.set?.name }; })() : null;
    const dish = td && !readonly ? (() => { const names = danglingDishes(td.blocks, td.items); return { names, items: td.items, locked: !!td.set?.readonly, found: foundInFile(names, fileDishes, 'name').length, setName: td.set?.name }; })() : null;
    return { prod: prod?.names.length ? prod : null, dish: dish?.names.length ? dish : null };
  };
  const linkBlock = (key, info, title, what) => {
    const l = lk[key], r = (v, t) => `<label><input type="radio" name="lk${key}" value="${v}" ${l.mode === v ? 'checked' : ''} ${info.locked && v !== 'warn' ? 'disabled' : ''}> ${t}</label>`;
    const opts = sel => `<option value="">— не связывать</option>${info.items.map(x => `<option value="${esc(x.name)}"${sel === x.name ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}`;
    return `<p><b>${title}:</b> ${info.names.length}. <span class="muted small">${info.names.slice(0, 6).map(esc).join(', ')}${info.names.length > 6 ? '…' : ''}</span></p>
      <p>${r('warn', 'оставить с предупреждением')} &nbsp; ${r('create', `создать из этого файла (найдено ${info.found} из ${info.names.length})`)} &nbsp; ${r('link', 'связать с существующим')}</p>
      ${info.locked ? `<p class="muted small">Набор «${esc(info.setName || '')}» — «оригинал, только чтение»: менять его нельзя.</p>` : ''}
      ${l.mode === 'link' && !info.locked ? `<div class="tbl"><table class="dtable">${info.names.map(n => `<tr><td>${esc(n)}</td><td><select data-lk="${key}" data-n="${esc(n)}">${opts(l.map[n])}</select></td></tr>`).join('')}</table></div><p class="muted small">Название в данных не меняется: к существующему ${what} добавляется второе имя.</p>` : ''}`;
  };
  const linksHtml = () => {
    if (!parsed || readonly) return '';
    const i = linkInfo(); if (!i.prod && !i.dish) return '';
    return `<h3>Связи</h3>${i.prod ? linkBlock('prod', i.prod, 'Продуктов из блюд нет в наборе продуктов', 'продукту') : ''}${i.dish ? linkBlock('dish', i.dish, 'Блюд из плана нет в наборе блюд', 'блюду') : ''}`;
  };
  const unitsHtml = () => {
    if (!sc || !(sc.kg || sc.pcs || sc.group)) return '<p class="muted small"><b>Единицы:</b> оставлены как в файле. Строки с шт, мл, л, «на группу» и продукты без КБЖУ загружаются, но в расчёте помечаются «не считается» и не подменяются.</p>';
    if (readonly) return '<p class="muted small"><b>Единицы:</b> для набора «оригинал, только чтение» пересчёт отключён: всё как в файле.</p>';
    const row = (cnt, label, body) => `<tr><td>${label} <span class="muted small">(${cnt})</span></td><td>${body}</td></tr>`;
    return `<h3>Единицы</h3><p class="muted small">По умолчанию — как в файле: такие строки не считаются и помечаются. Пересчёт только если выбрать ниже.</p><div class="tbl"><table class="dtable">
      ${sc.kg ? row(sc.kg, 'кг', `<label><input type="radio" name="ukg" value="0" ${us.kg ? '' : 'checked'}> как в файле</label> <label><input type="radio" name="ukg" value="1" ${us.kg ? 'checked' : ''}> перевести в граммы</label>`) : ''}
      ${sc.pcs ? row(sc.pcs, 'шт', `<label><input type="radio" name="upc" value="0" ${us.pcs ? '' : 'checked'}> как в файле</label> <label><input type="radio" name="upc" value="1" ${us.pcs ? 'checked' : ''}> вес 1 шт, г:</label>
        ${us.pcs ? `<br>${sc.pieceNames.map(n => `${esc(n)} <input data-pw="${esc(n)}" type="number" min="0" step="any" style="width:70px" value="${us.w[n] ?? ''}">`).join(' &nbsp; ')}<br><label><input type="checkbox" id="urem" ${us.rem ? 'checked' : ''}> запомнить для следующих загрузок</label>` : ''}`) : ''}
      ${sc.ml ? row(sc.ml, 'мл / л', 'как в файле (пересчёт не предусмотрен)') : ''}
      ${sc.group ? row(sc.group, '«на группу»', `<label><input type="radio" name="ugr" value="0" ${us.grp ? '' : 'checked'}> как в файле</label> <label><input type="radio" name="ugr" value="1" ${us.grp ? 'checked' : ''}> разделить на</label> <input id="ugn" type="number" min="1" step="1" style="width:60px" value="${us.n}"> чел`) : ''}
    </table></div>`;
  };
  modal(() => {
    const undo = ctx.undoInfo;
    const blocks = parsed ? parsed.blocks : [];
    const blockHtml = blocks.map((b, i) => {
      const s = st[i], cnt = b.kind === 'products' ? b.items.length : b.kind === 'dishes' ? b.dishes.length : b.rows.length, rp = REPOS[b.kind];
      const lines = b.kind === 'dishes' ? ` · строк ${b.dishes.reduce((a, d) => a + d.ing.length, 0)}` : '';
      const nonG = b.kind === 'products' ? b.items.filter(x => (x.baseUnit && x.baseUnit !== 'г') || x.kcal == null).length : b.kind === 'dishes' ? b.dishes.reduce((a, d) => a + d.ing.filter(x => (x.unit && x.unit !== 'г') || x.perGroup).length, 0) : 0;
      return `<tr><td><input type="checkbox" data-inc="${i}" ${s.include ? 'checked' : ''} ${(only && !kinds.includes(b.kind)) ? '' : ''}></td><td><b>${KIND_RU[b.kind]}</b>: ${cnt}${lines}<br><span class="muted small">лист «${esc(b.sheet)}»</span></td>
        <td><select data-tg="${i}"><option value="new"${s.target === 'new' ? ' selected' : ''}${rp.canAdd() ? '' : ' disabled'}>новая вкладка</option>${rp.list().filter(x => !x.readonly).map(x => `<option value="${x.id}"${s.target === x.id ? ' selected' : ''}>в «${esc(x.name)}»</option>`).join('')}</select>
        ${s.target === 'new' ? `<input data-nm="${i}" value="${esc(s.name)}" style="width:150px">` : `<select data-md="${i}"><option value="add"${s.mode === 'add' ? ' selected' : ''}>добавить к существующим</option><option value="replace"${s.mode === 'replace' ? ' selected' : ''}>заменить вкладку целиком</option></select>`}
        ${s.target !== 'new' && s.mode === 'add' && b.kind !== 'plan' ? `<br><select data-dp="${i}"><option value="update"${s.dup === 'update' ? ' selected' : ''}>совпадения: обновить</option><option value="skip"${s.dup === 'skip' ? ' selected' : ''}>совпадения: пропустить</option><option value="both"${s.dup === 'both' ? ' selected' : ''}>совпадения: сохранить оба</option></select>` : ''}</td>
        <td class="small">${b.errors.length ? `<span class="warnmsg">ошибок: ${b.errors.length}</span>` : '<span class="good">ошибок нет</span>'}${(b.notes || []).length ? `<br><span class="muted">${esc(b.notes.join('; '))}</span>` : ''}${nonG ? `<br><span class="muted">не считаются (единицы/КБЖУ): ${nonG}</span>` : ''}</td></tr>`;
    }).join('');
    const errs = blocks.flatMap(b => b.errors);
    return {
      title: 'Загрузка из файла',
      html: `<p class="muted">Шаблон Excel («Скачать пустую форму») — две вкладки, <b>«Продукты»</b> и <b>«Блюда»</b>. Заполните обе или только одну: загрузить можно что-то одно. Ещё поддерживаются .csv и .json. Файлы .xls сначала сохраните как .xlsx.</p>
        <details class="muted small"><summary>Как заполнить шаблон</summary>
          <p><b>Продукты</b> (КБЖУ на 100 г): обязательно «Название» и «Ккал на 100 г»; белки, жиры, углеводы, категория, упаковка (г) и цена — по желанию. Пример: Гречка | 313 | 12,6 | 3,3 | 62,1 | Крупы и макароны | 800 | 95.</p>
          <p><b>Блюда</b>: одна строка — один продукт в блюде, граммы на 1 человека. Приём пищи: Завтрак, Обед, Ужин или Перекус. Пример: Каша гречневая | Завтрак | Гречка | 80 и Каша гречневая | Завтрак | Масло сливочное | 10. Названия продуктов пишите как на вкладке «Продукты» (или как в вашем наборе).</p>
          <p>Строки с ошибками пропускаются, остальное загружается. Килограммы, штуки и «на группу» программа сама не пересчитывает, а предложит выбор в окне загрузки.</p>
          ${only === 'plan' ? '<p><b>Меню-план</b>: лист «План» с колонками «День», «Приём пищи», «Блюдо» (названия блюд как в наборе блюд).</p>' : ''}
        </details>
        <p class="muted"> Данные грузятся как в файле: ничего не исправляется и не пересчитывается. Текущий поход не меняется.</p>
        <div class="btnrow"><label class="btn filebtn2">Выбрать файл<input type="file" id="f" accept=".xlsx,.xls,.csv,.json" hidden></label><button class="btn ghost" id="blank">Скачать пустую форму</button>${undo ? `<button class="btn ghost" id="undo">Отменить последнюю загрузку</button>` : ''}</div>
        <p class="warnmsg">${esc(err)}</p>
        ${log ? `<h3>Готово</h3><ul class="list">${log.map(l => `<li><span>${esc(l)}</span></li>`).join('')}</ul><div class="btnrow"><button class="btn" id="done">Закрыть</button></div>` : ''}
        ${parsed && !log ? `<h3>Файл «${esc(fname)}» — что найдено</h3>
          ${blocks.length ? `<div class="tbl"><table class="dtable"><tr><th></th><th>Блок</th><th>Куда и как</th><th>Проверка</th></tr>${blockHtml}</table></div>` : '<p class="warnmsg">В файле нет данных для загрузки. Заполните строки под заголовками на листах «Продукты», «Блюда» или «План» (пример — на листе «Как заполнять») и выберите файл снова. Если данные есть, проверьте названия листов и заголовки колонок.</p>'}
          <div class="fld"><label>Пометить новые вкладки «оригинал, только чтение»</label><div class="ctl"><input type="checkbox" id="ro" ${readonly ? 'checked' : ''}></div></div>
          ${unitsHtml()}
          ${linksHtml()}
          ${errs.length ? `<h3>Ошибки (плохие строки пропускаются, остальное грузится)</h3><ul class="warnlist">${errs.slice(0, 25).map(e => `<li>${esc(e)}</li>`).join('')}${errs.length > 25 ? `<li>…и ещё ${errs.length - 25}</li>` : ''}</ul>` : ''}
          ${parsed.unused.length ? `<h3>Не использовано</h3><p class="muted small">Листы: ${parsed.unused.map(esc).join(', ')}</p>` : ''}
          <div class="btnrow"><button class="btn" id="go" ${blocks.some((b, i) => st[i].include) ? '' : 'disabled'}>Загрузить</button><button class="btn ghost" id="cancel">Отмена</button></div>` : ''}`,
      bind(root, refresh, close) {
        root.querySelector('#blank').onclick = async () => download('Форма_для_загрузки_пустая.xlsx', await blankForm());
        root.querySelector('#cancel')?.addEventListener('click', close); root.querySelector('#done')?.addEventListener('click', () => { close(); after?.(); });
        root.querySelector('#undo')?.addEventListener('click', async () => { await ctx.undoLoad(); close(); after?.(); });
        root.querySelector('#f').onchange = async e => {
          const f = e.target.files[0]; if (!f) return; err = ''; log = null;
          try {
            const sheets = await readAny(f); fname = f.name; parsed = prep(parseBook(sheets));
            us = { kg: false, pcs: false, w: {}, rem: true, grp: false, n: 12 }; lk = { prod: { mode: 'warn', map: {} }, dish: { mode: 'warn', map: {} } };
            if (!parsed.blocks.length) { // таблица без названий листов: пробуем по типу кнопки
              const only1 = Object.entries(sheets)[0];
              if (only && only1) { const fn = { products: parseProducts, dishes: parseDishes, plan: parsePlan }[only], r = fn(only1[1], only1[0]); parsed.blocks.push({ kind: only, sheet: only1[0], ...r }); }
            }
            st = {}; parsed.blocks.forEach((b, i) => { st[i] = { include: !only || b.kind === only, target: REPOS[b.kind].canAdd() ? 'new' : (REPOS[b.kind].list().find(x => !x.readonly)?.id || 'new'), mode: 'add', dup: 'update', name: f.name.replace(/\.[^.]+$/, '') + (parsed.blocks.filter(x => x.kind === b.kind).length > 1 ? ' ' + b.sheet : '') }; });
            readonly = false; parsed.blocks.forEach(b => { if ((b.items || b.dishes || b.rows || []).some(x => /\S+!/.test(x.srcCell || ''))) readonly = true; });
            sc = scanUnits(parsed.blocks); sc.pieceNames.forEach(n => { if (savedW[n] > 0) us.w[n] = savedW[n]; });
          } catch (x) { err = x.message; parsed = null; }
          refresh();
        };
        if (!parsed || log) return;
        root.querySelectorAll('[data-inc]').forEach(c => c.onchange = () => { st[c.dataset.inc].include = c.checked; refresh(); });
        root.querySelectorAll('[data-tg]').forEach(c => c.onchange = () => { st[c.dataset.tg].target = c.value; refresh(); });
        root.querySelectorAll('[data-nm]').forEach(c => c.onchange = () => { st[c.dataset.nm].name = c.value; });
        root.querySelectorAll('[data-md]').forEach(c => c.onchange = () => { st[c.dataset.md].mode = c.value; refresh(); });
        root.querySelectorAll('[data-dp]').forEach(c => c.onchange = () => { st[c.dataset.dp].dup = c.value; });
        root.querySelector('#ro').onchange = e => { readonly = e.target.checked; refresh(); };
        const radio = (nm, fn) => root.querySelectorAll(`input[name="${nm}"]`).forEach(c => c.onchange = () => { fn(c.value === '1'); refresh(); });
        radio('ukg', v => { us.kg = v; }); radio('upc', v => { us.pcs = v; }); radio('ugr', v => { us.grp = v; });
        root.querySelectorAll('[data-pw]').forEach(c => c.onchange = () => { us.w[c.dataset.pw] = parseFloat(String(c.value).replace(',', '.')) || 0; });
        for (const k of ['prod', 'dish']) root.querySelectorAll(`input[name="lk${k}"]`).forEach(c => c.onchange = () => { lk[k].mode = c.value; refresh(); });
        root.querySelectorAll('[data-lk]').forEach(c => c.onchange = () => { lk[c.dataset.lk].map[c.dataset.n] = c.value; });
        root.querySelector('#urem')?.addEventListener('change', e => { us.rem = e.target.checked; });
        root.querySelector('#ugn')?.addEventListener('change', e => { us.n = Math.max(1, parseInt(e.target.value) || 1); });
        root.querySelector('#go').onclick = async () => {
          try {
            const p2 = readonly ? parsed : { ...parsed, blocks: applyUnits(parsed.blocks, { kg: us.kg, pcs: us.pcs ? us.w : {}, group: us.grp ? us.n : null }) };
            const li = readonly ? { prod: null, dish: null } : linkInfo();
            const lk2 = { prod: { mode: li.prod ? lk.prod.mode : 'warn', map: lk.prod.map, names: li.prod?.names || [] }, dish: { mode: li.dish ? lk.dish.mode : 'warn', map: lk.dish.map, names: li.dish?.names || [] } };
            log = await execute(ctx, p2, st, readonly, fname, lk2);
            if (us.pcs && us.rem && !readonly) { savedW = { ...savedW, ...Object.fromEntries(Object.entries(us.w).filter(([, v]) => v > 0)) }; await store.put('settings', 'pieceWeights', savedW); }
          } catch (x) { err = 'Не удалось загрузить: ' + x.message; }
          refresh();
        };
      },
    };
  });
}

// Загрузка: создаёт/обновляет наборы и запоминает, как отменить
async function execute(ctx, parsed, st, readonly, fname, lk = null) {
  const undo = { created: [], replaced: [], file: fname, at: Date.now() }, out = [], setOf = {};
  const snapshot = (kind, set) => { if (undo.created.some(c => c.id === set.id) || undo.replaced.some(r => r.old.id === set.id)) return; undo.replaced.push({ kind, old: clone(set) }); };
  const meta = { file: fname, loaded: new Date().toISOString(), params: parsed.params || null };
  let newP = null, newD = null;
  const blocks = parsed.blocks;
  for (const kind of ['products', 'dishes', 'plan']) for (const [i, b] of blocks.entries()) {
    const s = st[i]; if (b.kind !== kind || !s.include) continue;
    const rp = REPOS[kind];
    if (s.target === 'new') {
      if (!rp.canAdd()) throw new Error(`Нет места: уже 10 вкладок («${KIND_RU[kind]}»). Выберите существующую вкладку.`);
      let set;
      if (kind === 'products') { set = mkProductSet(b, s.name || fname, readonly, meta); newP = set; }
      else if (kind === 'dishes') { set = { id: nid('m'), name: s.name || fname, readonly, meta, productSetId: newP?.id || prepo.first()?.id, dishes: b.dishes.map(mkDish) }; newD = set; }
      else set = { id: nid('l'), name: s.name || fname, readonly, meta, dishSetId: newD?.id || mrepo.first()?.id, productSetId: newP?.id || newD?.productSetId || prepo.first()?.id, rows: b.rows };
      await rp.add(set); undo.created.push({ kind, id: set.id }); setOf[i] = set;
      out.push(`${KIND_RU[kind]}: новая вкладка «${set.name}» — ${kind === 'products' ? set.items.length + ' продуктов' : kind === 'dishes' ? set.dishes.length + ' блюд' : set.rows.length + ' строк'}${readonly ? ' (оригинал, только чтение)' : ''}`);
    } else {
      const set = rp.get(s.target); snapshot(kind, set); setOf[i] = set;
      if (kind === 'products') {
        const add = b.items.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false }));
        if (s.mode === 'replace') set.items = add; else for (const x of add) { const k = set.items.findIndex(y => y.name === x.name); if (k < 0) set.items.push(x); else if (s.dup === 'update') set.items[k] = { ...x, id: set.items[k].id }; else if (s.dup === 'both') set.items.push({ ...x, name: x.name + ' (2)' }); }
      } else if (kind === 'dishes') {
        const add = b.dishes.map(mkDish);
        if (s.mode === 'replace') set.dishes = add; else for (const x of add) { const k = set.dishes.findIndex(y => y.name === x.name); if (k < 0) set.dishes.push(x); else if (s.dup === 'update') set.dishes[k] = { ...x, id: set.dishes[k].id }; else if (s.dup === 'both') set.dishes.push({ ...x, name: x.name + ' (2)' }); }
      } else { set.rows = s.mode === 'replace' ? b.rows : [...set.rows, ...b.rows]; }
      await rp.save(set); out.push(`${KIND_RU[kind]}: обновлена вкладка «${set.name}» (${s.mode === 'replace' ? 'заменена целиком' : 'добавлено'})`);
    }
  }
  if (!out.length) throw new Error('Ничего не выбрано.');
  if (lk) {
    const fileItems = blocks.filter(b => b.kind === 'products').flatMap(b => b.items), fileDishes = blocks.filter(b => b.kind === 'dishes').flatMap(b => b.dishes);
    const di = blocks.findIndex((b, i) => b.kind === 'dishes' && setOf[i]), pi = blocks.findIndex((b, i) => b.kind === 'plan' && setOf[i]);
    if (di >= 0 && lk.prod.mode !== 'warn') {
      const ps = prepo.get(setOf[di].productSetId);
      if (ps && !ps.readonly) {
        snapshot('products', ps);
        if (lk.prod.mode === 'create') { const add = foundInFile(lk.prod.names, fileItems).filter((x, k, a) => a.indexOf(x) === k); ps.items.push(...add.map(x => ({ id: nid('i'), ...x, on: true, custom: true, src: 'форма Excel', check: false }))); out.push(`Связи: в набор продуктов «${ps.name}» добавлено из файла: ${add.length}`); }
        else { const n = addAliases(ps.items, lk.prod.map); out.push(`Связи: продукты связаны с «${ps.name}»: ${n}`); }
        await prepo.save(ps);
      }
    }
    if (pi >= 0 && lk.dish.mode !== 'warn') {
      const ds = mrepo.get(setOf[pi].dishSetId);
      if (ds && !ds.readonly) {
        snapshot('dishes', ds);
        if (lk.dish.mode === 'create') { const add = foundInFile(lk.dish.names, fileDishes).filter((x, k, a) => a.indexOf(x) === k); ds.dishes.push(...add.map(mkDish)); out.push(`Связи: в набор блюд «${ds.name}» добавлено из файла: ${add.length}`); }
        else { const n = addAliases(ds.dishes, lk.dish.map); out.push(`Связи: блюда связаны с «${ds.name}»: ${n}`); }
        await mrepo.save(ds);
      }
    }
  }
  const bad = blocks.reduce((a, b) => a + b.errors.length, 0); if (bad) out.push(`Пропущено строк с ошибками: ${bad}`);
  await ctx.saveUndo(undo); return out;
}

// ---- отмена последней загрузки ----
async function saveUndo(u) { await store.put('settings', 'lastLoad', u); }
const getUndo = () => store.get('settings', 'lastLoad');
async function undoLoad() {
  const u = await store.get('settings', 'lastLoad'); if (!u) return false;
  for (const c of u.created) { const rp = REPOS[c.kind]; if (rp.get(c.id)) await rp.remove(c.id); }
  for (const r of u.replaced) await REPOS[r.kind].put(r.old);
  await store.del('settings', 'lastLoad'); return true;
}

// Для проверок: загрузить весь файл в новые вкладки без окон
async function loadFileAll(ctx, file, readonly = false) {
  const parsed = prep(parseBook(await readAny(file))), st = {};
  parsed.blocks.forEach((b, i) => { st[i] = { include: true, target: 'new', mode: 'add', dup: 'update', name: file.name.replace(/\.[^.]+$/, '') }; });
  return execute(ctx, parsed, st, readonly, file.name);
}

return {readAny, blankForm, formBook, openLoad, saveUndo, getUndo, undoLoad, loadFileAll};
})();
__m['productsview.js'] = (() => {
// Экран «Продукты»: вкладки-наборы, выделение, таблица, импорт из файла, добавление через Open Food Facts.
const {CATS} = __m['products.js'];
const {repo} = __m['pstore.js'];
const {tabsHtml, bindTabs} = __m['tabsui.js'];
const {readTable, writeXlsx, download} = __m['xlsx.js'];
const {form, bindForm, esc, modal} = __m['ui.js'];
const {openLoad} = __m['loadview.js'];

const ui = { id: null, cat: 'all', q: '' };
const focusSet = id => { ui.id = id; ui.cat = 'all'; }; // открыть вкладку «Продукты» на нужном наборе (кнопка «Настроить» в «Поход»)
const catName = k => (CATS.find(c => c[0] === k) || [, k])[1];
const PF = [
  { k: 'name', label: 'Название' }, { k: 'cat', label: 'Категория', type: 'select', opts: CATS },
  { k: 'kcal', label: 'Ккал на 100 г', type: 'number' }, { k: 'p', label: 'Белки на 100 г', type: 'number' },
  { k: 'f', label: 'Жиры на 100 г', type: 'number' }, { k: 'c', label: 'Углеводы на 100 г', type: 'number' },
  { k: 'pack', label: 'Типовая упаковка', type: 'number', unit: 'г' }, { k: 'unit', label: 'Ед. закупки (пачка, банка…)' },
  { k: 'shelf', label: 'Хранится без холодильника', type: 'number', unit: 'дн', help: 'Сколько дней продукт выдерживает без холодильника. 999 — практически не портится.' },
  { k: 'fresh', label: 'Свежий продукт', type: 'check', help: 'Свежие продукты ставятся в меню только в первые дни, по сроку хранения.' },
  { k: 'price', label: 'Цена упаковки', type: 'number' }, { k: 'tags', label: 'Теги (gluten lactose meat pork nuts spicy)' },
];
const COLS = ['Название', 'Категория', 'Ккал', 'Белки', 'Жиры', 'Углеводы', 'Упаковка_г', 'Хранение_дней', 'Свежий', 'Цена', 'Теги'];
const norm = s => String(s ?? '').toLowerCase().replace(/[\s_]/g, '');
const yes = v => /^(да|yes|y|1|true|\+)$/i.test(String(v ?? '').trim());

const productRows = items => [COLS, ...items.map(p => [p.name, catName(p.cat), p.kcal, p.p, p.f, p.c, p.pack ?? '', p.shelf ?? '', p.fresh ? 'да' : 'нет', p.price ?? '', p.tags || ''])];

// Разбор таблицы в продукты; возвращает {items, errors}
function parseProducts(rows) {
  const hdr = (rows[0] || []).map(norm), at = n => hdr.indexOf(norm(n)), errors = [], items = [];
  for (const need of ['Название', 'Категория', 'Ккал']) if (at(need) < 0) errors.push(`нет колонки «${need}»`);
  if (errors.length) return { items, errors };
  rows.slice(1).forEach((r, i) => {
    const ln = i + 2, g = n => r[at(n)], num = n => { const v = g(n); return v === '' || v == null ? null : (typeof v === 'number' ? v : (isFinite(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : NaN)); };
    if (!r.some(v => v !== '' && v != null)) return;
    const name = String(g('Название') ?? '').trim();
    if (!name) { errors.push(`строка ${ln}: нет названия`); return; }
    const kc = num('Ккал'); if (kc == null) { errors.push(`строка ${ln}: нет ккал`); return; } if (isNaN(kc)) { errors.push(`строка ${ln}: ккал не число`); return; }
    const cn = norm(g('Категория')), cat = (CATS.find(c => c[0] === cn || norm(c[1]) === cn) || CATS.find(c => norm(c[1]).startsWith(cn) && cn.length > 2) || [])[0];
    if (!cat) { errors.push(`строка ${ln}: неизвестная категория «${g('Категория')}»`); return; }
    const bad = ['Белки', 'Жиры', 'Углеводы', 'Упаковка_г', 'Хранение_дней', 'Цена'].find(n => at(n) >= 0 && isNaN(num(n)));
    if (bad) { errors.push(`строка ${ln}: поле «${bad}» не число`); return; }
    const shelf = at('Хранение_дней') >= 0 ? num('Хранение_дней') : null, fresh = at('Свежий') >= 0 ? yes(g('Свежий')) : false;
    items.push({ id: 'i' + Date.now().toString(36) + items.length, name, cat, kcal: kc, p: (at('Белки') >= 0 && num('Белки')) || 0, f: (at('Жиры') >= 0 && num('Жиры')) || 0, c: (at('Углеводы') >= 0 && num('Углеводы')) || 0, pack: at('Упаковка_г') >= 0 ? num('Упаковка_г') : null, shelf: shelf ?? 365, fresh, price: at('Цена') >= 0 ? num('Цена') : null, tags: at('Теги') >= 0 ? String(g('Теги') ?? '') : '', unit: 'пачка', src: 'файл', check: false, on: true, custom: true });
  });
  return { items, errors };
}

async function searchOff(q) {
  const enc = encodeURIComponent(q), tries = [
    [`https://search.openfoodfacts.org/search?q=${enc}&page_size=12&fields=product_name,nutriments,quantity,brands`, j => j.hits],
    [`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,nutriments,quantity,brands`, j => j.products],
  ];
  let list = null, last = '';
  for (const [url, pick] of tries) {
    try { const r = await fetch(url); if (r.ok) { list = pick(await r.json()) || []; break; } last = 'ошибка ' + r.status; } catch (e) { last = 'нет связи'; }
  }
  if (!list) throw new Error('Open Food Facts: ' + last);
  return list.filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null).map(mapOff);
}
const mapOff = p => {
  const n = p.nutriments, m = /([\d.,]+)\s*(kg|кг|g|г)/i.exec(p.quantity || ''), br = Array.isArray(p.brands) ? p.brands[0] : (p.brands || '').split(',')[0];
  return { name: (p.product_name || 'Продукт') + (br ? ` (${br})` : ''), kcal: Math.round(n['energy-kcal_100g'] || 0), p: +(n.proteins_100g || 0).toFixed(1), f: +(n.fat_100g || 0).toFixed(1), c: +(n.carbohydrates_100g || 0).toFixed(1), pack: m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/k|к/i.test(m[2]) ? 1000 : 1)) : null };
};
async function byBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments,quantity,brands`);
  const j = await r.json(); if (j.status !== 1 || !j.product?.nutriments) throw new Error('Продукт с таким штрихкодом не найден');
  return mapOff(j.product);
}
async function scan(video, onCode) {
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream; await video.play();
  (async function loop() {
    if (!stream.active) return;
    try { const r = await det.detect(video); if (r[0]) { stream.getTracks().forEach(t => t.stop()); onCode(r[0].rawValue); return; } } catch { /* кадр не готов */ }
    setTimeout(loop, 300);
  })();
}

const blank = (o = {}, src = 'вручную') => ({ id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 99), name: '', cat: 'sweet', kcal: 0, p: 0, f: 0, c: 0, pack: null, shelf: 365, fresh: false, tags: '', unit: 'пачка', price: null, src, check: false, on: true, custom: true, ...o });

function editProduct(set, p, done) {
  if (set.readonly) return;
  const isNew = !set.items.includes(p);
  modal(() => ({
    title: isNew ? 'Новый продукт' : p.name,
    html: `<p class="muted small">Источник: ${esc(p.src)}</p>${form(PF, p)}<div class="btnrow"><button class="btn" id="sv">Сохранить</button>${isNew ? '' : '<button class="btn danger" id="del">Удалить</button>'}<button class="btn ghost" id="cn">Закрыть</button></div>`,
    bind(root, refresh, close) {
      bindForm(root, PF, p, () => {}, refresh);
      root.querySelector('#sv').onclick = async () => { if (!p.name.trim()) return; if (isNew) set.items.push(p); await repo.save(set); close(); done(); };
      root.querySelector('#del')?.addEventListener('click', async () => { set.items = set.items.filter(x => x !== p); await repo.save(set); close(); done(); });
      root.querySelector('#cn').onclick = close;
    },
  }));
}

function addProductDialog(set, done) {
  let found = null, msg = '';
  modal(() => ({
    title: 'Добавить продукт',
    html: `<p class="muted">Введите название — поищем в Open Food Facts и заполним КБЖУ. Нужен интернет.</p>
      <div class="two"><input id="name" class="search" placeholder="Например: гречка"><button class="btn" id="find" style="width:auto;margin:0">Найти</button></div>
      <p class="warnmsg">${esc(msg)}</p>
      ${found ? `<ul class="list">${found.map((f, i) => `<li><button data-pick="${i}"><span>${esc(f.name)}</span><span class="muted">${f.kcal} ккал · Б${f.p} Ж${f.f} У${f.c}</span></button></li>`).join('') || '<li class="muted">Ничего не нашлось</li>'}</ul>` : ''}
      <h3>Штрихкод</h3><div class="two"><input id="code" class="search" inputmode="numeric" placeholder="Номер под штрихкодом"><button class="btn" id="bc" style="width:auto;margin:0">Найти</button></div>
      ${'BarcodeDetector' in window ? '<button class="btn ghost" id="cam">Сканировать камерой</button><video id="vid" playsinline muted style="width:100%;display:none"></video>' : '<p class="muted small">Сканирование камерой есть в Chrome на Android; здесь можно ввести номер.</p>'}
      <button class="btn ghost" id="manual">Ввести вручную</button>`,
    bind(root, refresh, close) {
      const open = (o, src) => { close(); editProduct(set, blank(o, src), done); };
      root.querySelector('#find').onclick = async () => { const n = root.querySelector('#name').value.trim(); if (!n) return; msg = 'Ищу…'; refresh(); try { found = await searchOff(n); msg = ''; } catch (e) { msg = e.message + '. Проверьте интернет или введите вручную.'; found = null; } refresh(); };
      root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => open(found[+b.dataset.pick], 'Open Food Facts'));
      const useCode = async code => { msg = 'Ищу…'; refresh(); try { open(await byBarcode(code), 'Open Food Facts'); } catch (e) { msg = e.message; refresh(); } };
      root.querySelector('#bc').onclick = () => { const c = root.querySelector('#code').value.trim(); if (c) useCode(c); };
      root.querySelector('#cam')?.addEventListener('click', async () => { const v = root.querySelector('#vid'); v.style.display = 'block'; try { await scan(v, useCode); } catch { msg = 'Нет доступа к камере'; refresh(); } });
      root.querySelector('#manual').onclick = () => open({ name: root.querySelector('#name').value.trim() || 'Новый продукт' }, 'вручную');
    },
  }));
}

function importDialog(done) {
  let res = null, fname = '', err = '';
  modal(() => ({
    title: 'Набор из файла',
    html: `<p class="muted">Файл .xlsx, .csv или .json с колонками: ${COLS.join('; ')}. Обязательные: Название, Категория, Ккал.</p>
      <div class="btnrow"><label class="btn ghost filebtn">Выбрать файл<input type="file" id="f" accept=".xlsx,.csv,.json" hidden></label><button class="btn ghost" id="tpl">Скачать шаблон</button></div>
      <p class="warnmsg">${esc(err)}</p>
      ${res ? `<h3>Предпросмотр: найдено продуктов ${res.items.length}${res.errors.length ? `, ошибок ${res.errors.length}` : ''}</h3>
        ${res.errors.length ? `<ul class="warnlist">${res.errors.slice(0, 30).map(e => `<li>${esc(e)}</li>`).join('')}${res.errors.length > 30 ? `<li>…и ещё ${res.errors.length - 30}</li>` : ''}</ul><p class="muted small">Строки с ошибками не загрузятся.</p>` : ''}
        <div class="tbl"><table class="dtable"><tr><th>Название</th><th>Категория</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th></tr>${res.items.slice(0, 8).map(p => `<tr><td>${esc(p.name)}</td><td>${catName(p.cat)}</td><td>${p.kcal}</td><td>${p.p}</td><td>${p.f}</td><td>${p.c}</td></tr>`).join('')}</table></div>
        <div class="fld"><label>Название набора</label><div class="ctl"><input id="nm" value="${esc(fname)}" style="width:220px;text-align:left"></div></div>
        <div class="btnrow"><button class="btn" id="load" ${res.items.length ? '' : 'disabled'}>Загрузить ${res.items.length} продуктов</button></div>` : ''}`,
    bind(root, refresh, close) {
      root.querySelector('#tpl').onclick = async () => download('Шаблон_набора_продуктов.xlsx', await writeXlsx([{ name: 'Продукты', rows: [COLS, ['Гречка', 'Крупы и макароны', 313, 12.6, 3.3, 62.1, 800, 999, 'нет', 120, '']] }]));
      root.querySelector('#f').onchange = async e => {
        const f = e.target.files[0]; if (!f) return; err = '';
        try { res = parseProducts(await readTable(f)); fname = f.name.replace(/\.[^.]+$/, ''); } catch (x) { err = x.message; res = null; } refresh();
      };
      root.querySelector('#load')?.addEventListener('click', async () => {
        const s = await repo.add({ id: repo.uid(), name: root.querySelector('#nm').value.trim() || fname || 'Из файла', items: res.items }); close(); done(s.id);
      });
    },
  }));
}

const views = {
  products(_, ctx) {
    const trip = ctx.trip(), sets = repo.list();
    if (!repo.get(ui.id)) ui.id = (repo.get(trip.productSet) || repo.first()).id;
    const set = repo.get(ui.id), q = ui.q.trim().toLowerCase();
    const scope = set.items.filter(p => ui.cat === 'all' || p.cat === ui.cat);
    const list = scope.filter(p => !q || p.name.toLowerCase().includes(q));
    const sel = set.items.filter(p => p.on).length;
    return {
      html: `<h2>Продукты</h2>${tabsHtml(sets, set.id, trip.productSet)}
        <div class="btnrow">${set.readonly ? '' : '<button class="mini" id="ren">Переименовать</button>'}<button class="mini" id="dup" ${repo.canAdd() ? '' : 'disabled'}>Дублировать</button><button class="mini" id="del">Удалить</button><button class="mini" id="exp">В файл</button><button class="mini" id="use">${set.id === trip.productSet ? 'Используется в походе ✓' : 'Использовать в походе'}</button></div>
        <input id="q" class="search" placeholder="Поиск по названию" value="${esc(ui.q)}">
        <div class="chips"><button data-c="all" class="${ui.cat === 'all' ? 'on' : ''}">Все</button>${CATS.map(([k, n]) => `<button data-c="${k}" class="${ui.cat === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="btnrow"><button class="btn ghost" data-sel="all">Выбрать все</button><button class="btn ghost" data-sel="none">Снять все выделение</button><button class="btn ghost" data-sel="inv">Инвертировать</button><span class="muted">${ui.cat === 'all' ? 'для всех продуктов' : 'для категории «' + catName(ui.cat) + '»'} · <b>выбрано ${sel} из ${set.items.length}</b></span>${set.readonly ? '' : '<button class="btn" id="addp" style="margin-left:auto">Добавить продукт</button>'}</div>
        <div class="btnrow"><button class="btn ghost" id="ldp">Загрузить продукты</button><button class="btn ghost" id="lda">Загрузить всё из файла</button>${set.readonly ? '<span class="muted small">🔒 Оригинал, только чтение: скопируйте набор («Дублировать»), чтобы менять.</span>' : ''}</div>
        <div class="tbl"><table class="dtable ptable"><tr><th></th><th>Название</th><th>Категория</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th><th>Упак., г</th><th>Хран., дн</th><th>Цена</th></tr>
        ${list.map(p => `<tr data-p="${p.id}"><td><input type="checkbox" data-on="${p.id}"${p.on ? ' checked' : ''}${set.readonly ? ' disabled' : ''}></td><td>${esc(p.name)}${p.check ? ' <span class="dot">?</span>' : ''}${p.kcal == null || (p.baseUnit && p.baseUnit !== 'г') ? ' <span class="bad small">не считается</span>' : ''}${p.fresh ? ' <span class="muted small">свежий</span>' : ''}</td><td>${esc(p.catOrig ?? catName(p.cat))}</td><td>${p.kcal ?? ''}</td><td>${p.p ?? ''}</td><td>${p.f ?? ''}</td><td>${p.c ?? ''}</td><td>${p.pack ?? ''}${p.baseUnit && p.baseUnit !== 'г' ? ` <span class="muted small">${esc(p.baseUnit)}</span>` : ''}</td><td>${p.shelf == null ? '' : p.shelf >= 999 ? '∞' : p.shelf}</td><td>${p.price ?? ''}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Ничего не найдено</td></tr>'}</table></div>`,
      bind(root) {
        const re = () => ctx.rerender();
        bindTabs(root, { repo, rerender: re, onSelect: id => { ui.id = id; ui.cat = 'all'; re(); }, onAdd: () => addSetDialog(set, id => { ui.id = id; re(); }, re, ctx) });
        const q2 = root.querySelector('#q'); q2.oninput = () => { ui.q = q2.value; const pos = q2.selectionStart; re(); const n = document.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); };
        root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { ui.cat = b.dataset.c; re(); });
        root.querySelectorAll('[data-on]').forEach(c => c.onchange = async () => { set.items.find(p => p.id === c.dataset.on).on = c.checked; await repo.save(set); re(); });
        root.querySelectorAll('[data-sel]').forEach(b => b.onclick = async () => { if (set.readonly) return; const m = b.dataset.sel; scope.forEach(p => { p.on = m === 'all' ? true : m === 'none' ? false : !p.on; }); await repo.save(set); re(); });
        root.querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = e => { if (e.target.tagName !== 'INPUT') editProduct(set, set.items.find(p => p.id === tr.dataset.p), re); });
        root.querySelector('#addp')?.addEventListener('click', () => addProductDialog(set, re));
        root.querySelector('#ldp').onclick = () => openLoad(ctx, { only: 'products', after: re });
        root.querySelector('#lda').onclick = () => openLoad(ctx, { after: re });
        root.querySelector('#ren')?.addEventListener('click', async () => { const n = prompt('Название набора', set.name); if (n && n.trim()) { set.name = n.trim(); await repo.save(set); re(); } });
        root.querySelector('#dup').onclick = async () => { const s = await repo.add({ ...JSON.parse(JSON.stringify(set)), id: repo.uid(), name: set.name + ' (копия)', builtin: false }); ui.id = s.id; re(); };
        root.querySelector('#del').onclick = async () => {
          if (sets.length < 2) { alert('Последний набор удалить нельзя.'); return; }
          if (!confirm(`Удалить набор «${set.name}»?`)) return;
          await repo.remove(set.id); if (trip.productSet === set.id) { trip.productSet = repo.first().id; ctx.saveTrip(); } ui.id = repo.first().id; re();
        };
        root.querySelector('#exp').onclick = async () => download(`Продукты_${set.name}.xlsx`, await writeXlsx([{ name: 'Продукты', rows: productRows(set.items) }]));
        root.querySelector('#use').onclick = () => { trip.productSet = set.id; ctx.saveTrip(); re(); };
      },
    };
  },
};

function addSetDialog(cur, done, rerender, ctx) {
  modal(() => ({
    title: 'Новый набор продуктов',
    html: `<ul class="list"><li><button data-k="empty">Пустой набор<span>›</span></button></li><li><button data-k="copy">Копия текущего («${esc(cur.name)}»)<span>›</span></button></li><li><button data-k="file">Из файла (.xlsx, .csv, .json)<span>›</span></button></li><li><button data-k="manual">Вручную, по одному продукту<span>›</span></button></li></ul>`,
    bind(root, refresh, close) {
      root.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
        const k = b.dataset.k; close();
        if (k === 'file') return openLoad(ctx, { only: 'products', after: rerender }); // общее окно загрузки; старое importDialog больше не вызывается
        const name = prompt('Название набора', k === 'copy' ? cur.name + ' (копия)' : 'Новый набор'); if (!name) return;
        const s = await repo.add({ id: repo.uid(), name: name.trim(), items: k === 'copy' ? JSON.parse(JSON.stringify(cur.items)) : [] });
        done(s.id); if (k === 'manual') setTimeout(() => addProductDialog(s, rerender), 50);
      });
    },
  }));
}

return {focusSet, COLS, productRows, parseProducts, searchOff, byBarcode, views};
})();
__m['meals.js'] = (() => {
// Приёмы пищи в дне: список «слотов» {id, type b|l|d|s, name?, share %}. По умолчанию: завтрак, перекус, обед, перекус, ужин.
// Меню хранит приём по id слота; тип слота определяет, какие блюда ему подходят (dish.meal).
const TYPE_NAMES = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const TYPES = Object.entries(TYPE_NAMES);

// P — параметры; доли по умолчанию берутся из split_b / split_s / split_l / split_d (25/10/25/10/30)
const defaultMeals = P => [
  { id: 'b', type: 'b', share: P?.split_b ?? 25 }, { id: 's', type: 's', share: P?.split_s ?? 10 }, { id: 'l', type: 'l', share: P?.split_l ?? 25 },
  { id: 's2', type: 's', share: P?.split_s ?? 10 }, { id: 'd', type: 'd', share: P?.split_d ?? 30 },
];
const mealsOf = (trip, P) => (trip?.meals?.length ? trip.meals : defaultMeals(P));
const shareSum = slots => slots.reduce((a, s) => a + (+s.share || 0), 0);

// Подпись приёма: своё имя или название типа; одинаковые типы нумеруются («Перекус 1», «Перекус 2»)
function slotLabel(slots, id) {
  const k = slots.findIndex(s => s.id === id); if (k < 0) return TYPE_NAMES[id] || id;
  const s = slots[k]; if (s.name) return s.name;
  const same = slots.filter(x => x.type === s.type && !x.name);
  return same.length > 1 ? `${TYPE_NAMES[s.type]} ${same.indexOf(s) + 1}` : TYPE_NAMES[s.type];
}
const slotById = (slots, id) => slots.find(s => s.id === id);
const newSlotId = slots => { let k = 1; while (slots.some(s => s.id === 'x' + k)) k++; return 'x' + k; };
// Слот для строки плана/загрузки: первый слот нужного типа
const firstSlotOfType = (slots, type) => slots.find(s => s.type === type)?.id ?? null;

// Редактирование списка (чистые функции, возвращают новый список)
const moveSlot = (slots, i, d) => { const j = i + d; if (j < 0 || j >= slots.length) return slots; const a = slots.slice(); [a[i], a[j]] = [a[j], a[i]]; return a; };
const removeSlot = (slots, i) => (slots.length > 1 ? slots.filter((_, k) => k !== i) : slots);
const addSlot = (slots, type = 's', share = 10) => [...slots, { id: newSlotId(slots), type, share }];

return {TYPE_NAMES, TYPES, defaultMeals, mealsOf, shareSum, slotLabel, slotById, newSlotId, firstSlotOfType, moveSlot, removeSlot, addSlot};
})();
__m['menu.js'] = (() => {
// Генератор меню: собирает меню ТОЛЬКО из готовых блюд выбранного набора меню и продуктов выбранного набора продуктов.
// Блюдо: {id, meal b|l|d|s, name, cook, cond[], on, ing:[{name (допустимо «А|Б»), g, min, max}]} — граммы на человека при «стандарте».
const {mealsOf, slotLabel, slotById} = __m['meals.js'];
const MEALS = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const ONION = /(^|[\s(])(лук|чеснок)/i; // лук и чеснок отдельными продуктами не предлагаем

const has = (txt, w) => w && txt.toLowerCase().includes(w.toLowerCase());
// Подходит ли продукт всем участникам (вегетарианство, аллергии, «не ест»)
function allowed(prod, group) {
  const tags = (prod.tags || '').split(/\s+/), nm = prod.name;
  return group.every(p => !((p.veg && tags.includes('meat')) || (p.allergy && p.allergy.split(/[,;]/).some(a => a.trim() && (has(nm, a.trim()) || tags.includes(a.trim().toLowerCase()))))
    || (p.dislike && p.dislike.split(/[,;]/).some(a => a.trim() && has(nm, a.trim())))));
}
const itemsKcal = (items, prods) => items.reduce((s, it) => s + (it.skip ? 0 : (prods.find(p => p.id === it.pid)?.kcal || 0) * it.g / 100), 0);
const norm = s => String(s).trim().toLowerCase();
// Продукты по названию; p.aliases — названия из файла, которые пользователь связал с этим продуктом (имя в данных не меняется)
const nameMap = items => { const m = new Map(); for (const p of items) { m.set(norm(p.name), p); for (const a of p.aliases || []) if (!m.has(norm(a))) m.set(norm(a), p); } return m; };
const altNames = ing => String(ing.name).split('|').map(norm).filter(Boolean);

function dayFlags(cd, i, P) {
  const d = cd.d, tavg = cd.per[0]?.t, tmax = d.tdmax ?? d.tday;
  return { rest: d.type === 'Днёвка' || d.type === 'Запасной', hot: tmax != null && tmax > P.hot_t, cold: tavg != null && tavg < P.cold_cond_t, alt3000: (d.maxAlt || 0) > 3000, first2: i < P.fresh_days, assault: d.type === 'Штурмовой' };
}
const condOk = (dish, f) => { const c = dish.cond || []; return !c.length || c.includes('any') || c.some(k => f[k]); };
const isHotLunch = d => d.meal === 'l' && !(d.cond || []).includes('any') && (d.cond || []).some(k => k === 'rest' || k === 'cold');

function freshOk(p, i, flags) { return !p.fresh || i + 1 <= Math.round((p.shelf ?? 999) * (flags.hot ? 1 : 1.5)); }
function candidates(ing, ctx) {
  const names = altNames(ing);
  return names.map(n => ctx.byName.get(n)).filter(p => p && p.on && !ONION.test(p.name) && allowed(p, ctx.group) && freshOk(p, ctx.i, ctx.flags));
}
function pick(ing, ctx, salt) {
  const c = candidates(ing, ctx); if (!c.length) return null;
  if (c.length > 1) {
    if (ctx.flags.hot) { const h = c.find(p => (p.tags || '').includes('heat')); if (h) return h; }
    else { const nh = c.filter(p => !(p.tags || '').includes('heat')); if (nh.length) return nh[(ctx.i + salt) % nh.length]; }
  }
  return c[(ctx.i + salt) % c.length];
}
const lim = (ing, k, def) => (ing[k] != null && ing[k] !== '' ? +ing[k] : def);

// Масштабирование блюда под бюджет (ккал на человека). Возвращает {items(на 1 чел), kcal, grams} или null.
// lunchP — параметры, если нужно соблюсти группы холодного обеда (порция растёт, пока правило не выполнится).
function scale(dish, ctx, perPerson, salt, minKcal, lunchP = null) {
  const base = dish.ing.map((ing, k) => ({ ing, p: pick(ing, ctx, salt + k) }));
  if (base.some(b => !b.p)) return null;
  const nong = b => b.ing.unit && b.ing.unit !== 'г';
  const ratio = (b, f) => { if (nong(b)) return 1; const g = b.ing.g; return Math.max(lim(b.ing, 'min', g * .7) / g, Math.min(lim(b.ing, 'max', g * 1.5) / g, f)); };
  const kc = f => base.reduce((s, b) => s + (nong(b) ? 0 : b.ing.g * ratio(b, f) * (b.p.kcal || 0) / 100), 0);
  const itemsAt = f => base.map(b => ({ pid: b.p.id, g: b.ing.g * ratio(b, f), cat: b.p.cat, tags: b.p.tags || '', name: b.p.name, unit: b.ing.unit || 'г', skip: nong(b) ? `единица «${b.ing.unit}», не граммы` : null }));
  const k0 = kc(1) || 1; let f = Math.max(.3, Math.min(3, perPerson / k0)), guard = 0;
  const fail = () => (minKcal && kc(f) < minKcal) || (lunchP && !lunchOk(itemsAt(f), lunchP));
  while (fail() && f < 3 && guard++ < 80) f += .05;
  if (fail()) return null;
  const items = itemsAt(f);
  return { items, kcal: kc(f), grams: items.reduce((s, i) => s + i.g, 0) };
}
const gsum = (items, cats, tag) => items.filter(i => cats.includes(i.cat) || (tag && i.tags.includes(tag))).reduce((s, i) => s + i.g, 0);
// Правило обеда-перекуса: углеводная основа ≥50 г, белок/жир ≥40 г, сладкое ≥30 г (для холодного обеда)
const lunchGroups = items => ({ carb: gsum(items, ['bread']), prot: gsum(items, ['meat', 'cheese'], 'protein'), sweet: gsum(items, ['sweet']) });
const lunchOk = (items, P) => { const g = lunchGroups(items); return g.carb >= P.lunch_carb && g.prot >= P.lunch_prot && g.sweet >= P.lunch_sweet; };
const carbShare = items => { let c = 0, t = 0; items.forEach(i => { t += i.g; if (['sweet', 'bread', 'grain', 'nuts'].includes(i.cat)) c += i.g; }); return t ? c / t : 0; };
const round5 = g => Math.max(1, g < 20 ? Math.round(g) : Math.round(g / 5) * 5);

function minFor(m, P, covK) {
  const k = Math.max(.8, Math.min(1, covK));
  return { b: P.min_b * k, l: P.min_l * k, d: P.min_d * k, s: 0 }[m];
}

function usable(dish, m, ctx, perPerson, P, covK) {
  if (!dish.on || dish.meal !== m || !condOk(dish, ctx.flags)) return null;
  const sc = scale(dish, ctx, perPerson, ctx.i, minFor(m, P, covK) * 1.02, m === 'l' && !isHotLunch(dish) ? P : null);
  if (!sc) return null;
  if (m === 'l' && sc.grams < P.min_l_g) return null;
  return sc;
}

const mainGrain = (dish, ctx) => { const ing = dish.ing[0]; if (!ing) return null; const p = pick(ing, ctx, ctx.i); return p && p.cat === 'grain' ? p.id : null; };

function toEntry(dish, sc, n, ctx) {
  const items = sc.items.map(it => ({ pid: it.pid, g: it.skip ? Math.round(it.g * n * 100) / 100 : round5(it.g * n), unit: it.unit, skip: it.skip }));
  return { dish: dish.id, name: dish.name, items, cook: dish.cook || 0, perKcal: Math.round(sc.kcal), perGrams: Math.round(sc.grams), pin: false };
}

// Полная сборка меню. old — прежнее меню (закреплённые блюда сохраняются)
function buildMenu(trip, calc, mset, pset, P, old = null, seed = 0) {
  const group = trip.group, n = calc.summary.n, prods = pset?.items || [], warnings = [], days = [];
  if (!mset || !prods.length) return { days: calc.days.map(() => ({})), warnings: ['Не выбран набор меню или набор продуктов.'], seed };
  const byName = nameMap(prods);
  const usage = {}, lastMeal = {};
  const cov = calc.days.length ? calc.days[0].cover : 0.67, covK = cov / 0.67;
  const hotLunchAlways = trip.food.lunchHot || String(trip.food.hot) === '3';
  // приёмы дня — список слотов (по умолчанию завтрак, перекус, обед, перекус, ужин); «перекусы в личке» не кладём в раскладку, их долю получают остальные приёмы
  const slots = mealsOf(trip, P), personalSn = trip.prefs?.snacks === 'personal';
  const snSum = slots.filter(s => s.type === 's').reduce((a, s) => a + (+s.share || 0), 0), mainK = personalSn && snSum < 100 ? 100 / (100 - snSum) : 1;
  calc.days.forEach((cd, i) => {
    const flags = dayFlags(cd, i, P), ctx = { i, flags, byName, group, n }, day = {}, used = new Set(), snackUsed = new Set(), perDay = cd.target / n;
    const adj = m => ((trip.adj?.meal?.[m] ?? 0) / 100 + 1) * ((trip.adj?.dayType?.[cd.d.type] ?? 0) / 100 + 1);
    slots.forEach((slot, mi) => {
      const m = slot.type, id = slot.id, budget = perDay * (+slot.share || 0) / 100 * adj(m) * (m === 's' ? 1 : mainK), prev = old?.days?.[i]?.[id];
      if (prev?.fixed) { day[id] = prev; return; }
      if (prev?.empty) { day[id] = { empty: true, items: [] }; return; }
      if (m === 's' && personalSn) { day[id] = { items: [], name: 'Перекус (в личке)', personal: true }; return; }
      let dishes = mset.dishes.filter(d => d.meal === m);
      if (prev?.pin && prev.dish) { const d = dishes.find(x => x.id === prev.dish); const sc = d && scale(d, ctx, budget, i, 0); if (sc) { day[id] = { ...toEntry(d, sc, n, ctx), pin: true }; usage[d.id] = (usage[d.id] || 0) + 1; lastMeal[id] = d.id; const g = mainGrain(d, ctx); if (g) used.add(g); return; } }
      let cand = dishes.map(d => ({ d, sc: usable(d, m, ctx, budget, P, covK) })).filter(x => x.sc);
      if (!cand.length && m === 's') { day[id] = buildSnack(budget * n, n, ctx, prods, P, i + mi * 3, snackUsed); return; } // блюд-перекусов в наборе нет — собираем из продуктов
      if (m === 'l') {
        const hot = cand.filter(x => isHotLunch(x.d)), cold = cand.filter(x => !isHotLunch(x.d));
        if (hotLunchAlways && hot.length) cand = hot; else if ((flags.rest || flags.cold) && hot.length) cand = hot; else if (cold.length) cand = cold;
      }
      if (flags.assault) { const q = cand.filter(x => (x.d.cook || 0) <= P.assault_cook); cand = q.length ? q : [...cand].sort((a, b) => (a.d.cook || 0) - (b.d.cook || 0)).slice(0, 2); }
      const fresh = cand.filter(x => x.d.id !== lastMeal[id]); if (fresh.length) cand = fresh;
      const nograin = cand.filter(x => { const g = mainGrain(x.d, ctx); return !g || !used.has(g); }); if (nograin.length) cand = nograin;
      const recent = did => menuRecent(days, i, slot.id, did, P.rot_days);
      const h = id => { let x = 0; for (const ch of id + seed + i + m) x = (x * 31 + ch.charCodeAt(0)) % 997; return x % 10; };
      cand.sort((a, b) => {
        const sc = x => (usage[x.d.id] || 0) * 4 + (recent(x.d.id) ? 20 : 0) + h(x.d.id) + Math.abs(x.sc.kcal - budget) / 40 + ((flags.alt3000 && (m === 'l')) ? -carbShare(x.sc.items) * 12 : 0) - (trip.ratings?.[x.d.id] || 0) * 3;
        return sc(a) - sc(b);
      });
      const best = cand[0];
      if (!best) { day[id] = { empty: true, items: [], none: true }; warnings.push(`День ${i + 1}, ${slotLabel(slots, id).toLowerCase()}: нет подходящего блюда в наборе (проверьте продукты и условия блюд)`); return; }
      usage[best.d.id] = (usage[best.d.id] || 0) + 1; lastMeal[id] = best.d.id; const g = mainGrain(best.d, ctx); if (g) used.add(g);
      day[id] = toEntry(best.d, best.sc, n, ctx);
    });
    days.push(day);
  });
  // проверки минимумов по каждому дню
  days.forEach((d, i) => slots.forEach(slot => { const e = d[slot.id]; if (!e || e.empty) return; const per = itemsKcal(e.items, prods) / n, mn = minFor(slot.type, P, covK); if (per < mn * 0.97) warnings.push(`День ${i + 1}, ${slotLabel(slots, slot.id).toLowerCase()}: ${Math.round(per)} ккал на человека, меньше минимума ${Math.round(mn)}`); }));
  // при заданных минимумах приёмов день может выйти за цель — говорим об этом, а не молча урезаем
  calc.days.forEach((cd, i) => { const per = slots.reduce((s, sl) => s + itemsKcal(days[i][sl.id]?.items || [], prods), 0) / n, tg = cd.target / n; if (tg > 0 && per > tg * 1.05) warnings.push(`День ${i + 1}: меню даёт ${Math.round(per)} ккал на человека при цели ${Math.round(tg)} (больше на ${Math.round((per / tg - 1) * 100)}%): сработали минимумы приёмов`); });
  return { days, warnings, seed };
}
const menuRecent = (days, i, m, id, k) => days.slice(Math.max(0, i - k + 1)).some(d => d[m]?.dish === id);

// Перекус из продуктов набора на свой бюджет rem (ккал на всю группу). salt — чтобы перекусы разных приёмов и дней отличались; usedSet — продукты, уже взятые в перекусы этого дня
function buildSnack(rem, n, ctx, prods, P, salt, usedSet) {
  const i = ctx.i;
  if (rem < 50 * n) return { items: [], name: 'Перекус', kcalLeft: 0 };
  let cand = prods.filter(p => p.on && ['sweet', 'nuts'].includes(p.cat) && p.kcal > 150 && !/паста/i.test(p.name) && !ONION.test(p.name) && allowed(p, ctx.group) && freshOk(p, i, ctx.flags));
  const unused = cand.filter(p => !usedSet.has(p.id)); if (unused.length >= 3) cand = unused;
  if (ctx.flags.alt3000) { const sw = cand.filter(p => p.f < 25 || p.c > 55); if (sw.length >= 3) cand = sw; }
  if (!cand.length) return { items: [], name: 'Перекус' };
  cand.sort((a, b) => ((a.name.charCodeAt(0) + salt * 7) % 11) - ((b.name.charCodeAt(0) + salt * 7) % 11));
  const cap = P.snack_cap * n; let k = Math.min(3, cand.length), items = [];
  for (; k <= Math.min(6, cand.length); k++) {
    items = cand.slice(0, k).map(p => ({ pid: p.id, g: Math.min(cap, round5(rem / k / p.kcal * 100)) }));
    if (itemsKcal(items, prods) >= rem * .93) break;
  }
  items.forEach(it => usedSet.add(it.pid));
  return { items, name: 'Перекус из набора', pin: false, dish: null };
}

// Повтор сборки одного приёма с выбранным блюдом (ручная замена)
function mealFor(trip, calc, mset, pset, P, i, m, dishId) {
  const cd = calc.days[i], n = calc.summary.n, prods = pset.items, byName = nameMap(prods);
  const ctx = { i, flags: dayFlags(cd, i, P), byName, group: trip.group, n }, d = mset.dishes.find(x => x.id === dishId);
  const sl = slotById(mealsOf(trip, P), m) || { share: P['split_' + m] }, sc = d && scale(d, ctx, cd.target / n * (+sl.share || 0) / 100, i, 0);
  return sc ? { ...toEntry(d, sc, n, ctx), pin: true } : { empty: true, items: [] };
}
function possibleFor(trip, calc, mset, pset, P, i, m) {
  const n = calc.summary.n, cd = calc.days[i], byName = nameMap(pset.items);
  const ctx = { i, flags: dayFlags(cd, i, P), byName, group: trip.group, n }, covK = calc.days[0].cover / 0.67;
  const sl = slotById(mealsOf(trip, P), m) || { type: m, share: P['split_' + m] }, type = sl.type;
  return mset.dishes.filter(d => d.meal === type && usable(d, type, ctx, cd.target / n * (+sl.share || 0) / 100, P, covK));
}
const findDish = (mset, id) => mset?.dishes.find(d => d.id === id);

// Проблемы набора меню относительно набора продуктов: [{dish, ing, alts:[{name,state}]}], state: ok | off | missing
function menuProblems(mset, pset) {
  const byName = nameMap(pset?.items || []), out = [];
  (mset?.dishes || []).forEach(d => d.ing.forEach(ing => {
    const alts = altNames(ing).map(n => { const p = byName.get(n); return { name: n, id: p?.id, state: !p ? 'missing' : p.on ? 'ok' : 'off' }; });
    if (!alts.some(a => a.state === 'ok')) out.push({ dish: d, ing, alts });
  }));
  return out;
}
const menuWarnings = menu => menu?.warnings || [];

// Таблица «ккал / граммы / БЖУ на человека» для блюда (для отчёта-проверки)
function dishFacts(dish, byName) {
  let kcal = 0, g = 0, p = 0, f = 0, c = 0; const items = [];
  for (const ing of dish.ing) { const pr = altNames(ing).map(n => byName.get(n)).find(Boolean); if (!pr) continue; kcal += ing.g * pr.kcal / 100; g += ing.g; p += ing.g * pr.p / 100; f += ing.g * pr.f / 100; c += ing.g * pr.c / 100; items.push({ g: ing.g, cat: pr.cat, tags: pr.tags || '', name: pr.name }); }
  return { kcal, g, p, f, c, items };
}

return {MEALS, allowed, itemsKcal, nameMap, altNames, lunchGroups, buildMenu, mealFor, possibleFor, findDish, menuProblems, menuWarnings, dishFacts};
})();
__m['menuview.js'] = (() => {
// Экран «Меню»: вкладки-наборы меню, список блюд по приёмам пищи, редактор блюда, проверка продуктов, импорт и шаблон.
const {repo, MEAL_NAMES, COND} = __m['mstore.js'];
const {repo: prepo} = __m['pstore.js'];
const {menuProblems, altNames} = __m['menu.js'];
const {tabsHtml, bindTabs} = __m['tabsui.js'];
const {readTable, writeXlsx, download} = __m['xlsx.js'];
const {esc, modal} = __m['ui.js'];
const {openLoad} = __m['loadview.js'];

const ui = { id: null };
const focusSet = id => { ui.id = id; }; // открыть вкладку «Меню» на нужном наборе (кнопка «Настроить» в «Поход»)
const MCOLS = ['Набор', 'Приём пищи', 'Блюдо', 'Продукт', 'Г_на_чел', 'Мин_г', 'Макс_г', 'Условия', 'Варка_мин'];
const MEAL_KEY = { завтрак: 'b', обед: 'l', ужин: 'd', перекус: 's', карпит: 's' };
const norm = s => String(s ?? '').toLowerCase().replace(/[\s_]/g, '');
const condName = k => (COND.find(c => c[0] === k) || [, k])[1];
const condKey = t => { const x = String(t).trim().toLowerCase(); return (COND.find(c => c[1] === x || c[0] === x) || (x.includes('3000') ? ['alt3000'] : x.startsWith('перв') ? ['first2'] : []))[0]; };

function menuRows(set) {
  const rows = [MCOLS];
  set.dishes.forEach(d => d.ing.forEach((i, k) => rows.push([set.name, MEAL_NAMES[d.meal], d.name, i.name, i.g, i.min ?? '', i.max ?? '', k === 0 ? (d.cond || []).map(condName).join(', ') : '', k === 0 ? d.cook ?? '' : ''])));
  return rows;
}

// Файл → наборы меню; errors построчно
function parseMenu(rows) {
  const hdr = (rows[0] || []).map(norm), at = n => hdr.indexOf(norm(n)), errors = [], sets = new Map(), dishes = new Map();
  for (const n of ['Приём пищи', 'Блюдо', 'Продукт', 'Г_на_чел']) if (at(n) < 0) errors.push(`нет колонки «${n}»`);
  if (errors.length) return { sets: [], errors };
  rows.slice(1).forEach((r, i) => {
    const ln = i + 2, g = n => (at(n) >= 0 ? r[at(n)] : ''), num = n => { const v = g(n); return v === '' || v == null ? null : +String(v).replace(',', '.'); };
    if (!r.some(v => v !== '' && v != null)) return;
    const mk = MEAL_KEY[String(g('Приём пищи')).trim().toLowerCase()]; if (!mk) { errors.push(`строка ${ln}: неизвестный приём пищи «${g('Приём пищи')}»`); return; }
    const dn = String(g('Блюдо') ?? '').trim(); if (!dn) { errors.push(`строка ${ln}: нет названия блюда`); return; }
    const pn = String(g('Продукт') ?? '').trim(); if (!pn) { errors.push(`строка ${ln}: нет продукта`); return; }
    const gr = num('Г_на_чел'); if (gr == null || isNaN(gr) || gr <= 0) { errors.push(`строка ${ln}: нет граммов на человека`); return; }
    const sn = String(g('Набор') || 'Из файла').trim(), key = sn + '|' + mk + '|' + dn;
    if (!sets.has(sn)) sets.set(sn, { name: sn, dishes: [] });
    let d = dishes.get(key);
    if (!d) { d = { id: 'd' + dishes.size + Date.now().toString(36), meal: mk, name: dn, cook: num('Варка_мин') || 0, cond: [], on: true, ing: [] }; dishes.set(key, d); sets.get(sn).dishes.push(d); }
    const cs = String(g('Условия') || '').split(/[,;]/).map(condKey).filter(Boolean); if (cs.length) d.cond = [...new Set([...d.cond, ...cs])];
    d.ing.push({ name: pn, g: gr, min: num('Мин_г') ?? Math.round(gr * .7), max: num('Макс_г') ?? Math.round(gr * 1.5) });
  });
  dishes.forEach(d => { if (!d.cond.length) d.cond = ['any']; });
  return { sets: [...sets.values()], errors };
}

function dishDialog(set, dish, done) {
  if (set.readonly) return;
  const isNew = !set.dishes.includes(dish), names = (prepo.get(set.productSetId) || prepo.first()).items.map(p => p.name);
  modal(() => ({
    title: isNew ? 'Новое блюдо' : dish.name,
    html: `<datalist id="pn">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="fld"><label>Название</label><div class="ctl"><input data-f="name" value="${esc(dish.name)}" style="width:240px;text-align:left"></div></div>
      <div class="fld"><label>Приём пищи</label><div class="ctl"><select data-f="meal">${Object.entries(MEAL_NAMES).map(([k, n]) => `<option value="${k}"${dish.meal === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div class="fld"><label>Время варки</label><div class="ctl"><input type="number" data-f="cook" value="${dish.cook ?? 0}"><span class="muted unit">мин</span></div></div>
      <div class="fld"><label>Включено</label><div class="ctl"><input type="checkbox" data-f="on" ${dish.on ? 'checked' : ''}></div></div>
      <h3>Условия применения</h3><div class="chips">${COND.map(([k, n]) => `<button data-c="${k}" class="${(dish.cond || []).includes(k) ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="muted small">Блюдо подходит, если выполняется любое отмеченное условие.</p>
      <h3>Продукты, г на человека</h3><div class="tbl"><table class="dtable"><tr><th>Продукт (можно «А|Б»)</th><th>База</th><th>Мин</th><th>Макс</th><th></th></tr>
      ${dish.ing.map((i, k) => `<tr><td><input list="pn" data-i="${k}:name" value="${esc(i.name)}" style="width:230px"></td><td><input type="number" data-i="${k}:g" value="${i.g}" style="width:64px"></td><td><input type="number" data-i="${k}:min" value="${i.min ?? ''}" style="width:64px"></td><td><input type="number" data-i="${k}:max" value="${i.max ?? ''}" style="width:64px"></td><td><button class="mini" data-x="${k}">×</button></td></tr>`).join('')}</table></div>
      <button class="mini" id="addi">+ Продукт</button>
      <div class="btnrow"><button class="btn" id="sv">Сохранить</button>${isNew ? '' : '<button class="btn danger" id="del">Удалить блюдо</button>'}<button class="btn ghost" id="cn">Закрыть</button></div>`,
    bind(root, refresh, close) {
      root.querySelectorAll('[data-f]').forEach(el => el.onchange = () => { const k = el.dataset.f; dish[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value; });
      root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const k = b.dataset.c; const c = new Set(dish.cond || []); if (k === 'any') { c.clear(); c.add('any'); } else { c.delete('any'); c.has(k) ? c.delete(k) : c.add(k); } dish.cond = c.size ? [...c] : ['any']; refresh(); });
      root.querySelectorAll('[data-i]').forEach(el => el.onchange = () => { const [k, f] = el.dataset.i.split(':'); const v = f === 'name' ? el.value : (el.value === '' ? null : +el.value); dish.ing[+k][f] = v; });
      root.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { dish.ing.splice(+b.dataset.x, 1); refresh(); });
      root.querySelector('#addi').onclick = () => { dish.ing.push({ name: '', g: 50, min: 35, max: 75 }); refresh(); };
      root.querySelector('#sv').onclick = async () => { if (!dish.name.trim()) return; dish.ing = dish.ing.filter(i => i.name.trim() && i.g > 0); if (isNew) set.dishes.push(dish); await repo.save(set); close(); done(); };
      root.querySelector('#del')?.addEventListener('click', async () => { set.dishes = set.dishes.filter(d => d !== dish); await repo.save(set); close(); done(); });
      root.querySelector('#cn').onclick = close;
    },
  }));
}

function problemsDialog(set, done) {
  modal(() => {
    const pset = prepo.get(set.productSetId) || prepo.first(), pr = menuProblems(set, pset), all = pset.items;
    return {
      title: `Проверка: «${set.name}» и набор продуктов «${pset.name}»`,
      html: pr.length ? `<p class="muted">Этих продуктов нет в наборе продуктов или они не выбраны. Включите продукт или замените его в блюде.</p>
        <div class="tbl"><table class="dtable"><tr><th>Блюдо</th><th>Продукт</th><th>Действие</th></tr>${pr.map((p, k) => `<tr><td>${esc(p.dish.name)}</td><td>${esc(p.ing.name)}</td><td>${p.alts.filter(a => a.state === 'off').map(a => `<button class="mini" data-on="${a.id}">Включить «${esc(all.find(x => x.id === a.id)?.name)}»</button>`).join(' ')}<select data-rep="${k}"><option value="">Заменить на…</option>${all.filter(x => x.on).map(x => `<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>` : '<p class="good"><b>Проблем нет:</b> все продукты блюд есть в наборе и выбраны.</p>',
      bind(root, refresh) {
        root.querySelectorAll('[data-on]').forEach(b => b.onclick = async () => { const p = all.find(x => x.id === b.dataset.on); p.on = true; await prepo.save(pset); done(); refresh(); });
        root.querySelectorAll('[data-rep]').forEach(s => s.onchange = async () => { if (!s.value) return; pr[+s.dataset.rep].ing.name = s.value; await repo.save(set); done(); refresh(); });
      },
    };
  });
}

function importDialog(done) {
  let res = null, err = '';
  modal(() => ({
    title: 'Набор меню из файла',
    html: `<p class="muted">Файл .xlsx, .csv или .json, колонки: ${MCOLS.join('; ')}. Одна строка — один продукт блюда. Условия через запятую: ${COND.map(c => c[1]).join(', ')}.</p>
      <div class="btnrow"><label class="btn ghost filebtn">Выбрать файл<input type="file" id="f" accept=".xlsx,.csv,.json" hidden></label><button class="btn ghost" id="tpl">Скачать шаблон</button></div><p class="warnmsg">${esc(err)}</p>
      ${res ? `<h3>Предпросмотр: наборов ${res.sets.length}, блюд ${res.sets.reduce((s, x) => s + x.dishes.length, 0)}${res.errors.length ? `, ошибок ${res.errors.length}` : ''}</h3>
        ${res.errors.length ? `<ul class="warnlist">${res.errors.slice(0, 30).map(e => `<li>${esc(e)}</li>`).join('')}</ul><p class="muted small">Строки с ошибками не загрузятся.</p>` : ''}
        <ul class="list">${res.sets.map(s => `<li><span>${esc(s.name)}</span><span class="muted">${s.dishes.length} блюд</span></li>`).join('')}</ul>
        <div class="btnrow"><button class="btn" id="load" ${res.sets.length ? '' : 'disabled'}>Загрузить</button></div>` : ''}`,
    bind(root, refresh, close) {
      root.querySelector('#tpl').onclick = async () => download('Шаблон_набора_меню.xlsx', await writeXlsx([{ name: 'Меню', rows: [MCOLS, ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Гречка', 90, 63, 135, 'любой день', 20], ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Тушёнка говяжья', 70, 49, 105, '', ''], ['Мой набор', 'Обед', 'Горячий обед', 'Суп в пакете', 25, 18, 38, 'днёвка, холод', 10]] }]));
      root.querySelector('#f').onchange = async e => { const f = e.target.files[0]; if (!f) return; err = ''; try { res = parseMenu(await readTable(f)); } catch (x) { err = x.message; res = null; } refresh(); };
      root.querySelector('#load')?.addEventListener('click', async () => {
        let last = null;
        for (const s of res.sets) { if (!repo.canAdd()) { alert('Достигнут максимум 10 наборов меню.'); break; } last = await repo.add({ id: repo.uid(), name: s.name, productSetId: prepo.first().id, dishes: s.dishes }); }
        close(); if (last) done(last.id);
      });
    },
  }));
}

function addSetDialog(cur, done, rerender, ctx) {
  modal(() => ({
    title: 'Новый набор меню',
    html: `<ul class="list"><li><button data-k="empty">Пустой набор<span>›</span></button></li><li><button data-k="copy">Копия текущего («${esc(cur.name)}»)<span>›</span></button></li><li><button data-k="file">Из файла (.xlsx, .csv, .json)<span>›</span></button></li><li><button data-k="manual">Вручную, по одному блюду<span>›</span></button></li></ul>`,
    bind(root, refresh, close) {
      root.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
        const k = b.dataset.k; close();
        if (k === 'file') return openLoad(ctx, { only: 'dishes', after: rerender }); // общее окно загрузки; старое importDialog больше не вызывается
        const name = prompt('Название набора', k === 'copy' ? cur.name + ' (копия)' : 'Новый набор'); if (!name) return;
        const s = await repo.add({ id: repo.uid(), name: name.trim(), productSetId: cur.productSetId, dishes: k === 'copy' ? JSON.parse(JSON.stringify(cur.dishes)) : [] });
        done(s.id); if (k === 'manual') setTimeout(() => dishDialog(s, { id: 'd' + Date.now().toString(36), meal: 'd', name: '', cook: 0, cond: ['any'], on: true, ing: [{ name: '', g: 80, min: 56, max: 120 }] }, rerender), 50);
      });
    },
  }));
}

const views = {
  menus(_, ctx) {
    const trip = ctx.trip(), sets = repo.list();
    if (!repo.get(ui.id)) ui.id = (repo.get(trip.menuSet) || repo.first()).id;
    const set = repo.get(ui.id), pset = prepo.get(set.productSetId) || prepo.first(), pr = menuProblems(set, pset);
    return {
      html: `<h2>Меню</h2>${tabsHtml(sets, set.id, trip.menuSet)}
        <div class="btnrow">${set.readonly ? '' : '<button class="mini" id="ren">Переименовать</button>'}<button class="mini" id="dup" ${repo.canAdd() ? '' : 'disabled'}>Дублировать</button><button class="mini" id="del">Удалить</button><button class="mini" id="exp">В файл</button><button class="mini" id="tpl">Скачать шаблон</button><button class="mini" id="use">${set.id === trip.menuSet ? 'Используется в походе ✓' : 'Использовать в походе'}</button></div>
        <div class="fld"><label>Набор продуктов для этого меню</label><div class="ctl"><select id="psel">${prepo.list().map(s => `<option value="${s.id}"${s.id === pset.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div></div>
        <div class="btnrow"><button class="btn ${pr.length ? '' : 'ghost'}" id="chk">Проверка продуктов${pr.length ? ` · проблем: ${pr.length}` : ' · ок'}</button>${set.readonly ? '' : '<button class="btn" id="addd" style="margin-left:auto">Добавить блюдо</button>'}</div>
        <div class="btnrow"><button class="btn ghost" id="ldd">Загрузить блюда</button><button class="btn ghost" id="ldl">Загрузить меню (план)</button><button class="btn ghost" id="lda">Загрузить всё из файла</button>${set.readonly ? '<span class="muted small">🔒 Оригинал, только чтение: скопируйте набор («Дублировать»), чтобы менять.</span>' : ''}</div>
        ${pr.length ? `<p class="warnmsg small">В меню есть продукты, которых нет в наборе «${esc(pset.name)}» или они выключены. Нажмите «Проверка продуктов».</p>` : ''}
        ${[...Object.entries(MEAL_NAMES), ['', 'Без приёма пищи (его задаёт план)']].filter(([m]) => m || set.dishes.some(d => !d.meal)).map(([m, n]) => { const ds = set.dishes.filter(d => (d.meal || '') === m); return `<h3>${n} · ${ds.length}</h3>${ds.length ? `<div class="tbl"><table class="dtable"><tr><th></th><th>Блюдо</th><th>Состав, г на человека</th><th>Условия</th><th>Варка</th></tr>${ds.map(d => `<tr data-d="${d.id}" class="${d.on ? '' : 'off'}"><td><input type="checkbox" data-on="${d.id}" ${d.on ? 'checked' : ''}${set.readonly ? ' disabled' : ''}></td><td>${esc(d.name)}</td><td class="muted small" style="white-space:normal">${d.ing.map(i => `${esc(String(i.name).split('|')[0])} ${i.g}${i.unit && i.unit !== 'г' ? ' ' + esc(i.unit) : ''}`).join(', ')}</td><td>${(d.cond || []).map(condName).join(', ')}</td><td>${d.cook || 0} мин</td></tr>`).join('')}</table></div>` : '<p class="muted small">Блюд нет.</p>'}`; }).join('')}`,
      bind(root) {
        const re = () => ctx.rerender();
        bindTabs(root, { repo, rerender: re, onSelect: id => { ui.id = id; re(); }, onAdd: () => addSetDialog(set, id => { ui.id = id; re(); }, re, ctx) });
        root.querySelector('#psel').onchange = async e => { set.productSetId = e.target.value; await repo.save(set); re(); };
        root.querySelector('#chk').onclick = () => problemsDialog(set, re);
        root.querySelector('#ldd').onclick = () => openLoad(ctx, { only: 'dishes', after: re });
        root.querySelector('#ldl').onclick = () => openLoad(ctx, { only: 'plan', after: re });
        root.querySelector('#lda').onclick = () => openLoad(ctx, { after: re });
        root.querySelector('#addd')?.addEventListener('click', () => dishDialog(set, { id: 'd' + Date.now().toString(36), meal: 'd', name: '', cook: 0, cond: ['any'], on: true, ing: [{ name: '', g: 80, min: 56, max: 120 }] }, re));
        root.querySelectorAll('[data-on]').forEach(c => c.onchange = async () => { set.dishes.find(d => d.id === c.dataset.on).on = c.checked; await repo.save(set); re(); });
        root.querySelectorAll('tr[data-d]').forEach(tr => tr.onclick = e => { if (e.target.tagName !== 'INPUT') dishDialog(set, set.dishes.find(d => d.id === tr.dataset.d), re); });
        root.querySelector('#ren')?.addEventListener('click', async () => { const n = prompt('Название набора', set.name); if (n && n.trim()) { set.name = n.trim(); await repo.save(set); re(); } });
        root.querySelector('#dup').onclick = async () => { const s = await repo.add({ ...JSON.parse(JSON.stringify(set)), id: repo.uid(), name: set.name + ' (копия)', builtin: false }); ui.id = s.id; re(); };
        root.querySelector('#del').onclick = async () => { if (sets.length < 2) { alert('Последний набор удалить нельзя.'); return; } if (!confirm(`Удалить набор «${set.name}»?`)) return; await repo.remove(set.id); if (trip.menuSet === set.id) { trip.menuSet = repo.first().id; ctx.saveTrip(); } ui.id = repo.first().id; re(); };
        root.querySelector('#exp').onclick = async () => download(`Меню_${set.name}.xlsx`, await writeXlsx([{ name: 'Меню', rows: menuRows(set) }]));
        root.querySelector('#tpl').onclick = async () => download('Шаблон_набора_меню.xlsx', await writeXlsx([{ name: 'Меню', rows: [MCOLS, ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Гречка', 90, 63, 135, 'любой день', 20], ['Мой набор', 'Ужин', 'Гречка с тушёнкой', 'Тушёнка говяжья', 70, 49, 105, '', '']] }]));
        root.querySelector('#use').onclick = () => { trip.menuSet = set.id; if (prepo.get(set.productSetId)) trip.productSet = set.productSetId; ctx.saveTrip(); re(); };
      },
    };
  },
};

return {focusSet, MCOLS, menuRows, parseMenu, views};
})();
__m['simple.js'] = (() => {
// Режим «Просто, на группу»: вместо списка участников — число человек и «средний участник».
// Приложение создаёт n одинаковых виртуальных участников, поэтому меню, закупки и рюкзаки работают как раньше.
const defaultSimple = () => ({ on: false, n: 12, weight: 70, height: 172, age: 35, veg: false, noEat: '', notes: '' });

// d: { appetite, shareM, shareF } — значения по умолчанию из параметров. Пол чередуется (М, Ж, М, …) — средний состав.
function virtualGroup(s, d) {
  const n = Math.max(1, Math.min(60, Math.round(+s.n) || 1)), no = (s.noEat || '').trim();
  return Array.from({ length: n }, (_, i) => {
    const f = i % 2 === 1;
    return { id: 'sim' + i, virtual: true, name: `Участник ${i + 1}`, sex: f ? 'F' : 'M', age: +s.age || 35, height: +s.height || 172, weight: +s.weight || 70, gear: null, appetite: d.appetite, share: f ? d.shareF : d.shareM, allergy: no, veg: !!s.veg, dislike: no };
  });
}

// Дополняет сохранённый поход полями, которых в старых данных нет
function ensureTrip(t) {
  t.simple = { ...defaultSimple(), ...(t.simple || {}) };
  t.food ||= {}; if (t.food.reservePct == null) t.food.reservePct = 0; if (t.food.reserveDays == null) t.food.reserveDays = 1; t.reserveItem ||= {};
  t.buyers ||= []; t.buyDept ||= {}; t.buyItem ||= {};
  t.prefs ||= {}; if (!('kcalGoal' in t.prefs)) t.prefs.kcalGoal = null; if (t.prefs.restPct == null) t.prefs.restPct = 80;
  return t;
}

// Включает/выключает простой режим. При включении подробная группа запоминается и возвращается при выключении.
function setSimpleMode(t, on, d) {
  ensureTrip(t);
  if (on) {
    if (t.group.length && !t.group.every(p => p.virtual)) t.detailedGroup = t.group;
    t.simple.on = true; t.group = virtualGroup(t.simple, d);
  } else {
    t.simple.on = false;
    if (t.detailedGroup) { t.group = t.detailedGroup; delete t.detailedGroup; }
  }
  return t;
}
const rebuildSimple = (t, d) => { if (t.simple.on) t.group = virtualGroup(t.simple, d); return t; };

return {defaultSimple, virtualGroup, ensureTrip, setSimpleMode, rebuildSimple};
})();
__m['trip.js'] = (() => {
// Экран «Поход»: общий блок, группа, вкладка «Вручную». Данные хранятся в одном объекте trip.
const {COVERS, DAY_TYPES, CATEGORIES} = __m['defaults.js'];
const {getParam} = __m['params.js'];
const {form, bindForm, esc} = __m['ui.js'];
const {repo: prepo} = __m['pstore.js'];
const {repo: mrepo} = __m['mstore.js'];
const {daysSection, ensurePlan, rebuild} = __m['tripdays.js'];
const store = __m['store.js'];
const {focusSet: focusProducts} = __m['productsview.js'];
const {focusSet: focusMenu} = __m['menuview.js'];
const {defaultSimple, ensureTrip, setSimpleMode, rebuildSimple} = __m['simple.js'];
const {TYPES, defaultMeals, mealsOf, shareSum, moveSlot, removeSlot, addSlot, slotLabel} = __m['meals.js'];

const newTrip = () => ({
  name: '', start: '', end: '', kind: 'mountain', category: CATEGORIES[0],
  days: [], group: [], drops: [],
  gear: { common: null, maxM: null, maxF: null },
  food: { hot: '2', lunchHot: false },
  prefs: { mode: 'std', custom: null, breakfast: 'milk', sugar: 'common', snacks: 'common', treat: false, budget: null, likes: '', dislikes: '', kcalGoal: null, restPct: 80 },
  simple: defaultSimple(),
});

let trip;
const loadTrip = async () => { trip = ensureTrip((await store.get('trips', 'current')) || newTrip()); return trip; };
const splitP = () => ({ split_b: getParam('split_b'), split_l: getParam('split_l'), split_d: getParam('split_d'), split_s: getParam('split_s') });
const simpleDefs = () => ({ appetite: getParam('appetite_def'), shareM: getParam('share_m'), shareF: getParam('share_f') });
const save = () => store.put('trips', 'current', trip);
const getTrip = () => trip;
const saveTrip = save;
const setTrip = t => { trip = ensureTrip(t); save(); };
const back = (to, label) => `<button class="back" data-go="${to}">‹ ${label}</button>`;
const SEX = [['M', 'М'], ['F', 'Ж']];
const KG = 'кг';

const F = {
  trip: [
    { k: 'name', label: 'Название' },
    { k: 'kind', label: 'Вид', type: 'seg', opts: [['hike', 'Пеший'], ['mountain', 'Горный'], ['ski', 'Лыжный'], ['water', 'Водный']] },
    { k: 'category', label: 'Категория', type: 'select', opts: CATEGORIES.map(c => [c, c]) },
  ],
  person: [
    { k: 'name', label: 'Имя' }, { k: 'sex', label: 'Пол', type: 'seg', opts: SEX },
    { k: 'age', label: 'Возраст', type: 'number', unit: 'лет' }, { k: 'height', label: 'Рост', type: 'number', unit: 'см' },
    { k: 'weight', label: 'Вес', type: 'number', unit: KG }, { k: 'gear', label: 'Личное снаряжение', type: 'number', unit: KG },
    { k: 'appetite', label: 'Коэффициент аппетита', type: 'number', help: 'Насколько человек ест больше или меньше обычного. 1.0 — как все, 1.2 — ест на пятую часть больше, 0.9 — меньше. Умножает его потребность в калориях, поэтому влияет на порции в раскладке. Если не знаешь, оставь 1.0; после похода приложение подскажет поправку.' },
    { k: 'share', label: 'Доля общего груза', type: 'number', help: 'Какую часть общего груза (продукты, палатки, котлы, горелки) несёт человек. 1.0 — как остальные, меньше — несёт меньше, например 0.7. По этим долям на этапе «Покупки» считаются рюкзаки. Личное снаряжение сюда не входит, оно вводится отдельно.' },
    { k: 'allergy', label: 'Аллергии' }, { k: 'veg', label: 'Вегетарианец', type: 'check' }, { k: 'dislike', label: 'Не ест' },
  ],
  simple: [
    { k: 'n', label: 'Человек в группе', type: 'number' },
    { k: 'weight', label: 'Средний вес', type: 'number', unit: KG }, { k: 'height', label: 'Средний рост', type: 'number', unit: 'см' }, { k: 'age', label: 'Средний возраст', type: 'number', unit: 'лет' },
    { k: 'veg', label: 'Есть вегетарианцы', type: 'check', help: 'Тогда мясные продукты в меню не используются: меню одно на всю группу.' },
    { k: 'noEat', label: 'Не едят / аллергии', help: 'Через запятую, например: орехи, грибы. Эти продукты в меню не попадут.' },
    { k: 'notes', label: 'Заметки о предпочтениях', help: 'Свободный текст, например: «1 чел — без глютена, 2 чел — не ест рыбу». Программа его не разбирает: заметки попадут в сводку и в информацию закупщикам.' },
  ],
  goal: [
    { k: 'kcalGoal', label: 'Цель по калориям', type: 'number', unit: 'ккал/чел/день', help: 'Если задана, она заменяет расчёт по нагрузке: каждый день цель одна и та же. Пусто — считать по нагрузке и режиму раскладки.' },
    { k: 'restPct', label: 'Днёвка', type: 'number', unit: '% от цели', show: p => p.kcalGoal > 0 },
  ],
  gear: [
    { k: 'common', label: 'Общественное снаряжение', type: 'number', unit: KG },
    { k: 'maxM', label: 'Макс. рюкзак М', type: 'number', unit: KG }, { k: 'maxF', label: 'Макс. рюкзак Ж', type: 'number', unit: KG },
  ],
  food: [
    { k: 'hot', label: 'Горячих приёмов в день', type: 'seg', opts: [['2', '2'], ['3', '3']] },
    { k: 'lunchHot', label: 'Обед горячий (иначе перекус)', type: 'check' },
    { k: 'reservePct', label: 'Резерв продуктов', type: 'number', unit: '% от количества', help: 'Сколько добавить к закупке каждого продукта сверх меню: любое число, 0 — без резерва. Для отдельного продукта своё значение задаётся в «Покупки» → «Список». Меню и калории от резерва не меняются.' },
    { k: 'reserveDays', label: 'Аварийный запас', type: 'number', unit: 'дн', help: 'Калорийные продукты (орехи, шоколад, халва…) на столько дней сверх меню. 0 — без аварийного запаса.' },
  ],
  prefs: [
    { k: 'mode', label: 'Режим раскладки', type: 'seg', opts: [['hungry', 'Голодная'], ['std', 'Стандарт'], ['full', 'Сытая'], ['custom', 'Своя']] },
    { k: 'custom', label: 'Своё покрытие', type: 'number', unit: '%', show: p => p.mode === 'custom' },
    { k: 'breakfast', label: 'Завтраки', type: 'seg', opts: [['milk', 'Молочные'], ['meat', 'Мясные']] },
    { k: 'sugar', label: 'Сахар', type: 'seg', opts: [['common', 'В раскладке'], ['personal', 'В личке']] },
    { k: 'snacks', label: 'Перекусы на ходу', type: 'seg', opts: [['common', 'В раскладке'], ['personal', 'В личке']] },
    { k: 'lunchSplit', label: 'Обед весь день (пакетов)', type: 'seg', opts: [['1', '1'], ['2', '2'], ['3', '3']], help: 'Обед-перекус делится на 2–3 пакета (около 11:00, 13:30 и 16:00): в горах едят часто и понемногу.' },
    { k: 'budget', label: 'Бюджет (необязательно)', type: 'number' },
    { k: 'likes', label: 'Любимые блюда' }, { k: 'dislikes', label: 'Нелюбимые блюда' },
  ],
  drop: [
    { k: 'after', label: 'После дня №', type: 'number' }, { k: 'what', label: 'Что в заброске' },
  ],
};

const bound = (ctx, fields, obj, after) => root => bindForm(root, fields, obj, () => save(), () => { after?.(); ctx.rerender(); });
const newPerson = () => ({ id: crypto.randomUUID(), name: '', sex: 'M', age: null, height: null, weight: null, gear: null, appetite: getParam('appetite_def'), share: getParam('share_m'), allergy: '', veg: false, dislike: '' });
// Пункт, который раскрывается и донастраивается: название, краткое значение и кнопка «Настроить» (нажимается вся строка)
const link = (v, t, s) => `<li><button data-go="${v}"><span>${t}</span><span class="muted lval">${s}</span><span class="cfgbtn">Настроить</span></button></li>`;

const views = {
  main(_, ctx) {
    ensurePlan(trip);
    const ds = daysSection(trip, save, ctx);
    return {
      html: `<h2>Поход</h2>
        <div class="cols2"><div><div id="tf">${form(F.trip, trip)}</div>
        <div class="fld"><label>Набор продуктов</label><div class="ctl"><select id="sp">${prepo.list().map(s => `<option value="${s.id}"${s.id === trip.productSet ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select><button class="cfgbtn" id="cfgp">Настроить</button></div></div>
        <div class="fld"><label>Набор меню</label><div class="ctl"><select id="sm">${mrepo.list().map(s => `<option value="${s.id}"${s.id === trip.menuSet ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select><button class="cfgbtn" id="cfgm">Настроить</button></div></div>
        <ul class="list">${link('group', 'Группа', `${trip.group.length} чел`)}${link('gear', 'Снаряжение', trip.gear.common ? trip.gear.common + ' кг' : '—')}
        ${link('food', 'Питание и заброски', `${trip.food.hot} горячих`)}${link('prefs', 'Предпочтения', '')}</ul></div>
        <div></div></div>${ds.html}`,
      bind(root) {
        bindForm(root.querySelector('#tf'), F.trip, trip, () => save(), () => ctx.rerender()); ds.bind(root);
        root.querySelector('#cfgp').onclick = () => { focusProducts(trip.productSet || prepo.first()?.id); ctx.state.tab = 'products'; ctx.go(''); };
        root.querySelector('#cfgm').onclick = () => { focusMenu(trip.menuSet || mrepo.first()?.id); ctx.state.tab = 'menus'; ctx.go(''); };
        root.querySelector('#sp').onchange = e => { trip.productSet = e.target.value; const m = mrepo.list().find(x => x.productSetId === e.target.value); if (m && mrepo.get(trip.menuSet)?.productSetId !== e.target.value) trip.menuSet = m.id; save(); ctx.rerender(); };
        root.querySelector('#sm').onchange = e => { trip.menuSet = e.target.value; const m = mrepo.get(e.target.value); if (m && prepo.get(m.productSetId)) trip.productSet = m.productSetId; save(); ctx.rerender(); };
      },
    };
  },

  group(_, ctx) {
    const on = trip.simple.on;
    const mode = `<div class="fld"><label>Как считаем</label><div class="ctl"><div class="seg"><button data-gmode="0" class="${on ? '' : 'on'}">Подробно, по участникам</button><button data-gmode="1" class="${on ? 'on' : ''}">Просто, на группу</button></div></div></div>`;
    const goal = `<h3>Цель по калориям</h3><div id="goalf">${form(F.goal, trip.prefs)}</div>`;
    return {
      html: `${back('', 'Поход')}<h2>Группа</h2>${mode}
        ${on ? `<p class="muted">Расчёт усреднённый: все участники одинаковые, пол чередуется. Чтобы учесть каждого, переключите на «Подробно».</p><div id="simplef">${form(F.simple, trip.simple)}</div>`
          : `${trip.group.length ? `<ul class="list">${trip.group.map((p, i) => `<li><button data-go="person" data-arg="${i}"><span>${esc(p.name) || 'Без имени'} · ${p.sex === 'F' ? 'Ж' : 'М'}${p.age ? ' · ' + p.age : ''}</span><span class="muted">${p.weight ? p.weight + ' кг' : ''} ›</span></button></li>`).join('')}</ul>` : '<p class="empty">Участников пока нет.</p>'}
        <button class="btn" id="add">Добавить участника</button>`}
        ${goal}`,
      bind(root) {
        root.querySelectorAll('[data-gmode]').forEach(b => b.onclick = () => { setSimpleMode(trip, b.dataset.gmode === '1', simpleDefs()); save(); ctx.rerender(); });
        if (on) bindForm(root.querySelector('#simplef'), F.simple, trip.simple, () => { rebuildSimple(trip, simpleDefs()); save(); }, () => ctx.rerender());
        else root.querySelector('#add').onclick = () => { trip.group.push(newPerson()); save(); ctx.go('person', trip.group.length - 1); };
        bindForm(root.querySelector('#goalf'), F.goal, trip.prefs, k => { save(); if (k === 'kcalGoal') ctx.rerender(); }, () => ctx.rerender());
      },
    };
  },

  person(i, ctx) {
    const p = trip.group[i];
    const prevSex = p.sex;
    return {
      html: `${back('group', 'Группа')}<h2>Участник</h2>${form(F.person, p)}<button class="btn danger" id="del">Удалить участника</button>`,
      bind(root) {
        bindForm(root, F.person, p, k => {
          if (k === 'sex' && p.share === getParam(prevSex === 'F' ? 'share_f' : 'share_m')) p.share = getParam(p.sex === 'F' ? 'share_f' : 'share_m');
          save();
        }, () => ctx.rerender());
        root.querySelector('#del').onclick = () => { trip.group.splice(i, 1); save(); ctx.go('group'); };
      },
    };
  },

  gear: (_, ctx) => ({ html: `${back('', 'Поход')}<h2>Снаряжение</h2>${form(F.gear, trip.gear)}`, bind: bound(ctx, F.gear, trip.gear) }),
  prefs: (_, ctx) => ({ html: `${back('', 'Поход')}<h2>Предпочтения</h2>${form(F.prefs, trip.prefs)}`, bind: bound(ctx, F.prefs, trip.prefs) }),

  food(_, ctx) {
    const slots = mealsOf(trip, splitP()), sum = shareSum(slots);
    const mealsHtml = `<h3>Приёмы пищи в день</h3><p class="muted small">Добавляйте приёмы и меняйте их порядок. Доля — часть дневных калорий. «Перекус» подбирается из сладкого и орехов набора, если в наборе нет блюд-перекусов.</p>
      ${slots.map((s, i) => `<div class="mealrow"><b>${i + 1}</b> <select data-mt="${i}">${TYPES.map(([k, n]) => `<option value="${k}"${k === s.type ? ' selected' : ''}>${n}</option>`).join('')}</select> <input data-mn="${i}" placeholder="${esc(slotLabel(slots, s.id))}" value="${esc(s.name || '')}" style="width:130px"> <input data-ms="${i}" type="number" min="0" max="100" value="${s.share}" style="width:60px">% <button class="mini" data-mu="${i}">▲</button><button class="mini" data-mdn="${i}">▼</button><button class="mini" data-mx="${i}">✕</button></div>`).join('')}
      <p class="${sum === 100 ? 'good' : 'warnmsg'}">Сумма долей: ${sum}%${sum === 100 ? '' : ' — должна быть 100%'}</p>
      <div class="btnrow"><button class="btn" id="addmeal">Добавить приём</button><button class="btn ghost" id="resetmeals">Стандартный план</button></div>`;
    return {
      html: `${back('', 'Поход')}<h2>Питание и заброски</h2>${mealsHtml}<div id="foodf">${form(F.food, trip.food)}</div>
        <h3>Заброски</h3>
        ${trip.drops.map((d, i) => `<div class="drop">${form(F.drop, d)}<button class="mini" data-deldrop="${i}">Удалить</button></div>`).join('') || '<p class="empty">Заброски не заданы.</p>'}
        <button class="btn" id="adddrop">Добавить заброску</button>`,
      bind(root) {
        bound(ctx, F.food, trip.food)(root.querySelector('#foodf'));
        const edit = fn => { trip.meals = fn(slots.map(s => ({ ...s }))); save(); ctx.rerender(); };
        root.querySelectorAll('[data-mt]').forEach(el => el.onchange = () => edit(a => { a[+el.dataset.mt].type = el.value; return a; }));
        root.querySelectorAll('[data-mn]').forEach(el => el.onchange = () => edit(a => { a[+el.dataset.mn].name = el.value.trim() || undefined; return a; }));
        root.querySelectorAll('[data-ms]').forEach(el => el.onchange = () => edit(a => { a[+el.dataset.ms].share = Math.max(0, Math.min(100, +el.value || 0)); return a; }));
        root.querySelectorAll('[data-mu]').forEach(el => el.onclick = () => edit(a => moveSlot(a, +el.dataset.mu, -1)));
        root.querySelectorAll('[data-mdn]').forEach(el => el.onclick = () => edit(a => moveSlot(a, +el.dataset.mdn, 1)));
        root.querySelectorAll('[data-mx]').forEach(el => el.onclick = () => edit(a => removeSlot(a, +el.dataset.mx)));
        root.querySelector('#addmeal').onclick = () => edit(a => addSlot(a));
        root.querySelector('#resetmeals').onclick = () => { delete trip.meals; save(); ctx.rerender(); };
        root.querySelectorAll('.drop').forEach((el, i) => bindForm(el, F.drop, trip.drops[i], save, () => ctx.rerender()));
        root.querySelector('#adddrop').onclick = () => { trip.drops.push({ after: null, what: '' }); save(); ctx.rerender(); };
        root.querySelectorAll('[data-deldrop]').forEach(b => b.onclick = () => { trip.drops.splice(+b.dataset.deldrop, 1); save(); ctx.rerender(); });
      },
    };
  },
};

return {newTrip, loadTrip, getTrip, saveTrip, setTrip, views};
})();
__m['plan.js'] = (() => {
// Меню-план: какие блюда стоят в ячейках «день × приём пищи». План «оригинал» применяется без генерации и масштабирования.
const {MEALS} = __m['menu.js'];
const {mealsOf, firstSlotOfType} = __m['meals.js'];

const DASH = ' + ';
// Строит меню из плана. Количества — как в файле: на порцию × порции (из плана, иначе число участников).
function planMenu(trip, calc, plan, dset, pset) {
  const n = calc.summary.n, warnings = [], days = calc.days.map(() => ({}));
  const withAl = (list, key) => { const m = new Map(list.map(x => [x[key], x])); for (const x of list) for (const a of x.aliases || []) if (!m.has(a)) m.set(a, x); return m; };
  const dishBy = withAl(dset?.dishes || [], 'name'), prodBy = withAl(pset?.items || [], 'name');
  for (const row of plan.rows) {
    const i = row.day - 1;
    if (i < 0 || i >= days.length) { warnings.push(`План: день ${row.day} (${row.dish.trim()}) вне дней похода — не применён`); continue; }
    const d = dishBy.get(row.dish), portions = row.portions ?? n;
    const slot = firstSlotOfType(mealsOf(trip), row.mealKey) ?? row.mealKey; // строка плана ложится в первый приём нужного типа
    const cell = days[i][slot] ||= { name: '', parts: [], items: [], fixed: true, pin: true, fromPlan: true, comments: [] };
    if (!d) { warnings.push(`День ${row.day}, ${MEALS[row.mealKey].toLowerCase()}: блюда «${row.dish.trim()}» нет в наборе блюд`); cell.parts.push({ dish: row.dish, name: row.dish, items: [], missing: true }); }
    else {
      const items = d.ing.map(ing => {
        const p = prodBy.get(ing.name), g = ing.g * portions;
        let skip = null;
        if (!p) skip = 'нет в наборе продуктов';
        else if (ing.perGroup) skip = 'количество указано «на группу»';
        else if (ing.unit && ing.unit !== 'г') skip = `единица «${ing.unit}», не граммы`;
        else if (p.baseUnit && p.baseUnit !== 'г') skip = `базовая единица продукта «${p.baseUnit}», не граммы`;
        else if (p.kcal == null) skip = 'нет КБЖУ';
        return { pid: p?.id ?? null, name: ing.name, g, unit: ing.unit || 'г', perPortion: ing.g, skip };
      });
      cell.parts.push({ dish: d.id, name: d.name, items, portions });
    }
    if (row.comment) cell.comments.push(row.comment);
  }
  days.forEach(day => Object.values(day).forEach(c => { c.name = c.parts.map(p => p.name).join(DASH); c.items = c.parts.flatMap(p => p.items); }));
  return { days, warnings, seed: 0 };
}
const skippedCount = menu => menu.days.reduce((s, d) => s + Object.values(d).reduce((a, c) => a + (c.items || []).filter(i => i.skip).length, 0), 0);

return {planMenu, skippedCount};
})();
__m['exportxlsx.js'] = (() => {
// Выгрузка в Excel по шаблону: берём встроенный шаблон (lib/template.js), заменяем данные и размеры диапазонов,
// остальное (оформление, диаграмма, таблицы, проверки данных) сохраняется, формулы пересчитывает Excel при открытии.
const {opts} = __m['params.js'];
const {tempText} = __m['engine.js'];
const {mealsOf} = __m['meals.js'];
const {xmlEsc, colName, download} = __m['xlsx.js'];

const MEAL_RU = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const TCAT = { grain: 'Крупы/макароны', legume: 'Сухие продукты', bread: 'Выпечка', meat: 'Белок', cheese: 'Молочное', dairy: 'Молочное', fat: 'Жиры', veg: 'Овощи', spice: 'Бакалея', soup: 'Сухие продукты', sweet: 'Перекусы', nuts: 'Перекусы', drink: 'Напитки', fresh: 'Овощи' };
const tcat = p => (/соус|паста томатная|томатная паста/i.test(p.name) ? 'Соусы' : TCAT[p.cat] || 'Бакалея');
const CALC_ROWS = 25; // строк калькуляции на одну строку меню (как в шаблоне)

// ---------- работа с XML листов ----------
const cellStr = (ref, s, v) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
const cellNum = (ref, s, v) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}><v>${v}</v></c>`;
const cellF = (ref, s, f) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}><f>${xmlEsc(f)}</f></c>`;
const cellE = (ref, s) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}/>`;
const mkCell = (ref, s, v) => (v == null || v === '' ? cellE(ref, s) : typeof v === 'number' ? cellNum(ref, s, v) : typeof v === 'object' ? cellF(ref, s, v.f) : cellStr(ref, s, v));
const rowXml = (r, cells) => `<row r="${r}">${cells.join('')}</row>`;

// стили по колонкам из образцовой строки шаблона
function styles(xml, rowNo) {
  const m = new RegExp(`<row r="${rowNo}"[^>]*>(.*?)</row>`, 's').exec(xml), out = {};
  if (m) for (const c of m[1].matchAll(/<c r="([A-Z]+)\d+"(?: s="(\d+)")?/g)) out[c[1]] = c[2] != null ? +c[2] : null;
  return out;
}
// строки шаблона до номера last включительно (шапка листа)
function head(xml, last) {
  return [...xml.matchAll(/<row r="(\d+)"[^>]*?(?:\/>|>.*?<\/row>)/gs)].filter(m => +m[1] <= last).map(m => m[0]).join('');
}
const setSheetData = (xml, rows, dim) => xml.replace(/<sheetData>.*<\/sheetData>|<sheetData\/>/s, `<sheetData>${rows}</sheetData>`).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="${dim}"/>`);
const setMerges = (xml, refs) => xml.replace(/<mergeCells[^>]*>.*?<\/mergeCells>/s, `<mergeCells count="${refs.length}">${refs.map(r => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>`);

// ---------- данные ----------
function prepare(D) {
  const { trip, calc, menu, pset } = D, n = calc.summary.n, prods = pset.items;
  const used = new Set(); menu.days.forEach(d => Object.values(d).forEach(e => (e?.items || []).forEach(it => used.add(it.pid))));
  const list = prods.filter(p => p.on || used.has(p.id));
  const idOf = new Map(list.map((p, i) => [p.id, i + 1]));
  // рецепты: по одному на уникальный состав блюда (граммы на человека)
  const recipes = [], byKey = new Map(), names = new Map(), rows = [];
  menu.days.forEach((day, i) => mealsOf(trip, D.P).forEach(slot => {
    const m = slot.type, e = day[slot.id]; if (!e || !e.items?.length) return;
    const ings = e.items.filter(it => it.pid || it.name).map(it => ({ pid: it.pid ?? it.name, name: it.name || prods.find(p => p.id === it.pid)?.name || '?', unit: it.unit || 'г', g: Math.round((it.perPortion ?? it.g / n) * 100) / 100 }));
    const base = (e.name || (m === 's' ? 'Перекус' : 'Блюдо')).trim(), key = base + '|' + ings.map(x => x.pid + ':' + x.g).join(',');
    let rec = byKey.get(key);
    if (!rec) {
      const k = (names.get(base) || 0) + 1; names.set(base, k);
      rec = { id: 'R' + String(recipes.length + 1).padStart(3, '0'), name: m === 's' ? `Перекус · день ${i + 1}` : (k > 1 ? `${base} (вариант ${k})` : base), desc: `${MEAL_RU[m]}.${e.cook ? ` Варка ${e.cook} мин.` : ''} Граммы на одного человека.`, ings };
      if (m === 's' && recipes.some(r => r.name === rec.name)) rec.name += ` (${recipes.length + 1})`;
      byKey.set(key, rec); recipes.push(rec);
    }
    rows.push({ day: i + 1, meal: MEAL_RU[m], dish: rec.name, note: m === 'l' && trip.prefs.lunchSplit > 1 ? `${trip.prefs.lunchSplit} пакета в течение дня` : '' });
  }));
  return { n, list, idOf, recipes, menuRows: rows };
}

const SEASON = d => { const m = d ? +d.slice(5, 7) : 7; return m === 12 || m < 3 ? 'Зима' : m < 6 ? 'Весна' : m < 9 ? 'Лето' : 'Осень'; };

function inputValues(D, X) {
  const { trip, calc } = D, S = calc.summary, days = trip.days;
  const avg = f => calc.days.reduce((s, d) => s + f(d), 0) / calc.days.length;
  const tdmin = Math.min(...days.map(d => d.tdmin ?? d.tday ?? 99)), tdmax = Math.max(...days.map(d => d.tdmax ?? d.tday ?? -99)), tnmin = Math.min(...days.map(d => d.tnmin ?? d.tnight ?? 99));
  const weather = days.some(d => (d.tdmax ?? d.tday) != null) ? `днём ${tdmin < 99 ? Math.round(tdmin) : '—'}…${Math.round(tdmax)} °C, ночью от ${tnmin < 99 ? Math.round(tnmin) : '—'} °C; осадки: ${[...new Set(days.map(d => ({ rain: 'дождь', snow: 'снег' }[d.precip] || 'нет')))].join(', ')}` : '';
  const restr = trip.group.map(p => [p.veg && 'вегетарианец', p.allergy && 'аллергия: ' + p.allergy, p.dislike && 'не ест: ' + p.dislike].filter(Boolean).join(', ') && `${p.name || 'участник'} — ${[p.veg && 'вегетарианец', p.allergy && 'аллергия: ' + p.allergy, p.dislike && 'не ест: ' + p.dislike].filter(Boolean).join(', ')}`).filter(Boolean);
  const mode = { hungry: 'голодная', std: 'стандарт', full: 'сытая', custom: 'своя' }[trip.prefs.mode];
  return {
    B4: X.n, B5: days.length, B6: Math.round(S.reserveKcal / (S.kcal || 1) * 1000) / 1000 || 0, B7: Math.round(avg(d => d.target / S.n)), B8: Math.round(avg(d => d.mac.p)), B9: Math.round(avg(d => d.mac.f)), B10: Math.round(avg(d => d.mac.c)),
    B11: opts.currency === '₸' ? 'KZT' : opts.currency, B12: SEASON(trip.plan?.start), B13: weather, B14: `Режим раскладки: ${mode}.${restr.length ? ' ' + restr.join('; ') + '.' : ''}`,
  };
}

// ---------- сборка ----------
async function buildWorkbook(D) {
  if (!window.TEMPLATE_B64) throw new Error('нет шаблона: запустите tools\\update-template.ps1');
  const X = prepare(D), zip = await JSZip.loadAsync(window.TEMPLATE_B64, { base64: true });
  const wbx = await zip.file('xl/workbook.xml').async('string'), rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const path = {};
  for (const m of wbx.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) { const t = new RegExp(`<Relationship [^>]*Id="${m[2]}"[^>]*Target="([^"]+)"|<Relationship [^>]*Target="([^"]+)"[^>]*Id="${m[2]}"`).exec(rels); path[m[1]] = 'xl/' + (t[1] || t[2]).replace(/^\/?(xl\/)?/, ''); }
  const rd = n => zip.file(path[n]).async('string'), put = (n, s) => zip.file(path[n], s);
  const N = X.list.length, Mn = X.menuRows.length, lastP = 5 + N, lastM = 5 + Mn, lastC = 5 + CALC_ROWS * Mn;

  // --- Продукты ---
  let sx = await rd('Продукты'); const ps = styles(sx, 6);
  const used = new Set(X.menuRows.length ? [] : []);
  const usedMeals = new Map(); X.recipes.forEach(r => r.ings.forEach(i => { const s = usedMeals.get(i.pid) || new Set(); s.add(r.desc.split('.')[0]); usedMeals.set(i.pid, s); }));
  let rows = head(sx, 5);
  X.list.forEach((p, i) => {
    const r = 6 + i, use = usedMeals.get(p.id);
    const v = [i + 1, tcat(p), p.name, p.unit || 'пачка', p.pack || 100, 'г', p.kcal, p.p, p.f, p.c, p.price ?? null, use ? 'Да' : 'Нет', use ? [...use].join(', ') : ''];
    rows += rowXml(r, 'ABCDEFGHIJKLM'.split('').map((c, k) => mkCell(c + r, ps[c], v[k])));
  });
  sx = setSheetData(sx, rows, `A1:M${Math.max(lastP, 6)}`).replace(/(<dataValidation [^>]*sqref=")L6:L\d+/, `$1L6:L${lastP}`); put('Продукты', sx);

  // --- Рецепты ---
  let rx = await rd('Рецепты'); const hs = { hdrA: 4, hdrB: 5, name: 31, desc: 29, colh: 19, ingA: 5, ingB: 7, ing: 5, blank: 3, tech: 8, techL: 9, id: 2 };
  const ps8 = styles(rx, 8), ps5 = styles(rx, 5), ps7 = styles(rx, 7), ps6 = styles(rx, 6);
  const lastTech = () => 0;
  let r0 = 5; const blocks = [], merges = ['A1:N1', 'A3:G3', 'H3:N3'], units = [];
  let rrows = head(rx, 4); const body = new Map(); const put2 = (r, c, x) => { if (!body.has(r)) body.set(r, {}); body.get(r)[c] = x; };
  X.recipes.forEach((rec, k) => { blocks.push(r0); r0 += 4 + Math.max(1, rec.ings.length) + 1; });
  const lastR = blocks.length ? blocks[blocks.length - 1] + 3 + Math.max(1, X.recipes.at(-1).ings.length) - 1 : 6;
  X.recipes.forEach((rec, k) => {
    const b = blocks[k], nI = Math.max(1, rec.ings.length), endI = b + 2 + nI;
    put2(b, 'A', cellStr(`A${b}`, hs.hdrA, 'Рецепт_ID')); put2(b, 'B', cellStr(`B${b}`, hs.hdrB, rec.id)); put2(b, 'C', cellStr(`C${b}`, 31, rec.name));
    ['D', 'E', 'F', 'G'].forEach(c => put2(b, c, cellE(`${c}${b}`, 31)));
    put2(b + 1, 'A', cellStr(`A${b + 1}`, hs.desc, rec.desc)); ['B', 'C', 'D', 'E', 'F', 'G'].forEach(c => put2(b + 1, c, cellE(`${c}${b + 1}`, hs.desc)));
    ['Продукт', 'Кол-во/порция', 'Ед.', 'Примечание'].forEach((t, i) => put2(b + 2, 'ABCD'[i], cellStr(`${'ABCD'[i]}${b + 2}`, 19, t))); ['E', 'F', 'G'].forEach(c => put2(b + 2, c, cellE(`${c}${b + 2}`, 3)));
    merges.push(`C${b}:G${b}`, `A${b + 1}:G${b + 1}`);
    rec.ings.forEach((ing, i) => {
      const r = b + 3 + i; units.push(`C${r}`);
      put2(r, 'A', cellStr(`A${r}`, 5, ing.name)); put2(r, 'B', cellNum(`B${r}`, 7, ing.g)); put2(r, 'C', cellStr(`C${r}`, 5, ing.unit || 'г')); put2(r, 'D', cellE(`D${r}`, 5)); ['E', 'F', 'G'].forEach(c => put2(r, c, cellE(`${c}${r}`, 3)));
      put2(r, 'I', cellF(`I${r}`, 8, `$C$${b}`)); put2(r, 'J', cellF(`J${r}`, 8, `IFERROR(INDEX(Продукты!$A$6:$A$${lastP},MATCH($A${r},Продукты!$C$6:$C$${lastP},0)),"")`)); put2(r, 'K', cellF(`K${r}`, 8, `$A${r}`)); put2(r, 'L', cellF(`L${r}`, 9, `$B${r}`)); put2(r, 'M', cellF(`M${r}`, 8, `$C${r}`)); put2(r, 'N', cellF(`N${r}`, 8, `$D${r}`));
    });
    for (let r = b + 1; r <= endI; r++) put2(r, 'H', cellF(`H${r}`, 8, `$B$${b}`));
    put2(5 + k, 'P', cellF(`P${5 + k}`, 2, `$B$${b}`)); put2(5 + k, 'Q', cellF(`Q${5 + k}`, 2, `$C$${b}`));
  });
  // шапка технической таблицы в строке 5
  ['Рецепт_ID', 'Рецепт', 'Продукт_ID', 'Продукт', 'Кол-во/порцию', 'Ед.', 'Примечание'].forEach((t, i) => put2(5, 'HIJKLMN'[i], cellStr(`${'HIJKLMN'[i]}5`, 19, t)));
  const maxRow = Math.max(5, ...body.keys());
  for (let r = 5; r <= maxRow; r++) { const cells = body.get(r); if (cells) rrows += rowXml(r, Object.keys(cells).sort((a, b) => a.length - b.length || a.localeCompare(b)).map(c => cells[c])); }
  rx = setSheetData(rx, rrows, `A1:Q${maxRow}`); rx = setMerges(rx, merges);
  rx = rx.replace(/<dataValidation [^>]*sqref="C8:C24[^"]*"/, m => m.replace(/sqref="[^"]*"/, `sqref="${units.join(' ') || 'C8'}"`));
  put('Рецепты', rx);
  const lastT = maxRow;

  // --- Меню ---
  let mx = await rd('Меню'); const ms = styles(mx, 6); rows = head(mx, 5);
  X.menuRows.forEach((m, i) => {
    const r = 6 + i;
    rows += rowXml(r, [mkCell(`A${r}`, ms.A, m.day), mkCell(`B${r}`, ms.B, m.meal), mkCell(`C${r}`, ms.C, m.dish), mkCell(`D${r}`, ms.D, { f: `IFERROR(INDEX(Рецепты!$P$5:$P$${4 + Math.max(1, X.recipes.length)},MATCH($C${r},Рецепты!$Q$5:$Q$${4 + Math.max(1, X.recipes.length)},0)),"")` }), mkCell(`E${r}`, ms.E, { f: `IF($C${r}="","",Ввод!$B$4)` }), mkCell(`F${r}`, ms.F, m.note)]);
  });
  mx = setSheetData(mx, rows, `A1:F${Math.max(lastM, 6)}`).replace(/sqref="A6:A95"/g, `sqref="A6:A${Math.max(lastM, 6)}"`).replace(/sqref="B6:B95"/g, `sqref="B6:B${Math.max(lastM, 6)}"`).replace(/sqref="E6:E95"/g, `sqref="E6:E${Math.max(lastM, 6)}"`).replace(/"Завтрак,Обед,Ужин"/g, '"Завтрак,Обед,Ужин,Перекус"');
  put('Меню', mx);

  // --- Калькуляция ---
  let cx = await rd('Калькуляция'); const cs = styles(cx, 6); rows = head(cx, 5);
  const RH = `Рецепты!$H$6:$H$${lastT}`, rng = c => `Рецепты!$${c}$6:$${c}$${lastT}`, PR = c => `Продукты!$${c}$6:$${c}$${Math.max(lastP, 6)}`;
  for (let mi = 0; mi < Mn; mi++) {
    const mr = 6 + mi;
    for (let k = 0; k < CALC_ROWS; k++) {
      const r = 6 + CALC_ROWS * mi + k, M = `MATCH(Меню!$D$${mr},${RH},0)+${k}`, same = c => `IFERROR(IF(IFERROR(INDEX(${RH},${M})=Меню!$D$${mr},FALSE),INDEX(${rng(c)},${M}),""),"")`;
      const f = {
        A: `IF($E${r}="","",Меню!$A$${mr})`, B: `IF($E${r}="","",Меню!$B$${mr})`, C: `IF($E${r}="","",Меню!$C$${mr})`, D: `IF($E${r}="","",Меню!$D$${mr})`,
        E: same('J'), F: `IF($E${r}="","",INDEX(${rng('K')},${M}))`, G: `IF($E${r}="","",INDEX(${rng('M')},${M}))`,
        H: `IFERROR(IF(IFERROR(INDEX(${RH},${M})=Меню!$D$${mr},FALSE),INDEX(${rng('L')},${M}),0),0)`, I: `IF($F${r}="","",Меню!$E$${mr})`, J: `IFERROR($H${r}*$I${r},0)`,
        K: `IFERROR($J${r}/100*INDEX(${PR('G')},MATCH($E${r},${PR('A')},0)),0)`, L: `IFERROR($J${r}/100*INDEX(${PR('H')},MATCH($E${r},${PR('A')},0)),0)`, M: `IFERROR($J${r}/100*INDEX(${PR('I')},MATCH($E${r},${PR('A')},0)),0)`, N: `IFERROR($J${r}/100*INDEX(${PR('J')},MATCH($E${r},${PR('A')},0)),0)`,
        O: same('N'),
      };
      rows += rowXml(r, 'ABCDEFGHIJKLMNO'.split('').map(c => cellF(c + r, cs[c], f[c])));
    }
  }
  cx = setSheetData(cx, rows, `A1:O${Math.max(lastC, 6)}`); put('Калькуляция', cx);

  // --- Раскладка ---
  let lx = await rd('Раскладка'); const ls = styles(lx, 6); rows = head(lx, 5);
  const CR = c => `Калькуляция!$${c}$6:$${c}$${Math.max(lastC, 6)}`;
  for (let i = 0; i < N; i++) {
    const r = 6 + i, f = { A: `Продукты!A${r}`, B: `Продукты!C${r}`, C: `Продукты!F${r}`, D: `SUMIF(${CR('E')},$A${r},${CR('J')})`, E: `$D${r}*Ввод!$B$6`, F: `IF($L${r}="Да",ROUNDUP(($D${r}+$E${r})/$H${r},0)*$H${r},0)`, G: `Продукты!D${r}`, H: `Продукты!E${r}`, I: `IFERROR(ROUNDUP(($D${r}+$E${r})/$H${r},0),0)`, J: `Продукты!K${r}`, K: `$I${r}*$J${r}`, L: `Продукты!L${r}`, M: `Продукты!M${r}` };
    rows += rowXml(r, 'ABCDEFGHIJKLM'.split('').map(c => cellF(c + r, ls[c], f[c])));
  }
  lx = setSheetData(lx, rows, `A1:M${Math.max(lastP, 6)}`).replace(/sqref="F6:F31"/g, `sqref="F6:F${Math.max(lastP, 6)}"`); put('Раскладка', lx);

  // --- Ввод, Сводка (правка отдельных ячеек) ---
  const dp = new DOMParser(), ser = new XMLSerializer(), NSM = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const setCell = (doc, ref, val) => {
    const rn = +ref.replace(/\D/g, ''), sd = doc.getElementsByTagNameNS(NSM, 'sheetData')[0];
    let row = [...sd.getElementsByTagNameNS(NSM, 'row')].find(x => +x.getAttribute('r') === rn);
    if (!row) { row = doc.createElementNS(NSM, 'row'); row.setAttribute('r', rn); const after = [...sd.getElementsByTagNameNS(NSM, 'row')].find(x => +x.getAttribute('r') > rn); sd.insertBefore(row, after || null); }
    let c = [...row.getElementsByTagNameNS(NSM, 'c')].find(x => x.getAttribute('r') === ref);
    if (!c) { c = doc.createElementNS(NSM, 'c'); c.setAttribute('r', ref); const idx = s => s.replace(/\d/g, '').split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0); const after = [...row.getElementsByTagNameNS(NSM, 'c')].find(x => idx(x.getAttribute('r')) > idx(ref)); row.insertBefore(c, after || null); }
    while (c.firstChild) c.removeChild(c.firstChild); c.removeAttribute('t');
    if (val == null || val === '') return;
    if (typeof val === 'number') { const v = doc.createElementNS(NSM, 'v'); v.textContent = val; c.appendChild(v); }
    else if (typeof val === 'object') { const f = doc.createElementNS(NSM, 'f'); f.textContent = val.f; c.appendChild(f); }
    else { c.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(NSM, 'is'), t = doc.createElementNS(NSM, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = val; is.appendChild(t); c.appendChild(is); }
  };
  const doc1 = dp.parseFromString(await rd('Ввод'), 'application/xml'), iv = inputValues(D, X);
  Object.entries(iv).forEach(([ref, v]) => setCell(doc1, ref, v)); put('Ввод', ser.serializeToString(doc1));

  const doc2 = dp.parseFromString(await rd('Сводка'), 'application/xml'), Pn = Math.max(lastP, 6);
  const RK = `Раскладка!$F$6:$F$${Pn}`, RU = `Раскладка!$C$6:$C$${Pn}`, RDn = `Раскладка!$D$6:$D$${Pn}`, RKs = `Раскладка!$K$6:$K$${Pn}`, PCAT = `Продукты!$B$6:$B$${Pn}`;
  const sv = {
    B4: { f: 'Ввод!B4' }, B5: { f: 'Ввод!B5' }, B6: { f: 'Ввод!B7' }, B7: { f: `SUM(${'Калькуляция!$K$6:$K$' + Math.max(lastC, 6)})/Ввод!B4/Ввод!B5` }, B8: { f: 'Ввод!B8' }, B9: { f: `SUM(Калькуляция!$L$6:$L$${Math.max(lastC, 6)})/Ввод!B4/Ввод!B5` },
    B10: { f: `SUMIFS(${RK},${RU},"г")/1000` }, B11: { f: `SUMIFS(${RK},${RU},"мл")/1000` }, B12: { f: `SUM(${RKs})` }, B13: { f: 'B12/Ввод!B4/Ввод!B5' }, B14: { f: `COUNTA(Меню!$C$6:$C$${Math.max(lastM, 6)})` },
  };
  Object.entries(sv).forEach(([ref, v]) => setCell(doc2, ref, v));
  for (let r = 20; r <= 31; r++) { setCell(doc2, `B${r}`, { f: `SUMPRODUCT((${PCAT}=$A${r})*(${RU}="г")*${RK})/1000` }); setCell(doc2, `C${r}`, { f: `SUMPRODUCT((${PCAT}=$A${r})*${RKs})` }); }
  setCell(doc2, 'B32', { f: `SUMIFS(${RK},${RU},"мл")/1000` }); setCell(doc2, 'C32', 0);
  put('Сводка', ser.serializeToString(doc2));

  // --- таблицы, диаграмма, расчёт при открытии ---
  const tfix = async (name, from, to) => { const p = Object.keys(zip.files).filter(f => /^xl\/tables\/table\d+\.xml$/.test(f)); for (const f of p) { let t = await zip.file(f).async('string'); if (t.includes(`name="${name}"`)) { t = t.replace(new RegExp(from, 'g'), to); zip.file(f, t); } } };
  await tfix('ProductsTableV2', 'A5:M31', `A5:M${Math.max(lastP, 6)}`); await tfix('PackingTableV2', 'A5:M31', `A5:M${Math.max(lastP, 6)}`);
  await tfix('MenuTable', 'A5:F95', `A5:F${Math.max(lastM, 6)}`); await tfix('CalculationTable', 'A5:O725', `A5:O${Math.max(lastC, 6)}`);
  const cf = Object.keys(zip.files).find(f => /^xl\/charts\/chart\d+\.xml$/.test(f)); if (cf) zip.file(cf, (await zip.file(cf).async('string')).replace(/\$27\b/g, '$32'));
  zip.remove('xl/calcChain.xml');
  zip.file('[Content_Types].xml', (await zip.file('[Content_Types].xml').async('string')).replace(/<Override [^>]*calcChain[^>]*\/>/, ''));
  zip.file('xl/_rels/workbook.xml.rels', rels.replace(/<Relationship [^>]*calcChain[^>]*\/>/, ''));
  zip.file('xl/workbook.xml', /<calcPr/.test(wbx) ? wbx.replace(/<calcPr([^>]*?)\/>/, (m, a) => `<calcPr${a.replace(/ fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wbx.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
}

async function exportExcel(D) {
  if (!D) throw new Error('нет данных для выгрузки: заполните поход');
  const blob = await buildWorkbook(D), d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  download(`Раскладка_${(D.trip.name || 'поход').replace(/[\\/:*?"<>|]/g, '').trim()}_${stamp}.xlsx`, blob);
}

return {inputValues, buildWorkbook, exportExcel};
})();
__m['calcview.js'] = (() => {
// Вкладка «Расчёт»: слева сводка и дни с «Почему столько?», справа сетка меню (день × приём). Наборы переключаются сразу.
const {allParams} = __m['params.js'];
const {computeTrip, tempText, isRest} = __m['engine.js'];
const {MEALS, buildMenu, itemsKcal, mealFor, possibleFor, menuProblems} = __m['menu.js'];
const {mealsOf, slotLabel} = __m['meals.js'];
const {repo: prepo, setActive} = __m['pstore.js'];
const {repo: mrepo} = __m['mstore.js'];
const {repo: plrepo} = __m['plstore.js'];
const {planMenu, skippedCount} = __m['plan.js'];
const {openLoad} = __m['loadview.js'];
const {getTrip, saveTrip} = __m['trip.js'];
const {exportExcel, buildWorkbook} = __m['exportxlsx.js'];
const {esc, modal} = __m['ui.js'];

const n0 = x => Math.round(x).toLocaleString('ru');
const kg = g => (g / 1000).toFixed(1).replace('.', ',');

const activePlan = trip => (trip.planId ? plrepo.get(trip.planId) : null);
function sets(trip) {
  const pl = activePlan(trip);
  if (pl) { const ps = prepo.get(pl.productSetId) || prepo.get(trip.productSet) || prepo.first(), ms = mrepo.get(pl.dishSetId) || mrepo.first(); setActive(ps?.id); return { pset: ps, mset: ms }; }
  const pset = prepo.get(trip.productSet) || prepo.first(), mset = mrepo.get(trip.menuSet) || mrepo.get(pset && mrepo.list().find(m => m.productSetId === pset.id)?.id) || mrepo.first();
  setActive(pset?.id); return { pset, mset };
}
function sig(trip, pset, mset, P) {
  return JSON.stringify([trip.meals, trip.group.map(p => [p.weight, p.height, p.age, p.sex, p.appetite, p.share, p.gear, p.veg, p.allergy, p.dislike]), trip.days, trip.prefs, trip.food, trip.gear, trip.adj, pset?.id, pset?.items.map(p => (p.on ? 1 : 0) + p.id).join(), mset?.id, mset?.dishes, P, activePlan(trip)?.id, activePlan(trip)?.rows]);
}

// Возвращает {calc, menu, P, pset, mset}; пересобирает меню, если исходные данные изменились (закреплённое остаётся)
function ensure(force = false) {
  const trip = getTrip(), P = allParams(); if (trip.food?.reserveDays != null) P.reserve_days = trip.food.reserveDays; // аварийный запас задаётся у похода
  const calc = computeTrip(trip, P), { pset, mset } = sets(trip);
  if (!calc.summary) return { calc, menu: null, P, pset, mset };
  const s = sig(trip, pset, mset, P);
  if (force || !trip.menu || trip.menu.sig !== s || trip.menu.days.length !== trip.days.length) {
    const seed = force ? (trip.menu?.seed || 0) + 1 : (trip.menu?.seed || 0), pl = activePlan(trip);
    if (pl) {
      const pm = planMenu(trip, calc, pl, mset, pset);
      // оригинал — только план, без генерации; обычный план закрепляет ячейки, генератор заполняет пустые
      trip.menu = { ...(pl.readonly ? pm : { ...buildMenu(trip, calc, mset, pset, P, pm, seed), warnings: [...pm.warnings] }), sig: s, fromPlan: pl.id };
    } else trip.menu = { ...buildMenu(trip, calc, mset, pset, P, trip.menu?.fromPlan ? null : trip.menu, seed), sig: s };
    saveTrip();
  }
  return { calc, menu: trip.menu, P, pset, mset };
}

// Данные для выгрузки в Excel (null, если меню ещё нет)
function exportData() { const e = ensure(); return e.menu && e.calc.summary ? { trip: getTrip(), ...e } : null; }
if (typeof window !== 'undefined') window.RK = { buildWorkbook, exportData };

const menuKcal = (day, prods) => Object.values(day).reduce((s, e) => s + itemsKcal(e?.items || [], prods), 0);
const menuGrams = day => Object.values(day).reduce((s, e) => s + (e?.items || []).reduce((a, i) => a + (i.skip ? 0 : i.g), 0), 0);
const itemName = (it, prods) => it.name || prods.find(p => p.id === it.pid)?.name || '?';

function why(cd, P) {
  const rows = cd.per.map(x => `<tr><td>${esc(x.p.name || 'Участник')}</td><td>${n0(x.bmr)}</td><td>${n0(x.walk)}</td><td>${n0(x.camp)}</td><td>${n0(x.cold)}</td><td>×${x.altK.toFixed(2)}</td><td>×${x.personal.toFixed(2)}${x.general !== 1 ? ' ×' + x.general.toFixed(2) : ''}</td><td><b>${n0(x.total)}</b></td></tr>`).join('');
  const x = cd.per[0], parts = x.parts.map(p => `${p.name}: ${n0(p.watts)} Вт, ${p.hours.toFixed(1)} ч, ${n0(p.kcal)} ккал`).join('; ');
  return `<details><summary>Почему столько?</summary><div class="why"><div class="tbl"><table class="dtable"><tr><th></th><th>Обмен</th><th>Ходьба</th><th>Остаток суток</th><th>Холод</th><th>Высота</th><th>Личн.</th><th>Итого</th></tr>${rows}</table></div>
    <p class="muted small">Обмен — расход покоя за сутки (Миффлин — Сан Жеор). Ходьба — по Пандольфу с учётом рюкзака (${x.L.toFixed(1)} кг у ${esc(x.p.name || 'первого участника')}), покрытия и поправки на недооценку. ${parts ? 'Участки у него: ' + esc(parts) + '. ' : ''}Остаток суток — ${isRest(cd.d) ? 'днёвка: обмен × ' + P.rest_k : 'остаток часов × обмен × ' + P.camp_k}. Холод — ${P.cold_k} ккал на градус ниже ${P.cold_t0} °C${x.t != null ? ` (сегодня ${x.t.toFixed(0)} °C)` : ', температура не задана'}. Высота — +${P.alt_pct}% на 1000 м выше ${P.alt_start} м. Личный — коэффициент аппетита и общая поправка ${P.general_pct}%.</p>
    <p class="small">Цель раскладки = потребность × покрытие${cd.appetite < 1 ? ` × аппетит на высоте ${cd.appetite}` : ''}: <b>${n0(cd.target)} ккал</b> на группу. БЖУ на человека: Б ${n0(cd.mac.p)} · Ж ${n0(cd.mac.f)} · У ${n0(cd.mac.c)} г.</p></div></details>`;
}

function mealDialog(i, m, ctx) {
  const trip = getTrip();
  modal(() => {
    const { calc, menu, P, pset, mset } = ensure(), e = menu.days[i][m], prods = pset.items, ro = e.fromPlan && activePlan(trip)?.readonly;
    const opts = possibleFor(trip, calc, mset, pset, P, i, m).filter(d => d.id !== e.dish);
    return {
      title: `День ${i + 1} · ${slotLabel(mealsOf(trip, P), m)}`,
      html: `<h3>${esc(e.name || (e.empty ? 'Блюдо убрано' : 'Нет подходящего блюда'))}${e.pin ? ' · закреплено' : ''}</h3>
        ${e.perKcal ? `<p class="muted small">На человека ≈ ${e.perKcal} ккал, ${e.perGrams} г. Варка ${e.cook || 0} мин.</p>` : ''}
        ${e.parts ? e.parts.map(pt => `<h3>${esc(pt.name)}${pt.missing ? ' <span class="bad">— блюда нет в наборе</span>' : ''}</h3><ul class="list">${pt.items.map(it => `<li><span>${esc(itemName(it, prods))}${it.skip ? ` <span class="bad small">не считается: ${esc(it.skip)}</span>` : ''}</span><b>${it.g} ${esc(it.unit || 'г')}</b></li>`).join('') || '<li class="muted">Пусто</li>'}</ul>`).join('') : `<ul class="list">${(e.items || []).map(it => `<li><span>${esc(itemName(it, prods))}${it.skip ? ` <span class="bad small">не считается: ${esc(it.skip)}</span>` : ''}</span><b>${it.g} ${esc(it.unit || 'г')}</b></li>`).join('') || '<li class="muted">Пусто</li>'}</ul>`}
        ${e.comments?.length ? `<p class="muted small">Комментарий: ${esc(e.comments.join('; '))}</p>` : ''}
        <p class="muted small">Количества на всю группу${e.fromPlan ? ' (как в плане: на порцию × порции)' : ''}.${ro ? ' План — оригинал, только чтение: скопируйте план, чтобы менять.' : ''}</p>
        ${ro ? '' : `<div class="btnrow">${e.dish || e.fixed ? `<button class="btn" id="pin">${e.pin ? 'Открепить' : 'Закрепить'}</button>` : ''}<button class="btn danger" id="del">Убрать</button></div>`}
        ${!ro && opts.length ? `<h3>Заменить на</h3><ul class="list">${opts.map(d => `<li><button data-rep="${d.id}">${esc(d.name)}<span>›</span></button></li>`).join('')}</ul>` : ''}`,
      bind(root, refresh, close) {
        const set = v => { menu.days[i][m] = v; saveTrip(); ctx.rerender(); refresh(); };
        root.querySelector('#pin')?.addEventListener('click', () => set({ ...e, pin: !e.pin, fixed: e.fixed ? !e.pin ? true : false : e.fixed }));
        root.querySelector('#del')?.addEventListener('click', () => {}); if (!ro) root.querySelector('#del').onclick = () => { menu.days[i][m] = { empty: true, items: [], pin: false }; saveTrip(); ctx.rerender(); close(); };
        root.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => set(mealFor(trip, calc, mset, pset, P, i, m, b.dataset.rep)));
      },
    };
  });
}

function plansDialog(ctx) {
  const trip = getTrip();
  modal(() => ({
    title: 'Меню-планы',
    html: `<ul class="list">${plrepo.list().map(s => `<li><span>${s.readonly ? '🔒 ' : ''}<b>${esc(s.name)}</b> <span class="muted small">· ${s.rows.length} строк${s.id === trip.planId ? ' · применён' : ''}</span></span><span><button class="mini" data-ap="${s.id}">${s.id === trip.planId ? 'Снять' : 'Применить'}</button> <button class="mini" data-cp="${s.id}">Копия</button> ${s.readonly ? '' : `<button class="mini" data-rn="${s.id}">Переименовать</button> `}<button class="mini" data-dl="${s.id}">Удалить</button></span></li>`).join('') || '<li class="muted">Планов пока нет. Загрузите план из файла.</li>'}</ul>`,
    bind(root, refresh) {
      root.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => { const s = plrepo.get(b.dataset.ap); trip.planId = trip.planId === s.id ? null : s.id; if (trip.planId) { if (prepo.get(s.productSetId)) trip.productSet = s.productSetId; if (mrepo.get(s.dishSetId)) trip.menuSet = s.dishSetId; } trip.menu = null; saveTrip(); ctx.rerender(); refresh(); });
      root.querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => { if (!plrepo.canAdd()) { alert('Уже 10 планов.'); return; } const s = plrepo.get(b.dataset.cp); await plrepo.add({ ...JSON.parse(JSON.stringify(s)), id: plrepo.uid(), name: s.name + ' (копия)', readonly: false }); ctx.rerender(); refresh(); });
      root.querySelectorAll('[data-rn]').forEach(b => b.onclick = async () => { const s = plrepo.get(b.dataset.rn), n = prompt('Название плана', s.name); if (n && n.trim()) { s.name = n.trim(); await plrepo.save(s); ctx.rerender(); refresh(); } });
      root.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { const s = plrepo.get(b.dataset.dl); if (!confirm(`Удалить план «${s.name}»?`)) return; await plrepo.remove(s.id); if (trip.planId === s.id) { trip.planId = null; trip.menu = null; saveTrip(); } ctx.rerender(); refresh(); });
    },
  }));
}

const views = {
  calc(_, ctx) {
    const trip = getTrip(), { calc, menu, P, pset, mset } = ensure();
    const sel = `<div class="btnrow selrow"><label>Набор продуктов <select id="selp">${prepo.list().map(s => `<option value="${s.id}"${s.id === pset?.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>Набор меню <select id="selm">${mrepo.list().map(s => `<option value="${s.id}"${s.id === mset?.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>Меню (план) <select id="selpl"><option value="">— нет (генератор) —</option>${plrepo.list().map(s => `<option value="${s.id}"${s.id === trip.planId ? ' selected' : ''}>${s.readonly ? '🔒 ' : ''}${esc(s.name)}</option>`).join('')}</select></label>
      <button class="btn ghost" id="loadpl">Загрузить меню (план)</button><button class="btn ghost" id="mgpl">Планы…</button>
      <button class="btn" id="sm" style="margin-left:auto">Сводка расчёта</button><button class="btn" id="xl">Выгрузить в Excel</button></div>`;
    const bindSel = root => {
      root.querySelector('#selp').onchange = e => { trip.productSet = e.target.value; const m = mrepo.list().find(x => x.productSetId === e.target.value); if (m && mrepo.get(trip.menuSet)?.productSetId !== e.target.value) trip.menuSet = m.id; saveTrip(); ctx.rerender(); };
      root.querySelector('#selm').onchange = e => { trip.menuSet = e.target.value; const m = mrepo.get(e.target.value); if (m?.productSetId && prepo.get(m.productSetId)) trip.productSet = m.productSetId; saveTrip(); ctx.rerender(); };
      root.querySelector('#selpl').onchange = e => { const pl = plrepo.get(e.target.value); trip.planId = pl ? pl.id : null; if (pl) { if (prepo.get(pl.productSetId)) trip.productSet = pl.productSetId; if (mrepo.get(pl.dishSetId)) trip.menuSet = pl.dishSetId; } trip.menu = null; saveTrip(); ctx.rerender(); };
      root.querySelector('#loadpl').onclick = () => openLoad(ctx, { only: 'plan', after: () => ctx.rerender() });
      root.querySelector('#mgpl').onclick = () => plansDialog(ctx);
      root.querySelector('#sm').onclick = () => ctx.go('summary');
      root.querySelector('#xl').onclick = () => exportExcel(exportData()).catch(err => alert('Не удалось выгрузить: ' + err.message));
    };
    if (!calc.summary) return { html: `<h2>Расчёт</h2>${sel}${calc.warnings.map(w => `<p class="warnmsg">${esc(w)}</p>`).join('')}<p class="empty">Заполните вкладку «Поход»: участники с возрастом, ростом и весом и дни.</p>`, bind: bindSel };
    const prods = pset.items, S = calc.summary;
    const totG = menu.days.reduce((s, d) => s + menuGrams(d), 0), totK = menu.days.reduce((s, d) => s + menuKcal(d, prods), 0);
    const cov = S.need ? totK / S.need : 0, gpd = totG / S.n / S.days, covPct = Math.round(cov * 100);
    const problems = trip.planId ? [] : menuProblems(mset, pset), warns = [...calc.warnings, ...(menu.warnings || [])];
    if (problems.length) warns.push(`В наборе меню есть продукты, которых нет в наборе продуктов или они выключены: ${new Set(problems.map(p => p.ing.name)).size}. Откройте «Меню» → «Проверка».`);
    if (trip.planId && skippedCount(menu)) warns.push(`План применён как в файле: строк «не считается» (единицы не граммы, нет КБЖУ или продукта): ${skippedCount(menu)}. Они не входят в ккал и граммы.`);
    if (covPct < P.cov_warn) warns.push(`Общее покрытие ${covPct}% ниже порога ${P.cov_warn}%`);
    const slider = Math.round(trip.prefs.mode === 'custom' ? (trip.prefs.custom ?? P.cov_custom) : { hungry: P.cov_hungry, std: P.cov_std, full: P.cov_full }[trip.prefs.mode]);
    const cards = calc.days.map((cd, i) => {
      const day = menu.days[i], k = menuKcal(day, prods), c = cd.need ? Math.round(k / cd.need * 100) : 0, d = cd.d;
      return `<section class="dcard"><div class="dh"><b>День ${i + 1} · ${esc(d.type)}</b><span class="muted">${d.km ? d.km + ' км · ' : ''}${d.maxAlt ? Math.round(d.maxAlt) + ' м · ' : ''}${tempText(d)}</span></div>
        <div class="nums"><div><span class="big">${n0(cd.need)}</span><span class="muted small">потребность, ккал</span></div><div><span class="big">${n0(k)}</span><span class="muted small">даёт раскладка, ккал</span></div><div><span class="big ${c < P.cov_warn ? 'bad' : 'good'}">${c}%</span><span class="muted small">покрытие</span></div><div><span class="big">${n0(menuGrams(day))}</span><span class="muted small">граммов на группу</span></div></div>
        <p class="muted small">На человека: ${cd.per.map(x => `${esc(x.p.name || '—')} ${n0(x.total)}`).join(' · ')} ккал</p>${why(cd, P)}</section>`;
    }).join('');
    const slots = mealsOf(trip, P);
    const grid = `<div class="tbl"><table class="dtable mgrid"><tr><th>День</th>${slots.map(s => `<th>${esc(slotLabel(slots, s.id))}</th>`).join('')}</tr>${menu.days.map((day, i) => `<tr><td><b>${i + 1}</b><br><span class="muted small">${esc(calc.days[i].d.type)}</span></td>${slots.map(s => s.id).map(m => { const e = day[m] || {}; return `<td class="mcell" data-m="${i}:${m}">${e.pin ? '📌 ' : ''}${esc(e.name || (e.empty ? 'убрано' : '—'))}${(e.items || []).length ? `<br><span class="muted small">${n0((e.items || []).reduce((a, it) => a + (it.skip ? 0 : it.g), 0))} г · ${n0(itemsKcal(e.items, prods))} ккал${(e.items || []).some(it => it.skip) ? ` · <span class="bad">не считается: ${(e.items || []).filter(it => it.skip).length} стр.</span>` : ''}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>`;
    return {
      html: `<h2>Расчёт</h2>${sel}
        <div class="metrics"><div><span class="big">${S.days}</span><span class="muted small">дней</span></div><div><span class="big">${kg(totG)} кг</span><span class="muted small">вся раскладка</span></div><div><span class="big">${n0(gpd)} г</span><span class="muted small">на чел. в день</span></div><div><span class="big">${n0(totK / S.n / S.days)}</span><span class="muted small">ккал на чел.</span></div><div><span class="big ${covPct < P.cov_warn ? 'bad' : 'good'}">${covPct}%</span><span class="muted small">покрытие</span></div><div><span class="big">${kg(S.fuel)} кг</span><span class="muted small">газ</span></div></div>
        <p class="muted small">Ориентиры на человека в день: ${P.ref_hungry} г — голодно, ${P.ref_std} г — стандарт, ${P.ref_full} г — сытно. Оценки приблизительные и настраиваются.</p>
        <div class="fld"><label>Сытость: <b id="sv">${slider}%</b> от потребности</label><div class="ctl"><input type="range" id="slide" min="40" max="100" value="${slider}" style="width:150px"></div></div>
        <div class="btnrow"><button class="btn" id="rebuild">Пересобрать меню</button><span class="muted small">Закреплённые блюда не меняются.</span></div>
        ${warns.length ? `<h3>Предупреждения</h3><ul class="warnlist">${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        <div class="cols2"><div><h3>Дни</h3>${cards}</div><div class="menupanel"><h3>Меню</h3>${grid}<p class="muted small">Нажмите на ячейку: заменить, закрепить или убрать блюдо.</p></div></div>`,
      bind(root) {
        bindSel(root);
        const sl = root.querySelector('#slide');
        sl.oninput = () => { root.querySelector('#sv').textContent = sl.value + '%'; };
        sl.onchange = () => { trip.prefs.mode = 'custom'; trip.prefs.custom = +sl.value; saveTrip(); ctx.rerender(); };
        root.querySelector('#rebuild').onclick = () => { ensure(true); ctx.rerender(); };
        root.querySelectorAll('.mcell').forEach(td => td.onclick = () => { const [i, m] = td.dataset.m.split(':'); mealDialog(+i, m, ctx); });
      },
    };
  },
};

return {activePlan, sets, sig, ensure, exportData, menuKcal, menuGrams, views};
})();
__m['buyers.js'] = (() => {
// Закупщики: у похода может быть несколько. Продукт попадает к закупщику по исключению для позиции (buyItem) или по отделу (buyDept).
// Список закупщиков — trip.buyers [{id, name, note}], назначения — trip.buyDept {отдел: id}, trip.buyItem {id продукта: id}.
const ensureBuyers = t => { t.buyers ||= []; t.buyDept ||= {}; t.buyItem ||= {}; return t; };

function addBuyer(t, name = '') {
  ensureBuyers(t);
  let k = t.buyers.length + 1; while (t.buyers.some(b => b.id === 'z' + k)) k++;
  const b = { id: 'z' + k, name: name || `Закупщик ${t.buyers.length + 1}`, note: '' };
  t.buyers.push(b); return b;
}
function removeBuyer(t, id) {
  ensureBuyers(t); t.buyers = t.buyers.filter(b => b.id !== id);
  for (const m of [t.buyDept, t.buyItem]) for (const k of Object.keys(m)) if (m[k] === id) delete m[k];
}
function assign(t, kind, key, id) { ensureBuyers(t); const m = kind === 'dept' ? t.buyDept : t.buyItem; if (id) m[key] = id; else delete m[key]; }

// Закупщик строки списка покупок: сначала исключение для позиции, затем отдел; если закупщик удалён — не назначено
function buyerOf(t, row) {
  ensureBuyers(t);
  const id = t.buyItem[row.p.id] ?? t.buyDept[row.dept] ?? null;
  return id && t.buyers.some(b => b.id === id) ? id : null;
}

// rows — строки shopData (p, total, buy, packs, price, dept). Возвращает группы по закупщикам и «не назначено»
function splitByBuyer(t, rows) {
  ensureBuyers(t);
  const groups = t.buyers.map(b => ({ buyer: b, rows: [], sum: 0 })), none = { buyer: null, rows: [], sum: 0 };
  for (const r of rows) { const id = buyerOf(t, r), g = groups.find(x => x.buyer.id === id) || none; g.rows.push(r); g.sum += r.price || 0; }
  return { groups, none };
}

const n0 = x => Math.round(x).toLocaleString('ru');
const line = (r, round) => `  ${r.p.name} — ${r.packs && round ? `${r.packs} уп. по ${r.p.pack} г (${n0(r.buy)} г)` : `${n0(r.total)} г`}${r.price ? `, ≈ ${n0(r.price)}` : ''}`;
// Текст листа закупщика. info: { trip, n, days, currency, round, notes, order (порядок отделов) }
function buyerText(g, info) {
  const t = info.trip, head = g.buyer ? `Закупщик: ${g.buyer.name}${g.buyer.note ? ` (${g.buyer.note})` : ''}` : 'Не назначено';
  const out = [`${t.name || 'Поход'} — ${info.n} чел., ${info.days} дн.${t.start ? `, ${t.start}${t.end ? ' — ' + t.end : ''}` : ''}`, head, ''];
  for (const dep of info.order) { const r = g.rows.filter(x => x.dept === dep); if (r.length) { out.push(dep + ':'); r.slice().sort((a, b) => a.p.name.localeCompare(b.p.name)).forEach(x => out.push(line(x, info.round))); } }
  out.push('', `Позиций: ${g.rows.length}${g.sum ? `, итого ≈ ${n0(g.sum)} ${info.currency}` : ''}`);
  if (info.notes?.length) out.push('', 'О группе:', ...info.notes.map(x => '  ' + x));
  return out.join('\n');
}
const buyerCsv = g => '﻿Товар;Нужно, г;Упаковок;Купить, г;Цена;Отдел\n' + g.rows.map(r => [r.p.name, Math.round(r.total), r.packs ?? '', Math.round(r.buy), r.price ? Math.round(r.price) : '', r.dept].join(';')).join('\n');

return {ensureBuyers, addBuyer, removeBuyer, assign, buyerOf, splitByBuyer, buyerText, buyerCsv};
})();
__m['summary.js'] = (() => {
// Сводка расчёта: показатели, проверки и закупка по категориям. Чистые функции — данные берутся из расчёта, меню и списка покупок.
const {itemsKcal, MEALS} = __m['menu.js'];
const {mealsOf} = __m['meals.js'];
const {CATS} = __m['products.js'];

const CAT_RU = Object.fromEntries(CATS);
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

// Заметки о группе (для сводки и листов закупщиков)
const groupNotes = trip => [trip.simple?.on && trip.simple.veg ? 'Есть вегетарианцы' : '', trip.simple?.on && trip.simple.noEat ? `Не едят / аллергии: ${trip.simple.noEat}` : '', trip.simple?.on && trip.simple.notes ? trip.simple.notes : '',
  trip.prefs?.likes ? `Любимые блюда: ${trip.prefs.likes}` : '', trip.prefs?.dislikes ? `Нелюбимые блюда: ${trip.prefs.dislikes}` : ''].filter(Boolean);

// D: { trip, calc, menu, P, pset, rows (из shopData), currency }
function buildSummary(D) {
  const { trip, calc, menu, P, pset, rows, currency = '₸' } = D, S = calc.summary, n = S.n, days = S.days, prods = pset.items, byId = new Map(prods.map(p => [p.id, p]));
  const slots = mealsOf(trip, P);
  const cells = menu.days.flatMap(d => slots.map(s => ({ s, e: d[s.id] })));
  const counted = cells.filter(c => !c.e?.personal), filled = counted.filter(c => c.e?.items?.length);
  const items = menu.days.flatMap(d => Object.values(d).flatMap(e => (e?.items || []).filter(i => !i.skip)));
  const factK = sum(menu.days, d => sum(Object.values(d), e => itemsKcal(e?.items || [], prods))) / n / days;
  const factP = sum(items, i => (byId.get(i.pid)?.p || 0) * i.g / 100) / n / days;
  const goalK = S.kcalPerPersonDay, goalP = sum(calc.days, d => d.mac.p) / calc.days.length;
  const buyG = sum(rows, r => r.buy), cost = sum(rows, r => r.price), reserveG = sum(rows, r => r.reserve + (r.resG || 0));
  const ratio = goalK ? factK / goalK : 0, okK = ratio >= 0.9 && ratio <= 1.1;
  const noPrice = rows.filter(r => !r.p.price), noPack = rows.filter(r => !r.p.pack), noKcal = rows.filter(r => r.p.kcal == null);
  const noRecipe = counted.filter(c => c.e && !c.e.empty && c.e.name && !c.e.items?.length);
  const personal = cells.filter(c => c.e?.personal).length;

  const indicators = [
    { label: 'Участников, чел.', value: n },
    { label: 'Дней, суток', value: days },
    { label: 'Цель энергии, ккал/чел/день', value: Math.round(goalK) },
    { label: 'Факт энергии, ккал/чел/день', value: Math.round(factK) },
    { label: 'Цель белка, г/чел/день', value: Math.round(goalP) },
    { label: 'Факт белка, г/чел/день', value: Math.round(factP) },
    { label: 'Вес закупки, кг', value: +(buyG / 1000).toFixed(1) },
    { label: 'Вода, л/чел/день (оценка)', value: +(S.water / n / days).toFixed(1) },
    { label: 'Топливо на поход, г', value: Math.round(S.fuel) },
    { label: `Общая стоимость, ${currency}`, value: cost ? Math.round(cost) : null },
    { label: `Стоимость, ${currency}/чел/день`, value: cost ? Math.round(cost / n / days) : null },
    { label: 'Заполненных приёмов меню', value: `${filled.length} из ${counted.length}` },
    { label: 'Статус калорий', value: okK ? 'OK' : 'Проверить', status: okK ? 'ok' : 'warn', note: `факт ${Math.round(ratio * 100)}% от цели (допустимо 90–110%)` },
  ];
  const check = (label, bad, okText = 'OK') => ({ label, ok: !bad.length, text: bad.length ? `${bad.length}: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? '…' : ''}` : okText });
  const checks = [
    check('Все блюда имеют рецепт', noRecipe.map(c => c.e.name)),
    check('Все продукты имеют цену', noPrice.map(r => r.p.name)),
    check('Все упаковки заполнены', noPack.map(r => r.p.name)),
    check('У всех продуктов есть КБЖУ', noKcal.map(r => r.p.name)),
    { label: 'Меню не пустое', ok: filled.length > 0, text: filled.length ? 'OK' : 'нет ни одного приёма' },
    { label: 'Резерв закупки', ok: true, text: `${trip.food?.reservePct ?? 0}% от количества + аварийный запас ${P.reserve_days} дн. (всего ≈ ${buyG ? Math.round(reserveG / Math.max(1, buyG - reserveG) * 100) : 0}% к рациону)` },
  ];
  if (personal) checks.push({ label: 'Приёмы «в личке»', ok: true, text: `${personal} (в раскладку не входят)` });
  const warnings = menu.warnings || [];
  if (warnings.length) checks.push({ label: 'Предупреждения меню', ok: false, text: `${warnings.length}: см. «Расчёт»` });

  const cat = new Map();
  rows.forEach(r => { const c = cat.get(r.p.cat) || { cat: r.p.cat, name: CAT_RU[r.p.cat] || r.p.cat, g: 0, cost: 0 }; c.g += r.buy; c.cost += r.price; cat.set(r.p.cat, c); });
  const byCategory = CATS.map(([k]) => cat.get(k)).concat([...cat.values()].filter(c => !CAT_RU[c.cat])).filter(Boolean).map(c => ({ name: c.name, kg: +(c.g / 1000).toFixed(2), cost: c.cost ? Math.round(c.cost) : null }));
  const notes = groupNotes(trip);
  return { indicators, checks, byCategory, totalKg: +(buyG / 1000).toFixed(2), totalCost: cost ? Math.round(cost) : null, currency, notes, name: trip.name || 'Поход' };
}

// Строки для Excel и текста
function summaryRows(s) {
  const v = x => (x == null ? '' : x);
  return [
    { name: 'Сводка', rows: [['Сводка расчёта: ' + s.name], [], ['Показатель', 'Значение', 'Примечание'], ...s.indicators.map(i => [i.label, v(i.value), i.note || '']), [], ['Проверка', 'Результат'], ...s.checks.map(c => [c.label, c.text]), ...(s.notes.length ? [[], ['Заметки группы'], ...s.notes.map(x => [x])] : [])] },
    { name: 'Закупка по категориям', rows: [['Категория', 'Купить, кг', `Стоимость, ${s.currency}`], ...s.byCategory.map(c => [c.name, c.kg, v(c.cost)]), ['Итого', s.totalKg, v(s.totalCost)]] },
  ];
}
function summaryText(s) {
  const f = x => (typeof x === 'number' ? x.toLocaleString('ru') : x ?? '—');
  return [`Сводка расчёта: ${s.name}`, '', ...s.indicators.map(i => `${i.label}: ${f(i.value)}${i.note ? ` (${i.note})` : ''}`), '', 'Проверки:', ...s.checks.map(c => `  ${c.ok ? '✓' : '✗'} ${c.label}: ${c.text}`), '', 'Закупка по категориям:', ...s.byCategory.map(c => `  ${c.name}: ${f(c.kg)} кг${c.cost != null ? `, ${f(c.cost)} ${s.currency}` : ''}`), `  Итого: ${f(s.totalKg)} кг${s.totalCost != null ? `, ${f(s.totalCost)} ${s.currency}` : ''}`, ...(s.notes.length ? ['', 'Заметки группы:', ...s.notes.map(x => '  ' + x)] : [])].join('\n');
}

return {groupNotes, buildSummary, summaryRows, summaryText};
})();
__m['shop.js'] = (() => {
// Вкладка «Покупки»: список, фасовка, рюкзаки, топливо и вода, экспорт.
const {allParams, opts, saveOpts} = __m['params.js'];
const {SHOP_DEPT} = __m['products.js'];
const {MEALS, allowed} = __m['menu.js'];
const {mealsOf, slotLabel} = __m['meals.js'];
const {addBuyer, removeBuyer, assign, buyerOf, splitByBuyer, buyerText, buyerCsv, ensureBuyers} = __m['buyers.js'];
const {groupNotes} = __m['summary.js'];
const {products, byId} = __m['pstore.js'];
const {getTrip, saveTrip, setTrip, newTrip} = __m['trip.js'];
const {ensure, menuGrams, exportData} = __m['calcview.js'];
const {exportExcel} = __m['exportxlsx.js'];
const {esc} = __m['ui.js'];

const n0 = x => Math.round(x).toLocaleString('ru'), kg = g => (g / 1000).toFixed(1).replace('.', ',');
const DEPT_ORDER = ['Овощи', 'Хлеб', 'Мясо', 'Молочный отдел', 'Бакалея', 'Специи', 'Сладкое', 'Сухофрукты и орехи', 'Напитки', 'Прочее'];

// Аварийный запас: калорийные продукты на reserve_days дней
function reserveItems(trip, calc, P) {
  const parts = [['Грецкий|Арахис|Миндаль', .3], ['Шоколад', .25], ['Халва|Козинаки', .25], ['Масло топлёное', .2]], out = [];
  const kcal = calc.summary.reserveKcal;
  parts.forEach(([kw, f]) => {
    const p = products().find(x => x.on && kw.split('|').some(k => x.name.includes(k)) && allowed(x, trip.group));
    if (p && p.kcal > 0) out.push({ pid: p.id, g: Math.round(kcal * f / p.kcal * 100 / 10) * 10 });
  });
  return out;
}

function shopData() {
  const trip = getTrip(), { calc, menu, P, pset } = ensure();
  if (!menu) return null;
  const n = calc.summary.n, need = {}, add = (pid, g, tag) => { need[pid] ??= { g: 0, reserve: 0 }; need[pid][tag || 'g'] += g; };
  menu.days.forEach(d => Object.values(d).forEach(e => (e?.items || []).forEach(it => add(it.pid, it.g))));
  const extra = (name, g) => { const p = products().find(x => x.on && x.name === name); if (p && g > 0) add(p.id, g); };
  extra('Соль', P.salt_fix + P.salt_pp * n * menu.days.length);
  const reserve = reserveItems(trip, calc, P);
  reserve.forEach(it => add(it.pid, it.g, 'reserve'));
  const rows = Object.entries(need).map(([pid, v]) => {
    const p = byId(pid); if (!p) return null;
    const resPct = Math.max(0, +(trip.reserveItem?.[pid] ?? trip.food?.reservePct ?? 0) || 0), resG = Math.round(v.g * resPct / 100 * 10) / 10; // резерв в % от количества продукта
    const total = v.g + v.reserve + resG, packs = p.pack ? Math.ceil(total / p.pack - 1e-9) : null;
    return { p, g: v.g, reserve: v.reserve, resPct, resG, total, packs, buy: opts.round && packs ? packs * p.pack : total, price: p.price && packs ? packs * p.price : (p.price ? p.price * total / (p.pack || 100) : 0), dept: SHOP_DEPT[p.cat] || 'Прочее' };
  }).filter(Boolean);
  return { trip, calc, menu, P, pset, rows, n, reserve };
}

const bought = t => (t.bought ||= {});
const fuelDays = (calc, P) => calc.days.map(d => d.fuel);

function weights(D) {
  const { trip, calc, menu } = D, g = calc.days[0].per.map(x => x.p), shareSum = g.reduce((s, p) => s + (p.share || 1), 0);
  const dayFood = menu.days.map((d, i) => menuGrams(d) + calc.days[i].fuel + 0);
  const menuG = menu.days.reduce((t, d) => t + menuGrams(d), 0), resTotal = D.rows.reduce((t, r) => t + r.reserve, 0);
  const extras = Math.max(0, D.rows.reduce((t, r) => t + r.total - r.reserve, 0) - menuG);
  const drops = (trip.drops || []).map(d => +d.after).filter(Boolean).sort((a, b) => a - b);
  const common = trip.gear.common || 0;
  return g.map(p => {
    const sh = (p.share || 1) / shareSum, byDay = dayFood.map((_, d) => {
      const end = drops.find(a => a >= d + 1 && a < dayFood.length) ?? dayFood.length;
      const seg = dayFood.slice(d, end).reduce((a, b) => a + b, 0) + resTotal;
      return ((p.gear || 0) + common * sh) + (seg + extras) * sh / 1000;
    });
    return { p, sh, byDay };
  });
}

function textExport(D) {
  const { trip, rows, calc } = D, t = [`Раскладка: ${trip.name || 'поход'}`, `${calc.summary.days} дн., ${calc.summary.n} чел.`, '', 'СПИСОК ПОКУПОК'];
  DEPT_ORDER.forEach(dep => { const r = rows.filter(x => x.dept === dep); if (r.length) { t.push(dep + ':'); r.forEach(x => t.push(`  ${x.p.name} — ${x.packs && opts.round ? `${x.packs} уп. (${n0(x.buy)} г)` : n0(x.total) + ' г'}`)); } });
  t.push('', 'ПО ДНЯМ');
  D.menu.days.forEach((d, i) => { t.push(`День ${i + 1}`); const sl = mealsOf(trip, D.P); sl.forEach(s => { const e = d[s.id]; if (e?.items?.length) t.push(`  ${slotLabel(sl, s.id)}: ${e.name || ''} — ${e.items.map(it => `${byId(it.pid)?.name} ${it.g} г`).join(', ')}`); }); });
  return t.join('\n');
}
const csvExport = D => '﻿Товар;Нужно, г;Резерв, г;Упаковка, г;Упаковок;Купить, г;Отдел\n' + D.rows.map(r => [r.p.name, r.g, r.reserve, r.p.pack || '', r.packs ?? '', r.buy, r.dept].join(';')).join('\n');
function download(name, text, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

const views = {
  shop(_, ctx) {
    const D = shopData();
    if (!D) return { html: '<h2>Покупки</h2><p class="empty">Список появится после составления меню: нужен набор продуктов и набор меню.</p>' };
    const tab = ctx.state.shopTab || 'list', { trip, calc, menu, P, rows, n } = D, b = bought(trip);
    const tabs = [['list', 'Список'], ['buy', 'Закупщики'], ['pack', 'Фасовка'], ['bags', 'Рюкзаки'], ['fuel', 'Топливо'], ['exp', 'Экспорт']];
    let body = '';
    if (tab === 'list') {
      const sum = rows.reduce((s, r) => s + r.price, 0);
      body = `<div class="fld"><label>Крупный шрифт (для магазина)</label><div class="ctl"><input type="checkbox" id="big"${ctx.state.big ? ' checked' : ''}></div></div>
        ${DEPT_ORDER.map(dep => { const r = rows.filter(x => x.dept === dep).sort((a, b) => a.p.name.localeCompare(b.p.name)); return r.length ? `<h3>${dep}</h3><ul class="list shop">${r.map(x => `<li class="${b[x.p.id] ? 'done' : ''}"><label><input type="checkbox" data-buy="${x.p.id}"${b[x.p.id] ? ' checked' : ''}><span><b>${esc(x.p.name)}</b><br><span class="muted small">нужно ${n0(x.total)} г${x.resG ? ` (в т.ч. резерв ${x.resPct}% = ${n0(x.resG)})` : ''}${x.reserve ? ` (в т.ч. аварийный запас ${n0(x.reserve)})` : ''}${x.packs && opts.round ? ` → ${x.packs} × ${x.p.pack} г = ${n0(x.buy)} г` : ''}</span></span></label><span class="muted small">резерв <input data-rp="${x.p.id}" type="number" min="0" step="any" style="width:56px" value="${trip.reserveItem?.[x.p.id] ?? ''}" placeholder="${trip.food?.reservePct ?? 0}"> %</span>${x.price ? `<span>${n0(x.price)} ${opts.currency}</span>` : ''}</li>`).join('')}</ul>` : ''; }).join('')}
        ${sum ? `<p><b>Итого ${n0(sum)} ${opts.currency}</b> · с человека ${n0(sum / n)} ${opts.currency}</p>` : '<p class="muted small">Цены не заданы. Их можно указать в карточке продукта.</p>'}
        <p class="muted small">Резерв ${trip.food?.reservePct ?? 0}% от количества (для отдельных продуктов можно задать своё) и аварийный запас на ${P.reserve_days} дн. включены в список.</p>`;
    } else if (tab === 'buy') {
      ensureBuyers(trip);
      const opt = sel => '<option value="">не назначено</option>' + trip.buyers.map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.name) + '</option>').join(''), sp = splitByBuyer(trip, rows);
      const info = { trip, n, days: calc.summary.days, currency: opts.currency, round: opts.round, notes: groupNotes(trip), order: DEPT_ORDER };
      const card = (g, i) => '<section class="dcard"><div class="dh"><b>' + (g.buyer ? esc(g.buyer.name) : 'Не назначено') + '</b><span class="muted">' + (g.buyer?.note ? esc(g.buyer.note) + ' · ' : '') + g.rows.length + ' поз.' + (g.sum ? ' · ≈ ' + n0(g.sum) + ' ' + opts.currency : '') + '</span></div>'
        + (g.rows.length ? DEPT_ORDER.map(dep => { const r = g.rows.filter(x => x.dept === dep); return r.length ? '<p class="muted small"><b>' + dep + '</b></p><ul class="list">' + r.sort((a, b) => a.p.name.localeCompare(b.p.name)).map(x => '<li><span>' + esc(x.p.name) + '</span><b>' + (x.packs && opts.round ? x.packs + ' уп. · ' + n0(x.buy) + ' г' : n0(x.total) + ' г') + '</b></li>').join('') + '</ul>' : ''; }).join('') : '<p class="empty">Пусто.</p>')
        + (g.rows.length ? '<div class="btnrow"><button class="btn ghost" data-bcopy="' + i + '">Скопировать текстом</button><button class="btn ghost" data-bcsv="' + i + '">CSV</button></div>' : '') + '</section>';
      const all = [...sp.groups, sp.none];
      body = '<h3>Закупщики</h3>' + (trip.buyers.map(x => '<div class="fld"><input data-bn="' + x.id + '" value="' + esc(x.name) + '" placeholder="Имя" style="width:140px"> <input data-bt="' + x.id + '" value="' + esc(x.note || '') + '" placeholder="Магазин, рынок, срок" style="width:200px"> <button class="mini" data-bx="' + x.id + '">Удалить</button></div>').join('') || '<p class="empty">Закупщиков пока нет: все покупки в общем списке.</p>')
        + '<div class="btnrow"><button class="btn" id="addbuyer">Добавить закупщика</button></div>'
        + (trip.buyers.length ? '<h3>Кто что покупает</h3><p class="muted small">Назначьте отдел целиком, а отдельные продукты можно передать другому закупщику.</p><div class="tbl"><table class="dtable">' + DEPT_ORDER.filter(dep => rows.some(r => r.dept === dep)).map(dep => '<tr><td>' + dep + '</td><td><select data-bd="' + esc(dep) + '">' + opt(trip.buyDept[dep]) + '</select></td></tr>').join('') + '</table></div>'
          + '<details><summary>Отдельные продукты (исключения)</summary><div class="tbl"><table class="dtable">' + rows.slice().sort((a, b) => a.p.name.localeCompare(b.p.name)).map(r => '<tr><td>' + esc(r.p.name) + ' <span class="muted small">' + r.dept + '</span></td><td><select data-bi="' + r.p.id + '"><option value="">как у отдела</option>' + trip.buyers.map(x => '<option value="' + x.id + '"' + (trip.buyItem[r.p.id] === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></td></tr>').join('') + '</table></div></details>'
          + '<h3>Листы закупщиков</h3>' + (sp.none.rows.length ? '<p class="warnmsg">Не назначено позиций: ' + sp.none.rows.length + '</p>' : '') + all.filter(g => g.buyer || g.rows.length).map((g, i) => card(g, all.indexOf(g))).join('') + '<div class="btnrow"><button class="btn" id="ballcopy">Все листы текстом</button></div>' : '');
      ctx.buyerData = { all, info };
    } else if (tab === 'pack') {
      body = menu.days.map((d, i) => `<h3>День ${i + 1}</h3>` + mealsOf(trip, P).map(sl => { const m = sl.type, e = d[sl.id]; if (!e?.items?.length) return ''; const sp = m === 'l' ? Math.max(1, +trip.prefs.lunchSplit || 1) : 1, times = ['11:00', '13:30', '16:00'];
        const part = k => e.items.map(it => `${esc(byId(it.pid)?.name)} ${Math.round(it.g / sp / 5) * 5 || 5} г`).join(', ');
        return `<div class="pk"><b>${esc(slotLabel(mealsOf(trip, P), sl.id))}</b> · ${esc(e.name || '')}${sp > 1 ? ` <span class="muted">· ${sp} пакета(ов) на человека-приём</span>` : ''}<br>${sp > 1 ? Array.from({ length: sp }, (_, k) => `<span class="muted"><b>Пакет ${k + 1} (${times[sp === 2 ? [0, 1][k] === 0 ? 0 : 2 : k]})</b>: ${part(k)}</span>`).join('<br>') : `<span class="muted">${e.items.map(it => `${esc(byId(it.pid)?.name)} ${it.g} г`).join(', ')}</span>`}</div>`; }).join('')).join('') + '<button class="btn" id="print">Печать этикеток</button>';
    } else if (tab === 'bags') {
      const W = weights(D), lim = p => (p.sex === 'F' ? trip.gear.maxF : trip.gear.maxM);
      body = `<p class="muted small">Вес рюкзака в начале каждого дня (личное снаряжение + доля общего + продукты и газ до ближайшей заброски). Продукты делятся по «Доле общего груза».</p>` + W.map(w => `<h3>${esc(w.p.name || 'Участник')} <span class="muted">· доля ${(w.sh * 100).toFixed(0)}%${lim(w.p) ? ` · лимит ${lim(w.p)} кг` : ''}</span></h3>
        <div class="tbl"><table><tr>${w.byDay.map((_, i) => `<th>Д${i + 1}</th>`).join('')}</tr><tr>${w.byDay.map(x => `<td class="${lim(w.p) && x > lim(w.p) ? 'bad' : ''}">${x.toFixed(1)}</td>`).join('')}</tr></table></div>
        <details><summary>Что нести</summary><ul class="list">${rows.slice().sort((a, b) => b.total - a.total).map(r => `<li><span>${esc(r.p.name)}</span><b>${n0(Math.round(r.buy * w.sh / 10) * 10)} г</b></li>`).join('')}</ul></details>`).join('');
    } else if (tab === 'fuel') {
      const fd = fuelDays(calc, P), tot = fd.reduce((a, b) => a + b, 0), water = calc.days.map(d => d.water);
      body = `<div class="metrics"><div><span class="big">${n0(tot)} г</span><span class="muted small">газ на поход</span></div><div><span class="big">${Math.ceil(tot / P.canister_g)}</span><span class="muted small">баллонов по ${P.canister_g} г</span></div><div><span class="big">${(water.reduce((a, b) => a + b, 0) / water.length).toFixed(1).replace('.', ',')} л</span><span class="muted small">воды на группу в день</span></div></div>
        <div class="tbl"><table><tr><th>День</th><th>Газ, г</th><th>Вода, л</th></tr>${fd.map((f, i) => `<tr><td>${i + 1}</td><td>${n0(f)}</td><td>${water[i].toFixed(1)}</td></tr>`).join('')}</table></div>
        <p class="muted small">Газ — по нормам из Настроек (без снега, с топкой снега, мороз/высота). Вода: ${P.water_ml} мл на кг веса, в жару плюс ${P.hot_l} л.</p>`;
    } else {
      body = `<div class="two"><button class="btn" id="xl">Выгрузить в Excel</button><button class="btn" id="share">Поделиться текстом</button><button class="btn ghost" id="print">Печать / PDF</button></div>
        <div class="two"><button class="btn ghost" id="csv">Скачать CSV</button><button class="btn ghost" id="json">Сохранить поход (JSON)</button></div>
        <label class="btn ghost filebtn">Загрузить поход (JSON)<input type="file" id="load" accept=".json" hidden></label><p class="warnmsg" id="msg"></p>`;
    }
    return {
      html: `<h2>Покупки</h2><div class="subtabs">${tabs.map(([k, n]) => `<button data-st="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="${ctx.state.big && tab === 'list' ? 'bigfont' : ''}">${body}</div>`,
      bind(root) {
        root.querySelectorAll('[data-st]').forEach(x => x.onclick = () => { ctx.state.shopTab = x.dataset.st; ctx.rerender(); });
        root.querySelector('#big')?.addEventListener('change', e => { ctx.state.big = e.target.checked; ctx.rerender(); });
        root.querySelectorAll('[data-buy]').forEach(c => c.onchange = () => { b[c.dataset.buy] = c.checked; saveTrip(); ctx.rerender(); });
        root.querySelectorAll('[data-rp]').forEach(c => c.onchange = () => { const v = c.value.trim(); trip.reserveItem ||= {}; if (v === '') delete trip.reserveItem[c.dataset.rp]; else trip.reserveItem[c.dataset.rp] = Math.max(0, +v || 0); saveTrip(); ctx.rerender(); });
        if (tab === 'buy') {
          const rer = () => { saveTrip(); ctx.rerender(); }, bd = ctx.buyerData, say = (btn, ok) => { btn.textContent = ok ? 'Скопировано' : 'Не удалось'; };
          root.querySelector('#addbuyer').onclick = () => { addBuyer(trip); rer(); };
          root.querySelectorAll('[data-bx]').forEach(x => x.onclick = () => { removeBuyer(trip, x.dataset.bx); rer(); });
          root.querySelectorAll('[data-bn]').forEach(x => x.onchange = () => { const b = trip.buyers.find(y => y.id === x.dataset.bn); if (b) { b.name = x.value.trim() || b.name; rer(); } });
          root.querySelectorAll('[data-bt]').forEach(x => x.onchange = () => { const b = trip.buyers.find(y => y.id === x.dataset.bt); if (b) { b.note = x.value; rer(); } });
          root.querySelectorAll('[data-bd]').forEach(x => x.onchange = () => { assign(trip, 'dept', x.dataset.bd, x.value); rer(); });
          root.querySelectorAll('[data-bi]').forEach(x => x.onchange = () => { assign(trip, 'item', x.dataset.bi, x.value); rer(); });
          root.querySelectorAll('[data-bcopy]').forEach(x => x.onclick = async () => { try { await navigator.clipboard.writeText(buyerText(bd.all[+x.dataset.bcopy], bd.info)); say(x, true); } catch { download('zakupki.txt', buyerText(bd.all[+x.dataset.bcopy], bd.info), 'text/plain'); } });
          root.querySelectorAll('[data-bcsv]').forEach(x => x.onclick = () => { const g = bd.all[+x.dataset.bcsv]; download('zakupki_' + (g.buyer?.name || 'не_назначено') + '.csv', buyerCsv(g), 'text/csv'); });
          root.querySelector('#ballcopy')?.addEventListener('click', async e => { const t = bd.all.filter(g => g.rows.length).map(g => buyerText(g, bd.info)).join('\n\n----------\n\n'); try { await navigator.clipboard.writeText(t); say(e.target, true); } catch { download('zakupki.txt', t, 'text/plain'); } });
        }
        root.querySelector('#print')?.addEventListener('click', () => window.print());
        root.querySelector('#xl')?.addEventListener('click', () => exportExcel(exportData()).catch(err => { root.querySelector('#msg').textContent = 'Не удалось выгрузить: ' + err.message; }));
        root.querySelector('#csv')?.addEventListener('click', () => download('raskladka.csv', csvExport(D), 'text/csv'));
        root.querySelector('#json')?.addEventListener('click', () => download('pohod.json', JSON.stringify(trip), 'application/json'));
        root.querySelector('#share')?.addEventListener('click', async () => {
          const text = textExport(D), msg = root.querySelector('#msg');
          try { if (navigator.share) await navigator.share({ title: trip.name || 'Раскладка', text }); else { await navigator.clipboard.writeText(text); msg.textContent = 'Скопировано, можно вставлять в мессенджер.'; } } catch (e) { if (e.name !== 'AbortError') { msg.textContent = 'Не удалось поделиться. Скачайте CSV.'; } }
        });
        root.querySelector('#load')?.addEventListener('change', async e => {
          try { const j = JSON.parse(await e.target.files[0].text()); if (!j.days || !j.group) throw 0; setTrip({ ...newTrip(), ...j }); ctx.rerender(); } catch { root.querySelector('#msg').textContent = 'Файл не похож на сохранённый поход.'; }
        });
      },
    };
  },
};

return {shopData, views};
})();
__m['summaryview.js'] = (() => {
// Экран «Сводка расчёта»: показатели, проверки, закупка по категориям; выгрузка в Excel и копирование текстом.
const {shopData} = __m['shop.js'];
const {opts} = __m['params.js'];
const {buildSummary, summaryRows, summaryText} = __m['summary.js'];
const {writeXlsx, download} = __m['xlsx.js'];
const {esc} = __m['ui.js'];

const f = x => (typeof x === 'number' ? x.toLocaleString('ru') : x ?? '—');

const views = {
  summary(_, ctx) {
    const back = `<button class="back" data-go="">‹ Расчёт</button>`;
    const D = shopData();
    if (!D) return { html: `${back}<h2>Сводка расчёта</h2><p class="empty">Сводка появится, когда будет рассчитано меню: заполните «Поход».</p>`, bind() {} };
    const S = buildSummary({ trip: D.trip, calc: D.calc, menu: D.menu, P: D.P, pset: D.pset, rows: D.rows, currency: opts.currency });
    const ind = S.indicators.map(i => `<tr><td>${esc(i.label)}</td><td class="num ${i.status === 'warn' ? 'bad' : i.status === 'ok' ? 'good' : ''}"><b>${esc(f(i.value))}</b>${i.note ? `<br><span class="muted small">${esc(i.note)}</span>` : ''}</td></tr>`).join('');
    const chk = S.checks.map(c => `<tr><td>${esc(c.label)}</td><td class="${c.ok ? 'good' : 'bad'}">${c.ok ? '✓ ' : '✗ '}${esc(c.text)}</td></tr>`).join('');
    const cat = S.byCategory.map(c => `<tr><td>${esc(c.name)}</td><td class="num">${f(c.kg)}</td><td class="num">${c.cost != null ? f(c.cost) : '—'}</td></tr>`).join('');
    return {
      html: `${back}<h2>Сводка расчёта</h2>
        <div class="cols2"><div class="tbl"><table class="dtable"><tr><th>Показатель</th><th>Значение</th></tr>${ind}</table></div>
        <div class="tbl"><table class="dtable"><tr><th>Проверка</th><th>Результат</th></tr>${chk}</table></div></div>
        <h3>Закупка по категориям</h3><div class="tbl"><table class="dtable"><tr><th>Категория</th><th>Купить, кг</th><th>Стоимость, ${esc(S.currency)}</th></tr>${cat}<tr><td><b>Итого</b></td><td class="num"><b>${f(S.totalKg)}</b></td><td class="num"><b>${S.totalCost != null ? f(S.totalCost) : '—'}</b></td></tr></table></div>
        ${S.totalCost == null ? '<p class="muted small">Цены не заданы: их можно указать в «Продукты».</p>' : ''}
        ${S.notes.length ? `<h3>Заметки группы</h3><ul class="list">${S.notes.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
        <div class="btnrow"><button class="btn" id="sx">Выгрузить сводку в Excel</button><button class="btn ghost" id="st">Скопировать текстом</button></div>`,
      bind(root) {
        root.querySelector('#sx').onclick = async () => download(`Сводка_${S.name}.xlsx`, await writeXlsx(summaryRows(S)));
        root.querySelector('#st').onclick = async e => { try { await navigator.clipboard.writeText(summaryText(S)); e.target.textContent = 'Скопировано'; } catch { download('Сводка.txt', summaryText(S), 'text/plain'); } };
      },
    };
  },
};

return {views};
})();
__m['extras.js'] = (() => {
// Экраны Настроек: мои поправки, шаблоны блюд, магазин, история, отзыв после похода, резервная копия, возможности.
const {DAY_TYPES, APP_VERSION} = __m['defaults.js'];
const {opts, saveOpts} = __m['params.js'];
const {MEALS} = __m['menu.js'];
const {products, byId} = __m['pstore.js'];
const {getTrip, saveTrip, setTrip, newTrip} = __m['trip.js'];
const {ensure} = __m['calcview.js'];
const {form, bindForm, esc} = __m['ui.js'];
const store = __m['store.js'];

const back = (to = 'settings', t = 'Настройки') => `<button class="back" data-go="${to}">‹ ${t}</button>`;
const numRow = (label, attr, val, unit = '%') => `<div class="fld"><label>${esc(label)}</label><div class="ctl"><input type="number" step="any" ${attr} value="${val ?? ''}"><span class="muted unit">${unit}</span></div></div>`;
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

const views = {
  adj(_, ctx) {
    const t = getTrip(); t.adj ||= { dayType: {}, meal: {}, product: {} };
    const a = t.adj;
    return {
      html: `${back()}<h2>Мои поправки</h2><p class="muted">Прибавка или убавка в процентах к рекомендации приложения. Общая поправка — в «Параметрах расчёта» (Сутки). Поправки по участникам — коэффициент аппетита в карточке участника.</p>
        <h3>По типу дня</h3>${DAY_TYPES.map(d => numRow(d, `data-a="dayType:${d}"`, a.dayType[d])).join('')}
        <h3>По приёму пищи</h3>${Object.entries(MEALS).map(([k, n]) => numRow(n, `data-a="meal:${k}"`, a.meal[k])).join('')}
`,
      bind(root) {
        root.querySelectorAll('[data-a]').forEach(i => i.onchange = () => { const [g, k] = i.dataset.a.split(':'); if (i.value === '') delete a[g][k]; else a[g][k] = +i.value; saveTrip(); });
      },
    };
  },

  shopset(_, ctx) {
    const F = [{ k: 'round', label: 'Округлять до упаковок', type: 'check' }, { k: 'currency', label: 'Валюта' }];
    return { html: `${back()}<h2>Магазин</h2>${form(F, opts)}<p class="muted small">Отделы магазина для списка покупок задаются категорией продукта.</p>`, bind: root => bindForm(root, F, opts, saveOpts, () => ctx.rerender()) };
  },

  history(_, ctx) {
    return {
      html: `${back()}<h2>История походов</h2><p class="muted">Сохранённые копии. Сейчас открыт: «${esc(getTrip().name || 'без названия')}».</p><button class="btn" id="save">Сохранить текущий поход в историю</button><ul class="list" id="hl"><li class="muted">Загрузка…</li></ul>`,
      async bind(root) {
        const render = async () => {
          const list = (await store.entries('trips')).filter(([k]) => k !== 'current').sort((a, b) => b[1]._saved - a[1]._saved);
          root.querySelector('#hl').innerHTML = list.map(([k, t]) => `<li><span style="flex:1">${esc(t.name || 'Без названия')}<br><span class="muted small">${new Date(t._saved).toLocaleDateString('ru')} · ${t.days.length} дн.</span></span><button class="mini" data-open="${k}">Открыть</button> <button class="mini" data-copy="${k}">Как шаблон</button> <button class="mini" data-del="${k}">×</button></li>`).join('') || '<li class="muted">Пока пусто</li>';
          root.querySelectorAll('[data-open]').forEach(b => b.onclick = async () => { if (confirm('Открыть этот поход? Текущий заменится (сначала сохраните его в историю).')) { const { _saved, ...t } = await store.get('trips', b.dataset.open); setTrip({ ...newTrip(), ...t }); ctx.go(''); } });
          root.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => { const { _saved, menu, bought, fb, ...t } = await store.get('trips', b.dataset.copy); setTrip({ ...newTrip(), ...t, name: (t.name || '') + ' (копия)', start: '', end: '' }); ctx.go(''); });
          root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await store.del('trips', b.dataset.del); render(); });
        };
        root.querySelector('#save').onclick = async () => { await store.put('trips', 'h' + Date.now(), { ...JSON.parse(JSON.stringify(getTrip())), _saved: Date.now() }); render(); };
        render();
      },
    };
  },

  feedback(_, ctx) {
    const t = getTrip(); t.fb ||= { days: [] };
    const sc = { '-1': 'Голодно', 0: 'Нормально', 1: 'Много' };
    return {
      html: `${back()}<h2>Отзыв после похода</h2><p class="muted">Отметь, как было по дням. Приложение предложит поправки, применятся только после подтверждения.</p>
        ${t.days.map((d, i) => `<div class="fld"><label>День ${i + 1}</label><div class="ctl"><div class="seg">${Object.entries(sc).map(([v, n]) => `<button data-fd="${i}:${v}" class="${String(t.fb.days[i]) === v ? 'on' : ''}">${n}</button>`).join('')}</div></div></div>`).join('') || '<p class="empty">Дней нет.</p>'}
        <button class="btn" id="sug">Предложить поправки</button><div id="out"></div>`,
      bind(root) {
        root.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.fd.split(':'); t.fb.days[+i] = +v; saveTrip(); ctx.rerender(); });
        root.querySelector('#sug').onclick = () => {
          const vals = t.fb.days.filter(v => v != null), avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, out = root.querySelector('#out');
          const delta = Math.round(-avg * 10) / 100, likes = [];
          if (!delta && !likes.length) { out.innerHTML = '<p class="muted">Поправок не нужно.</p>'; return; }
          out.innerHTML = `<h3>Предложение</h3>${delta ? `<p>В среднем было «${avg < 0 ? 'голодно' : 'много'}»: изменить коэффициент аппетита всех участников на ${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%.</p>` : ''}${likes.length ? `<p>Рейтинг блюд: ${likes.length} шт. (понравившиеся будут чаще попадать в меню).</p>` : ''}<button class="btn" id="apply">Применить</button>`;
          out.querySelector('#apply').onclick = () => {
            if (delta) t.group.forEach(p => { p.appetite = Math.round((p.appetite || 1) * (1 + delta) * 100) / 100; });
            saveTrip(); out.innerHTML = '<p class="good">Применено.</p>';
          };
        };
      },
    };
  },

  backup(_, ctx) {
    return {
      html: `${back()}<h2>Резервная копия</h2><p class="muted">Все данные приложения (походы, продукты, настройки) одним файлом.</p>
        <button class="btn" id="exp">Сохранить копию (JSON)</button><label class="btn ghost filebtn">Восстановить из файла<input type="file" id="imp" accept=".json" hidden></label><p class="warnmsg" id="msg"></p>`,
      bind(root) {
        root.querySelector('#exp').onclick = async () => {
          const all = { app: 'raskladka', version: APP_VERSION, date: new Date().toISOString() };
          for (const s of ['trips', 'products', 'settings']) all[s] = await store.entries(s);
          download(`raskladka-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(all));
        };
        root.querySelector('#imp').onchange = async e => {
          try {
            const j = JSON.parse(await e.target.files[0].text()); if (j.app !== 'raskladka') throw 0;
            if (!confirm('Все текущие данные будут заменены данными из файла. Продолжить?')) return;
            for (const s of ['trips', 'products', 'settings']) { await store.clear(s); for (const [k, v] of j[s] || []) await store.put(s, k, v); }
            location.reload();
          } catch { root.querySelector('#msg').textContent = 'Файл не подходит: нужна копия, сохранённая этим приложением.'; }
        };
      },
    };
  },

  features() {
    const L = [
      ['Запуск', 'Открывается двойным щелчком по Раскладка.html в Chrome или Edge, без сервера и установки. Данные хранятся в браузере; переносить между компьютерами можно через «Резервную копию».'],
      ['Поход', 'GPX-трек: берутся только координаты и высоты. Окна «Параметры похода» (дата, число дней, днёвки и запасные дни, разбивка трека на дни поровну по нагрузке), «Условия» на весь поход и «День N» (двойной щелчок по строке таблицы). Профиль высот с перетаскиваемыми ночёвками. Группа, снаряжение, питание, заброски, предпочтения, «обед весь день». Выбор набора продуктов и набора меню. «Рассчитать» включается, когда заполнено всё обязательное.'],
      ['Продукты', 'Вкладки-наборы (до 10): переименовать, дублировать, удалить, в файл, перетаскивание для порядка. «+ Набор»: пустой, копия, из файла .xlsx/.csv/.json с предпросмотром и ошибками построчно, вручную. Кнопки «Выбрать все», «Снять все выделение», «Инвертировать» и счётчик. Встроенные наборы «Базовый» и «Расширенный». Свой продукт: поиск КБЖУ в Open Food Facts, штрихкод, ввод вручную.'],
      ['Меню', 'Вкладки-наборы меню (до 10) с теми же действиями. Редактор блюда: продукты с граммами на человека (база, мин, макс), условия применения, время варки, включено/выключено. Проверка продуктов блюд по набору продуктов с вариантами «включить» и «заменить». Встроенные меню «Базовое» и «Расширенное», шаблон файла.'],
      ['Расчёт', 'Потребность каждого участника по дням: обмен, ходьба по Пандольфу, холод, высота, личные коэффициенты; «Почему столько?» показывает расчёт по шагам. Справа сетка меню день × приём пищи, замена, закрепление и удаление блюд, ползунок сытости. Наборы переключаются сразу. Предупреждения о покрытии, минимумах и недостающих продуктах. Выгрузка в Excel.'],
      ['Загрузка из Excel-формы', 'Простой шаблон («Скачать пустую форму»): две вкладки, «Продукты» и «Блюда», с минимумом колонок. Можно заполнить обе или только одну. Подсказка «Как заполнить» — в окне загрузки. Меню-план (лист «План») тоже загружается. Выгрузка наборов — расширенная форма, она тоже грузится обратно. Файлы .xls не читаются: сохраните как .xlsx. Кнопки «Загрузить продукты», «Загрузить блюда», «Загрузить меню (план)» и «Загрузить всё из файла» (в Продуктах, Меню, Расчёте и Настройках). Предпросмотр: что найдено, куда загрузить (новая вкладка или существующая), добавить или заменить, дубли названий, ошибки построчно, «не использовано». Данные грузятся как в файле. Единицы по умолчанию не пересчитываются (строки в шт, мл, л и продукты без КБЖУ помечаются «не считается»), но в окне загрузки можно выбрать пересчёт: кг → г, вес 1 шт (запоминается), «на группу» ÷ число человек. Связи: продукты из блюд и блюда из плана, которых нет в наборе, можно оставить с предупреждением, создать из файла или связать с существующими (название в данных не меняется). Планы можно применять к походу (оригинал — без генерации). «Отменить последнюю загрузку», «Скачать пустую форму», «Выгрузить наборы в форму Excel». Наборы-оригиналы помечены 🔒 (только чтение, можно сделать копию).'],
      ['Покупки', 'Список с округлением до упаковок и отделами магазина, фасовка по дням и приёмам (обед делится на пакеты), вес рюкзаков по дням, газ и вода, текст для мессенджера, CSV, JSON, печать, выгрузка в Excel по шаблону.'],
      ['Выгрузка в Excel', 'Файл повторяет ваш шаблон: те же листы, оформление, диаграмма и формулы; меняются данные и размеры таблиц. Формулы пересчитываются при открытии. Обновить шаблон: положите новый файл в папку «Шаблон раскладки» и запустите файл update-template.ps1 из папки tools.'],
      ['Настройки', 'Тема, все параметры расчёта и меню с возвратом к исходным (доли приёмов пищи проверяются на сумму 100%), справка по методологии, мои поправки, история походов, отзыв после похода, резервная копия.'],
    ];
    return { html: `${back()}<h2>Возможности приложения</h2>${L.map(([t, d]) => `<h3>${t}</h3><p>${esc(d)}</p>`).join('')}<p class="muted small">Версия ${APP_VERSION}.</p>` };
  },
};

return {views};
})();
__m['method.js'] = (() => {
// Справка по методологии. {id} подставляется текущим значением параметра и ведёт в его настройку.
const METHOD = [
  ['1. Основной обмен (BMR)', `Формула Миффлина — Сан Жеора на каждого участника:
М: 10·вес + 6,25·рост − 5·возраст + 5
Ж: 10·вес + 6,25·рост − 5·возраст − 161
Это расход покоя в ккал за сутки.`],
  ['2. Ходьба (Пандольф)', `Расход считается по участкам трека длиной {seg_step} м:
M (Вт) = 1,5·W + 2·(W+L)·(L/W)² + η·(W+L)·(1,5·v² + 0,35·v·G)
W — вес тела, L — вес рюкзака (меняется по дням: еда съедается), v — скорость м/с, G — уклон в % (от −{slope_clip} до +{slope_clip}), η — коэффициент покрытия.
Результат умножается на поправку {pandolf_corr}, потому что формула занижает реальный расход. Ватт-часы в ккал: ×{kcal_per_wh}.
Скорость берётся из меток времени трека, а если их нет — по функции Тоблера с базой {tobler_base} км/ч.
Высоты трека сглаживаются, порог {smooth_thr} м.`],
  ['3. Покрытие и спуск', `η: асфальт {eta_asphalt}, грунтовка {eta_dirt}, тропа {eta_trail}, кусты и курумник {eta_bush}, болото {eta_swamp}, песок {eta_sand}. Снег: {eta_snow_a} + {eta_snow_b}·глубина в см.
Спуск: берётся стоимость ровного участка с коэффициентом {descent_k_low} при уклоне до {descent_th_low}%, {descent_k_mid} при {descent_th_low}–{descent_th_high}% и {descent_k_high} круче {descent_th_high}%.`],
  ['4. Остальная часть суток и тип дня', `Вне ходьбы: (24 − ходовые часы) · BMR/24 · {camp_k}.
Днёвка: BMR · {rest_k}, без ходьбы.
Подходной и выход: доля дня по фактическому треку. Штурмовой: ходьба по треку плюс ранний подъём и горячий перекус.`],
  ['5. Холод и высота', `Холод: + {cold_k} ккал на каждый градус ниже {cold_t0} °C средней температуры дня.
Высота: расход растёт на {alt_pct}% за каждые 1000 м выше {alt_start} м (по максимальной высоте дня).
Аппетит в первые {app_days} дня на новой высоте: ×{app_alt1} выше 3000 м, ×{app_alt2} выше 4000 м, ×{app_alt3} выше 5000 м.
Выше {macro_alt} м соотношение белки : жиры : углеводы сдвигается с 1 : {macro_f_low} : {macro_c_low} до 1 : {macro_f_high} : {macro_c_high}.
Все эти оценки приблизительные, поэтому их можно менять.`],
  ['6. Потребность и раскладка', `Потребность = (ходьба + остаток суток + холод) · высота · личный коэффициент аппетита · (1 + {general_pct}%).
Цель по ккал = потребность × покрытие: голодная {cov_hungry}%, стандарт {cov_std}%, сытая {cov_full}%, своя {cov_custom}%. Ниже {cov_warn}% показывается предупреждение.
Граммы = цель / калорийность меню (около {kcal100} ккал/100 г, потом считается по реальным продуктам). Ориентиры для сверки: {ref_hungry} г — голодно, {ref_std} г — стандарт, {ref_full} г — сытно.
Аварийный запас: {reserve_days} дн.
Вес рюкзака проверяется: личное снаряжение + доля общего + продукты до ближайшей заброски не больше лимита.`],
  ['7. Меню и приёмы пищи', `Приёмы пищи в дне — список (по умолчанию завтрак, перекус, обед, перекус, ужин; его можно менять в «Питание и заброски»). Каждый приём получает свою долю ккал дня: по умолчанию завтрак {split_b}%, перекус {split_s}%, обед-перекус {split_l}%, перекус {split_s}%, ужин {split_d}% (в сумме 100%). Перекус собирается из блюд-перекусов набора, а если их нет — из сладкого и орехов набора на свою долю. Минимумы приёмов не урезаются: если из-за них день вышел за цель, в предупреждениях указан перебор.
Меню собирается только из готовых блюд выбранного набора меню и только из продуктов выбранного набора продуктов. Приложение не придумывает сочетания само: граммы блюда на человека масштабируются под потребность в пределах «мин / макс» каждого продукта.
Минимум на приём пищи (на человека): завтрак {min_b} ккал, обед-перекус {min_l} ккал и {min_l_g} г, ужин {min_d} ккал. Ниже минимума порция растёт в пределах «макс», а если и так мало — блюдо не используется.
Холодный обед-перекус обязан содержать три группы: углеводная основа ≥ {lunch_carb} г, белок/жир ≥ {lunch_prot} г, сладкое ≥ {lunch_sweet} г.
Условия блюд: днёвка, жара (выше {hot_t} °C), холод (средняя ниже {cold_cond_t} °C), высота > 3000 м, первые {fresh_days} дн. (свежее и хлеб). На высоте обед и перекус делаются углеводнее, в штурмовой день берутся блюда с варкой не дольше {assault_cook} мин (если таких нет — самые быстрые).
Одно блюдо не повторяется два дня подряд в одном приёме; одна основа-крупа — не чаще раза в день. Лук и чеснок отдельными продуктами не предлагаются никогда. Цикл ротации {rot_days} дн.`],
  ['8. Топливо и вода', `Газ на человека в день: {fuel_nosnow} г без снега, {fuel_snow} г с топкой снега, {fuel_cold} г в мороз или выше {fuel_cold_alt} м. За крупы, варящиеся дольше {long_min} мин, добавляется {long_g} г.
Вода: {water_ml} мл на кг веса, в жару (максимум выше {hot_t} °C) плюс {hot_l} л.`],
];

return {METHOD};
})();
__m['settings.js'] = (() => {
const {APP_VERSION, TERMS_VERSION, PARAMS, GROUPS} = __m['defaults.js'];
const {getParam, setParam, isChanged, resetParams, changedCount} = __m['params.js'];
const {METHOD} = __m['method.js'];
const {esc} = __m['ui.js'];
const store = __m['store.js'];
const {openLoad, blankForm, formBook} = __m['loadview.js'];
const {download} = __m['xlsx.js'];
const {repo: prepo} = __m['pstore.js'];
const {repo: mrepo} = __m['mstore.js'];
const {repo: plrepo} = __m['plstore.js'];

const DISCLAIMER = 'Расчёт питания в этом приложении оценочный и не является медицинской рекомендацией. Ответственность за питание группы лежит на руководителе и завхозе.';
const back = (to, label = 'Назад') => `<button class="back" data-go="${to}">‹ ${label}</button>`;

const views = {
  settings(_, ctx) {
    const th = (v, n) => `<button data-theme="${v}" class="${ctx.state.theme === v ? 'on' : ''}">${n}</button>`;
    return {
      html: `${back('')}<h2>Настройки</h2>
        <p class="muted">Тема оформления</p><div class="seg">${th('auto', 'Авто')}${th('light', 'Светлая')}${th('dark', 'Тёмная')}</div>
        <h3>Загрузка и выгрузка данных</h3>
        <div class="btnrow"><button class="btn ghost" id="ldall">Загрузить всё из одного файла</button><button class="btn ghost" id="blank">Скачать пустую форму Excel</button><button class="btn ghost" id="expform">Выгрузить наборы в форму Excel</button>${ctx.undoInfo ? '<button class="btn ghost" id="undo">Отменить последнюю загрузку</button>' : ''}</div>
        <p class="muted small" id="fmsg"></p>
        <ul class="list">
          <li><button data-go="params">Параметры расчёта<span>${PARAMS.length}${changedCount() ? ` · изменено ${changedCount()}` : ''} ›</span></button></li>
          <li><button data-go="method">Методология расчёта<span>справка ›</span></button></li>
          <li><button data-go="adj">Мои поправки<span>›</span></button></li>
          <li><button data-go="shopset">Магазин: округление и валюта<span>›</span></button></li>
          <li><button data-go="history">История походов<span>›</span></button></li>
          <li><button data-go="feedback">Отзыв после похода<span>›</span></button></li>
          <li><button data-go="backup">Резервная копия<span>›</span></button></li>
          <li><button data-go="features">Возможности приложения<span>›</span></button></li>
          <li><button data-go="legal">Правовая информация<span>›</span></button></li>
        </ul>`,
      bind(root) {
        root.querySelector('#ldall').onclick = () => openLoad(ctx, { after: () => ctx.rerender() });
        root.querySelector('#blank').onclick = async () => download('Форма_для_загрузки_пустая.xlsx', await blankForm());
        root.querySelector('#undo')?.addEventListener('click', async () => { await ctx.undoLoad(); ctx.rerender(); });
        root.querySelector('#expform').onclick = async () => {
          const t = ctx.trip(), plan = t.planId ? plrepo.get(t.planId) : null, pset = prepo.get(plan?.productSetId) || prepo.get(t.productSet), dset = mrepo.get(plan?.dishSetId) || mrepo.get(t.menuSet);
          download('Раскладка_наборы.xlsx', await formBook({ pset, dset, plan, params: plan?.meta?.params || pset?.meta?.params }));
          root.querySelector('#fmsg').textContent = `Выгружено: набор продуктов «${pset?.name}», набор блюд «${dset?.name}»${plan ? `, план «${plan.name}»` : ''}.`;
        };
        root.querySelectorAll('[data-theme]').forEach(b => b.onclick = async () => {
          ctx.state.theme = b.dataset.theme; await store.put('settings', 'theme', ctx.state.theme); ctx.applyTheme(); ctx.rerender();
        });
      },
    };
  },

  legal() {
    return {
      html: `${back('settings')}<h2>Правовая информация</h2><p>${DISCLAIMER}</p>
        <p class="muted">Источники данных: Open Food Facts (лицензия ODbL) — только для поиска КБЖУ нового продукта по названию или штрихкоду. Погода и высоты из интернета не используются. Версия приложения ${APP_VERSION}, условия v${TERMS_VERSION}.</p>`,
    };
  },

  params(group, ctx) {
    group = group || 'walk';
    const list = PARAMS.filter(p => p.group === group && !p.hidden);
    return {
      html: `${back('settings')}<h2>Параметры расчёта</h2>
        <div class="chips">${GROUPS.map(([g, n]) => `<button data-grp="${g}" class="${g === group ? 'on' : ''}">${n}</button>`).join('')}</div>
        <p class="muted">Это оценочные значения. Изменённые помечены точкой.</p>
        ${list.map(p => `<div class="fld"><label>${esc(p.label)}${isChanged(p.id) ? ' <span class="dot">●</span>' : ''}${p.hint ? `<button class="q" data-help="${p.id}">?</button>` : ''}</label>
          <div class="ctl"><input type="number" inputmode="decimal" step="any" data-p="${p.id}" value="${getParam(p.id)}"><span class="muted unit">${esc(p.unit)}</span>
          ${isChanged(p.id) ? `<button class="mini" data-reset="${p.id}">По умолчанию: ${p.def}</button>` : ''}</div></div>
          ${p.hint ? `<p class="help" id="help-${p.id}" hidden>${esc(p.hint)}</p>` : ''}`).join('')}
        ${group === 'menu' ? (() => { const sum = getParam('split_b') + getParam('split_l') + getParam('split_d') + 2 * getParam('split_s'); return `<p class="${sum === 100 ? 'good' : 'warnmsg'}"><b>Сумма долей ккал (завтрак + обед + ужин + 2 перекуса): ${sum}%</b>${sum === 100 ? '' : ' — должна быть 100%, иначе меню будет недобирать или перебирать'}</p>`; })() : ''}
        <button class="btn ghost" id="resetg">Сбросить группу</button>`,
      bind(root) {
        root.querySelectorAll('[data-grp]').forEach(b => b.onclick = () => ctx.go('params', b.dataset.grp, true));
        root.querySelectorAll('[data-help]').forEach(b => b.onclick = () => { const p = root.querySelector('#help-' + b.dataset.help); p.hidden = !p.hidden; });
        root.querySelectorAll('[data-p]').forEach(i => i.onchange = async () => {
          await setParam(i.dataset.p, i.value === '' ? null : Number(i.value)); ctx.rerender();
        });
        root.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => { await resetParams([b.dataset.reset]); ctx.rerender(); });
        root.querySelector('#resetg').onclick = async () => { await resetParams(list.map(p => p.id)); ctx.rerender(); };
      },
    };
  },

  method(_, ctx) {
    return {
      html: `${back('settings')}<h2>Методология расчёта</h2>
        <p class="muted">Справка. Цифры в тексте — текущие значения параметров, нажми на число, чтобы его изменить.</p>
        ${METHOD.map(([t, body]) => `<h3>${esc(t)}</h3><p class="prose">${esc(body).replace(/\{(\w+)\}/g, (_, id) => `<a class="pv" data-pv="${id}">${getParam(id)}</a>`)}</p>`).join('')}`,
      bind(root) {
        root.querySelectorAll('[data-pv]').forEach(a => a.onclick = () => ctx.go('params', PARAMS.find(p => p.id === a.dataset.pv).group));
      },
    };
  },
};

return {DISCLAIMER, views};
})();
__m['app.js'] = (() => {
const {APP_VERSION, TERMS_VERSION} = __m['defaults.js'];
const store = __m['store.js'];
const {loadParams} = __m['params.js'];
const {loadTrip, getTrip, saveTrip, views: tripViews} = __m['trip.js'];
const {views: prodViews} = __m['productsview.js'];
const {views: calcViews} = __m['calcview.js'];
const {views: summaryViews} = __m['summaryview.js'];
const {views: shopViews} = __m['shop.js'];
const {views: extraViews} = __m['extras.js'];
const {loadProducts, repo: prepo} = __m['pstore.js'];
const {loadMenus, repo: mrepo} = __m['mstore.js'];
const {loadPlans} = __m['plstore.js'];
const {saveUndo, getUndo, undoLoad, loadFileAll, formBook} = __m['loadview.js'];
const {repo: plrepo} = __m['plstore.js'];
const {views: menuViews} = __m['menuview.js'];
const {views: settingsViews, DISCLAIMER} = __m['settings.js'];

const app = document.getElementById('app');
const state = { tab: 'trip', sub: 'gpx', view: null, arg: null, theme: 'auto' };

const TABS = {
  trip: { name: 'Поход' },
  products: { name: 'Продукты' },
  menus: { name: 'Меню', empty: 'Наборы меню появятся на следующих этапах.' },
  calc: { name: 'Расчёт' },
  shop: { name: 'Покупки' },
};

function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = dark ? '#161A18' : '#2F4A3A';
}

function renderWelcome() {
  app.innerHTML = `<div class="welcome">
    <h1>Раскладка</h1><p class="muted">Расчёт питания для походов</p>
    <h2>Прежде чем начать</h2><p>${DISCLAIMER}</p>
    <label class="check"><input type="checkbox" id="ok"><span>Я прочитал(а) и согласен(на)</span></label>
    <button class="btn" id="go" disabled>Начать работу</button>
    <p class="muted">Условия v${TERMS_VERSION} · приложение ${APP_VERSION}</p></div>`;
  const ok = document.getElementById('ok'), go = document.getElementById('go');
  ok.onchange = () => go.disabled = !ok.checked;
  go.onclick = async () => {
    await store.put('settings', 'consent', { termsVersion: TERMS_VERSION, appVersion: APP_VERSION, date: new Date().toISOString() });
    renderShell();
  };
}

const ctx = {
  state, applyTheme, undoInfo: null,
  async saveUndo(u) { await saveUndo(u); ctx.undoInfo = u; }, async undoLoad() { await undoLoad(); ctx.undoInfo = null; }, trip: () => getTrip(), saveTrip: () => saveTrip(),
  // go('') — к вкладке; go('day', 2) — открыть экран; replace — не добавлять шаг
  go(view, arg = null) {
    if (view === 'products') { state.tab = 'products'; view = ''; }
    state.view = view || null; state.arg = arg; renderShell();
  },
  rerender() {
    const m = app.querySelector('main'), y = m ? m.scrollTop : 0;
    renderShell(); const n = app.querySelector('main'); if (n) n.scrollTop = y;
  },
};

function currentView() {
  if (state.view) return (tripViews[state.view] || prodViews[state.view] || menuViews[state.view] || calcViews[state.view] || summaryViews[state.view] || shopViews[state.view] || extraViews[state.view] || settingsViews[state.view])(state.arg, ctx);
  if (state.tab === 'trip') return tripViews.main(null, ctx);
  if (state.tab === 'shop') return shopViews.shop(null, ctx);
  if (state.tab === 'calc') return calcViews.calc(null, ctx);
  if (state.tab === 'products') return prodViews.products(null, ctx);
  if (state.tab === 'menus') return menuViews.menus(null, ctx);
  return { html: `<h2>${TABS[state.tab].name}</h2><p class="empty">${TABS[state.tab].empty}</p>` };
}

function renderShell() {
  const v = currentView();
  app.innerHTML = `<div class="shell"><aside class="side"><div class="logo">Раскладка</div>
    <nav class="tabs">${Object.entries(TABS).map(([k, t]) => `<button data-tab="${k}" class="${!state.view && state.tab === k ? 'on' : ''}">${t.name}</button>`).join('')}</nav>
    <button class="setbtn${state.view && ['settings', 'params', 'method', 'adj', 'shopset', 'history', 'feedback', 'backup', 'features', 'legal'].includes(state.view) ? ' on' : ''}" data-go="settings">⚙ Настройки</button></aside>
    <main>${v.html}</main></div>`;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; state.view = null; renderShell(); });
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.go(b.dataset.go, b.dataset.arg === undefined ? null : (isNaN(b.dataset.arg) ? b.dataset.arg : Number(b.dataset.arg))));
  v.bind?.(app.querySelector('main'));
}

(async () => {
  state.theme = (await store.get('settings', 'theme')) || 'auto';
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  await loadParams(); await loadTrip(); await loadProducts(); await loadMenus(); await loadPlans(); ctx.undoInfo = await getUndo();
  window.RK = Object.assign(window.RK || {}, { loadFile: (f, ro) => loadFileAll(ctx, f, ro), formBook, repos: { prepo, mrepo, plrepo }, ctx });
  { const t = getTrip(); if (!prepo.get(t.productSet)) t.productSet = prepo.first().id; if (!mrepo.get(t.menuSet)) t.menuSet = (mrepo.list().find(m => m.productSetId === t.productSet) || mrepo.first()).id; saveTrip(); }
  if (!(await store.get('settings', 'consent'))) renderWelcome(); else renderShell();
  // PWA и service worker отключены: приложение открывается двойным щелчком по Раскладка.html (file://).
  // if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

return {};
})();
})();
