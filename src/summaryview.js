// Экран «Сводка расчёта»: показатели, проверки, закупка по категориям; выгрузка в Excel и копирование текстом.
import { shopData } from './shop.js';
import { opts } from './params.js';
import { buildSummary, summaryRows, summaryText } from './summary.js';
import { writeXlsx, download } from './xlsx.js';
import { esc } from './ui.js';

const f = x => (typeof x === 'number' ? x.toLocaleString('ru') : x ?? '—');

export const views = {
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
