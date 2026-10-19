// Собирает все файлы приложения в один single/index.html. Запуск: node build-single.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const order = ['defaults.js', 'store.js', 'params.js', 'method.js', 'ui.js', 'settings.js', 'products.js', 'pstore.js', 'productsview.js', 'gpx.js', 'gpxview.js', 'trip.js', 'engine.js', 'menu.js', 'calcview.js', 'shop.js', 'extras.js', 'app.js'];
const parts = order.map(f => {
  let src = readFileSync(f, 'utf8');
  const names = [...src.matchAll(/^export (?:async )?(?:const|let|function) (\w+)/gm)].map(m => m[1]);
  src = src.replace(/^import \* as (\w+) from '\.\/([\w.]+)';?$/gm, (_, n, m) => `const ${n} = __m['${m}'];`);
  src = src.replace(/^import \{([^}]+)\} from '\.\/([\w.]+)';?$/gm, (_, list, m) =>
    `const {${list.split(',').map(s => s.trim().replace(/ as /, ': ')).join(', ')}} = __m['${m}'];`);
  src = src.replace(/^export (?=(?:async )?(?:const|let|function))/gm, '');
  return `__m['${f}'] = (() => {\n${src}\nreturn {${names.join(', ')}};\n})();`;
});

const css = readFileSync('styles.css', 'utf8');
const icon = 'data:image/svg+xml,' + encodeURIComponent(readFileSync('icon.svg', 'utf8'));
const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Раскладка</title><link rel="icon" href="${icon}">
<meta name="theme-color" content="#2F4A3A">
<style>${css}</style></head>
<body><div id="app"></div>
<script>
const __m = {};
${parts.join('\n').replace(/^\s*if \('serviceWorker' in navigator\).*$/m, '')}
</script></body></html>`;

mkdirSync('single', { recursive: true });
writeFileSync('single/index.html', html);
console.log('single/index.html', Math.round(html.length / 1024) + ' КБ');
