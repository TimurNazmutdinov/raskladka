import { APP_VERSION, TERMS_VERSION, PARAMS, GROUPS } from './defaults.js';
import { getParam, setParam, isChanged, resetParams, changedCount } from './params.js';
import { METHOD } from './method.js';
import { esc } from './ui.js';
import * as store from './store.js';
import { openLoad, blankForm, formBook } from './loadview.js';
import { download } from './xlsx.js';
import { repo as prepo } from './pstore.js';
import { repo as mrepo } from './mstore.js';
import { repo as plrepo } from './plstore.js';

export const DISCLAIMER = 'Расчёт питания в этом приложении оценочный и не является медицинской рекомендацией. Ответственность за питание группы лежит на руководителе и завхозе.';
const back = (to, label = 'Назад') => `<button class="back" data-go="${to}">‹ ${label}</button>`;

export const views = {
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
