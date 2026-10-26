// Экран «Поход»: трек (только координаты и высоты), окна «Параметры похода», «Условия», «День N», таблица дней.
import { COVERS, DAY_TYPES, PARAMS } from './defaults.js';
import { allParams } from './params.js';
import { isRest, tempText } from './engine.js';
import * as G from './gpx.js';
import { form, bindForm, esc, modal } from './ui.js';

const P = () => allParams();
const r1 = x => Math.round(x * 10) / 10;
const KEYS = ['km', 'up', 'down', 'hours'];
const msg = { text: '', opened: false };
const COND0 = { tdmin: null, tdmax: null, tnmin: null, tnmax: null, precip: '', melt: false, cover: 'trail', wind: false };

export function ensurePlan(trip) {
  trip.plan ||= { start: '', n: null, rests: [] };
  trip.cond ||= { ...COND0 };
}
const iso = (start, i) => { if (!start) return ''; const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); };
export const fmtDate = s => (s ? s.split('-').reverse().join('.') : '');

const blankDay = (cond, kind = 'Ходовой') => ({ type: kind, rest: isRest({ type: kind }), man: {}, covers: [], note: '', cover: cond.cover, tdmin: cond.tdmin, tdmax: cond.tdmax, tnmin: cond.tnmin, tnmax: cond.tnmax, precip: cond.precip, melt: cond.melt, wind: cond.wind });

// Пересобирает список дней из трека/плана, сохраняя ручные правки по дням
export function rebuild(trip) {
  ensurePlan(trip);
  const tr = trip.track, pl = trip.plan, cond = trip.cond;
  let autos = null;
  if (tr) {
    const T = G.prep(tr, P()), rs = G.ranges(T, tr.cuts), withEle = G.hasEle(tr.pts);
    autos = rs.map(([a, b]) => { const s = G.dayStats(T, a, b); return { km: r1(s.km), up: withEle ? Math.round(s.up) : null, down: withEle ? Math.round(s.down) : null, hours: r1(s.hours), maxAlt: withEle ? Math.round(s.maxAlt) : null, endAlt: withEle ? Math.round(s.endAlt) : null }; });
    pl.n = autos.length;
  }
  const n = pl.n || 0, oldW = trip.days.filter(d => !d.rest), oldR = trip.days.filter(d => d.rest);
  const out = [];
  for (let j = 0; j < n; j++) {
    const d = oldW[j] || blankDay(cond);
    d.auto = autos ? autos[j] : null; d.rest = false;
    if (isRest(d)) d.type = 'Ходовой';
    for (const k of KEYS) d[k] = d.man?.[k] ?? d.auto?.[k] ?? null;
    d.nightAlt = d.man?.nightAlt ?? d.auto?.endAlt ?? null;
    const alts = [d.man?.maxAlt ?? d.auto?.maxAlt, d.nightAlt].filter(v => v != null);
    d.maxAlt = alts.length ? Math.max(...alts) : null;
    out.push(d);
    (pl.rests || []).forEach((r, ri) => { if (+r.after === j + 1) { const o = oldR.find(x => x.rkey === ri) || blankDay(cond, r.kind); o.rkey = ri; o.rest = true; o.type = r.kind; o.maxAlt = o.man?.maxAlt ?? d.maxAlt; o.nightAlt = o.maxAlt; out.push(o); } });
  }
  out.forEach((d, i) => { d.date = d.dateMan || iso(pl.start, i); });
  trip.days = out;
  trip.start = pl.start; trip.end = out.length ? out.at(-1).date : '';
}

export function missing(trip) {
  const m = [];
  if (!trip.days.length) return ['нет дней: задайте количество дней в «Параметрах похода» или загрузите трек'];
  if (trip.prefs?.kcalGoal > 0) return m; // задана цель по калориям: данные по дням (дата, км, набор, сброс, часы, температуры) необязательны
  if (!trip.plan?.start) m.push('дата начала');
  trip.days.forEach((d, i) => {
    const w = [];
    if (!d.type) w.push('тип');
    if (!d.rest) { for (const [k, n] of [['km', 'км'], ['up', 'набор'], ['down', 'сброс'], ['hours', 'часы']]) if (d[k] == null) w.push(n); }
    if (d.tdmax == null && d.tday == null) w.push('температура днём');
    if (d.tnmin == null && d.tnight == null) w.push('температура ночью');
    if (w.length) m.push(`день ${i + 1}: ${w.join(', ')}`);
  });
  return m;
}
const bad = (d, k) => (k === 'td' ? d.tdmax == null && d.tday == null : k === 'tn' ? d.tnmin == null && d.tnight == null : d[k] == null && !d.rest ? true : false);

