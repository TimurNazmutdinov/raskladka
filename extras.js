// Экраны Настроек: мои поправки, шаблоны блюд, магазин, история, отзыв после похода, резервная копия, возможности.
import { DAY_TYPES, APP_VERSION } from './defaults.js';
import { opts, saveOpts } from './params.js';
import { DISHES, MEALS, findDish } from './menu.js';
import { products, byId } from './pstore.js';
import { getTrip, saveTrip, setTrip, newTrip } from './trip.js';
import { ensure } from './calcview.js';
import { form, bindForm, esc } from './ui.js';
import * as store from './store.js';

const back = (to = 'settings', t = 'Настройки') => `<button class="back" data-go="${to}">‹ ${t}</button>`;
const numRow = (label, attr, val, unit = '%') => `<div class="fld"><label>${esc(label)}</label><div class="ctl"><input type="number" step="any" ${attr} value="${val ?? ''}"><span class="muted unit">${unit}</span></div></div>`;
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

export const views = {
  adj(_, ctx) {
    const t = getTrip(); t.adj ||= { dayType: {}, meal: {}, product: {} };
    const a = t.adj, prods = products().filter(p => p.on);
    return {
      html: `${back()}<h2>Мои поправки</h2><p class="muted">Прибавка или убавка в процентах к рекомендации приложения. Общая поправка — в «Параметрах расчёта» (Сутки). Поправки по участникам — коэффициент аппетита в карточке участника.</p>
        <h3>По типу дня</h3>${DAY_TYPES.map(d => numRow(d, `data-a="dayType:${d}"`, a.dayType[d])).join('')}
        <h3>По приёму пищи</h3>${Object.entries(MEALS).map(([k, n]) => numRow(n, `data-a="meal:${k}"`, a.meal[k])).join('')}
        <h3>На конкретный продукт</h3><p class="muted small">Например «гречка +10 г»: к каждому приёму, где она есть, добавится столько граммов на человека.</p>
        ${Object.entries(a.product).map(([pid, g]) => numRow(byId(pid)?.name || '?', `data-a="product:${pid}"`, g, 'г/чел')).join('')}
        <div class="two"><select id="np"><option value="">Выбрать продукт…</option>${prods.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><button class="btn" id="addp" style="width:auto;margin:0">Добавить</button></div>`,
      bind(root) {
        root.querySelectorAll('[data-a]').forEach(i => i.onchange = () => { const [g, k] = i.dataset.a.split(':'); if (i.value === '') delete a[g][k]; else a[g][k] = +i.value; saveTrip(); });
        root.querySelector('#addp').onclick = () => { const v = root.querySelector('#np').value; if (v) { a.product[v] = a.product[v] ?? 10; saveTrip(); ctx.rerender(); } };
      },
    };
  },

  dishes(_, ctx) {
    const t = getTrip(); t.dishOff ||= []; t.customDishes ||= [];
    const all = [...DISHES, ...t.customDishes];
    return {
      html: `${back()}<h2>Шаблоны блюд</h2><p class="muted">Выключенные блюда не попадут в меню.</p>
        ${Object.entries(MEALS).map(([m, n]) => `<h3>${n}</h3><ul class="list">${all.filter(d => (m === 'l' ? 'ch'.includes(d.meal) : d.meal === m)).map(d => `<li><label class="sw"><input type="checkbox" data-d="${d.id}"${t.dishOff.includes(d.id) ? '' : ' checked'}></label><span style="flex:1">${esc(d.name)}${d.id[0] === 'u' ? ' ★' : ''}</span>${d.id[0] === 'u' ? `<button class="mini" data-rm="${d.id}">Удалить</button>` : ''}</li>`).join('')}</ul>`).join('')}
        <h3>Своё блюдо</h3><div class="fld"><label>Название</label><div class="ctl"><input id="dn"></div></div>
        <div class="fld"><label>Приём</label><div class="ctl"><select id="dm"><option value="b">Завтрак</option><option value="c">Обед холодный</option><option value="h">Обед горячий</option><option value="d">Ужин</option><option value="s">Перекусы</option></select></div></div>
        <div class="fld"><label>Продукты через запятую</label><div class="ctl"><input id="dp" placeholder="Гречка, Тушёнка, Масло"></div></div>
        <button class="btn" id="adddish">Добавить блюдо</button><p class="warnmsg" id="msg"></p>`,
      bind(root) {
        root.querySelectorAll('[data-d]').forEach(c => c.onchange = () => { const id = c.dataset.d; t.dishOff = t.dishOff.filter(x => x !== id); if (!c.checked) t.dishOff.push(id); saveTrip(); });
        root.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { t.customDishes = t.customDishes.filter(d => d.id !== b.dataset.rm); saveTrip(); ctx.rerender(); });
        root.querySelector('#adddish').onclick = () => {
          const name = root.querySelector('#dn').value.trim(), kws = root.querySelector('#dp').value.split(',').map(s => s.trim()).filter(Boolean);
          if (!name || !kws.length) { root.querySelector('#msg').textContent = 'Укажите название и хотя бы один продукт.'; return; }
          t.customDishes.push({ id: 'u' + Date.now(), name, meal: root.querySelector('#dm').value, tags: '', slots: kws.map((k, i) => ({ role: k, kw: k, frac: 1 / kws.length, opt: 0, fixed: null })) });
          saveTrip(); ctx.rerender();
        };
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
    const t = getTrip(); t.fb ||= { days: [], dishes: {} };
    const { menu } = t.days.length && t.group.length ? ensure() : {}, ids = menu ? [...new Set(menu.days.flatMap(d => ['b', 'l', 'd', 's'].map(m => d[m]?.dish)).filter(Boolean))] : [];
    const sc = { '-1': 'Голодно', 0: 'Нормально', 1: 'Много' };
    return {
      html: `${back()}<h2>Отзыв после похода</h2><p class="muted">Отметь, как было по дням и блюдам. Приложение предложит поправки, применятся только после подтверждения.</p>
        ${t.days.map((d, i) => `<div class="fld"><label>День ${i + 1}</label><div class="ctl"><div class="seg">${Object.entries(sc).map(([v, n]) => `<button data-fd="${i}:${v}" class="${String(t.fb.days[i]) === v ? 'on' : ''}">${n}</button>`).join('')}</div></div></div>`).join('') || '<p class="empty">Дней нет.</p>'}
        <h3>Блюда</h3>${ids.map(id => `<div class="fld"><label>${esc(findDish(t, id)?.name)}</label><div class="ctl"><div class="seg"><button data-fh="${id}:-1" class="${t.fb.dishes[id] === -1 ? 'on' : ''}">Нет</button><button data-fh="${id}:1" class="${t.fb.dishes[id] === 1 ? 'on' : ''}">Да</button></div></div></div>`).join('')}
        <button class="btn" id="sug">Предложить поправки</button><div id="out"></div>`,
      bind(root) {
        root.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.fd.split(':'); t.fb.days[+i] = +v; saveTrip(); ctx.rerender(); });
        root.querySelectorAll('[data-fh]').forEach(b => b.onclick = () => { const [id, v] = b.dataset.fh.split(':'); t.fb.dishes[id] = t.fb.dishes[id] === +v ? 0 : +v; saveTrip(); ctx.rerender(); });
        root.querySelector('#sug').onclick = () => {
          const vals = t.fb.days.filter(v => v != null), avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, out = root.querySelector('#out');
          const delta = Math.round(-avg * 10) / 100, likes = Object.entries(t.fb.dishes).filter(([, v]) => v);
          if (!delta && !likes.length) { out.innerHTML = '<p class="muted">Поправок не нужно.</p>'; return; }
          out.innerHTML = `<h3>Предложение</h3>${delta ? `<p>В среднем было «${avg < 0 ? 'голодно' : 'много'}»: изменить коэффициент аппетита всех участников на ${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%.</p>` : ''}${likes.length ? `<p>Рейтинг блюд: ${likes.length} шт. (понравившиеся будут чаще попадать в меню).</p>` : ''}<button class="btn" id="apply">Применить</button>`;
          out.querySelector('#apply').onclick = () => {
            if (delta) t.group.forEach(p => { p.appetite = Math.round((p.appetite || 1) * (1 + delta) * 100) / 100; });
            opts.ratings ||= {}; likes.forEach(([id, v]) => { opts.ratings[id] = (opts.ratings[id] || 0) + v; }); saveOpts();
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
      ['Поход', 'Название, даты, вид и категория. Участники группы с ростом, весом, аппетитом и ограничениями. Дни: вручную или из GPX-трека (длина, набор, сброс, профиль, разбивка на дни, перетаскивание ночёвок). Температуру и осадки вводите сами. Заброски, снаряжение, предпочтения.'],
      ['Продукты', 'Встроенная база с КБЖУ, переключатели «используем», поиск, свои продукты через Open Food Facts, штрихкод и ручной ввод.'],
      ['Расчёт', 'Потребность каждого участника по дням: обмен, ходьба по Пандольфу, холод, высота, личные коэффициенты. Кнопка «Почему столько?» показывает расчёт по шагам. Меню по дням и приёмам, замена и закрепление блюд, ползунок сытости, предупреждения.'],
      ['Покупки', 'Список с округлением до упаковок и отделами магазина, фасовка по дням, вес рюкзаков по дням, газ и вода, экспорт текстом, в CSV и JSON, печать.'],
      ['Настройки', 'Тема, все параметры расчёта с возвратом к исходным, справка по методологии, мои поправки, шаблоны блюд, история походов, отзыв после похода, резервная копия.'],
    ];
    return { html: `${back()}<h2>Возможности приложения</h2>${L.map(([t, d]) => `<h3>${t}</h3><p>${esc(d)}</p>`).join('')}<p class="muted small">Версия ${APP_VERSION}.</p>` };
  },
};
