import { listExpenses } from '../db.js';
import { CAT_COLORS, PALETTE } from '../data.js';
import { fmtDateInput, fmtMoney, fmtMoneyShort } from '../format.js';
import { escapeHtml } from '../ui/escape.js';
import { icon } from '../ui/icons.js';

const RANGES = [
  { id: 'today', label: 'Сегодня' },
  { id: 'week', label: 'На этой неделе' },
  { id: 'month', label: 'Этот месяц' },
  { id: '3mo', label: 'Последние 3 месяца' },
  { id: 'year', label: 'Этот год' },
  { id: 'all', label: 'За всё время' },
  { id: 'custom', label: 'Свой период' },
];

const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

function rangeBounds(id, customFrom, customTo) {
  const now = new Date();
  const end = now.getTime();
  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  switch (id) {
    case 'today': return [startOfDay(now), end];
    case 'week': {
      const d = new Date(now);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return [d.getTime(), end];
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return [d.getTime(), end];
    }
    case '3mo': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      d.setHours(0, 0, 0, 0);
      return [d.getTime(), end];
    }
    case 'year': return [new Date(now.getFullYear(), 0, 1).getTime(), end];
    case 'all': return [0, end];
    case 'custom': {
      const f = customFrom ? new Date(customFrom + 'T00:00:00').getTime() : 0;
      const t = customTo ? new Date(customTo + 'T23:59:59').getTime() : end;
      return [f, t];
    }
    default: return [0, end];
  }
}

// ─────────────── Aggregators

function aggByCategory(rows) {
  const m = new Map();
  for (const e of rows) m.set(e.category, (m.get(e.category) || 0) + e.price);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: CAT_COLORS[label] || '#6366f1' }));
}

function aggByTime(rows, from, to) {
  if (!rows.length) return [];
  const span = Math.max(1, to - from);
  const days = span / 86400000;
  let bucketMs, fmt;
  if (days <= 1.5) {
    bucketMs = 3600000;
    fmt = (d) => String(d.getHours()).padStart(2, '0');
  } else if (days <= 35) {
    bucketMs = 86400000;
    fmt = (d) => String(d.getDate());
  } else if (days <= 120) {
    bucketMs = 7 * 86400000;
    fmt = (d) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  } else {
    bucketMs = 30 * 86400000;
    fmt = (d) => MONTHS[d.getMonth()];
  }
  const start = Math.floor(from / bucketMs) * bucketMs;
  const bucketCount = Math.max(1, Math.ceil((to - start) / bucketMs));
  const buckets = new Array(bucketCount).fill(0);
  for (const e of rows) {
    const idx = Math.floor((e.createdAt - start) / bucketMs);
    if (idx >= 0 && idx < bucketCount) buckets[idx] += e.price;
  }
  return buckets.map((v, i) => ({ value: v, label: fmt(new Date(start + i * bucketMs)) }));
}

function aggByMonth(rows) {
  const year = new Date().getFullYear();
  const totals = new Array(12).fill(0);
  for (const e of rows) {
    const d = new Date(e.createdAt);
    if (d.getFullYear() !== year) continue;
    totals[d.getMonth()] += e.price;
  }
  return totals.map((value, i) => ({ label: MONTHS[i], value }));
}

