const currencyFmt = new Intl.NumberFormat('ru-KZ', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const pluralRecord = new Intl.PluralRules('ru-RU');

const dayChartFmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const monthChartFmt = new Intl.DateTimeFormat('ru-RU', {
  month: '2-digit',
  year: 'numeric',
});

export const formatCurrency = (n) => currencyFmt.format(Number(n) || 0);
export const formatDate = (t) => dateFmt.format(new Date(t));
export const formatDateTime = (t) => dateTimeFmt.format(new Date(t));
export const formatDayChart = (t) => dayChartFmt.format(new Date(t));
export const formatMonthChart = (t) => monthChartFmt.format(new Date(t));

export function recordsLabel(n) {
  const r = pluralRecord.select(n);
  return r === 'one' ? 'запись' : r === 'few' ? 'записи' : 'записей';
}

export function monthKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
