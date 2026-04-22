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
import { formatCurrency, monthKey, dayKey } from '../format.js';

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

function rangeFor(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'month') return { from: new Date(y, m, 1).getTime(), to: Date.now() };
  if (preset === '3m') return { from: new Date(y, m - 2, 1).getTime(), to: Date.now() };
  if (preset === 'year') return { from: new Date(y, 0, 1).getTime(), to: Date.now() };
  return {};
}

export function renderAnalytics(root) {
  root.innerHTML = `
    <section class="card">
      <div class="row">
        <h2>Analytics</h2>
        <select id="a-range" class="filter">
          <option value="month">This month</option>
          <option value="3m" selected>Last 3 months</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
        </select>
      </div>
      <div id="a-total" class="total"></div>
      <div class="chart-grid">
        <div class="chart-card">
          <h3>By category</h3>
          <div class="chart-wrap"><canvas id="c-category"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Over time</h3>
          <div class="chart-wrap"><canvas id="c-time"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Monthly totals</h3>
          <div class="chart-wrap"><canvas id="c-month"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Top items</h3>
          <div class="chart-wrap"><canvas id="c-top"></canvas></div>
        </div>
      </div>
      <p id="a-empty" class="empty" hidden>No data in this range yet.</p>
    </section>
  `;

  const rangeEl = root.querySelector('#a-range');
  const emptyEl = root.querySelector('#a-empty');
  const totalEl = root.querySelector('#a-total');
  const charts = {};

  async function refresh() {
    const rows = await listExpenses(rangeFor(rangeEl.value));
    const hasData = rows.length > 0;
    emptyEl.hidden = hasData;
    root.querySelector('.chart-grid').style.display = hasData ? '' : 'none';
    const total = rows.reduce((s, r) => s + r.price, 0);
    totalEl.textContent = hasData
      ? `${rows.length} entries · ${formatCurrency(total)} total`
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
    const useMonth = spanMs > 1000 * 60 * 60 * 24 * 90;
    const buckets = new Map();
    for (const r of sorted) {
      const k = useMonth ? monthKey(r.createdAt) : dayKey(r.createdAt);
      buckets.set(k, (buckets.get(k) || 0) + r.price);
    }
    const labels = [...buckets.keys()];
    const data = labels.map((k) => Number(buckets.get(k).toFixed(2)));
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
      const k = monthKey(r.createdAt);
      totals.set(k, (totals.get(k) || 0) + r.price);
    }
    const labels = [...totals.keys()].sort();
    const data = labels.map((k) => Number(totals.get(k).toFixed(2)));
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

  rangeEl.addEventListener('change', refresh);
  refresh();

  return () => {
    Object.values(charts).forEach((c) => c.destroy());
  };
}