function aggTopItems(rows) {
  const m = new Map();
  for (const e of rows) m.set(e.name, (m.get(e.name) || 0) + e.price);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

// ─────────────── Chart renderers (SVG strings)

function doughnutSvg(data, { big = false } = {}) {
  const segments = data.filter((d) => d.value > 0);
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return emptySvg(big);
  const r = 44, rIn = 30, cx = 60, cy = 60;
  const totalTxt = escapeHtml(fmtMoneyShort(total));
  const centerTopSize = big ? 9 : 11;
  const centerBotSize = big ? 11 : 12;
  const centerText = `
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="${centerTopSize}" fill="#94a3b8">всего</text>
    <text x="${cx}" y="${cy + (big ? 11 : 12)}" text-anchor="middle" font-size="${centerBotSize}" font-weight="700" fill="#f1f5f9">${totalTxt}</text>
  `;

  let body;
  if (segments.length === 1) {
    const ringR = (r + rIn) / 2;
    const ringW = r - rIn;
    body = `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${segments[0].color}" stroke-width="${ringW}" />`;
  } else {
    let acc = 0;
    body = segments
      .map((d) => {
        const frac = d.value / total;
        const a0 = acc * Math.PI * 2 - Math.PI / 2;
        acc += frac;
        const a1 = acc * Math.PI * 2 - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        const p = (a, R) => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
        const [x0, y0] = p(a0, r);
        const [x1, y1] = p(a1, r);
        const [ix1, iy1] = p(a1, rIn);
        const [ix0, iy0] = p(a0, rIn);
        const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${rIn} ${rIn} 0 ${large} 0 ${ix0} ${iy0} Z`;
        return `<path d="${path}" fill="${d.color}" />`;
      })
      .join('');
  }

  return `
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet"
         style="width:100%;height:${big ? '100%' : '140px'}">
      ${body}
      ${centerText}
    </svg>
  `;
}

function areaSvg(points, { big = false, gradId }) {
  if (!points.length) return emptySvg(big);
  const W = big ? 720 : 280;
  const H = big ? 320 : 120;
  const pad = big ? { l: 60, r: 20, t: 20, b: 40 } : { l: 28, r: 8, t: 8, b: 18 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const xs = (i) =>
    pad.l +
    (points.length === 1
      ? (W - pad.l - pad.r) / 2
      : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const ys = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p.value)}`).join(' ');
  const area = `${path} L ${xs(points.length - 1)} ${H - pad.b} L ${xs(0)} ${H - pad.b} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const fs = big ? 14 : 9;
  const labelEvery = big
    ? Math.max(1, Math.floor(points.length / 12))
    : Math.max(1, Math.floor(points.length / 4));
  const gid = gradId || (big ? 'areaFillBig' : 'areaFill') + '-' + Math.random().toString(36).slice(2, 7);
  const gridLines = ticks
    .map((t) => {
      const y = ys(t);
      return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="#283056" stroke-dasharray="2 3" />
              <text x="${pad.l - 6}" y="${y + fs / 3}" font-size="${fs}" fill="#94a3b8" text-anchor="end">${escapeHtml(fmtMoneyShort(t))}</text>`;
    })
    .join('');
  const dots = big
    ? points.map((p, i) => `<circle cx="${xs(i)}" cy="${ys(p.value)}" r="3" fill="#6366f1" stroke="#0b1020" stroke-width="1.5" />`).join('')
    : '';
  const xLabels = points
    .map((p, i) =>
      i % labelEvery === 0 || i === points.length - 1
        ? `<text x="${xs(i)}" y="${H - (big ? 14 : 4)}" font-size="${fs}" fill="#94a3b8" text-anchor="middle">${escapeHtml(p.label)}</text>`
        : '',
    )
    .join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
         style="width:100%;height:${big ? '100%' : '140px'}">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${area}" fill="url(#${gid})" />
      <path d="${path}" fill="none" stroke="#6366f1" stroke-width="${big ? 3 : 2}" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${xLabels}
    </svg>
  `;
}

function barSvg(bars, { big = false } = {}) {
  if (!bars.length) return emptySvg(big);
  const W = big ? 720 : 280;
  const H = big ? 320 : 120;
  const pad = big ? { l: 60, r: 20, t: 20, b: 40 } : { l: 28, r: 8, t: 8, b: 18 };
  const max = Math.max(1, ...bars.map((b) => b.value));
  const bw = (W - pad.l - pad.r) / bars.length;
  const barW = bw * 0.68;
  const ys = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const fs = big ? 14 : 9;
  const gridLines = ticks
    .map((t) => {
      const y = ys(t);
      return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="#283056" stroke-dasharray="2 3" />
              <text x="${pad.l - 6}" y="${y + fs / 3}" font-size="${fs}" fill="#94a3b8" text-anchor="end">${escapeHtml(fmtMoneyShort(t))}</text>`;
    })
    .join('');
  const rects = bars
    .map((b, i) => {
      const x = pad.l + i * bw + (bw - barW) / 2;
      const y = ys(b.value);
      const h = H - pad.b - y;
      const color = PALETTE[i % PALETTE.length];
      const valueLabel = big
        ? `<text x="${x + barW / 2}" y="${y - 6}" font-size="${fs}" fill="#cbd5e1" text-anchor="middle" font-weight="600">${escapeHtml(fmtMoneyShort(b.value))}</text>`
        : '';
      const xLabel = `<text x="${x + barW / 2}" y="${H - (big ? 14 : 4)}" font-size="${fs}" fill="#94a3b8" text-anchor="middle">${escapeHtml(b.label)}</text>`;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="${big ? 6 : 3}" fill="${color}" />${valueLabel}${xLabel}`;
    })
    .join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
         style="width:100%;height:${big ? '100%' : '140px'}">
      ${gridLines}
      ${rects}
    </svg>
  `;
}

function hbarHtml(rows, { big = false, limit } = {}) {
  if (!rows.length) {
    return `<div class="chart-empty">Нет данных за период</div>`;
  }
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(1, ...shown.map((r) => r.value));
  const items = shown
    .map((r, i) => {
      const pct = (r.value / max) * 100;
      const color = PALETTE[i % PALETTE.length];
      const value = big ? fmtMoney(r.value) : fmtMoneyShort(r.value);
      return `
        <div class="hbar-row">
          <div class="hbar-meta">
            <span class="label">${escapeHtml(r.label)}</span>
            <span class="value">${escapeHtml(value)}</span>
          </div>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
      `;
    })
    .join('');
  return `<div class="hbar-list ${big ? 'fs-hbar' : ''}">${items}</div>`;
}

function emptySvg(big) {
  return `<div class="chart-empty" style="${big ? 'height:100%' : ''}">Нет данных за период</div>`;
}

function doughnutLegendHtml(data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '';
  return `
    <div class="legend-grid">
      ${data
        .map(
          (d) => `
        <div class="legend-item">
          <span class="swatch" style="background:${d.color}"></span>
          <span class="legend-label">${escapeHtml(d.label)}</span>
          <span class="legend-pct">${Math.round((d.value / total) * 100)}%</span>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

function doughnutLegendPreviewHtml(data) {
  if (!data.length) return '';
  const items = data
    .slice(0, 6)
    .map(
      (d) => `
    <div class="chart-legend-item">
      <span class="chart-legend-swatch" style="background:${d.color}"></span>
      <span class="chart-legend-label">${escapeHtml(d.label)}</span>
    </div>
  `,
    )
    .join('');
  return `<div class="chart-legend">${items}</div>`;
}

// ─────────────── Fullscreen overlay

function openFullscreen({ id, title, subtitle, data }) {
  const existing = document.querySelector('.fs-overlay');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'fs-overlay';
  const portrait = window.innerHeight >= window.innerWidth;
  const panelClass = portrait ? 'fs-panel is-rotated' : 'fs-panel is-flat';
  const panelStyle = portrait
    ? `width:${window.innerHeight}px;height:${window.innerWidth}px;`
    : '';
  let body = '';
  if (id === 'cat') {
    body = `
      <div class="fs-doughnut">
        ${doughnutSvg(data, { big: true })}
        <div class="legend">${doughnutLegendHtml(data)}</div>
      </div>
    `;
  } else if (id === 'time') {
    body = areaSvg(data, { big: true });
  } else if (id === 'month') {
    body = barSvg(data, { big: true });
  } else if (id === 'top') {
    body = hbarHtml(data, { big: true });
  }

  overlay.innerHTML = `
    <div class="${panelClass}" style="${panelStyle}">
      <div class="fs-header">
        <div>
          <div class="fs-subtitle">${escapeHtml(subtitle)}</div>
          <div class="fs-title">${escapeHtml(title)}</div>
        </div>
        <button type="button" class="fs-close" aria-label="Закрыть">${icon('x', { size: 20 })}</button>
      </div>
      <div class="fs-body">${body}</div>
      <div class="fs-hint">Нажмите × или на фон, чтобы вернуться</div>
    </div>
    <button type="button" class="fs-backdrop" aria-label="Закрыть"></button>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  overlay.querySelector('.fs-close').addEventListener('click', close);
  overlay.querySelector('.fs-backdrop').addEventListener('click', close);
}

// ─────────────── Render

export function renderAnalytics(root) {
  root.innerHTML = `
    <div class="stack">
      <section class="card">
        <div class="field-label">Период</div>
        <div id="a-pills" class="range-pills"></div>
        <div id="a-custom" class="range-custom" hidden>
          <div class="field">
            <span class="field-label">С</span>
            <input id="a-from" class="field-input is-compact" type="date" />
          </div>
          <div class="field">
            <span class="field-label">По</span>
            <input id="a-to" class="field-input is-compact" type="date" />
          </div>
        </div>
        <div class="range-summary">
          <div class="count"><strong id="a-count">0</strong> записей</div>
          <div class="total" id="a-total">0 ₸</div>
        </div>
      </section>

      <div class="chart-grid">
        <button type="button" class="chart-card" data-chart="cat">
          <div class="chart-head">
            <div class="chart-title">По категориям</div>
            <span class="chart-expand">${icon('expand', { size: 11, strokeWidth: 2.2 })}</span>
          </div>
          <div class="chart-body" id="ch-cat"></div>
          <div id="ch-cat-legend"></div>
        </button>
        <button type="button" class="chart-card" data-chart="time">
          <div class="chart-head">
            <div class="chart-title">По времени</div>
            <span class="chart-expand">${icon('expand', { size: 11, strokeWidth: 2.2 })}</span>
          </div>
          <div class="chart-body" id="ch-time"></div>
        </button>
        <button type="button" class="chart-card" data-chart="month">
          <div class="chart-head">
            <div class="chart-title">По месяцам</div>
            <span class="chart-expand">${icon('expand', { size: 11, strokeWidth: 2.2 })}</span>
          </div>
          <div class="chart-body" id="ch-month"></div>
        </button>
        <button type="button" class="chart-card" data-chart="top">
          <div class="chart-head">
            <div class="chart-title">Топ позиций</div>
            <span class="chart-expand">${icon('expand', { size: 11, strokeWidth: 2.2 })}</span>
          </div>
          <div class="chart-body" id="ch-top"></div>
        </button>
      </div>
    </div>
  `;

  const pillsEl = root.querySelector('#a-pills');
  const customEl = root.querySelector('#a-custom');
  const fromEl = root.querySelector('#a-from');
  const toEl = root.querySelector('#a-to');
  const countEl = root.querySelector('#a-count');
  const totalEl = root.querySelector('#a-total');
  const chartGrid = root.querySelector('.chart-grid');

  let range = 'month';
  fromEl.value = fmtDateInput(Date.now() - 30 * 86400000);
  toEl.value = fmtDateInput(Date.now());

  function renderPills() {
    pillsEl.innerHTML = RANGES.map(
      (r) =>
        `<button type="button" class="range-pill${r.id === range ? ' is-active' : ''}" data-range="${r.id}">${escapeHtml(r.label)}</button>`,
    ).join('');
  }

  async function refresh() {
    renderPills();
    customEl.hidden = range !== 'custom';
    const [lo, hi] = rangeBounds(range, fromEl.value, toEl.value);
    const [filtered, all] = await Promise.all([
      listExpenses({ from: lo, to: hi }),
      listExpenses(),
    ]);
    const total = filtered.reduce((s, r) => s + r.price, 0);
    countEl.textContent = filtered.length.toLocaleString('ru-RU');
    totalEl.textContent = fmtMoney(total);

    const byCat = aggByCategory(filtered);
    const byTime = aggByTime(filtered, lo, hi);
    const byMonth = aggByMonth(all);
    const topItems = aggTopItems(filtered);

    root.querySelector('#ch-cat').innerHTML = doughnutSvg(byCat);
    root.querySelector('#ch-cat-legend').innerHTML = doughnutLegendPreviewHtml(byCat);
    root.querySelector('#ch-time').innerHTML = areaSvg(byTime, { gradId: 'area-small' });
    root.querySelector('#ch-month').innerHTML = barSvg(byMonth);
    root.querySelector('#ch-top').innerHTML = hbarHtml(topItems, { limit: 6 });

    chartGrid.dataset.cat = JSON.stringify(byCat);
    chartGrid.dataset.time = JSON.stringify(byTime);
    chartGrid.dataset.month = JSON.stringify(byMonth);
    chartGrid.dataset.top = JSON.stringify(topItems);
  }

  pillsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    range = btn.dataset.range;
    refresh();
  });

  fromEl.addEventListener('change', refresh);
  fromEl.addEventListener('input', refresh);
  toEl.addEventListener('change', refresh);
  toEl.addEventListener('input', refresh);

  chartGrid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-chart]');
    if (!card) return;
    const id = card.dataset.chart;
    const rangeLabel = RANGES.find((r) => r.id === range)?.label || '';
    const titles = {
      cat: 'По категориям',
      time: 'По времени',
      month: 'По месяцам',
      top: 'Топ позиций',
    };
    const data = JSON.parse(chartGrid.dataset[id] || '[]');
    openFullscreen({ id, title: titles[id], subtitle: rangeLabel, data });
  });

  refresh();

  return () => {
    document.querySelector('.fs-overlay')?.remove();
  };
}
