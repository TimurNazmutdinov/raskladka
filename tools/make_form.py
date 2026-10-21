# Строит Excel-форму для загрузки данных и заполняет её данными Виктора из «Виктор_экстракция.json» (без изменений).
# Запуск: python tools/make_form.py  (после tools/extract_victor.py)
# Результат в папке «Шаблон раскладки»: Виктор_экстракция.xlsx (заполнено) и Форма_для_загрузки_пустая.xlsx
import json, os, zipfile, re
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'Шаблон раскладки')
D = json.load(open(os.path.join(DIR, 'Виктор_экстракция.json'), encoding='utf8'))

def col(i):
    s = ''
    i += 1
    while i: i, r = divmod(i - 1, 26); s = chr(65 + r) + s
    return s

# значение ячейки: {'raw':..., 'v':...} из JSON -> ('n', текст числа) или ('s', строка) или None
def cv(c):
    if c is None: return None
    if 'v' in c: return ('n', c['raw'])
    return None if c['raw'] in (None,) else ('s', c['raw'])
def S(x): return None if x is None or x == '' else ('s', str(x))
def N(x): return None if x is None else ('n', repr(x) if isinstance(x, float) else str(x))

class Sheet:
    def __init__(self, name, headers, widths, notes=None, dv=None, title=None):
        self.name, self.headers, self.widths, self.rows, self.dv, self.notes, self.title = name, headers, widths, [], dv or [], notes, title
    def add(self, *cells): self.rows.append(cells)
    def xml(self):
        out = []
        r0 = 1
        if self.title:  # строка пояснения над таблицей
            out.append(f'<row r="1" ht="48" customHeight="1"><c r="A1" s="3" t="inlineStr"><is><t xml:space="preserve">{escape(self.title)}</t></is></c></row>'); r0 = 2
        out.append(f'<row r="{r0}" ht="32" customHeight="1">' + ''.join(f'<c r="{col(i)}{r0}" s="1" t="inlineStr"><is><t xml:space="preserve">{escape(h)}</t></is></c>' for i, h in enumerate(self.headers)) + '</row>')
        for k, cells in enumerate(self.rows):
            r = r0 + 1 + k; cs = []
            for i, c in enumerate(cells):
                if c is None: continue
                t, v = c
                if t == 'n': cs.append(f'<c r="{col(i)}{r}"><v>{v}</v></c>')
                else: cs.append(f'<c r="{col(i)}{r}" s="2" t="inlineStr"><is><t xml:space="preserve">{escape(v)}</t></is></c>')
            out.append(f'<row r="{r}">' + ''.join(cs) + '</row>')
        last = r0 + max(1, len(self.rows))
        cols = ''.join(f'<col min="{i + 1}" max="{i + 1}" width="{w}" customWidth="1"/>' for i, w in enumerate(self.widths))
        merge = f'<mergeCells count="1"><mergeCell ref="A1:{col(len(self.headers) - 1)}1"/></mergeCells>' if self.title else ''
        dv = ''
        if self.dv:
            dv = f'<dataValidations count="{len(self.dv)}">' + ''.join(f'<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="{col(i)}{r0 + 1}:{col(i)}{max(last, 500)}"><formula1>"{escape(lst)}"</formula1></dataValidation>' for i, lst in self.dv) + '</dataValidations>'
        pane = f'<sheetViews><sheetView workbookViewId="0"><pane ySplit="{r0}" topLeftCell="A{r0 + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                f'{pane}<sheetFormatPr defaultRowHeight="15"/><cols>{cols}</cols><sheetData>{"".join(out)}</sheetData>'
                f'<autoFilter ref="A{r0}:{col(len(self.headers) - 1)}{last}"/>{merge}{dv}</worksheet>')

class TextSheet:  # лист-инструкция: строки текста
    def __init__(self, name, lines): self.name, self.lines = name, lines
    def xml(self):
        rows = ''.join(f'<row r="{i + 1}"{" ht=\"26\" customHeight=\"1\"" if st == 4 else ""}><c r="A{i + 1}" s="{st}" t="inlineStr"><is><t xml:space="preserve">{escape(t)}</t></is></c></row>' for i, (st, t) in enumerate(self.lines))
        return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="120" customWidth="1"/></cols><sheetData>{rows}</sheetData></worksheet>'

STYLES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
          '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF2F4A3A"/><name val="Calibri"/></font><font><i/><sz val="11"/><color rgb="FF5B6168"/><name val="Calibri"/></font></fonts>'
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F4A3A"/></patternFill></fill></fills>'
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
          '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
          '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>')

