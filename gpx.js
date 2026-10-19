// Чистые функции для трека: разбор GPX, сглаживание, набор/сброс, время, разбивка на дни, запросы Open-Meteo.
// Точка трека: [lat, lon, ele|null, время мс|null, номер сегмента]. Все коэффициенты приходят в P (из параметров).

export function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Файл не похож на GPX');
  const pts = []; let seg = 0;
  doc.querySelectorAll('trk').forEach(trk => trk.querySelectorAll('trkseg').forEach(s => {
    s.querySelectorAll('trkpt').forEach(p => {
      const e = p.querySelector('ele'), t = p.querySelector('time');
      pts.push([+p.getAttribute('lat'), +p.getAttribute('lon'), e ? +e.textContent : null, t ? Date.parse(t.textContent) || null : null, seg]);
    });
    seg++;
  }));
  const wpts = [...doc.querySelectorAll('wpt')].map(w => ({ name: w.querySelector('name')?.textContent || 'Точка', lat: +w.getAttribute('lat'), lon: +w.getAttribute('lon') }));
  return { pts, wpts };
}

export function dist(a, b) { // метры
  const R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function downsample(pts, minM = 25) {
  const out = [pts[0]];
  for (const p of pts) if (p[4] !== out.at(-1)[4] || dist(out.at(-1), p) >= minM) out.push(p);
  return out;
}

// Достраивает пропуски высот линейно между известными
export function fillEle(pts) {
  const known = pts.map((p, i) => (p[2] == null ? -1 : i)).filter(i => i >= 0);
  if (!known.length) return pts.map(() => 0);
  return pts.map((p, i) => {
    if (p[2] != null) return p[2];
    const a = [...known].reverse().find(k => k < i), b = known.find(k => k > i);
    if (a == null) return pts[b][2];
    if (b == null) return pts[a][2];
    return pts[a][2] + (pts[b][2] - pts[a][2]) * (i - a) / (b - a);
  });
}

export function smooth(e, win = 5) {
  const h = win >> 1;
  return e.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - h); j <= Math.min(e.length - 1, i + h); j++) { s += e[j]; n++; } return s / n; });
}

// Набор и сброс с гистерезисом: изменения меньше порога thr не считаются
export function gainLoss(e, thr) {
  let up = 0, down = 0, ref = e[0];
  for (const v of e) {
    if (v - ref >= thr) { up += v - ref; ref = v; } else if (ref - v >= thr) { down += ref - v; ref = v; }
  }
  return { up, down };
}

// Подготовка трека: накопленное расстояние (км) и сглаженные высоты
export function prep(track, P) {
  const pts = track.pts, ele = smooth(fillEle(pts));
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + (pts[i][4] === pts[i - 1][4] ? dist(pts[i - 1], pts[i]) / 1000 : 0));
  return { pts, ele, d, total: d.at(-1), P };
}

// Скорость км/ч по Тоблеру: на ровном = базовой, на подъёме/спуске падает
export function speed(slope, P) {
  const s = Math.max(-P.slope_clip, Math.min(P.slope_clip, slope * 100)) / 100;
  return P.tobler_base * Math.exp(-3.5 * (Math.abs(s + 0.05) - 0.05));
}

export function modelHours(T, i0, i1) {
  let h = 0;
  for (let i = i0 + 1; i <= i1; i++) {
    const dk = T.d[i] - T.d[i - 1]; if (dk <= 0) continue;
    h += dk / speed((T.ele[i] - T.ele[i - 1]) / (dk * 1000), T.P);
  }
  return h;
}

export const idxAtKm = (T, km) => { const i = T.d.findIndex(v => v >= km); return i < 0 ? T.pts.length - 1 : i; };

export function dayStats(T, i0, i1) {
  const e = T.ele.slice(i0, i1 + 1), { up, down } = gainLoss(e, T.P.smooth_thr);
  const t0 = T.pts[i0][3], t1 = T.pts[i1][3];
  return {
    km: T.d[i1] - T.d[i0], up, down, maxAlt: Math.max(...e), minAlt: Math.min(...e),
    hours: modelHours(T, i0, i1), hoursTime: t0 && t1 ? (t1 - t0) / 3600000 : null,
  };
}

export const totalStats = T => ({ ...dayStats(T, 0, T.pts.length - 1), hours: undefined });