// ---------- окна ----------
function openParams(trip, save, ctx) {
  ensurePlan(trip);
  const pl = trip.plan, tr = trip.track;
  const close = modal(() => ({
    title: 'Параметры похода',
    html: `<div class="fld"><label>Дата начала</label><div class="ctl"><input type="date" id="pstart" value="${esc(pl.start)}"></div></div>
      <div class="fld"><label>Ходовых дней *</label><div class="ctl"><input type="number" id="pn" min="1" max="60" value="${(tr ? (pl.want ?? pl.n) : pl.n) ?? ''}"></div></div>
      ${tr ? '<p class="muted small">Для трека: укажите число дней и нажмите «Разбить трек на дни».</p>' : ''}
      <h3>Днёвки и запасные дни</h3>
      ${(pl.rests || []).map((r, i) => `<div class="segrow">после дня <input type="number" min="1" data-ra="${i}" value="${r.after}" style="width:60px"> <select data-rk="${i}"><option${r.kind === 'Днёвка' ? ' selected' : ''}>Днёвка</option><option${r.kind === 'Запасной' ? ' selected' : ''}>Запасной</option></select> <button class="mini" data-rd="${i}">Убрать</button></div>`).join('') || '<p class="muted small">Нет</p>'}
      <button class="mini" id="addr">+ Добавить</button>
      ${tr ? `<p class="muted small" style="margin-top:12px">Разбивка поровну по нагрузке: км + набор/${P().split_up} + сброс/${P().split_down} (коэффициенты в Настройках → Параметры расчёта → Ходьба).</p><button class="btn" id="split" ${(pl.want ?? pl.n) ? '' : 'disabled'}>Разбить трек на дни</button>` : ''}
      <div class="btnrow"><button class="btn ghost" id="ok">Закрыть</button></div>`,
    bind(root, refresh, cl) {
      const apply = () => { rebuild(trip); save(); ctx.rerender(); };
      root.querySelector('#pstart').onchange = e => { pl.start = e.target.value; apply(); };
      root.querySelector('#pn').onchange = e => { const v = Math.max(1, Math.min(60, +e.target.value || 1)); if (tr) { pl.want = v; refresh(); } else { pl.n = v; apply(); } };
      root.querySelectorAll('[data-ra]').forEach(i => i.onchange = () => { pl.rests[+i.dataset.ra].after = +i.value; apply(); });
      root.querySelectorAll('[data-rk]').forEach(i => i.onchange = () => { pl.rests[+i.dataset.rk].kind = i.value; apply(); });
      root.querySelectorAll('[data-rd]').forEach(b => b.onclick = () => { pl.rests.splice(+b.dataset.rd, 1); trip.days = trip.days.filter(d => !d.rest); apply(); refresh(); });
      root.querySelector('#addr').onclick = () => { pl.rests.push({ after: 1, kind: 'Днёвка' }); apply(); refresh(); };
      root.querySelector('#ok').onclick = cl;
      root.querySelector('#split')?.addEventListener('click', () => { const T = G.prep(tr, P()); tr.cuts = G.splitLoad(T, pl.want ?? pl.n); delete pl.want; apply(); cl(); });
    },
  }));
}

function openCond(trip, save, ctx) {
  ensurePlan(trip);
  const c = trip.cond, F = [
    { k: 'tdmin', label: 'Днём, °C: минимум', type: 'number' }, { k: 'tdmax', label: 'Днём, °C: максимум', type: 'number' },
    { k: 'tnmin', label: 'Ночью, °C: минимум', type: 'number' }, { k: 'tnmax', label: 'Ночью, °C: максимум', type: 'number' },
    { k: 'precip', label: 'Осадки', type: 'select', opts: [['', 'Нет'], ['rain', 'Дождь'], ['snow', 'Снег']] },
    { k: 'melt', label: 'Топка снега для воды', type: 'check' },
    { k: 'cover', label: 'Покрытие по умолчанию', type: 'select', opts: COVERS },
    { k: 'wind', label: 'Сильный ветер', type: 'check', help: 'Сильный ветер увеличивает расход газа (прибавка в Настройках → Топливо и вода).' },
  ];
  modal(() => ({
    title: 'Условия на весь поход',
    html: `${form(F, c)}<div class="btnrow"><button class="btn" id="all">Применить ко всем дням</button><button class="btn ghost" id="ok">Закрыть</button></div><p class="muted small" id="note"></p>`,
    bind(root, refresh, cl) {
      bindForm(root, F, c, () => save(), refresh);
      root.querySelector('#all').onclick = () => { trip.days.forEach(d => { ['tdmin', 'tdmax', 'tnmin', 'tnmax', 'precip', 'melt', 'wind'].forEach(k => { d[k] = c[k]; }); d.cover = c.cover; if (d.covers?.length) d.covers = []; delete d.tday; delete d.tnight; }); save(); ctx.rerender(); root.querySelector('#note').textContent = `Применено к ${trip.days.length} дн.`; };
      root.querySelector('#ok').onclick = cl;
    },
  }));
}

