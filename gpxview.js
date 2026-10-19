// Вкладка «GPX-трек»: загрузка, высоты, профиль с маркерами ночёвок, разбивка на дни, погода.
import { PARAMS } from './defaults.js';
import { getParam } from './params.js';
import * as G from './gpx.js';
import { esc } from './ui.js';

const P = () => Object.fromEntries(PARAMS.map(p => [p.id, getParam(p.id)]));
const r1 = x => Math.round(x * 10) / 10;
const METHODS = [['dates', 'Даты'], ['segs', 'Сегменты'], ['wpts', 'Точки'], ['manual', 'Вручную'], ['target', 'По времени']];
const msg = { text: '' };

function applyCuts(trip, T) {
  const tr = trip.track, rs = G.ranges(T, tr.cuts), old = trip.days.filter(d => d.fromTrack), rests = trip.days.filter(d => !d.fromTrack && d.after != null);
  const days = [];
  rs.forEach(([a, b], j) => {
    const s = G.dayStats(T, a, b), o = old[j] || {};
    const date = G.dayDate(T, a) || (trip.start ? new Date(Date.parse(trip.start) + j * 86400000).toISOString().slice(0, 10) : '');
    days.push({
      type: 'Ходовой', cover: 'trail', snow: null, tday: null, tnight: null, ...o, fromTrack: true, date: date || o.date || '',
      km: r1(s.km), up: Math.round(s.up), down: Math.round(s.down), maxAlt: Math.round(s.maxAlt), hours: r1(s.hoursTime && s.hoursTime < 14 ? s.hoursTime : s.hours),
      mid: [T.pts[(a + b) >> 1][0], T.pts[(a + b) >> 1][1]],
    });
    rests.filter(d => d.after === j).forEach(d => days.push(d));
  });
  trip.days = days;
}

function autoCuts(trip, T) {
  const tr = trip.track, m = tr.method;
  if (m === 'dates') tr.cuts = G.splitDates(T);
  else if (m === 'segs') tr.cuts = G.splitSegs(T);
  else if (m === 'wpts') tr.cuts = G.splitWpts(T, tr.wpts);
  else if (m === 'target') tr.cuts = G.splitTarget(T, tr.target || 8);
}

