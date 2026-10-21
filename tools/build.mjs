// Сборка: склеивает src/*.js в один обычный скрипт app.bundle.js (работает через file://, без модулей).
// Запуск: node tools/build.mjs   (нужен только мне при правке кода; для работы приложения Node не нужен)
import { readFileSync, writeFileSync } from 'node:fs';

const seen = new Set(), order = [];
(function visit(f) {
  if (seen.has(f)) return; seen.add(f);
  for (const m of readFileSync(`src/${f}`, 'utf8').matchAll(/from '\.\/([\w.]+)'/g)) visit(m[1]);
  order.push(f);
})('app.js');

const parts = order.map(f => {
  let src = readFileSync(`src/${f}`, 'utf8');
  const names = [...src.matchAll(/^export (?:async )?(?:const|let|function) (\w+)/gm)].map(m => m[1]);
  src = src.replace(/^import \* as (\w+) from '\.\/([\w.]+)';?$/gm, (_, n, m) => `const ${n} = __m['${m}'];`);
  src = src.replace(/^import \{([^}]+)\} from '\.\/([\w.]+)';?$/gm, (_, list, m) =>
    `const {${list.split(',').map(s => s.trim().replace(/ as /, ': ')).join(', ')}} = __m['${m}'];`);
  src = src.replace(/^export (?=(?:async )?(?:const|let|function))/gm, '');
  return `__m['${f}'] = (() => {\n${src}\nreturn {${names.join(', ')}};\n})();`;
});
writeFileSync('app.bundle.js', `// ФАЙЛ СОБИРАЕТСЯ АВТОМАТИЧЕСКИ из src/ командой node tools/build.mjs — не правьте вручную.\n(function () {\nconst __m = {};\n${parts.join('\n')}\n})();\n`);
console.log('app.bundle.js:', order.length, 'модулей');
