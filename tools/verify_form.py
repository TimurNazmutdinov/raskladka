# Сверка «ячейка в ячейку»: форма Виктор_экстракция.xlsx против оригинала Калькулятор Виктор.xlsx (по колонке «Источник»).
import zipfile, re, os
from xml.etree import ElementTree as ET
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}; Q = '{%s}' % NS['m']
DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Шаблон раскладки')
def book(path):
    z = zipfile.ZipFile(path)
    ss = [''.join(t.text or '' for t in si.iter(Q + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)] if 'xl/sharedStrings.xml' in z.namelist() else []
    names = re.findall(r'<sheet [^>]*name="([^"]+)"', z.read('xl/workbook.xml').decode()); out = {}
    for i, n in enumerate(names, 1):
        g = {}
        for c in ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml')).iter(Q + 'c'):
            v = c.find('m:v', NS); t = c.get('t'); is_ = c.find('m:is', NS)
            if t == 'inlineStr': val = ''.join(x.text or '' for x in is_.iter(Q + 't'))
            elif v is None or v.text is None: continue
            elif t == 's': val = ss[int(v.text)]
            elif t in ('str',): val = v.text
            else: val = float(v.text)
            g[c.get('r')] = val
        out[n] = g
    return out
O = book(os.path.join(DIR, 'Калькулятор Виктор.xlsx')); F = book(os.path.join(DIR, 'Виктор_экстракция.xlsx'))
checked = bad = 0; diffs = []
def cmp(label, a, b):
    global checked, bad
    checked += 1
    if (a is None and b is None) or (a == b) or (isinstance(a, float) and isinstance(b, float) and a == b): return
    bad += 1; diffs.append((label, a, b))
def cell_of(sheet, ref): return O[sheet].get(ref)
def hdr_map(sh):
    return {v: re.sub(r'\d', '', k) for k, v in F[sh].items() if int(re.sub(r'\D', '', k)) == 1 and isinstance(v, str)}
# Продукты
H = hdr_map('Продукты'); rows = sorted({int(re.sub(r'\D', '', k)) for k in F['Продукты'] if int(re.sub(r'\D', '', k)) > 1})
mp = {'Название': 'C', 'Категория': 'B', 'Ккал на 100 г': 'G', 'Белки на 100 г': 'H', 'Жиры на 100 г': 'I', 'Углеводы на 100 г': 'J', 'Базовая ед.': 'F', 'Размер упаковки': 'E', 'Ед. закупки': 'D', 'Цена за упаковку': 'K', 'В закупку?': 'L', 'Примечание': 'M', 'ID': 'A'}
for r in rows:
    src = F['Продукты'][f"{H['Источник']}{r}"]; orow = int(re.search(r'A(\d+):', src).group(1))
    for k, oc in mp.items(): cmp(f'Продукты {k} {src}', cell_of('Продукты', f'{oc}{orow}'), F['Продукты'].get(f'{H[k]}{r}'))
    for extra in ('Хранение, дней', 'Свежий (да/нет)', 'Теги'): cmp(f'Продукты пусто {extra} стр.{r}', None, F['Продукты'].get(f'{H[extra]}{r}'))
orig_products = [r for r in range(6, 67) if f'C{r}' in O['Продукты'] or f'A{r}' in O['Продукты']]
cmp('Продукты: количество строк', float(len(orig_products)), float(len(rows)))
# Блюда
H = hdr_map('Блюда'); rows = sorted({int(re.sub(r'\D', '', k)) for k in F['Блюда'] if int(re.sub(r'\D', '', k)) > 1}); n_lines = 0
mb = {'Продукт': 'A', 'Кол-во на 1 человека': 'B', 'Ед.': 'C', 'Примечание к строке': 'D'}
for r in rows:
    src = F['Блюда'][f"{H['Источник']}{r}"]; m = re.match(r'Рецепты!A(\d+):D', src)
    if not m: continue
    orow = int(m.group(1)); n_lines += 1
    for k, oc in mb.items(): cmp(f'Блюда {k} {src}', cell_of('Рецепты', f'{oc}{orow}'), F['Блюда'].get(f'{H[k]}{r}'))
    hdr = max(h for h in range(5, orow) if O['Рецепты'].get(f'A{h}') == 'Рецепт_ID')
    cmp(f'Блюда название блока {hdr}', O['Рецепты'].get(f'C{hdr}'), F['Блюда'].get(f"{H['Блюдо']}{r}")); cmp(f'Блюда описание {hdr}', O['Рецепты'].get(f'A{hdr + 1}'), F['Блюда'].get(f"{H['Описание блюда']}{r}")); cmp(f'Блюда id {hdr}', O['Рецепты'].get(f'B{hdr}'), F['Блюда'].get(f"{H['ID блюда']}{r}"))
    for extra in ('Приём пищи', 'Мин', 'Макс', 'Условия', 'Варка, мин'): cmp(f'Блюда пусто {extra}', None, F['Блюда'].get(f'{H[extra]}{r}'))
orig_lines = 0
hdrs = [h for h in range(5, 143) if O['Рецепты'].get(f'A{h}') == 'Рецепт_ID']
for k, h in enumerate(hdrs):
    end = hdrs[k + 1] if k + 1 < len(hdrs) else 143
    orig_lines += len([r for r in range(h + 3, end) if f'A{r}' in O['Рецепты'] and O['Рецепты'][f'A{r}'] != 'Рецепт_ID'])
cmp('Блюда: количество строк-ингредиентов', float(orig_lines), float(n_lines))
# План
H = hdr_map('План'); rows = sorted({int(re.sub(r'\D', '', k)) for k in F['План'] if int(re.sub(r'\D', '', k)) > 1})
for r in rows:
    src = F['План'][f"{H['Источник']}{r}"]; orow = int(re.search(r'A(\d+):', src).group(1))
    for k, oc in {'День': 'A', 'Приём пищи': 'B', 'Блюдо': 'C', 'Порций': 'E', 'Комментарий': 'F', 'ID блюда': 'D'}.items(): cmp(f'План {k} {src}', cell_of('Меню', f'{oc}{orow}'), F['План'].get(f'{H[k]}{r}'))
orig_plan = [r for r in range(6, 96) if any(f'{c}{r}' in O['Меню'] and O['Меню'][f'{c}{r}'] not in ('',) for c in 'ABCF')]
cmp('План: количество строк', float(len(orig_plan)), float(len(rows)))
# Параметры
H = hdr_map('Параметры'); rows = sorted({int(re.sub(r'\D', '', k)) for k in F['Параметры'] if int(re.sub(r'\D', '', k)) > 1})
for r in rows:
    src = F['Параметры'][f"{H['Источник']}{r}"]; orow = int(re.search(r'B(\d+)', src).group(1))
    cmp(f'Параметры {src}', O['Ввод'].get(f'B{orow}'), F['Параметры'].get(f"{H['Значение']}{r}")); cmp(f'Параметры имя {orow}', O['Ввод'].get(f'A{orow}'), F['Параметры'].get(f"{H['Параметр']}{r}"))
print('проверено значений:', checked, '| расхождений:', bad)
for d in diffs[:40]: print(d)