export function gpxSection(trip, save, ctx) {
  const tr = trip.track;
  if (!tr) {
    return {
      html: `<div class="drop-zone"><input type="file" id="file" accept=".gpx,application/gpx+xml" multiple><p class="muted">Выбери один или несколько GPX-файлов. Они склеятся по порядку.</p></div><p class="warnmsg">${esc(msg.text)}</p>`,
      bind(root) {
        root.querySelector('#file').onchange = async e => {
          try {
            let pts = [], wpts = [], seg = 0;
            for (const f of e.target.files) {
              const r = G.parseGpx(await f.text());
              const maxSeg = Math.max(-1, ...r.pts.map(p => p[4]));
              r.pts.forEach(p => { p[4] += seg; }); seg += maxSeg + 1;
              pts.push(...r.pts); wpts.push(...r.wpts);
            }
            if (pts.length < 2) throw new Error('В файле нет точек трека');
            pts = G.downsample(pts);
            trip.track = { pts, wpts, cuts: [], method: 'dates', target: 8, files: [...e.target.files].map(f => f.name) };
            const T = G.prep(trip.track, P()); autoCuts(trip, T);
            if (!trip.track.cuts.length && trip.track.method === 'dates') { trip.track.method = 'segs'; autoCuts(trip, T); }
            msg.text = '';
            if (!pts.some(p => p[2] == null)) applyCuts(trip, T);
            save(); ctx.rerender();
          } catch (err) { msg.text = err.message; ctx.rerender(); }
        };
      },
    };
  }

  const needEle = tr.pts.some(p => p[2] == null);
  const T = G.prep(tr, P()), tot = G.totalStats(T), rs = G.ranges(T, tr.cuts);
  const W = 600, H = 170, ymin = Math.min(...T.ele), ymax = Math.max(...T.ele), yr = Math.max(1, ymax - ymin);
  const X = km => (km / T.total) * W, Y = e => H - 10 - ((e - ymin) / yr) * (H - 30);
  const step = Math.max(1, Math.floor(T.pts.length / 400));
  const line = T.pts.map((_, i) => i).filter(i => i % step === 0).map(i => `${X(T.d[i]).toFixed(1)},${Y(T.ele[i]).toFixed(1)}`).join(' ');
  const markers = tr.cuts.map((k, i) => `<g class="mk" data-i="${i}"><line x1="${X(k)}" x2="${X(k)}" y1="0" y2="${H}"/><circle cx="${X(k)}" cy="12" r="11"/></g>`).join('');
  const rows = trip.days.map((d, i) => `<li><button data-go="day" data-arg="${i}"><span>${i + 1} · ${esc(d.date || d.type)}</span><span class="muted">${d.fromTrack ? `${d.km} км · +${d.up}/−${d.down} · ${d.hours} ч` : esc(d.type)}${d.tday != null ? ` · ${Math.round(d.tday)}°/${d.tnight != null ? Math.round(d.tnight) : '—'}°` : ''} ›</span></button></li>`).join('');

  return {
    html: `<p><b>${r1(T.total)} км</b> · +${Math.round(tot.up)} / −${Math.round(tot.down)} м · ${Math.round(tot.minAlt)}–${Math.round(tot.maxAlt)} м<br><span class="muted">${esc((tr.files || []).join(', '))} · ${T.pts.length} точек, ${tr.wpts.length} путевых</span></p>
      ${needEle ? '<p class="warnmsg">В треке нет высот. Набор считается по ним, поэтому их нужно загрузить из Open-Meteo (нужен интернет).</p><button class="btn" id="elev">Загрузить высоты</button>' : ''}
      <p class="warnmsg" id="status">${esc(msg.text)}</p>
      <svg id="prof" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Профиль высот"><polygon class="area" points="0,${H} ${line} ${W},${H}"/><polyline class="ln" points="${line}"/>${markers}</svg>
      <p class="muted small">Маркеры ночёвок можно тянуть пальцем.</p>
      <div class="chips">${METHODS.map(([k, n]) => `<button data-m="${k}" class="${tr.method === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${tr.method === 'target' ? `<div class="fld"><label>Ходовых часов в день</label><div class="ctl"><input type="number" step="any" id="target" value="${tr.target}"></div></div>` : ''}
      ${tr.method === 'manual' ? `<div class="fld"><label>Километры ночёвок через запятую</label><div class="ctl"><input id="kms" value="${tr.cuts.map(r1).join(', ')}"></div></div>` : ''}
      <h3>Дни: ${rs.length}</h3><ul class="list">${rows}</ul>
      <div class="two"><button class="btn ghost" id="rest">Вставить днёвку</button></div>
      <button class="btn danger" id="clear">Убрать трек</button>`,
    bind(root) {
      const st = t => { msg.text = t; const s = root.querySelector('#status'); if (s) s.textContent = t; };
      const recompute = (auto = true) => { if (auto) autoCuts(trip, T); applyCuts(trip, T); save(); ctx.rerender(); };
      root.querySelector('#elev')?.addEventListener('click', async () => {
        if (!confirm('Запросить высоты у Open-Meteo? Координаты трека уйдут на сервер open-meteo.com.')) return;
        try {
          const el = await G.fetchElevations(tr.pts, (a, b) => st(`Загружаю высоты: ${a} из ${b}`));
          tr.pts.forEach((p, i) => { p[2] = el[i]; }); st(''); recompute(false);
        } catch (e) { st(e.message + '. Проверь интернет и повтори.'); }
      });
      if (!needEle && !trip.days.some(d => d.fromTrack)) applyCuts(trip, T), save();
      root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { tr.method = b.dataset.m; if (tr.method !== 'manual') autoCuts(trip, T); applyCuts(trip, T); save(); ctx.rerender(); });
      root.querySelector('#target')?.addEventListener('change', e => { tr.target = +e.target.value || 8; recompute(); });
      root.querySelector('#kms')?.addEventListener('change', e => { tr.cuts = e.target.value.split(/[,;\s]+/).map(Number).filter(k => k > 0 && k < T.total); recompute(false); });
      // перетаскивание маркеров
      const svg = root.querySelector('#prof');
      svg.querySelectorAll('.mk').forEach(g => g.addEventListener('pointerdown', e => {
        e.preventDefault(); const i = +g.dataset.i; g.setPointerCapture(e.pointerId);
        const mv = ev => { const r = svg.getBoundingClientRect(); tr.cuts[i] = Math.max(0.1, Math.min(T.total - 0.1, ((ev.clientX - r.left) / r.width) * T.total)); g.querySelectorAll('line').forEach(l => { l.setAttribute('x1', X(tr.cuts[i])); l.setAttribute('x2', X(tr.cuts[i])); }); g.querySelector('circle').setAttribute('cx', X(tr.cuts[i])); };
        const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); tr.method = 'manual'; tr.cuts.sort((a, b) => a - b); recompute(false); };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
      }));
      root.querySelector('#rest').onclick = () => {
        const n = +prompt(`После какого дня вставить днёвку? (1–${rs.length})`, '1');
        if (!n || n < 1 || n > rs.length) return;
        trip.days.splice(trip.days.findIndex((d, i) => d.fromTrack && trip.days.filter((x, j) => j <= i && x.fromTrack).length === n) + 1, 0, { type: 'Днёвка', date: '', maxAlt: null, cover: 'trail', after: n - 1, tday: null, tnight: null });
        save(); ctx.rerender();
      };
      root.querySelector('#clear').onclick = () => { if (confirm('Убрать трек и построенные по нему дни?')) { delete trip.track; trip.days = trip.days.filter(d => !d.fromTrack); save(); ctx.rerender(); } };
    },
  };
}
