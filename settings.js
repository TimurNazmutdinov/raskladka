import { APP_VERSION, TERMS_VERSION, PARAMS, GROUPS } from './defaults.js';
import { getParam, setParam, isChanged, resetParams, changedCount } from './params.js';
import { METHOD } from './method.js';
import { esc } from './ui.js';
import * as store from './store.js';

export const DISCLAIMER = 'Расчёт питания в этом приложении оценочный и не является медицинской рекомендацией. Ответственность за питание группы лежит на руководителе и завхозе.';
const back = (to, label = 'Назад') => `<button class="back" data-go="${to}">‹ ${label}</button>`;

export const views = {
  settings(_, ctx) {
    const th = (v, n) => `<button data-theme="${v}" class="${ctx.state.theme === v ? 'on' : ''}">${n}</button>`;
    return {
      html: `${back('')}<h2>Настройки</h2>
        <p class="muted">Тема оформления</p><div class="seg">${th('auto', 'Авто')}${th('light', 'Светлая')}${th('dark', 'Тёмная')}</div>
        <ul class="list">
          ${ctx.state.productsInSettings ? '<li><button data-go="products">Продукты<span>›</span></button></li>' : ''}
          <li><button data-go="params">Параметры расчёта<span>${PARAMS.length}${changedCount() ? ` · изменено ${changedCount()}` : ''} ›</span></button></li>
          <li><button data-go="method">Методология расчёта<span>справка ›</span></button></li>
          <li><button data-go="adj">Мои поправки<span>›</span></button></li>
          <li><button data-go="dishes">Шаблоны блюд<span>›</span></button></li>
          <li><button data-go="shopset">Магазин: округление и валюта<span>›</span></button></li>
          <li><button data-go="history">История походов<span>›</span></button></li>
          <li><button data-go="feedback">Отзыв после похода<span>›</span></button></li>
          <li><button data-go="backup">Резервная копия<span>›</span></button></li>
          <li><button data-go="features">Возможности приложения<span>›</span></button></li>
          <li><button data-go="legal">Правовая информация<span>›</span></button></li>
        </ul>`,
      bind(root) {
        root.querySelectorAll('[data-theme]').forEach(b => b.onclick = async () => {
          ctx.state.theme = b.dataset.theme; await store.put('settings', 'theme', ctx.state.theme); ctx.applyTheme(); ctx.rerender();
        });
      },
    };
  },

  legal() {
    return {
      html: `${back('settings')}<h2>Правовая информация</h2><p>${DISCLAIMER}</p>
        <p class="muted">Источники данных: Open Food Facts (лицензия ODbL), Open-Meteo (CC BY 4.0). Версия приложения ${APP_VERSION}, условия v${TERMS_VERSION}.</p>`,
    };
  },

  params(group, ctx) {
    group = group || 'walk';
    const list = PARAMS.filter(p => p.group === group);
    return {
      html: `${back('settings')}<h2>Параметры расчёта</h2>
        <div class="chips">${GROUPS.map(([g, n]) => `<button data-grp="${g}" class="${g === group ? 'on' : ''}">${n}</button>`).join('')}</div>
        <p class="muted">Это оценочные значения. Изменённые помечены точкой.</p>
        ${list.map(p => `<div class="fld"><label>${esc(p.label)}${isChanged(p.id) ? ' <span class="dot">●</span>' : ''}${p.hint ? `<button class="q" data-help="${p.id}">?</button>` : ''}</label>
          <div class="ctl"><input type="number" inputmode="decimal" step="any" data-p="${p.id}" value="${getParam(p.id)}"><span class="muted unit">${esc(p.unit)}</span>
          ${isChanged(p.id) ? `<button class="mini" data-reset="${p.id}">По умолчанию: ${p.def}</button>` : ''}</div></div>
          ${p.hint ? `<p class="help" id="help-${p.id}" hidden>${esc(p.hint)}</p>` : ''}`).join('')}
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
