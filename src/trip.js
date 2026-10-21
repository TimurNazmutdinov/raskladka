// Экран «Поход»: общий блок, группа, вкладка «Вручную». Данные хранятся в одном объекте trip.
import { COVERS, DAY_TYPES, CATEGORIES } from './defaults.js';
import { getParam } from './params.js';
import { form, bindForm, esc } from './ui.js';
import { repo as prepo } from './pstore.js';
import { repo as mrepo } from './mstore.js';
import { daysSection, ensurePlan, rebuild } from './tripdays.js';
import * as store from './store.js';

export const newTrip = () => ({
  name: '', start: '', end: '', kind: 'mountain', category: CATEGORIES[0],
  days: [], group: [], drops: [],
  gear: { common: null, maxM: null, maxF: null },
  food: { hot: '2', lunchHot: false },
  prefs: { mode: 'std', custom: null, breakfast: 'milk', sugar: 'common', snacks: 'common', treat: false, budget: null, likes: '', dislikes: '' },
});

let trip;
export const loadTrip = async () => { trip = (await store.get('trips', 'current')) || newTrip(); return trip; };
const save = () => store.put('trips', 'current', trip);
export const getTrip = () => trip;
export const saveTrip = save;
export const setTrip = t => { trip = t; save(); };
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
  gear: [
    { k: 'common', label: 'Общественное снаряжение', type: 'number', unit: KG },
    { k: 'maxM', label: 'Макс. рюкзак М', type: 'number', unit: KG }, { k: 'maxF', label: 'Макс. рюкзак Ж', type: 'number', unit: KG },
  ],
  food: [
    { k: 'hot', label: 'Горячих приёмов в день', type: 'seg', opts: [['2', '2'], ['3', '3']] },
    { k: 'lunchHot', label: 'Обед горячий (иначе перекус)', type: 'check' },
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
    return {
      html: `${back('', 'Поход')}<h2>Группа</h2>
        ${trip.group.length ? `<ul class="list">${trip.group.map((p, i) => `<li><button data-go="person" data-arg="${i}"><span>${esc(p.name) || 'Без имени'} · ${p.sex === 'F' ? 'Ж' : 'М'}${p.age ? ' · ' + p.age : ''}</span><span class="muted">${p.weight ? p.weight + ' кг' : ''} ›</span></button></li>`).join('')}</ul>` : '<p class="empty">Участников пока нет.</p>'}
        <button class="btn" id="add">Добавить участника</button>`,
      bind(root) { root.querySelector('#add').onclick = () => { trip.group.push(newPerson()); save(); ctx.go('person', trip.group.length - 1); }; },
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
    return {
      html: `${back('', 'Поход')}<h2>Питание и заброски</h2><div id="foodf">${form(F.food, trip.food)}</div>
        <p class="muted">Аварийный запас: ${getParam('reserve_days')} дн. (меняется в Настройках)</p><h3>Заброски</h3>
        ${trip.drops.map((d, i) => `<div class="drop">${form(F.drop, d)}<button class="mini" data-deldrop="${i}">Удалить</button></div>`).join('') || '<p class="empty">Заброски не заданы.</p>'}
        <button class="btn" id="adddrop">Добавить заброску</button>`,
      bind(root) {
        bound(ctx, F.food, trip.food)(root.querySelector('#foodf'));
        root.querySelectorAll('.drop').forEach((el, i) => bindForm(el, F.drop, trip.drops[i], save, () => ctx.rerender()));
        root.querySelector('#adddrop').onclick = () => { trip.drops.push({ after: null, what: '' }); save(); ctx.rerender(); };
        root.querySelectorAll('[data-deldrop]').forEach(b => b.onclick = () => { trip.drops.splice(+b.dataset.deldrop, 1); save(); ctx.rerender(); });
      },
    };
  },
};
