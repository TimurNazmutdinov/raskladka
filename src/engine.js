// Движок расчёта: только чистые функции. Все коэффициенты приходят в объекте P (из defaults.js + правки пользователя).

export const isRest = d => d.type === 'Днёвка' || d.type === 'Запасной';
const mean = (a, b) => (a != null && b != null ? (a + b) / 2 : (a ?? b ?? null));
// Средняя температура суток: днём и ночью по среднему мин/макс; запасной вариант — старые поля tday/tnight
export const tavgOf = d => { const td = mean(d.tdmin, d.tdmax) ?? d.tday ?? null, tn = mean(d.tnmin, d.tnmax) ?? d.tnight ?? null; return td != null && tn != null ? (td + tn) / 2 : (td ?? tn); };
export const tmaxOf = d => d.tdmax ?? d.tday ?? null;
export const tempText = d => { const f = (a, b) => (a != null && b != null && a !== b ? `${Math.round(a)}…${Math.round(b)}` : (b ?? a) != null ? `${Math.round(b ?? a)}` : '—'); return `${f(d.tdmin, d.tdmax ?? d.tday)}/${f(d.tnmin, d.tnmax ?? d.tnight)}°`; };
export const bmr = p => 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'F' ? -161 : 5);

export function eta(cover, snowCm, P) {
  if (cover === 'snow') return P.eta_snow_a + P.eta_snow_b * (snowCm || 0);
  return { asphalt: P.eta_asphalt, dirt: P.eta_dirt, trail: P.eta_trail, bush: P.eta_bush, swamp: P.eta_swamp, sand: P.eta_sand }[cover] ?? P.eta_trail;
}

// Пандольф: W вес тела кг, L рюкзак кг, v м/с, G уклон % (≥0 для формулы), et — η. Возвращает ватты.
export function pandolf(W, L, v, G, et) {
  return 1.5 * W + 2 * (W + L) * (L / W) ** 2 + et * (W + L) * (1.5 * v * v + 0.35 * v * G);
}

// η дня: если задано несколько участков покрытия с км — средневзвешенно по км
export function etaDay(day, P) {
  const seg = (day.covers || []).filter(s => s.cover && s.km > 0);
  if (!seg.length) return eta(day.cover, day.snow, P);
  const tot = seg.reduce((s, x) => s + x.km, 0);
  return seg.reduce((s, x) => s + eta(x.cover, x.snow, P) * x.km, 0) / tot;
}
export const descentK = (g, P) => { const a = Math.abs(g); return a <= P.descent_th_low ? P.descent_k_low : a <= P.descent_th_high ? P.descent_k_mid : P.descent_k_high; };
const clip = (g, P) => Math.max(-P.slope_clip, Math.min(P.slope_clip, g));

// Ходьба за день по сводным данным дня: условно делим путь на подъём и спуск с одинаковой скоростью
export function walkKcal(day, W, L, P) {
  const hours = day.hours || 0, D = (day.km || 0) * 1000;
  if (!hours || !D) return { kcal: 0, parts: [] };
  const v = D / (hours * 3600), up = day.up || 0, down = day.down || 0, et = etaDay(day, P);
  const sum = up + down, Du = sum ? D * up / sum : D / 2, Dd = D - Du;
  const parts = []; let kcal = 0;
  const add = (name, dist, g, mult) => {
    if (dist <= 0) return;
    const gc = clip(g, P), h = hours * dist / D;
    const w = (mult ? pandolf(W, L, v, 0, et) * mult : pandolf(W, L, v, gc, et));
    const k = w * h * P.kcal_per_wh * P.pandolf_corr;
    kcal += k; parts.push({ name, watts: w, hours: h, kcal: k, slope: gc });
  };
  add('Подъём', Du, Du ? up / Du * 100 : 0);
  add('Спуск', Dd, Dd ? -down / Dd * 100 : 0, descentK(Dd ? down / Dd * 100 : 0, P));
  return { kcal, parts, v };
}

const tavg = tavgOf;

// Потребность участника на день с разбивкой по шагам
export function personNeed(person, day, L, P) {
  const B = bmr(person), rest = isRest(day), hours = rest ? 0 : (day.hours || 0);
  const w = rest ? { kcal: 0, parts: [] } : walkKcal(day, person.weight, L, P);
  const camp = rest ? B * P.rest_k : Math.max(0, 24 - hours) * B / 24 * P.camp_k;
  const t = tavg(day), cold = t != null ? P.cold_k * Math.max(0, P.cold_t0 - t) : 0;
  const base = w.kcal + camp + cold;
  const altK = day.maxAlt > P.alt_start ? 1 + P.alt_pct / 100 * (day.maxAlt - P.alt_start) / 1000 : 1;
  const personal = person.appetite || 1, general = 1 + P.general_pct / 100;
  const total = base * altK * personal * general;
  return { bmr: B, walk: w.kcal, parts: w.parts, camp, cold, t, base, altK, personal, general, total, rest };
}

export const coverage = (mode, custom, P) => ({ hungry: P.cov_hungry, std: P.cov_std, full: P.cov_full, custom: custom ?? P.cov_custom })[mode] ?? P.cov_std;

