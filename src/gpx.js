// Чистые функции для трека: разбор GPX, сглаживание, набор/сброс, время, разбивка на дни, запросы Open-Meteo.
// Точка трека: [lat, lon, ele|null, (не используется), номер сегмента]. Время и даты из GPX не берём. Все коэффициенты приходят в P (из параметров).

export function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Файл не похож на GPX');
  const pts = []; let seg = 0;
  doc.querySelectorAll('trk').forEach(trk => trk.querySelectorAll('trkseg').forEach(s => {
    s.querySelectorAll('trkpt').forEach(p => {
      const e = p.querySelector('ele');
      pts.push([+p.getAttribute('lat'), +p.getAttribute('lon'), e && isFinite(+e.textContent) ? +e.textContent : null, null, seg]);
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
  return {
    km: T.d[i1] - T.d[i0], up, down, maxAlt: Math.max(...e), minAlt: Math.min(...e),
    hours: modelHours(T, i0, i1), endAlt: T.ele[i1],
  };
}

export const totalStats = T => ({ ...dayStats(T, 0, T.pts.length - 1), hours: undefined });

// Границы дней: массив [i0,i1] по километрам-ночёвкам cuts
export function ranges(T, cuts) {
  const idx = [0, ...[...cuts].filter(k => k > 0 && k < T.total).sort((a, b) => a - b).map(k => idxAtKm(T, k)), T.pts.length - 1];
  const r = []; for (let i = 0; i < idx.length - 1; i++) if (idx[i + 1] > idx[i]) r.push([idx[i], idx[i + 1]]);
  return r;
}

export function splitSegs(T) {
  const c = []; T.pts.forEach((p, i) => { if (i && p[4] !== T.pts[i - 1][4]) c.push(T.d[i]); });
  return c;
}
// Разбивка поровну по нагрузке: эквивалент = км + набор/split_up + сброс/split_down
export function splitLoad(T, n) {
  if (n < 2) return [];
  const cum = [0];
  for (let i = 1; i < T.pts.length; i++) {
    const de = T.ele[i] - T.ele[i - 1], dk = T.d[i] - T.d[i - 1];
    cum.push(cum[i - 1] + dk + Math.max(0, de) / T.P.split_up + Math.max(0, -de) / T.P.split_down);
  }
  const total = cum.at(-1), cuts = [];
  for (let k = 1; k < n; k++) { const i = cum.findIndex(v => v >= total * k / n); if (i > 0) cuts.push(T.d[i]); }
  return cuts;
}
export const hasEle = pts => pts.some(p => p[2] != null);
