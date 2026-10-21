// Общие кусочки интерфейса: экранирование и генератор форм по описанию полей.
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Поле: {k, label, type: text|number|date|select|seg|check, opts:[[value,label]], help, show:(obj)=>bool, unit}
export function form(fields, obj) {
  return fields.filter(f => !f.show || f.show(obj)).map(f => {
    const v = obj[f.k] ?? '';
    const q = f.help ? `<button class="q" data-help="${f.k}" aria-label="Пояснение">?</button>` : '';
    let ctl;
    if (f.type === 'select') ctl = `<select data-k="${f.k}">${f.opts.map(([a, b]) => `<option value="${esc(a)}"${a == v ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
    else if (f.type === 'seg') ctl = `<div class="seg">${f.opts.map(([a, b]) => `<button data-seg="${f.k}" data-v="${esc(a)}" class="${a == v ? 'on' : ''}">${esc(b)}</button>`).join('')}</div>`;
    else if (f.type === 'check') ctl = `<input type="checkbox" data-k="${f.k}"${obj[f.k] ? ' checked' : ''}>`;
    else ctl = `<input data-k="${f.k}" type="${f.type || 'text'}" ${f.type === 'number' ? 'inputmode="decimal" step="any"' : ''} value="${esc(v)}">${f.unit ? `<span class="muted unit">${f.unit}</span>` : ''}`;
    return `<div class="fld"><label>${esc(f.label)}${q}</label><div class="ctl">${ctl}</div></div>${f.help ? `<p class="help" id="help-${f.k}" hidden>${esc(f.help)}</p>` : ''}`;
  }).join('');
}

// Привязка событий. onChange вызывается после каждого изменения; rerender — если поле влияет на вид формы.
export function bindForm(root, fields, obj, onChange, rerender) {
  const type = k => fields.find(f => f.k === k)?.type;
  root.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
    const k = el.dataset.k, t = type(k);
    obj[k] = t === 'check' ? el.checked : t === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
    onChange(k);
    if (t === 'select' || t === 'check') rerender();
  });
  root.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => {
    const k = b.dataset.seg;
    obj[k] = b.dataset.v;
    onChange(k);
    rerender();
  });
  root.querySelectorAll('[data-help]').forEach(b => b.onclick = () => {
    const p = root.querySelector('#help-' + b.dataset.help);
    p.hidden = !p.hidden;
  });
}

// Модальное окно. build() возвращает {title, html, bind(root, refresh, close)}; refresh() перерисовывает окно.
export function modal(build, onClose) {
  const ov = document.createElement('div'); ov.className = 'overlay';
  const close = () => { ov.remove(); onClose?.(); };
  const refresh = () => {
    const b = build();
    ov.innerHTML = `<div class="modal" role="dialog"><div class="mh2"><b>${esc(b.title)}</b><button class="icon-btn" data-x aria-label="Закрыть">×</button></div><div class="mbody">${b.html}</div></div>`;
    ov.querySelector('[data-x]').onclick = close;
    b.bind?.(ov.querySelector('.mbody'), refresh, close);
  };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov); refresh();
  return close;
}
