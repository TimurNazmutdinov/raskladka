import { APP_VERSION, TERMS_VERSION } from './defaults.js';
import * as store from './store.js';
import { loadParams } from './params.js';
import { loadTrip, views as tripViews } from './trip.js';
import { views as prodViews } from './productsview.js';
import { views as calcViews } from './calcview.js';
import { views as shopViews } from './shop.js';
import { views as extraViews } from './extras.js';
import { loadProducts } from './pstore.js';
import { views as settingsViews, DISCLAIMER } from './settings.js';

const app = document.getElementById('app');
const state = { tab: 'trip', sub: 'gpx', view: null, arg: null, theme: 'auto', productsInSettings: false };

const TABS = {
  trip: { name: 'Поход' },
  products: { name: 'Продукты', empty: 'База продуктов появится на этапе 4.' },
  calc: { name: 'Расчёт', empty: 'Сначала заполните поход и продукты.' },
  shop: { name: 'Покупки', empty: 'Список появится после расчёта.' },
};

function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = dark ? '#161A18' : '#2F4A3A';
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
  state, applyTheme,
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
  if (state.view) return (tripViews[state.view] || prodViews[state.view] || calcViews[state.view] || shopViews[state.view] || extraViews[state.view] || settingsViews[state.view])(state.arg, ctx);
  if (state.tab === 'trip') return tripViews.main(null, ctx);
  if (state.tab === 'shop') return shopViews.shop(null, ctx);
  if (state.tab === 'calc') return calcViews.calc(null, ctx);
  if (state.tab === 'products') return prodViews.products(null, ctx);
  return { html: `<h2>${TABS[state.tab].name}</h2><p class="empty">${TABS[state.tab].empty}</p>` };
}

function renderShell() {
  const tabs = Object.entries(TABS).filter(([k]) => !(k === 'products' && state.productsInSettings));
  const v = currentView();
  app.innerHTML = `<header><h1>Раскладка</h1><button class="icon-btn" data-go="settings" aria-label="Настройки">⚙</button></header>
    <main>${v.html}</main>
    <nav class="tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${!state.view && state.tab === k ? 'on' : ''}">${t.name}</button>`).join('')}</nav>`;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; state.view = null; renderShell(); });
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.go(b.dataset.go, b.dataset.arg === undefined ? null : (isNaN(b.dataset.arg) ? b.dataset.arg : Number(b.dataset.arg))));
  v.bind?.(app.querySelector('main'));
}

(async () => {
  state.theme = (await store.get('settings', 'theme')) || 'auto';
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  await loadParams(); await loadTrip(); await loadProducts();
  state.productsInSettings = !!(await store.get('settings', 'productsDone'));
  if (!(await store.get('settings', 'consent'))) renderWelcome(); else renderShell();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
