// Экран «Поход»: общий блок, группа, вкладка «Вручную». Данные хранятся в одном объекте trip.
import { COVERS, DAY_TYPES, CATEGORIES } from './defaults.js';
import { getParam } from './params.js';
import { form, bindForm, esc } from './ui.js';
import { repo as prepo } from './pstore.js';
import { repo as mrepo } from './mstore.js';
import { daysSection, ensurePlan, rebuild } from './tripdays.js';
import * as store from './store.js';
import { defaultSimple, ensureTrip, setSimpleMode, rebuildSimple } from './simple.js';
import { TYPES, defaultMeals, mealsOf, shareSum, moveSlot, removeSlot, addSlot, slotLabel } from './meals.js';

export const newTrip = () => ({
  name: '', start: '', end: '', kind: 'mountain', category: CATEGORIES[0],
  days: [], group: [], drops: [],
  gear: { common: null, maxM: null, maxF: null },
  food: { hot: '2', lunchHot: false },
  prefs: { mode: 'std', custom: null, breakfast: 'milk', sugar: 'common', snacks: 'common', treat: false, budget: null, likes: '', dislikes: '', kcalGoal: null, restPct: 80 },
  simple: defaultSimple(),
});

let trip;
export const loadTrip = async () => { trip = ensureTrip((await store.get('trips', 'current')) || newTrip()); return trip; };
const splitP = () => ({ split_b: getParam('split_b'), split_l: getParam('split_l'), split_d: getParam('split_d'), split_s: getParam('split_s') });
const simpleDefs = () => ({ appetite: getParam('appetite_def'), shareM: getParam('share_m'), shareF: getParam('share_f') });
const save = () => store.put('trips', 'current', trip);
export const getTrip = () => trip;
export const saveTrip = save;
export const setTrip = t => { trip = ensureTrip(t); save(); };
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
const link = (v, t, s) => `<li><button data-go="${v}">${t}<span class="muted">${s} ›</span></button></li>`;

export const views = {
  main(_, ctx) {
    ensurePlan(trip);
    const ds = daysSection(trip, save, ctx);
    return {
      html: `<h2>Поход</h2>
        <div class="cols2"><div><div id="tf">${form(F.trip, trip)}</div>
        <div class="fld"><label>Набор продуктов</label><div class="ctl"><select id="sp">${prepo.list().map(s => `<option value="${s.id}"${s.id === trip.productSet ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div></div>
        <div class="fld"><label>Набор меню</label><div class="ctl"><select id="sm">${mrepo.list().map(s => `<option value="${s.id}"${s.id === trip.menuSet ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div></div>
        <ul class="list">${link('group', 'Группа', `${trip.group.length} чел`)}${link('gear', 'Снаряжение', trip.gear.common ? trip.gear.common + ' кг' : '—')}
        ${link('food', 'Питание и заброски', `${trip.food.hot} горячих`)}${link('prefs', 'Предпочтения', '')}</ul></div>
        <div></div></div>${ds.html}`,
      bind(root) {
        bindForm(root.querySelector('#tf'), F.trip, trip, () => save(), () => ctx.rerender()); ds.bind(root);
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