// Границы дней: массив [i0,i1] по километрам-ночёвкам cuts
export function ranges(T, cuts) {
  const idx = [0, ...[...cuts].filter(k => k > 0 && k < T.total).sort((a, b) => a - b).map(k => idxAtKm(T, k)), T.pts.length - 1];
  const r = []; for (let i = 0; i < idx.length - 1; i++) if (idx[i + 1] > idx[i]) r.push([idx[i], idx[i + 1]]);
  return r;
}

const localDate = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const dayDate = (T, i0) => (T.pts[i0][3] ? localDate(T.pts[i0][3]) : '');

export function splitDates(T) {
  const c = []; let prev = T.pts[0][3] && localDate(T.pts[0][3]);
  T.pts.forEach((p, i) => { if (!p[3]) return; const dt = localDate(p[3]); if (prev && dt !== prev) c.push(T.d[i]); prev = dt; });
  return c;
}
export function splitSegs(T) {
  const c = []; T.pts.forEach((p, i) => { if (i && p[4] !== T.pts[i - 1][4]) c.push(T.d[i]); });
  return c;
}
export function splitWpts(T, wpts) {
  return wpts.map(w => { let best = 0, bd = 1e12; T.pts.forEach((p, i) => { const x = dist(p, [w.lat, w.lon]); if (x < bd) { bd = x; best = i; } }); return bd < 1500 ? T.d[best] : null; })
    .filter(k => k != null && k > 0.5 && k < T.total - 0.5);
}
export function splitTarget(T, hours) {
  const c = []; let acc = 0;
  for (let i = 1; i < T.pts.length; i++) {
    const dk = T.d[i] - T.d[i - 1]; if (dk <= 0) continue;
    acc += dk / speed((T.ele[i] - T.ele[i - 1]) / (dk * 1000), T.P);
    if (acc >= hours) { c.push(T.d[i]); acc = 0; }
  }
  if (c.length && T.total - c.at(-1) < 0.5) c.pop();
  return c;
}

// ---- Интернет: Open-Meteo ----
export async function fetchElevations(pts, onProgress) {
  const out = [];
  for (let i = 0; i < pts.length; i += 100) {
    const part = pts.slice(i, i + 100);
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${part.map(p => p[0].toFixed(5)).join(',')}&longitude=${part.map(p => p[1].toFixed(5)).join(',')}`);
    if (!r.ok) throw new Error('Open-Meteo: ошибка ' + r.status);
    out.push(...(await r.json()).elevation);
    onProgress?.(Math.min(i + 100, pts.length), pts.length);
  }
  return out;
}

const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
// Прогноз, если дата близко, иначе средние за 3 прошлых года на ту же дату
export async function fetchWeather(lat, lon, ele, date) {
  const q = (base, d1, d2) => fetch(`${base}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&elevation=${Math.round(ele)}&start_date=${d1}&end_date=${d2}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean&timezone=auto`).then(r => r.ok ? r.json() : Promise.reject(new Error('Open-Meteo: ошибка ' + r.status)));
  const days = (new Date(date) - Date.now()) / 86400000;
  if (days > -90 && days < 15) {
    const d = (await q('https://api.open-meteo.com/v1/forecast', date, date)).daily;
    if (d.temperature_2m_mean[0] != null) return { tmin: d.temperature_2m_min[0], tavg: d.temperature_2m_mean[0], tmax: d.temperature_2m_max[0], src: 'прогноз' };
  }
  const y = +date.slice(0, 4), cur = new Date().getFullYear(), rows = [];
  for (let k = 1; k <= 3; k++) {
    let yy = y - k; while (yy >= cur) yy--;
    try { const d = (await q('https://archive-api.open-meteo.com/v1/archive', `${yy}${date.slice(4)}`, `${yy}${date.slice(4)}`)).daily; if (d.temperature_2m_mean[0] != null) rows.push(d); } catch { /* пропускаем год */ }
  }
  if (!rows.length) throw new Error('Нет данных погоды');
  return { tmin: avg(rows.map(d => d.temperature_2m_min[0])), tavg: avg(rows.map(d => d.temperature_2m_mean[0])), tmax: avg(rows.map(d => d.temperature_2m_max[0])), src: 'климат' };
}
