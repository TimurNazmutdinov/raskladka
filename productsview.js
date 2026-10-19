// Экран «Продукты»: список с переключателями, поиск, правка, свой продукт через Open Food Facts.
import { CATS } from './products.js';
import { products, saveProduct, addProduct, deleteProduct, seedOf } from './pstore.js';
import { form, bindForm, esc } from './ui.js';
import * as store from './store.js';

const ui = { cat: 'all', q: '', found: null, msg: '' };
const PF = [
  { k: 'name', label: 'Название' }, { k: 'cat', label: 'Категория', type: 'select', opts: CATS },
  { k: 'kcal', label: 'Ккал на 100 г', type: 'number' }, { k: 'p', label: 'Белки на 100 г', type: 'number' },
  { k: 'f', label: 'Жиры на 100 г', type: 'number' }, { k: 'c', label: 'Углеводы на 100 г', type: 'number' },
  { k: 'pack', label: 'Типовая упаковка', type: 'number', unit: 'г' },
  { k: 'hot', label: 'Хранится в жару', type: 'number', unit: 'дн', help: 'Сколько дней продукт выдерживает без холодильника при жаре (около +25 °C). 999 — практически не портится.' },
  { k: 'cool', label: 'Хранится в прохладе', type: 'number', unit: 'дн' },
  { k: 'price', label: 'Цена упаковки', type: 'number' },
  { k: 'tags', label: 'Теги (gluten lactose meat pork nuts spicy)' },
];
const back = (to, t) => `<button class="back" data-go="${to}">‹ ${t}</button>`;

export async function searchOff(q) {
  const enc = encodeURIComponent(q), tries = [
    [`https://search.openfoodfacts.org/search?q=${enc}&page_size=12&fields=product_name,nutriments,quantity,brands`, j => j.hits],
    [`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,nutriments,quantity,brands`, j => j.products],
  ];
  let list = null, last = '';
  for (const [url, pick] of tries) {
    try { const r = await fetch(url); if (r.ok) { list = pick(await r.json()) || []; break; } last = 'ошибка ' + r.status; } catch (e) { last = 'нет связи'; }
  }
  if (!list) throw new Error('Open Food Facts: ' + last);
  return list.filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null).map(p => {
    const n = p.nutriments, m = /([\d.,]+)\s*(kg|кг|g|г)/i.exec(p.quantity || ''), br = Array.isArray(p.brands) ? p.brands[0] : (p.brands || '').split(',')[0];
    return { name: p.product_name + (br ? ` (${br})` : ''), kcal: Math.round(n['energy-kcal_100g']), p: +(n.proteins_100g || 0).toFixed(1), f: +(n.fat_100g || 0).toFixed(1), c: +(n.carbohydrates_100g || 0).toFixed(1),
      pack: m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/k|к/i.test(m[2]) ? 1000 : 1)) : null };
  });
}