def write_book(path, sheets):
    z = zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED)
    n = len(sheets)
    z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + ''.join(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(n)) + '</Types>')
    z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    z.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + ''.join(f'<sheet name="{escape(s.name)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, s in enumerate(sheets)) + '</sheets></workbook>')
    z.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>' for i in range(n)) + f'<Relationship Id="rId{n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    z.writestr('xl/styles.xml', STYLES)
    for i, s in enumerate(sheets): z.writestr(f'xl/worksheets/sheet{i + 1}.xml', s.xml())
    z.close()

# ---------- структура формы (одна для всех) ----------
UNITS = 'г,мл,шт,кг,л,ложка'
MEALS = 'Завтрак,Обед,Ужин,Перекус'
YN = 'Да,Нет'
def instruction(filled_from=None):
    L = [(4, 'Форма для загрузки данных в «Раскладку»'), (2, filled_from or 'Заполните листы «Продукты», «Блюда», «План» и «Параметры». Листы с «Эталон…» и «Пересчёт» нужны только для сверки расчёта и можно не заполнять.'), (2, ''),
         (2, 'КАК ЗАПОЛНЯТЬ'),
         (2, '• Лист «Продукты»: одна строка — один продукт. Ккал, белки, жиры, углеводы — на 100 г. Пустая ячейка значит «не указано»: не ставьте 0, если не знаете.'),
         (2, '• Лист «Блюда»: одна строка — один продукт в блюде. Название блюда повторяется в каждой строке этого блюда. «Кол-во на 1 человека» — на одного человека за один приём. Единицы пишите как есть (г, мл, шт, л): приложение ничего не пересчитывает без вашего разрешения.'),
         (2, '• «Приём пищи» у блюда можно не указывать (его задаёт план). «Условия» — слова через запятую: любой день, днёвка, жара, холод, высота > 3000, первые 2 дня. «Мин» и «Макс» — границы граммов при масштабировании (если пусто — приложение не масштабирует).'),
         (2, '• Лист «План»: что едим в какой день и приём пищи. Если в приёме несколько блюд — по строке на каждое. Название блюда должно совпадать с листом «Блюда» символ в символ.'),
         (2, '• Лист «Параметры»: любые параметры похода (участники, дни, цели). Они только справочные.'),
         (2, '• Колонки «Источник», «ID», «Формула» заполнять не нужно: они сохраняют, откуда взяты данные.'),
         (2, ''), (2, 'ЛИСТЫ'), (2, 'Параметры · Продукты · Блюда · План — данные для загрузки. Эталон_сводка · Эталон_закупка · Эталон_калькуляция — итоги исходного файла (для сверки, в расчётах не используются). Пересчёт_по_блюдам · Пересчёт_итоги · Диагностика — производные данные, получены по видимым рецептам.')]
    return TextSheet('Инструкция', L)

def forms():
    P = Sheet('Продукты', ['Название', 'Категория', 'Ккал на 100 г', 'Белки на 100 г', 'Жиры на 100 г', 'Углеводы на 100 г', 'Базовая ед.', 'Размер упаковки', 'Ед. закупки', 'Цена за упаковку', 'В закупку?', 'Хранение, дней', 'Свежий (да/нет)', 'Теги', 'Примечание', 'ID', 'Источник'],
              [30, 18, 12, 12, 12, 14, 10, 14, 14, 14, 11, 12, 12, 16, 40, 8, 16], dv=[(6, UNITS), (10, YN), (12, YN)])
    B = Sheet('Блюда', ['Блюдо', 'Приём пищи', 'Продукт', 'Кол-во на 1 человека', 'Ед.', 'Мин', 'Макс', 'Условия', 'Варка, мин', 'Описание блюда', 'Примечание к строке', 'ID блюда', 'Источник'],
              [32, 12, 30, 14, 8, 8, 8, 22, 10, 40, 40, 10, 16], dv=[(1, MEALS), (4, UNITS)])
    L = Sheet('План', ['День', 'Приём пищи', 'Блюдо', 'Порций', 'Комментарий', 'ID блюда', 'Источник'], [8, 14, 32, 10, 40, 10, 16], dv=[(1, MEALS)])
    V = Sheet('Параметры', ['Параметр', 'Значение', 'Примечание', 'Формула (как в источнике)', 'Источник'], [34, 34, 60, 40, 16])
    return P, B, L, V

def tohtml(): pass

# ---------- пустая форма ----------
P, B, L, V = forms()
write_book(os.path.join(DIR, 'Форма_для_загрузки_пустая.xlsx'), [instruction(), V, P, B, L])

# ---------- заполненная данными Виктора ----------
P, B, L, V = forms()
SRC = 'Калькулятор Виктор.xlsx'
for r in D['inputs']:
    lab, val, note = r['label'], r['value'], r['note']
    V.add(cv(lab) or S(lab and lab['raw']), cv(val) if val and 'v' in val else (S(val['raw']) if val else None), S(note['raw']) if note else None, S(val['formula']) if val and val.get('formula') else None, S(val['source'] if val else ''))
for p in D['products']:
    g = lambda k: p[k]
    num = lambda k: (('n', g(k)['raw']) if g(k) and 'v' in g(k) else (S(g(k)['raw']) if g(k) else None))
    P.add(S(g('name')['raw']), S(g('category')['raw']) if g('category') else None, num('kcal100'), num('protein100'), num('fat100'), num('carb100'), S(g('base_unit')['raw']) if g('base_unit') else None, num('pack_size'), S(g('unit_purchase')['raw']) if g('unit_purchase') else None, num('price'), S(g('in_purchase')['raw']) if g('in_purchase') else None, None, None, None, S(g('note')['raw']) if g('note') else None, num('id'), S(p['source_row']))
for d in D['dishes']:
    for l in d['lines']:
        q = l['qty']
        B.add(S(d['name']['raw']), None, S(l['product']['raw']), (('n', q['raw']) if q and 'v' in q else (S(q['raw']) if q else None)), S(l['unit']['raw']) if l['unit'] else None, None, None, None, None, S(d['description']['raw']) if d['description'] else None, S(l['note']['raw']) if l['note'] else None, S(d['recipe_id']['raw']), S(f"Рецепты!A{l['row']}:D{l['row']}"))
    if not d['lines']: B.add(S(d['name']['raw']), None, None, None, None, None, None, None, None, S(d['description']['raw']), None, S(d['recipe_id']['raw']), S(f"Рецепты!C{d['header_row']}"))
for r in D['plan']:
    L.add(cv(r['day']), S(r['meal']['raw']) if r['meal'] else None, S(r['dish']['raw']) if r['dish'] else None, cv(r['portions']), S(r['comment']['raw']) if r['comment'] else None, S(r['recipe_id']['raw']) if r['recipe_id'] and r['recipe_id']['raw'] != '' else None, S(f"Меню!A{r['row']}:F{r['row']}"))

ES = Sheet('Эталон_сводка', ['Показатель', 'Значение', 'Формула (как в файле)', 'Источник'], [40, 24, 70, 14], title='Итоги исходного файла (значения, сохранённые Excel). Только для сверки, в расчётах не используются. Внимание: получены по технической таблице рецептов, которая не совпадает с видимыми блоками (см. лист «Диагностика»).')
sm = D['etalon']['summary']
def sget(k): return sm.get(k)
for r in range(4, 16):
    a, b = sget(f'A{r}'), sget(f'B{r}')
    if a: ES.add(S(a['raw']), cv(b) if b and 'v' in b else (S(b['raw']) if b else None), S(b['formula']) if b and b.get('formula') else None, S(f'Сводка!B{r}'))
for r in range(4, 9):
    a, b = sget(f'D{r}'), sget(f'E{r}')
    if a: ES.add(S('Проверка: ' + a['raw']), cv(b) if b and 'v' in b else (S(b['raw']) if b else None), S(b['formula']) if b and b.get('formula') else None, S(f'Сводка!E{r}'))
for r in range(20, 33):
    a, b, c = sget(f'A{r}'), sget(f'B{r}'), sget(f'C{r}')
    if a:
        ES.add(S(f"Категория «{a['raw']}»: купить, кг"), cv(b), S(b['formula']) if b and b.get('formula') else None, S(f'Сводка!B{r}'))
        ES.add(S(f"Категория «{a['raw']}»: стоимость, KZT"), cv(c), S(c['formula']) if c and c.get('formula') else None, S(f'Сводка!C{r}'))
EP = Sheet('Эталон_закупка', ['ID', 'Продукт', 'Базовая ед.', 'Нужно всего', 'Резерв', 'Купить', 'Ед. закупки', 'Размер упаковки', 'Упаковок', 'Цена/уп.', 'Стоимость', 'В закупку?', 'Примечание', 'Источник'], [6, 30, 10, 14, 12, 12, 14, 14, 10, 10, 12, 10, 40, 14], title='Лист «Раскладка» исходного файла (значения). Только для сверки.')
def anyc(c): return None if c is None else (('n', c['raw']) if 'v' in c else S(c['raw']))
for r in D['etalon']['purchase_rows']:
    EP.add(*[anyc(r[k]) for k in ['id', 'product', 'base_unit', 'need', 'reserve', 'buy', 'unit_purchase', 'pack_size', 'packs', 'price', 'cost', 'in_purchase', 'note']], S(f"Раскладка!A{r['row']}:M{r['row']}"))
t = D['etalon']['purchase_total']
EP.add(None, S('ИТОГО'), None, anyc(t['D']), anyc(t['E']), anyc(t['F']), None, None, anyc(t['I']), None, anyc(t['K']), None, None, S('Раскладка!A67:K67'))
EK = Sheet('Эталон_калькуляция', ['День', 'Трапеза', 'Блюдо', 'Рецепт_ID', 'Продукт_ID', 'Продукт', 'Ед.', 'Кол-во/порцию', 'Порций', 'Всего', 'ккал', 'Белок, г', 'Жир, г', 'Угл., г', 'Примечание', 'Источник'], [6, 10, 28, 10, 10, 28, 8, 12, 8, 10, 10, 10, 10, 10, 36, 14], title='Лист «Калькуляция» исходного файла: только строки с продуктом (значения). Только для сверки.')
for r in D['etalon']['calculation_rows']:
    EK.add(*[anyc(r[k]) for k in ['day', 'meal', 'dish', 'recipe_id', 'product_id', 'product', 'unit', 'qty_per_portion', 'portions', 'total', 'kcal', 'protein', 'fat', 'carb', 'note']], S(f"Калькуляция!A{r['row']}:O{r['row']}"))
RC = D['recomputed_from_visible_recipes']
PR = Sheet('Пересчёт_по_блюдам', ['Способ', 'Строка меню', 'День', 'Приём', 'Блюдо', 'Порций', 'ккал (группа)', 'Белки, г', 'Жиры, г', 'Углеводы, г', 'Граммов (только «г»)', 'Не считается'], [18, 10, 6, 10, 28, 8, 12, 10, 10, 12, 14, 70], title='ПРОИЗВОДНЫЕ данные (не из файла Виктора): пересчёт по видимым блокам рецептов и плану. «по формуле Виктора» — количество × порции / 100 × ккал на 100 г для любой единицы; «строго граммы» — считаются только строки в граммах.')
for key, label in (('victor_method', 'по формуле Виктора'), ('strict_grams', 'строго граммы')):
    for r in RC[key]['rows']:
        if 'skipped' in r: PR.add(S(label), N(r['menu_row']), N(r['day']), S(r['meal']), S(r['dish']), None, None, None, None, None, None, S(r['skipped'])); continue
        PR.add(S(label), N(r['menu_row']), N(r['day']), S(r['meal']), S(r['dish']), N(r['portions']), N(r['kcal']), N(r['protein']), N(r['fat']), N(r['carb']), N(r['grams']), S('; '.join(r['not_counted'])))
PI = Sheet('Пересчёт_итоги', ['Способ', 'Показатель', 'Значение'], [22, 50, 16], title='ПРОИЗВОДНЫЕ данные: итоги пересчёта по видимым рецептам.')
for key, label in (('victor_method', 'по формуле Виктора'), ('strict_grams', 'строго граммы')):
    for k, nm in (('kcal', 'ккал на человека в день'), ('protein', 'белки, г на человека в день'), ('fat', 'жиры, г на человека в день'), ('carb', 'углеводы, г на человека в день'), ('grams', 'граммов (только «г») на человека в день')):
        PI.add(S(label), S(nm), N(RC[key]['per_person_per_day'][k]))
    for day, v in RC[key]['by_day_group'].items():
        PI.add(S(label), S(f'День {day}: ккал на всю группу'), N(v['kcal']))
    for item in RC[key]['need_by_product_and_unit']:
        PI.add(S(label), S(f"Нужно на группу: {item['product']} ({item['unit']})"), N(item['total']))
DG = Sheet('Диагностика', ['Рецепт_ID', 'Название', 'Строк в видимом блоке', 'Строк в технической таблице (Рецепты!H:N)', 'Совпадают ли строки'], [12, 36, 18, 28, 16], title='ПРОИЗВОДНЫЕ данные: сравнение видимых блоков рецептов с технической таблицей Рецепты!H:N, по которой считал Виктор (Калькуляция берёт данные из неё).')
for x in D['diagnostics']['tech_table_vs_blocks']:
    DG.add(S(x['recipe_id']), S(x['name']), N(x['lines_in_block']), N(x['lines_in_tech_table']), S('да' if x['tech_table_equals_block'] else 'нет'))

write_book(os.path.join(DIR, 'Виктор_экстракция.xlsx'), [instruction('Данные из файла «Калькулятор Виктор.xlsx», перенесены без изменений: названия символ в символ, числа с полной точностью, пустые ячейки остались пустыми. В колонке «Источник» — лист и ячейки оригинала. Эту форму можно заполнять своими данными так же.'), V, P, B, L, ES, EP, EK, PR, PI, DG])
print('готово: Виктор_экстракция.xlsx, Форма_для_загрузки_пустая.xlsx')
print('строк: продукты', len(P.rows), 'блюда(строк)', len(B.rows), 'план', len(L.rows), 'параметры', len(V.rows))
