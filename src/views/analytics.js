import {
  Chart,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  BarController,
  LineController,
} from 'chart.js';
import { listExpenses } from '../db.js';
import {
  formatCurrency,
  recordsLabel,
  formatDayChart,
  formatMonthChart,
} from '../format.js';

Chart.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  BarController,
  LineController,
);

const PALETTE = [
  '#6366f1', '#22d3ee', '#f472b6', '#f59e0b', '#34d399',
  '#a78bfa', '#fb7185', '#60a5fa', '#f87171', '#4ade80',
];

const DAY_MS = 86_400_000;

function startOfDay(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function startOfMonth(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function toIsoDate(t) {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function rangeFor(preset, fromISO, toISO) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (preset === 'today') {
    const lo = new Date(y, m, d).getTime();
    return { from: lo, to: lo + DAY_MS - 1 };
  }
  if (preset === 'week') {
    const daysToMonday = (now.getDay() + 6) % 7;
    const monday = new Date(y, m, d - daysToMonday);
    const sundayEnd = new Date(monday);
    sundayEnd.setDate(sundayEnd.getDate() + 6);
    sundayEnd.setHours(23, 59, 59, 999);
    return { from: monday.getTime(), to: sundayEnd.getTime() };
  }
  if (preset === 'month') return { from: new Date(y, m, 1).getTime(), to: Date.now() };
  if (preset === '3m') return { from: new Date(y, m - 2, 1).getTime(), to: Date.now() };
  if (preset === 'year') return { from: new Date(y, 0, 1).getTime(), to: Date.now() };
  if (preset === 'custom') {
    const from = fromISO ? new Date(fromISO + 'T00:00:00').getTime() : undefined;
    const to = toISO ? new Date(toISO + 'T23:59:59.999').getTime() : undefined;
    return { from, to };
  }
  return {};
}

export function renderAnalytics(root) {
  root.innerHTML = `
    <section class="card">
      <div class="row">
        <h2>Аналитика</h2>
        <select id="a-range" class="filter">
          <option value="today">Сегодня</option>
          <option value="week">На этой неделе</option>
          <option value="month">Этот месяц</option>
          <option value="3m" selected>Последние 3 месяца</option>
          <option value="year">Этот год</option>
          <option value="all">За всё время</option>
          <option value="custom">Свой период</option>
        </select>
      </div>
      <div id="a-custom" class="custom-range" hidden>
        <label>С <input id="a-from" type="date" /></label>
        <label>По <input id="a-to" type="date" /></label>
      </div>
      <div id="a-total" class="total"></div>
      <div class="chart-grid">
        <div class="chart-card">
          <h3>По категориям</h3>
          <div class="chart-wrap"><canvas id="c-category"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>По времени</h3>
          <div class="chart-wrap"><canvas id="c-time"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>По месяцам</h3>
          <div class="chart-wrap"><canvas id="c-month"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Топ позиций</h3>
          <div class="chart-wrap"><canvas id="c-top"></canvas></div>
        </div>
      </div>
      <p id="a-empty" class="empty" hidden>Нет данных за выбранный период.</p>
    </section>
  `;

  const rangeEl = root.querySelector('#a-range');
  const customEl = root.querySelector('#a-custom');
  const fromEl = root.querySelector('#a-from');
  const toEl = root.querySelector('#a-to');
  const emptyEl = root.querySelector('#a-empty');
  const totalEl = root.querySelector('#a-total');
  const charts = {};

  async function refresh() {
    const isCustom = rangeEl.value === 'custom';
    customEl.hidden = !isCustom;
    const rows = await listExpenses(
      rangeFor(rangeEl.value, fromEl.value, toEl.value),
    );
    const hasData = rows.length > 0;
    emptyEl.hidden = hasData;
    root.querySelector('.chart-grid').style.display = hasData ? '' : 'none';
    const total = rows.reduce((s, r) => s + r.price, 0);
    totalEl.textContent = hasData
      ? `${rows.length} ${recordsLabel(rows.length)} · всего ${formatCurrency(total)}`
      : '';
    if (!hasData) {
      Object.values(charts).forEach((c) => c.destroy());
      for (const k of Object.keys(charts)) delete charts[k];
      return;
    }
    drawCategory(rows);
    drawTime(rows);
    drawMonthly(rows);
    drawTop(rows);
  }

  function upsert(key, ctxId, config) {
    if (charts[key]) {
      charts[key].data = config.data;
      charts[key].options = config.options;
      charts[key].update();
      return;
    }
    charts[key] = new Chart(root.querySelector('#' + ctxId), config);
  }

  function drawCategory(rows) {
    const totals = new Map();
    for (const r of rows) totals.set(r.category, (totals.get(r.category) || 0) + r.price);
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    upsert('cat', 'c-category', {
      type: 'doughnut',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [
          {
            data: entries.map((e) => Number(e[1].toFixed(2))),
            backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#cbd5e1' } },
          tooltip: {
            callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.parsed)}` },
          },
        },
      },
    });
  }

  function drawTime(rows) {
    const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt);
    const spanMs = sorted[sorted.length - 1].createdAt - sorted[0].createdAt;
    const useMonth = spanMs > DAY_MS * 90;
    const buckets = new Map();
    for (const r of sorted) {
      const key = useMonth ? startOfMonth(r.createdAt) : startOfDay(r.createdAt);
      buckets.set(key, (buckets.get(key) || 0) + r.price);
    }
    const keys = [...buckets.keys()].sort((a, b) => a - b);
    const labels = keys.map((k) => (useMonth ? formatMonthChart(k) : formatDayChart(k)));
    const data = keys.map((k) => Number(buckets.get(k).toFixed(2)));
    upsert('time', 'c-time', {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => formatCurrency(c.parsed.y) } },
        },
        scales: {
          x: { ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true } },
          y: { ticks: { color: '#94a3b8', callback: (v) => formatCurrency(v) } },
        },
      },
    });
  }

  function drawMonthly(rows) {
    const totals = new Map();
    for (const r of rows) {
      const key = startOfMonth(r.createdAt);
      totals.set(key, (totals.get(key) || 0) + r.price);
    }
    const keys = [...totals.keys()].sort((a, b) => a - b);
    const labels = keys.map((k) => formatMonthChart(k));
    const data = keys.map((k) => Number(totals.get(k).toFixed(2)));
    upsert('month', 'c-month', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => formatCurrency(c.parsed.y) } },
        },
        scales: {
          x: { ticks: { color: '#94a3b8' } },
          y: { ticks: { color: '#94a3b8', callback: (v) => formatCurrency(v) } },
        },
      },
    });
  }

  function drawTop(rows) {
    const totals = new Map();
    for (const r of rows) {
      const key = r.name;
      totals.set(key, (totals.get(key) || 0) + r.price);
    }
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    upsert('top', 'c-top', {
      type: 'bar',
      data: {
        labels: top.map((e) => e[0]),
        datasets: [
          {
            data: top.map((e) => Number(e[1].toFixed(2))),
            backgroundColor: top.map((_, i) => PALETTE[i % PALETTE.length]),
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => formatCurrency(c.parsed.x) } },
        },
        scales: {
          x: { ticks: { color: '#94a3b8', callback: (v) => formatCurrency(v) } },
          y: { ticks: { color: '#94a3b8' } },
        },
      },
    });
  }

  rangeEl.addEventListener('change', () => {
    if (rangeEl.value === 'custom' && !fromEl.value && !toEl.value) {
      const now = new Date();
      fromEl.value = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
      toEl.value = toIsoDate(now);
    }
    refresh();
  });
  fromEl.addEventListener('change', refresh);
  fromEl.addEventListener('input', refresh);
  toEl.addEventListener('change', refresh);
  toEl.addEventListener('input', refresh);
  refresh();

  return () => {
    Object.values(charts).forEach((c) => c.destroy());
  };
}
