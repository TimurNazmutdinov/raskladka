// Экраны Настроек: мои поправки, шаблоны блюд, магазин, история, отзыв после похода, резервная копия, возможности.
import { DAY_TYPES, APP_VERSION } from './defaults.js';
import { opts, saveOpts } from './params.js';
import { MEALS } from './menu.js';
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
