const NBSP = ' ';
const SHORT_MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const CHART_MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

export function fmtMoney(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('ru-RU').replace(/\s/g, NBSP) + NBSP + '₸';
}

export function fmtMoneyShort(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1000) {
    const digits = v >= 10000 ? 0 : 1;
    return (v / 1000).toFixed(digits).replace('.', ',') + 'к';
  }
  return String(v);
}

export function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `Сегодня · ${hh}:${mm}`;
  if (isYest) return `Вчера · ${hh}:${mm}`;
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

export function fmtDateInput(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function chartMonthLabel(monthIndex) {
  return CHART_MONTHS[monthIndex];
}
