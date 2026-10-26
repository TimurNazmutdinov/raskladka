import { APP_VERSION, TERMS_VERSION } from './defaults.js';
import * as store from './store.js';
import { loadParams } from './params.js';
import { loadTrip, getTrip, saveTrip, views as tripViews } from './trip.js';
import { views as prodViews } from './productsview.js';
import { views as calcViews } from './calcview.js';
import { views as summaryViews } from './summaryview.js';
import { views as shopViews } from './shop.js';
import { views as extraViews } from './extras.js';
import { loadProducts, repo as prepo } from './pstore.js';
import { loadMenus, repo as mrepo } from './mstore.js';
import { loadPlans } from './plstore.js';
import { saveUndo, getUndo, undoLoad, loadFileAll, formBook } from './loadview.js';
import { repo as plrepo } from './plstore.js';
import { views as menuViews } from './menuview.js';
import { views as settingsViews, DISCLAIMER } from './settings.js';

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