const mapOff = p => {
  const n = p.nutriments, m = /([\d.,]+)\s*(kg|кг|g|г)/i.exec(p.quantity || '');
  return { name: p.product_name || 'Продукт', kcal: Math.round(n['energy-kcal_100g'] || 0), p: +(n.proteins_100g || 0).toFixed(1), f: +(n.fat_100g || 0).toFixed(1), c: +(n.carbohydrates_100g || 0).toFixed(1), pack: m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/k|к/i.test(m[2]) ? 1000 : 1)) : null };
};
export async function byBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments,quantity,brands`);
  const j = await r.json(); if (j.status !== 1 || !j.product?.nutriments) throw new Error('Продукт с таким штрихкодом не найден');
  return mapOff(j.product);
}
async function scan(video, onCode) {
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream; await video.play();
  const stop = () => stream.getTracks().forEach(t => t.stop());
  (async function loop() {
    if (!stream.active) return;
    try { const r = await det.detect(video); if (r[0]) { stop(); onCode(r[0].rawValue); return; } } catch { /* кадр не готов */ }
    setTimeout(loop, 300);
  })();
  return stop;
}

export const views = {
  products(_, ctx) {
    const q = ui.q.trim().toLowerCase();
    const list = products().filter(p => (ui.cat === 'all' || p.cat === ui.cat) && (!q || p.name.toLowerCase().includes(q)));
    const catOn = ui.cat !== 'all' && products().filter(p => p.cat === ui.cat).every(p => p.on);
    return {
      html: `<h2>Продукты</h2>
        <input id="q" class="search" placeholder="Поиск по названию" value="${esc(ui.q)}">
        <div class="chips"><button data-c="all" class="${ui.cat === 'all' ? 'on' : ''}">Все</button>${CATS.map(([k, n]) => `<button data-c="${k}" class="${ui.cat === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        ${ui.cat !== 'all' ? `<button class="mini" id="alltog">${catOn ? 'Выключить всю категорию' : 'Включить всю категорию'}</button>` : ''}
        <p class="muted small">Включено ${products().filter(p => p.on).length} из ${products().length}. «?» — значение приблизительное, сверьте с упаковкой.</p>
        <ul class="list plist">${list.map(p => `<li><label class="sw"><input type="checkbox" data-on="${p.id}"${p.on ? ' checked' : ''}></label><button data-go="product" data-arg="${p.id}"><span>${esc(p.name)}${p.check ? ' <span class="dot">?</span>' : ''}${p.custom ? ' ★' : ''}</span><span class="muted">${p.kcal} ккал ›</span></button></li>`).join('') || '<li class="muted">Ничего не найдено</li>'}</ul>
        <button class="btn" data-go="addprod">Добавить продукт</button>
        <button class="btn ghost" id="done">Готово, перенести «Продукты» в Настройки</button>`,
      bind(root) {
        const q = root.querySelector('#q'); q.oninput = () => { ui.q = q.value; const pos = q.selectionStart; ctx.rerender(); const n = document.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); };
        root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { ui.cat = b.dataset.c; ctx.rerender(); });
        root.querySelectorAll('[data-on]').forEach(c => c.onchange = () => { const p = products().find(x => x.id === c.dataset.on); p.on = c.checked; saveProduct(p); ctx.rerender(); });
        root.querySelector('#alltog')?.addEventListener('click', () => { products().filter(p => p.cat === ui.cat).forEach(p => { p.on = !catOn; saveProduct(p); }); ctx.rerender(); });
        root.querySelector('#done').onclick = async () => { ctx.state.productsInSettings = true; await store.put('settings', 'productsDone', true); ctx.state.tab = 'trip'; ctx.go('settings'); };
      },
    };
  },

  product(id, ctx) {
    const p = products().find(x => x.id === id), seed = seedOf(id);
    return {
      html: `${back('products', 'Продукты')}<h2>${esc(p.name)}</h2><p class="muted small">Источник: ${esc(p.src)}</p>${form(PF, p)}
        ${seed ? '<button class="btn ghost" id="reset">Сбросить к исходным значениям</button>' : '<button class="btn danger" id="del">Удалить продукт</button>'}`,
      bind(root) {
        bindForm(root, PF, p, () => { p.fresh = (p.hot ?? 999) <= 14 || p.cat === 'fresh'; saveProduct(p); }, () => ctx.rerender());
        root.querySelector('#reset')?.addEventListener('click', () => { Object.assign(p, seed, { on: p.on }); saveProduct(p); ctx.rerender(); });
        root.querySelector('#del')?.addEventListener('click', async () => { await deleteProduct(id); ctx.go('products'); });
      },
    };
  },

  addprod(_, ctx) {
    return {
      html: `${back('products', 'Продукты')}<h2>Добавить продукт</h2>
        <p class="muted">Введи название — поищем в Open Food Facts и заполним КБЖУ. Нужен интернет.</p>
        <div class="two"><input id="name" class="search" placeholder="Например: гречка"><button class="btn" id="find" style="width:auto;margin:0">Найти</button></div>
        <p class="warnmsg">${esc(ui.msg)}</p>
        ${ui.found ? `<ul class="list">${ui.found.map((f, i) => `<li><button data-pick="${i}"><span>${esc(f.name)}</span><span class="muted">${f.kcal} ккал · Б${f.p} Ж${f.f} У${f.c}</span></button></li>`).join('') || '<li class="muted">Ничего не нашлось</li>'}</ul>` : ''}
        <h3>Штрихкод</h3><div class="two"><input id="code" class="search" inputmode="numeric" placeholder="Номер под штрихкодом"><button class="btn" id="bc" style="width:auto;margin:0">Найти</button></div>
        ${'BarcodeDetector' in window ? '<button class="btn ghost" id="cam">Сканировать камерой</button><video id="vid" playsinline muted style="width:100%;display:none"></video>' : '<p class="muted small">Сканирование камерой не поддерживается в этом браузере (нужен Chrome на Android). Можно ввести номер.</p>'}
        <button class="btn ghost" id="manual">Ввести вручную</button>`,
      bind(root) {
        const mk = (o, src) => { const p = { id: 'u' + Date.now(), name: '', cat: 'sweet', kcal: 0, p: 0, f: 0, c: 0, pack: null, hot: 30, cool: 90, fresh: false, tags: '', price: null, check: false, on: true, custom: true, src, ...o }; addProduct(p); ui.found = null; ui.msg = ''; ctx.go('product', p.id); };
        root.querySelector('#find').onclick = async () => {
          const n = root.querySelector('#name').value.trim(); if (!n) return;
          ui.msg = 'Ищу…'; root.querySelector('.warnmsg').textContent = ui.msg;
          try { ui.found = await searchOff(n); ui.msg = ''; } catch (e) { ui.msg = e.message + '. Проверь интернет или введи вручную.'; ui.found = null; }
          ctx.rerender();
        };
        root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => mk(ui.found[+b.dataset.pick], 'Open Food Facts'));
        const useCode = async code => { ui.msg = 'Ищу…'; root.querySelector('.warnmsg').textContent = ui.msg; try { mk(await byBarcode(code), 'Open Food Facts'); } catch (e) { ui.msg = e.message; ctx.rerender(); } };
        root.querySelector('#bc').onclick = () => { const c = root.querySelector('#code').value.trim(); if (c) useCode(c); };
        root.querySelector('#cam')?.addEventListener('click', async () => { const v = root.querySelector('#vid'); v.style.display = 'block'; try { await scan(v, useCode); } catch { ui.msg = 'Нет доступа к камере'; root.querySelector('.warnmsg').textContent = ui.msg; } });
        root.querySelector('#manual').onclick = () => mk({ name: root.querySelector('#name').value.trim() || 'Новый продукт' }, 'вручную');
      },
    };
  },
};
