import * as g from '../src/gpx.js';
const P = { smooth_thr: 5, tobler_base: 5, slope_clip: 40, split_up: 100, split_down: 200 };
// синтетика: 10 км на восток, высота 0→500 м (треугольная волна с шумом 2 м)
const pts = []; for (let i = 0; i <= 400; i++) { const x = i * 25; pts.push([50, 30 + x / 71500, (x / 10000) * 500 + (i % 2 ? 2 : -2), null, 0]); }
const T = g.prep({ pts }, P), s = g.dayStats(T, 0, pts.length - 1);
const ok = (n, c) => console.log(c ? 'ok  ' : 'FAIL', n);
ok('длина ~10 км: ' + s.km.toFixed(2), Math.abs(s.km - 10) < 0.3);
ok('набор ~500 без шума: ' + Math.round(s.up), Math.abs(s.up - 500) < 40);
ok('сброс мал: ' + Math.round(s.down), s.down < 30);
ok('скорость на ровном = база', Math.abs(g.speed(0, P) - 5) < 1e-9);
ok('время 10 км в гору 5% > 2 ч: ' + s.hours.toFixed(2), s.hours > 2 && s.hours < 4);
const c = g.splitLoad(T, 4); ok('разбивка на 4 дня: ' + c.map(x => x.toFixed(1)), c.length === 3 && Math.abs(c[1] - 5) < 1);
ok('ranges', g.ranges(T, [3, 6]).length === 3);
