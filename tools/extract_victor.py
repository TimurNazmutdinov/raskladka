# Экстракция файла «Калькулятор Виктор.xlsx» в JSON без изменений данных (только чтение).
# Запуск: python tools/extract_victor.py
# Результат: Шаблон раскладки/Виктор_экстракция.json
import zipfile, re, json, os, sys, datetime
from xml.etree import ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
Q = '{%s}' % NS['m']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'Шаблон раскладки')
SRC = os.path.join(DIR, 'Калькулятор Виктор.xlsx')
OUT = os.path.join(DIR, 'Виктор_экстракция.json')

z = zipfile.ZipFile(SRC)
ss = [''.join(t.text or '' for t in si.iter(Q + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
wb = z.read('xl/workbook.xml').decode('utf8')
names = re.findall(r'<sheet [^>]*name="([^"]+)"', wb)

def col_idx(ref):
    n = 0
    for ch in re.sub(r'\d', '', ref): n = n * 26 + ord(ch) - 64
    return n

def read_sheet(i):
    """Все ячейки листа: адрес -> {raw, v, t, f}. raw — текст из файла без изменений; v — число, если ячейка числовая."""
    x = ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
    cells, shared = {}, {}
    for c in x.iter(Q + 'c'):
        ref, t = c.get('r'), c.get('t')
        v, f = c.find('m:v', NS), c.find('m:f', NS)
        is_ = c.find('m:is', NS)
        if v is None and f is None and is_ is None: continue
        raw = None
        if t == 's' and v is not None: raw = ss[int(v.text)]
        elif t == 'inlineStr': raw = ''.join(tt.text or '' for tt in is_.iter(Q + 't'))
        elif v is not None: raw = v.text if v.text is not None else ''
        cell = {'raw': raw, 't': {'s': 'string', 'str': 'string', 'inlineStr': 'string', 'b': 'bool', 'e': 'error'}.get(t, 'number')}
        if cell['t'] == 'number' and raw not in (None, ''):
            cell['v'] = float(raw) if ('.' in raw or 'E' in raw or 'e' in raw) else int(raw)
        if f is not None:
            ftxt = f.text
            if f.get('t') == 'shared':
                if ftxt: shared[f.get('si')] = (ref, ftxt)
                cell['shared_formula'] = {'si': f.get('si'), 'ref': f.get('ref')}
                cell['f'] = ftxt  # для зависимых ячеек текст берём из ведущей ниже
            else:
                cell['f'] = ftxt
            cell['is_formula'] = True
        cells[ref] = cell
    # зависимые ячейки общей формулы: записываем ведущую ячейку и текст «как в файле» (смещение не пересчитываем)
    for ref, cell in cells.items():
        sf = cell.get('shared_formula')
        if sf and not cell.get('f') and sf['si'] in shared:
            lead, ftxt = shared[sf['si']]
            cell['f_from_shared'] = {'lead_cell': lead, 'lead_formula': ftxt}
    merges = [m.get('ref') for m in x.iter(Q + 'mergeCell')]
    return cells, merges

sheets, merges = {}, {}
for i, n in enumerate(names, 1):
    sheets[n], merges[n] = read_sheet(i)

def val(sheet, ref):
    c = sheets[sheet].get(ref)
    return None if c is None else (c['v'] if 'v' in c else c['raw'])
def raw(sheet, ref):
    c = sheets[sheet].get(ref); return None if c is None else c['raw']
def src(sheet, ref): return f'{sheet}!{ref}'
def cell_info(sheet, ref):
    c = sheets[sheet].get(ref)
    if c is None: return None
    d = {'source': src(sheet, ref), 'raw': c['raw']}
    if 'v' in c: d['v'] = c['v']
    if c.get('is_formula'): d['formula'] = c.get('f') or c.get('f_from_shared')
    return d

# ---------- Ввод ----------
inputs = []
for r in range(4, 15):
    inputs.append({'row': r, 'label': cell_info('Ввод', f'A{r}'), 'value': cell_info('Ввод', f'B{r}'), 'note': cell_info('Ввод', f'E{r}')})

# ---------- Продукты ----------
P_FIELDS = [('A', 'id'), ('B', 'category'), ('C', 'name'), ('D', 'unit_purchase'), ('E', 'pack_size'), ('F', 'base_unit'), ('G', 'kcal100'), ('H', 'protein100'), ('I', 'fat100'), ('J', 'carb100'), ('K', 'price'), ('L', 'in_purchase'), ('M', 'note')]
products = []
for r in range(6, 67):
    if f'C{r}' not in sheets['Продукты'] and f'A{r}' not in sheets['Продукты']: continue
    p = {'row': r, 'source_row': src('Продукты', f'A{r}:M{r}')}
    for col, key in P_FIELDS:
        ci = cell_info('Продукты', f'{col}{r}')
        p[key] = ci  # None, если ячейка пуста (пустая остаётся пустой)
    nk = [p[k] for k in ('kcal100', 'protein100', 'fat100', 'carb100')]
    reasons = []
    if any(x is None for x in nk): reasons.append('нет КБЖУ (пустая ячейка)')
    elif all(x['v'] == 0 for x in nk): reasons.append('КБЖУ все нули')
    if p['base_unit'] and p['base_unit']['raw'] != 'г': reasons.append(f"базовая единица «{p['base_unit']['raw']}», не граммы")
    p['not_counted_reasons'] = reasons
    products.append(p)

# ---------- Рецепты (видимые блоки A:D) ----------
R = sheets['Рецепты']
hdr_rows = sorted(int(re.sub(r'\D', '', k)) for k, c in R.items() if k.startswith('A') and re.fullmatch(r'A\d+', k) and c['raw'] == 'Рецепт_ID')
dishes = []
for k, h in enumerate(hdr_rows):
    end = hdr_rows[k + 1] if k + 1 < len(hdr_rows) else 143
    d = {'recipe_id': cell_info('Рецепты', f'B{h}'), 'name': cell_info('Рецепты', f'C{h}'), 'description': cell_info('Рецепты', f'A{h + 1}'), 'header_row': h, 'lines': []}
    col_hdr = h + 2
    for r in range(col_hdr + 1, end):
        if f'A{r}' not in R: continue
        if R[f'A{r}']['raw'] == 'Рецепт_ID': break
        d['lines'].append({'row': r, 'product': cell_info('Рецепты', f'A{r}'), 'qty': cell_info('Рецепты', f'B{r}'), 'unit': cell_info('Рецепты', f'C{r}'), 'note': cell_info('Рецепты', f'D{r}')})
    dishes.append(d)

# ---------- Меню (план) ----------
M = sheets['Меню']
plan = []
for r in range(6, 96):
    if all(f'{c}{r}' not in M or M[f'{c}{r}']['raw'] in (None, '') for c in 'ABCF'): continue
    plan.append({'row': r, 'day': cell_info('Меню', f'A{r}'), 'meal': cell_info('Меню', f'B{r}'), 'dish': cell_info('Меню', f'C{r}'), 'recipe_id': cell_info('Меню', f'D{r}'), 'portions': cell_info('Меню', f'E{r}'), 'comment': cell_info('Меню', f'F{r}')})

# ---------- Эталон: итоги Виктора (значения как в файле) ----------
etalon = {
    'note': 'Итоги Виктора как в файле (значения, сохранённые Excel). Получены по технической таблице Рецепты!H:N, которая не совпадает с видимыми блоками рецептов (см. diagnostics).',
    'summary': {k: cell_info('Сводка', k) for k in list(sheets['Сводка'].keys())},
    'purchase_rows': [], 'purchase_total': {c: cell_info('Раскладка', f'{c}67') for c in 'ADEFIK'},
    'calculation_rows': [],
}
for r in range(6, 67):
    if f'B{r}' not in sheets['Раскладка']: continue
    etalon['purchase_rows'].append({'row': r, **{key: cell_info('Раскладка', f'{col}{r}') for col, key in zip('ABCDEFGHIJKLM', ['id', 'product', 'base_unit', 'need', 'reserve', 'buy', 'unit_purchase', 'pack_size', 'packs', 'price', 'cost', 'in_purchase', 'note'])}})
K = sheets['Калькуляция']
for r in range(6, 726):
    if f'E{r}' in K and K[f'E{r}']['raw'] not in (None, ''):
        etalon['calculation_rows'].append({'row': r, **{key: cell_info('Калькуляция', f'{col}{r}') for col, key in zip('ABCDEFGHIJKLMNO', ['day', 'meal', 'dish', 'recipe_id', 'product_id', 'product', 'unit', 'qty_per_portion', 'portions', 'total', 'kcal', 'protein', 'fat', 'carb', 'note'])}})

# ---------- Техническая таблица Рецепты!H:N и диагностика ----------
tech = []
for r in range(5, 86):
    row = {'row': r}
    for col, key in zip('HIJKLMN', ['recipe_id', 'recipe', 'product_id', 'product', 'qty', 'unit', 'note']):
        row[key] = cell_info('Рецепты', f'{col}{r}')
    if any(row[k] for k in ('recipe_id', 'product')): tech.append(row)
def tv(c): return None if c is None else c['raw']
tech_by_recipe = {}
for t in tech[1:]:
    tech_by_recipe.setdefault(tv(t['recipe_id']), []).append((tv(t['product']), tv(t['qty']), tv(t['unit'])))
diag = []
for d in dishes:
    rid = d['recipe_id']['raw']
    block = [(l['product']['raw'], l['qty']['raw'] if l['qty'] else None, l['unit']['raw'] if l['unit'] else None) for l in d['lines']]
    tl = tech_by_recipe.get(rid, [])
    tl_clean = [x for x in tl if x[0] not in (None, '')]
    norm = lambda a: (a[0], None if a[1] is None else float(a[1]), a[2])
    same = [norm(x) for x in block] == [norm(x) for x in tl_clean]
    diag.append({'recipe_id': rid, 'name': d['name']['raw'], 'lines_in_block': len(block), 'lines_in_tech_table': len(tl_clean), 'tech_table_equals_block': same})

# ---------- Пересчёт по видимым рецептам (производные данные, не данные Виктора) ----------
by_name = {}
for p in products: by_name.setdefault(p['name']['raw'], p)
dish_by_id = {d['recipe_id']['raw']: d for d in dishes}
dish_by_name = {d['name']['raw']: d for d in dishes}

def calc_menu(strict):
    rows, need = [], {}
    for pr in plan:
        name = pr['dish']['raw'] if pr['dish'] else None
        d = dish_by_name.get(name)
        port = pr['portions']['v'] if pr['portions'] and 'v' in pr['portions'] else None
        if not d or port is None:
            rows.append({'menu_row': pr['row'], 'day': pr['day']['v'], 'meal': pr['meal']['raw'], 'dish': name, 'skipped': 'нет рецепта или порций'}); continue
        tot = {'kcal': 0.0, 'protein': 0.0, 'fat': 0.0, 'carb': 0.0, 'grams': 0.0}; skipped = []
        for l in d['lines']:
            pname = l['product']['raw']; q = l['qty']['v'] if l['qty'] and 'v' in l['qty'] else None; unit = l['unit']['raw'] if l['unit'] else None
            prod = by_name.get(pname)
            total = None if q is None else q * port
            if total is not None:
                key = (pname, unit); need[key] = need.get(key, 0) + total
            if prod is None: skipped.append(f'{pname}: нет в Продуктах'); continue
            if q is None: skipped.append(f'{pname}: нет количества'); continue
            if strict and (unit != 'г' or prod['base_unit']['raw'] != 'г'): skipped.append(f'{pname}: единица «{unit}» (не граммы)'); continue
            if any(prod[k] is None for k in ('kcal100', 'protein100', 'fat100', 'carb100')): skipped.append(f'{pname}: нет КБЖУ'); continue
            tot['kcal'] += total / 100 * prod['kcal100']['v']; tot['protein'] += total / 100 * prod['protein100']['v']; tot['fat'] += total / 100 * prod['fat100']['v']; tot['carb'] += total / 100 * prod['carb100']['v']
            if unit == 'г': tot['grams'] += total
        rows.append({'menu_row': pr['row'], 'day': pr['day']['v'], 'meal': pr['meal']['raw'], 'dish': name, 'portions': port, **{k: round(v, 6) for k, v in tot.items()}, 'not_counted': skipped})
    days = {}
    for r in rows:
        if 'skipped' in r: continue
        a = days.setdefault(r['day'], {'kcal': 0.0, 'protein': 0.0, 'fat': 0.0, 'carb': 0.0, 'grams': 0.0})
        for k in a: a[k] += r[k]
    people = inputs[0]['value']['v']; ndays = inputs[1]['value']['v']
    tot = {k: sum(a[k] for a in days.values()) for k in ('kcal', 'protein', 'fat', 'carb', 'grams')}
    return {'rows': rows, 'by_day_group': {str(k): {kk: round(vv, 6) for kk, vv in v.items()} for k, v in days.items()},
            'per_person_per_day': {k: round(v / (people * ndays), 6) for k, v in tot.items()},
            'need_by_product_and_unit': [{'product': k[0], 'unit': k[1], 'total': round(v, 6)} for k, v in sorted(need.items(), key=lambda kv: (kv[0][0], str(kv[0][1])))]}

recomputed = {
    'note': 'Производные данные (не из файла Виктора): пересчёт по ВИДИМЫМ блокам рецептов и плану. «victor_method» повторяет формулу Виктора (количество × порции / 100 × ккал на 100 г для любой единицы), «strict_grams» считает только строки в граммах.',
    'victor_method': calc_menu(False), 'strict_grams': calc_menu(True),
}
# проверка: повторить формулу Виктора по его же кэшированным строкам Калькуляции
vsum = lambda col: sum(c[col]['v'] for c in etalon['calculation_rows'] if c[col] and 'v' in c[col])
people, ndays = inputs[0]['value']['v'], inputs[1]['value']['v']
etalon['check_from_cached_calculation_rows'] = {'kcal_per_person_per_day': vsum('kcal') / (people * ndays), 'protein_per_person_per_day': vsum('protein') / (people * ndays), 'rows': len(etalon['calculation_rows'])}

# ---------- Формулы ----------
formulas = {}
for n in names:
    fs = [(ref, c) for ref, c in sheets[n].items() if c.get('is_formula')]
    pat = {}
    for ref, c in fs:
        col = re.sub(r'\d', '', ref); pat.setdefault(col, []).append(ref)
    formulas[n] = {'count': len(fs), 'by_column': {col: {'cells': len(refs), 'first_cell': refs[0], 'first_formula': (sheets[n][refs[0]].get('f') or (sheets[n][refs[0]].get('f_from_shared') or {}).get('lead_formula'))} for col, refs in pat.items()}}

out = {
    'meta': {'source_file': 'Шаблон раскладки/Калькулятор Виктор.xlsx', 'extracted_at': datetime.datetime.now().isoformat(timespec='seconds'), 'extractor': 'tools/extract_victor.py', 'sheets': names,
             'rules': 'Данные извлечены без изменений: raw — текст из файла символ в символ, v — число с полной точностью. Пустые ячейки отсутствуют (null), не превращены в 0. Формулы сохранены как формулы + вычисленное значение. Продукты/блюда/план — только из ячеек файла, адреса в source.'},
    'inputs': inputs, 'products': products, 'dishes': dishes, 'plan': plan,
    'etalon': etalon, 'technical_table_recipes_H_N': tech, 'diagnostics': {'tech_table_vs_blocks': diag}, 'recomputed_from_visible_recipes': recomputed,
    'formulas': formulas, 'merged_cells': merges,
    'raw_sheets': {n: sheets[n] for n in names},
}
json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('записано', OUT, round(os.path.getsize(OUT) / 1024), 'КБ')
