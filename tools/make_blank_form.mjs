// Создаёт простой шаблон загрузки «Шаблон раскладки/Форма_для_загрузки_пустая.xlsx» тем же кодом, что и кнопка «Скачать пустую форму».
// Запуск: node tools/make_blank_form.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
globalThis.JSZip = createRequire(import.meta.url)('../lib/jszip.min.js');
const { writeXlsx } = await import('../src/xlsx.js');
const { simpleFormSheets } = await import('../src/formio.js');
const buf = Buffer.from(await (await writeXlsx(simpleFormSheets())).arrayBuffer());
writeFileSync(new URL('../Шаблон раскладки/Форма_для_загрузки_пустая.xlsx', import.meta.url), buf);
console.log('готово: Шаблон раскладки/Форма_для_загрузки_пустая.xlsx,', buf.length, 'байт');