function openDay(trip, i, save, ctx) {
  const src = trip.days[i], d = JSON.parse(JSON.stringify(src)); d.man ||= {}; d.covers ||= [];
  const F = [
    { k: 'dateMan', label: 'Дата', type: 'date' }, { k: 'type', label: 'Тип дня', type: 'select', opts: DAY_TYPES.map(x => [x, x]) },
    { k: 'tdmin', label: 'Днём, °C: мин', type: 'number' }, { k: 'tdmax', label: 'Днём, °C: макс', type: 'number' },
    { k: 'tnmin', label: 'Ночью, °C: мин', type: 'number' }, { k: 'tnmax', label: 'Ночью, °C: макс', type: 'number' },
    { k: 'precip', label: 'Осадки', type: 'select', opts: [['', 'Нет'], ['rain', 'Дождь'], ['snow', 'Снег']] }, { k: 'melt', label: 'Топка снега для воды', type: 'check' }, { k: 'wind', label: 'Сильный ветер', type: 'check' },
  ];
  d.dateMan = d.dateMan || d.date || '';
  modal(() => {
    const a = d.auto || {};
    const man = (k, lab, unit) => `<div class="fld"><label>${lab}</label><div class="ctl"><input type="number" step="any" data-m="${k}" value="${d.man[k] ?? ''}" placeholder="${a[k] ?? ''}"><span class="muted unit">${unit}</span></div></div>`;
    return {
      title: `День ${i + 1}`,
      html: `${form(F, d)}
        <h3>Покрытие</h3>${d.covers.map((s, j) => `<div class="segrow"><select data-cs="${j}:cover">${COVERS.map(([k, n]) => `<option value="${k}"${s.cover === k ? ' selected' : ''}>${n}</option>`).join('')}</select><input type="number" step="any" data-cs="${j}:km" value="${s.km ?? ''}" placeholder="км"> км${s.cover === 'snow' ? `<input type="number" data-cs="${j}:snow" value="${s.snow ?? ''}" placeholder="см"> см` : ''}<button class="mini" data-cd="${j}">×</button></div>`).join('') || `<p class="muted small">Весь день: ${esc((COVERS.find(c => c[0] === d.cover) || [])[1] || '—')}. Можно добавить участки с км.</p>`}
        <button class="mini" id="addc">+ Участок покрытия</button>
        <h3>Высота и ручная поправка</h3>
        <div class="fld"><label>Высота ночёвки${a.endAlt != null ? ' (из трека)' : ''}</label><div class="ctl"><input type="number" data-m="nightAlt" value="${d.man.nightAlt ?? ''}" placeholder="${a.endAlt ?? ''}"><span class="muted unit">м</span></div></div>
        ${man('km', 'Километры', 'км')}${man('up', 'Набор', 'м')}${man('down', 'Сброс', 'м')}${man('hours', 'Ходовые часы', 'ч')}
        <p class="muted small">Пусто — берётся значение из трека (серое в поле).</p>
        <div class="fld"><label>Заметка</label><div class="ctl"><input data-note value="${esc(d.note || '')}" style="width:220px;text-align:left"></div></div>
        <div class="btnrow"><button class="btn" id="save">Сохранить</button><button class="btn ghost" id="cancel">Отмена</button></div>`,
      bind(root, refresh, cl) {
        bindForm(root, F, d, () => {}, refresh);
        root.querySelectorAll('[data-m]').forEach(el => el.onchange = () => { d.man[el.dataset.m] = el.value === '' ? undefined : +el.value; if (d.man[el.dataset.m] === undefined) delete d.man[el.dataset.m]; });
        root.querySelectorAll('[data-cs]').forEach(el => el.onchange = () => { const [j, k] = el.dataset.cs.split(':'); d.covers[+j][k] = k === 'cover' ? el.value : (el.value === '' ? null : +el.value); if (k === 'cover') refresh(); });
        root.querySelectorAll('[data-cd]').forEach(b => b.onclick = () => { d.covers.splice(+b.dataset.cd, 1); refresh(); });
        root.querySelector('#addc').onclick = () => { d.covers.push({ cover: 'trail', km: null, snow: null }); refresh(); };
        root.querySelector('[data-note]').onchange = e => { d.note = e.target.value; };
        root.querySelector('#cancel').onclick = cl;
        root.querySelector('#save').onclick = () => {
          d.dateMan = d.dateMan === iso(trip.plan.start, i) ? '' : d.dateMan; delete d.tday; delete d.tnight;
          trip.days[i] = d; rebuild(trip); save(); cl(); ctx.rerender();
        };
      },
    };
  });
}

