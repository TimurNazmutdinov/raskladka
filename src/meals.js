// Приёмы пищи в дне: список «слотов» {id, type b|l|d|s, name?, share %}. По умолчанию: завтрак, перекус, обед, перекус, ужин.
// Меню хранит приём по id слота; тип слота определяет, какие блюда ему подходят (dish.meal).
export const TYPE_NAMES = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
export const TYPES = Object.entries(TYPE_NAMES);

// P — параметры; доли по умолчанию берутся из split_b / split_s / split_l / split_d (25/10/25/10/30)
export const defaultMeals = P => [
  { id: 'b', type: 'b', share: P?.split_b ?? 25 }, { id: 's', type: 's', share: P?.split_s ?? 10 }, { id: 'l', type: 'l', share: P?.split_l ?? 25 },
  { id: 's2', type: 's', share: P?.split_s ?? 10 }, { id: 'd', type: 'd', share: P?.split_d ?? 30 },
];
export const mealsOf = (trip, P) => (trip?.meals?.length ? trip.meals : defaultMeals(P));
export const shareSum = slots => slots.reduce((a, s) => a + (+s.share || 0), 0);

// Подпись приёма: своё имя или название типа; одинаковые типы нумеруются («Перекус 1», «Перекус 2»)
export function slotLabel(slots, id) {
  const k = slots.findIndex(s => s.id === id); if (k < 0) return TYPE_NAMES[id] || id;
  const s = slots[k]; if (s.name) return s.name;
  const same = slots.filter(x => x.type === s.type && !x.name);
  return same.length > 1 ? `${TYPE_NAMES[s.type]} ${same.indexOf(s) + 1}` : TYPE_NAMES[s.type];
}
export const slotById = (slots, id) => slots.find(s => s.id === id);
export const newSlotId = slots => { let k = 1; while (slots.some(s => s.id === 'x' + k)) k++; return 'x' + k; };
// Слот для строки плана/загрузки: первый слот нужного типа
export const firstSlotOfType = (slots, type) => slots.find(s => s.type === type)?.id ?? null;

// Редактирование списка (чистые функции, возвращают новый список)
export const moveSlot = (slots, i, d) => { const j = i + d; if (j < 0 || j >= slots.length) return slots; const a = slots.slice(); [a[i], a[j]] = [a[j], a[i]]; return a; };
export const removeSlot = (slots, i) => (slots.length > 1 ? slots.filter((_, k) => k !== i) : slots);
export const addSlot = (slots, type = 's', share = 10) => [...slots, { id: newSlotId(slots), type, share }];
