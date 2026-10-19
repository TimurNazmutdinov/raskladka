// Экран «Поход»: общий блок, группа, вкладка «Вручную». Данные хранятся в одном объекте trip.
import { COVERS, DAY_TYPES, CATEGORIES } from './defaults.js';
import { getParam } from './params.js';
import { form, bindForm, esc } from './ui.js';
import { gpxSection } from './gpxview.js';
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
    { k: 'name', label: 'Название' }, { k: 'start', label: 'Начало', type: 'date' }, { k: 'end', label: 'Конец', type: 'date' },
    { k: 'kind', label: 'Вид', type: 'seg', opts: [['hike', 'Пеший'], ['mountain', 'Горный'], ['ski', 'Лыжный'], ['water', 'Водный']] },
    { k: 'category', label: 'Категория', type: 'select', opts: CATEGORIES.map(c => [c, c]) },
  ],
  day: [
    { k: 'type', label: 'Тип дня', type: 'select', opts: DAY_TYPES.map(c => [c, c]) },
    { k: 'date', label: 'Дата', type: 'date' },
    { k: 'km', label: 'Расстояние', type: 'number', unit: 'км', show: d => d.type !== 'Днёвка' },
    { k: 'up', label: 'Набор', type: 'number', unit: 'м', show: d => d.type !== 'Днёвка' },
    { k: 'down', label: 'Сброс', type: 'number', unit: 'м', show: d => d.type !== 'Днёвка' },
    { k: 'maxAlt', label: 'Макс. высота', type: 'number', unit: 'м' },
    { k: 'hours', label: 'Ходовое время', type: 'number', unit: 'ч', show: d => d.type !== 'Днёвка' },
    { k: 'cover', label: 'Покрытие', type: 'select', opts: COVERS, show: d => d.type !== 'Днёвка' },
    { k: 'snow', label: 'Глубина снега', type: 'number', unit: 'см', show: d => d.cover === 'snow' && d.type !== 'Днёвка' },
    { k: 'tday', label: 'Температура днём', type: 'number', unit: '°C', help: 'Ожидаемая дневная температура на маршруте. По ней считается жара (вода) и, вместе с ночной, холод.' },
    { k: 'tnight', label: 'Температура ночью', type: 'number', unit: '°C' },
    { k: 'precip', label: 'Осадки', type: 'select', opts: [['', 'Нет'], ['rain', 'Дождь'], ['snow', 'Снег']] },
    { k: 'melt', label: 'Топим снег на воду', type: 'check', help: 'Если воды нет и её получают из снега, газа уходит больше.' },
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
    { k: 'treat', label: 'Вкусняшка дня', type: 'check' },
    { k: 'budget', label: 'Бюджет (необязательно)', type: 'number' },
    { k: 'likes', label: 'Любимые блюда' }, { k: 'dislikes', label: 'Нелюбимые блюда' },
  ],
  drop: [
    { k: 'after', label: 'После дня №', type: 'number' }, { k: 'what', label: 'Что в заброске' },
  ],
};

const bound = (ctx, fields, obj, after) => root => bindForm(root, fields, obj, () => save(), () => { after?.(); ctx.rerender(); });
const newDay = () => ({ type: 'Ходовой', date: '', km: null, up: null, down: null, maxAlt: null, hours: null, cover: 'trail', snow: null, tday: null, tnight: null });
const newPerson = () => ({ id: crypto.randomUUID(), name: '', sex: 'M', age: null, height: null, weight: null, gear: null, appetite: getParam('appetite_def'), share: getParam('share_m'), allergy: '', veg: false, dislike: '' });
const dayRow = (d, i) => `<li><button data-go="day" data-arg="${i}"><span>${i + 1} · ${esc(d.type)}</span><span class="muted">${d.type === 'Днёвка' ? '' : `${d.km ?? '—'} км · +${d.up ?? 0}/−${d.down ?? 0} · ${d.hours ?? '—'} ч`} ›</span></button></li>`;
const link = (v, t, s) => `<li><button data-go="${v}">${t}<span class="muted">${s} ›</span></button></li>`;

export const views = {
  // Основной экран вкладки «Поход» (рисуется внутри вкладки)
  main(_, ctx) {
    const sub = ctx.state.sub;
    const gpx = sub === 'gpx' ? gpxSection(trip, save, ctx) : null;
    const days = sub === 'manual'
      ? `<h3>Дни</h3>${trip.days.length ? `<ul class="list">${trip.days.map(dayRow).join('')}</ul>` : '<p class="empty">Дней пока нет.</p>'}
         <button class="btn" id="addday">Добавить день</button>`
      : gpx.html;
    return {
      html: `<h2>Поход</h2><div class="subtabs"><button data-sub="gpx" class="${sub === 'gpx' ? 'on' : ''}">GPX-трек</button><button data-sub="manual" class="${sub === 'manual' ? 'on' : ''}">Вручную</button></div>
        ${days}<h3>Общее</h3>${form(F.trip, trip)}
        <ul class="list">${link('group', 'Группа', `${trip.group.length} чел`)}${link('gear', 'Снаряжение', trip.gear.common ? trip.gear.common + ' кг' : '—')}
        ${link('food', 'Питание и заброски', `${trip.food.hot} горячих`)}${link('prefs', 'Предпочтения', '')}</ul>`,
      bind(root) {
        bound(ctx, F.trip, trip)(root);
        gpx?.bind(root);
        root.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { ctx.state.sub = b.dataset.sub; ctx.rerender(); });
        root.querySelector('#addday')?.addEventListener('click', () => { trip.days.push(newDay()); save(); ctx.go('day', trip.days.length - 1); });
      },
    };
  },

  day(i, ctx) {
    const d = trip.days[i];
    return {
      html: `${back('', 'Поход')}<h2>День ${i + 1}</h2>${form(F.day, d)}
        <button class="btn" id="copy">Копировать день</button><button class="btn danger" id="del">Удалить день</button>`,
      bind(root) {
        bound(ctx, F.day, d)(root);
        root.querySelector('#copy').onclick = () => { trip.days.splice(i + 1, 0, { ...d }); save(); ctx.go('day', i + 1, true); };
        root.querySelector('#del').onclick = () => { trip.days.splice(i, 1); save(); ctx.go(''); };
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
