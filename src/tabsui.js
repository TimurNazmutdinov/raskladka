// Полоса вкладок-наборов: прокрутка стрелками и колесом мыши, перетаскивание для смены порядка, кнопка «+ Набор» (до 10).
import { MAX_SETS } from './setrepo.js';
import { esc } from './ui.js';

export function tabsHtml(sets, activeId, tripId) {
  const full = sets.length >= MAX_SETS;
  return `<div class="tabrow"><button class="tarrow" data-ta="-1" aria-label="Влево">‹</button>
    <div class="tabstrip" id="tstrip">${sets.map(s => `<button class="stab${s.id === activeId ? ' on' : ''}" draggable="true" data-sid="${s.id}">${s.readonly ? '🔒 ' : ''}${esc(s.name)}${s.id === tripId ? ' ✓' : ''}</button>`).join('')}</div>
    <button class="tarrow" data-ta="1" aria-label="Вправо">›</button>
    <button class="btn addset" id="addset" ${full ? 'disabled title="Максимум 10 наборов"' : ''}>+ Набор</button></div>${full ? '<p class="muted small">Максимум 10 наборов: удалите ненужный, чтобы добавить новый.</p>' : ''}`;
}

export function bindTabs(root, { repo, onSelect, onAdd, rerender }) {
  const strip = root.querySelector('#tstrip');
  root.querySelectorAll('[data-ta]').forEach(b => b.onclick = () => strip.scrollBy({ left: 160 * +b.dataset.ta, behavior: 'smooth' }));
  strip.addEventListener('wheel', e => { e.preventDefault(); strip.scrollLeft += e.deltaY || e.deltaX; }, { passive: false });
  const on = strip.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  let dragId = null;
  strip.querySelectorAll('.stab').forEach(t => {
    t.onclick = () => onSelect(t.dataset.sid);
    t.ondragstart = e => { dragId = t.dataset.sid; e.dataTransfer.effectAllowed = 'move'; };
    t.ondragover = e => { e.preventDefault(); t.classList.add('over'); };
    t.ondragleave = () => t.classList.remove('over');
    t.ondrop = async e => {
      e.preventDefault(); t.classList.remove('over');
      if (!dragId || dragId === t.dataset.sid) return;
      const ids = repo.list().map(s => s.id), from = ids.indexOf(dragId), to = ids.indexOf(t.dataset.sid);
      ids.splice(to, 0, ids.splice(from, 1)[0]); await repo.reorder(ids); rerender();
    };
  });
  root.querySelector('#addset').onclick = () => { if (repo.canAdd()) onAdd(); };
}