// ---------- секция экрана ----------
export function daysSection(trip, save, ctx) {
  ensurePlan(trip);
  const tr = trip.track, miss = missing(trip);
  const goalSet = trip.prefs?.kcalGoal > 0, rq = c => (!goalSet && c ? 'req' : ''); // подсветка «обязательно» только если цели по калориям нет
  let prof = '';
  if (tr) {
    const T = G.prep(tr, P()), tot = G.totalStats(T), noEle = !G.hasEle(tr.pts);
    const W = 800, H = 150, ymin = Math.min(...T.ele), ymax = Math.max(...T.ele), yr = Math.max(1, ymax - ymin);
    const X = km => (km / T.total) * W, Y = e => H - 10 - ((e - ymin) / yr) * (H - 30), step = Math.max(1, Math.floor(T.pts.length / 500));
    const line = T.pts.map((_, i) => i).filter(i => i % step === 0).map(i => `${X(T.d[i]).toFixed(1)},${noEle ? H - 10 : Y(T.ele[i]).toFixed(1)}`).join(' ');
    const mk = tr.cuts.map((k, i) => `<g class="mk" data-i="${i}"><line x1="${X(k)}" x2="${X(k)}" y1="0" y2="${H}"/><circle cx="${X(k)}" cy="12" r="11"/></g>`).join('');
    prof = `<p><b>${r1(T.total)} км</b>${noEle ? '' : ` · +${Math.round(tot.up)} / −${Math.round(tot.down)} м · ${Math.round(tot.minAlt)}–${Math.round(tot.maxAlt)} м`} <span class="muted">· ${esc((tr.files || []).join(', '))}</span></p>
      ${noEle ? '<p class="warnmsg">В треке нет высот: набор и сброс задайте вручную по дням.</p>' : ''}
      <svg id="prof" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Профиль высот"><polygon class="area" points="0,${H} ${line} ${W},${H}"/><polyline class="ln" points="${line}"/>${mk}</svg>
      <div class="fld"><label>Километры ночёвок (можно тянуть маркеры на профиле)</label><div class="ctl"><input id="kms" style="width:240px" value="${tr.cuts.map(r1).join(', ')}"></div></div>`;
  }
  const hdr = '<tr><th>№</th><th>Дата</th><th>Тип</th><th>км</th><th>Набор</th><th>Сброс</th><th>Часы</th><th>Темп. днём/ночью</th><th>Осадки</th><th>Ночёвка, м</th><th></th></tr>';
  const rows = trip.days.map((d, i) => `<tr data-d="${i}"><td>${i + 1}</td><td class="${rq(!d.date)}">${fmtDate(d.date) || '—'}</td><td class="${rq(!d.type)}">${esc(d.type)}</td>${['km', 'up', 'down', 'hours'].map(k => d.rest ? '<td class="rest">—</td>' : `<td class="${rq(d[k] == null)}">${d[k] ?? ''}</td>`).join('')}<td class="${rq(bad(d, 'td') || bad(d, 'tn'))}">${bad(d, 'td') && bad(d, 'tn') ? '' : tempText(d)}</td><td>${{ rain: 'дождь', snow: 'снег' }[d.precip] || 'нет'}</td><td>${d.nightAlt ?? ''}</td><td><button class="mini" data-e="${i}">Изменить</button></td></tr>`).join('');
  return {
    html: `<div class="btnrow"><label class="btn filebtn2">${tr ? 'Заменить GPX-трек' : 'Загрузить GPX-трек'}<input type="file" id="file" accept=".gpx,application/gpx+xml" multiple hidden></label>
      <button class="btn ghost" id="bparams">Параметры похода</button><button class="btn ghost" id="bcond">Условия</button>${tr ? '<button class="btn ghost" id="bclear">Убрать трек</button>' : ''}</div>
      <p class="warnmsg">${esc(msg.text)}</p>${tr ? '' : '<p class="muted">Загрузите трек (нужны только координаты и высоты) или задайте количество дней в «Параметрах похода» и введите дни вручную.</p>'}
      ${prof}
      <h3>Дни${trip.days.length ? `: ${trip.days.length}` : ''}</h3>
      ${trip.days.length ? `<div class="tbl"><table class="dtable">${hdr}${rows}</table></div><p class="muted small">Двойной щелчок по строке открывает окно дня. ${goalSet ? 'Цель по калориям задана: данные по дням необязательны, их можно ввести для уточнения расчёта.' : 'Подсвеченное обязательно заполнить.'}</p>` : '<p class="empty">Дней пока нет.</p>'}
      ${miss.length ? `<p class="warnmsg small">Не хватает: ${esc(miss.join('; '))}</p>` : ''}`,
    bind(root) {
      root.querySelector('#bparams').onclick = () => openParams(trip, save, ctx);
      root.querySelector('#bcond').onclick = () => openCond(trip, save, ctx);
      root.querySelectorAll('tr[data-d]').forEach(tr2 => tr2.ondblclick = () => openDay(trip, +tr2.dataset.d, save, ctx));
      root.querySelectorAll('[data-e]').forEach(b => b.onclick = () => openDay(trip, +b.dataset.e, save, ctx));
      root.querySelector('#bclear')?.addEventListener('click', () => { if (confirm('Убрать трек? Дни останутся, их можно править вручную.')) { delete trip.track; trip.days.forEach(d => { d.auto = null; }); rebuild(trip); save(); ctx.rerender(); } });
      root.querySelector('#file').onchange = async e => {
        try {
          let pts = [], wpts = [], seg = 0;
          for (const f of e.target.files) {
            const r = G.parseGpx(await f.text()), maxSeg = Math.max(-1, ...r.pts.map(p => p[4]));
            r.pts.forEach(p => { p[4] += seg; }); seg += maxSeg + 1; pts.push(...r.pts); wpts.push(...r.wpts);
          }
          if (pts.length < 2) throw new Error('В файле нет точек трека');
          pts = G.downsample(pts);
          trip.track = { pts, wpts, cuts: [], files: [...e.target.files].map(f => f.name) };
          msg.text = '';
          const n = trip.plan.n || 5; trip.plan.n = n;
          trip.track.cuts = G.splitLoad(G.prep(trip.track, P()), n);
          rebuild(trip); save(); ctx.rerender();
          if (!G.hasEle(pts)) { msg.text = 'В треке нет высот: набор и сброс задайте вручную по дням.'; ctx.rerender(); }
          openParams(trip, save, ctx);
        } catch (err) { msg.text = err.message; ctx.rerender(); }
      };
      if (!tr) return;
      const T = G.prep(tr, P()), svg = root.querySelector('#prof'), W = 800, X = km => (km / T.total) * W;
      root.querySelector('#kms').onchange = e => { tr.cuts = e.target.value.split(/[,;\s]+/).map(Number).filter(k => k > 0 && k < T.total); rebuild(trip); save(); ctx.rerender(); };
      svg.querySelectorAll('.mk').forEach(g => g.addEventListener('pointerdown', e => {
        e.preventDefault(); const i = +g.dataset.i; g.setPointerCapture(e.pointerId);
        const mv = ev => { const r = svg.getBoundingClientRect(); tr.cuts[i] = Math.max(0.1, Math.min(T.total - 0.1, ((ev.clientX - r.left) / r.width) * T.total)); g.querySelectorAll('line').forEach(l => { l.setAttribute('x1', X(tr.cuts[i])); l.setAttribute('x2', X(tr.cuts[i])); }); g.querySelector('circle').setAttribute('cx', X(tr.cuts[i])); };
        const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); tr.cuts.sort((a, b) => a - b); rebuild(trip); save(); ctx.rerender(); };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
      }));
    },
  };
}