// Множитель аппетита по дням: в первые app_days дней на новой высоте
export function appetiteFactors(days, P) {
  const band = d => (d.maxAlt >= 5000 ? 3 : d.maxAlt >= 4000 ? 2 : d.maxAlt >= 3000 ? 1 : 0);
  const mult = [1, P.app_alt1, P.app_alt2, P.app_alt3];
  let top = 0, entry = -99, ebands = 0;
  return days.map((d, i) => {
    const b = band(d);
    if (b > top) { top = b; entry = i; ebands = b; }
    return (i - entry < P.app_days && ebands > 0) ? mult[ebands] : 1;
  });
}

export function macros(kcal, alt, P) {
  const f = alt > P.macro_alt ? P.macro_f_high : P.macro_f_low, c = alt > P.macro_alt ? P.macro_c_high : P.macro_c_low;
  const p = kcal / (4 + 9 * f + 4 * c);
  return { p, f: p * f, c: p * c };
}

export function fuelPerPerson(day, P) {
  const k = day.wind ? 1 + P.fuel_wind_pct / 100 : 1;
  if (isRest(day) && !day.melt) return P.fuel_nosnow * k;
  if (day.maxAlt > P.fuel_cold_alt || (tavg(day) ?? 99) < -10) return P.fuel_cold * k;
  return (day.melt || day.cover === 'snow' || day.precip === 'snow' ? P.fuel_snow : P.fuel_nosnow) * k;
}

export const waterLiters = (person, day, P) => person.weight * P.water_ml / 1000 + ((tmaxOf(day) ?? -99) > P.hot_t ? P.hot_l : 0);

// Полный расчёт похода. Возвращает {days, summary, warnings}
export function computeTrip(trip, P) {
  const g = trip.group.filter(p => p.weight && p.height && p.age), n = g.length, days = trip.days;
  const warnings = [];
  if (!n) return { days: [], summary: null, warnings: ['Добавьте участников с возрастом, ростом и весом.'] };
  if (!days.length) return { days: [], summary: null, warnings: ['Добавьте дни похода.'] };
  const cov = coverage(trip.prefs.mode, trip.prefs.custom, P) / 100;
  const goal = trip.prefs.kcalGoal > 0 ? trip.prefs.kcalGoal : null, restK = (trip.prefs.restPct ?? 80) / 100; // цель по калориям задана вручную (ккал/чел/день)
  const apf = appetiteFactors(days, P), shareSum = g.reduce((s, p) => s + (p.share || 1), 0);
  const out = days.map((d, i) => {
    const left = days.length - i + P.reserve_days;
    const foodKg = n * (P.ref_std * cov / 0.67) * left / 1000; // грубая оценка веса еды в рюкзаках до расчёта меню
    const per = g.map(p => {
      const share = (p.share || 1) / shareSum, L = (p.gear || 0) + (trip.gear.common || 0) * share + foodKg * share;
      const nd = personNeed(p, d, L, P), target = goal ? goal * (p.appetite || 1) * (isRest(d) ? restK : 1) : nd.total * cov * apf[i];
      return { p, L, ...nd, target, grams: target / P.kcal100 * 100 };
    });
    const need = per.reduce((s, x) => s + x.total, 0), target = per.reduce((s, x) => s + x.target, 0);
    const tgtGrams = target / P.kcal100 * 100;
    return { i, d, per, need, target, grams: tgtGrams, cover: need ? target / need : 0, appetite: apf[i], fuel: fuelPerPerson(d, P) * n, water: per.reduce((s, x) => s + waterLiters(x.p, d, P), 0), mac: macros(target / n, d.maxAlt || 0, P) };
  });
  const tot = out.reduce((s, x) => s + x.target, 0), totNeed = out.reduce((s, x) => s + x.need, 0), gramsAll = out.reduce((s, x) => s + x.grams, 0);
  out.forEach(x => { if (goal && !(isRest(x.d) || (x.d.km && x.d.hours))) return; /* цель задана, данных о нагрузке нет — покрытие не оцениваем */ if (x.cover * 100 < P.cov_warn - 0.01) warnings.push(`День ${x.i + 1}: покрытие ${Math.round(x.cover * 100)}% ниже порога ${P.cov_warn}%`); });
  g.forEach(p => {
    const lim = p.sex === 'F' ? trip.gear.maxF : trip.gear.maxM;
    const x = out[0].per.find(q => q.p === p);
    if (lim && x.L > lim) warnings.push(`${p.name || 'Участник'}: рюкзак в начале ≈ ${x.L.toFixed(1)} кг при лимите ${lim} кг. Рассмотрите заброску или меньшую граммовку.`);
  });
  const reserveKcal = P.reserve_days * (out.reduce((s, x) => s + x.target, 0) / days.length);
  return {
    days: out, warnings,
    summary: { days: days.length, kcal: tot, need: totNeed, grams: gramsAll, gramsPerPersonDay: gramsAll / n / days.length, kcalPerPersonDay: tot / n / days.length, cover: totNeed ? tot / totNeed : 0, fuel: out.reduce((s, x) => s + x.fuel, 0), water: out.reduce((s, x) => s + x.water, 0), reserveKcal, n },
  };
}
