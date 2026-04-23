// Аналитика — time range + 4 charts (hand-drawn SVG) with tap-to-fullscreen.

const RANGES = [
  { id: 'today',   label: 'Сегодня' },
  { id: 'week',    label: 'На этой неделе' },
  { id: 'month',   label: 'Этот месяц' },
  { id: '3mo',     label: 'Последние 3 месяца' },
  { id: 'year',    label: 'Этот год' },
  { id: 'all',     label: 'За всё время' },
  { id: 'custom',  label: 'Свой период' },
];

function rangeBounds(id, customFrom, customTo) {
  const now = new Date();
  const end = now.getTime();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); };
  switch (id) {
    case 'today':  return [startOfDay(now), end];
    case 'week': {
      const d = new Date(now);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day); d.setHours(0,0,0,0);
      return [d.getTime(), end];
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return [d.getTime(), end];
    }
    case '3mo': {
      const d = new Date(now); d.setMonth(d.getMonth() - 3); d.setHours(0,0,0,0);
      return [d.getTime(), end];
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1);
      return [d.getTime(), end];
    }
    case 'all': return [0, end];
    case 'custom': {
      const f = customFrom ? new Date(customFrom + 'T00:00:00').getTime() : 0;
      const t = customTo ? new Date(customTo + 'T23:59:59').getTime() : end;
      return [f, t];
    }
    default: return [0, end];
  }
}

// ─────────────── Doughnut (responsive via viewBox)
function Doughnut({ data, big = false }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 44, rIn = 30, cx = 60, cy = 60;
  if (total === 0) return <EmptyChart big={big} />;
  let acc = 0;
  const segs = data.map((d) => {
    const frac = d.value / total;
    const a0 = acc * Math.PI * 2 - Math.PI / 2;
    acc += frac;
    const a1 = acc * Math.PI * 2 - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (a, R) => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r);
    const [ix1, iy1] = p(a1, rIn), [ix0, iy0] = p(a0, rIn);
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${rIn} ${rIn} 0 ${large} 0 ${ix0} ${iy0} Z`;
    return { path, color: d.color, frac, label: d.label, value: d.value };
  });
  if (big) {
    // Landscape: big donut on left, full legend on right
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', gap: 32 }}>
        <svg viewBox="0 0 120 120" style={{ height: '94%', flexShrink: 0 }}>
          {segs.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="#94a3b8">всего</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f1f5f9">
            {fmtMoneyShort(total)}
          </text>
        </svg>
        <div className="nosb" style={{
          flex: 1, minWidth: 0,
          height: '100%',
          overflowY: 'auto',
          paddingRight: 8,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 20px',
          }}>
            {segs.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: '#e2e8f0', minWidth: 0 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                <span style={{ color: '#94a3b8', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.frac * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <svg viewBox="0 0 120 120" style={{ width: '100%', height: 140 }}>
        {segs.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fill="#94a3b8">всего</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f1f5f9">
          {fmtMoneyShort(total)}
        </text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {segs.slice(0, 6).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#cbd5e1' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
            <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────── Line (filled area)
function AreaChart({ points, big = false }) {
  if (!points.length) return <EmptyChart big={big} />;
  const W = big ? 720 : 280, H = big ? 320 : 120;
  const pad = big ? { l: 60, r: 20, t: 20, b: 40 } : { l: 28, r: 8, t: 8, b: 18 };
  const max = Math.max(1, ...points.map(p => p.value));
  const xs = (i) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : i * (W - pad.l - pad.r) / (points.length - 1));
  const ys = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + xs(i) + ' ' + ys(p.value)).join(' ');
  const area = `${path} L ${xs(points.length - 1)} ${H - pad.b} L ${xs(0)} ${H - pad.b} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
  const fs = big ? 14 : 9;
  const labelEvery = big ? Math.max(1, Math.floor(points.length / 12)) : Math.max(1, Math.floor(points.length / 4));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: big ? '100%' : 140 }}>
      <defs>
        <linearGradient id={big ? "areaFillBig" : "areaFill"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => {
        const y = ys(t);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#283056" strokeDasharray="2 3" />
            <text x={pad.l - 6} y={y + fs/3} fontSize={fs} fill="#94a3b8" textAnchor="end">{fmtMoneyShort(t)}</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${big ? "areaFillBig" : "areaFill"})`} />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth={big ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {big && points.map((p, i) => (
        <circle key={i} cx={xs(i)} cy={ys(p.value)} r={3} fill="#6366f1" stroke="#0b1020" strokeWidth="1.5" />
      ))}
      {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) && (
        <text key={i} x={xs(i)} y={H - (big ? 14 : 4)} fontSize={fs} fill="#94a3b8" textAnchor="middle">{p.label}</text>
      ))}
    </svg>
  );
}

// ─────────────── Bar
function BarChart({ bars, big = false }) {
  if (!bars.length) return <EmptyChart big={big} />;
  const W = big ? 720 : 280, H = big ? 320 : 120;
  const pad = big ? { l: 60, r: 20, t: 20, b: 40 } : { l: 28, r: 8, t: 8, b: 18 };
  const max = Math.max(1, ...bars.map(b => b.value));
  const bw = (W - pad.l - pad.r) / bars.length;
  const barW = bw * 0.68;
  const ys = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
  const fs = big ? 14 : 9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: big ? '100%' : 140 }}>
      {ticks.map((t, i) => {
        const y = ys(t);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#283056" strokeDasharray="2 3" />
            <text x={pad.l - 6} y={y + fs/3} fontSize={fs} fill="#94a3b8" textAnchor="end">{fmtMoneyShort(t)}</text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const x = pad.l + i * bw + (bw - barW) / 2;
        const y = ys(b.value);
        const h = H - pad.b - y;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={big ? 6 : 3} fill={PALETTE[i % PALETTE.length]} />
            {big && (
              <text x={x + barW / 2} y={y - 6} fontSize={fs} fill="#cbd5e1" textAnchor="middle" fontWeight="600">
                {fmtMoneyShort(b.value)}
              </text>
            )}
            <text x={x + barW / 2} y={H - (big ? 14 : 4)} fontSize={fs} fill="#94a3b8" textAnchor="middle">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────── Horizontal bar
function HBarChart({ rows, big = false }) {
  if (!rows.length) return <EmptyChart big={big} />;
  const max = Math.max(1, ...rows.map(r => r.value));
  const fs = big ? 15 : 10.5;
  const barH = big ? 18 : 6;
  return (
    <div className="nosb" style={{
      display: 'flex', flexDirection: 'column',
      gap: big ? 16 : 6,
      width: '100%', height: '100%',
      overflowY: big ? 'auto' : 'visible',
      padding: big ? '4px 20px 4px 4px' : 0,
      boxSizing: 'border-box',
    }}>
      {rows.map((r, i) => (
        <div key={i} style={{ flexShrink: 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: fs, color: '#cbd5e1', marginBottom: big ? 6 : 3,
          }}>
            <span style={{ maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>
              {big ? fmtMoney(r.value) : fmtMoneyShort(r.value)}
            </span>
          </div>
          <div style={{ height: barH, background: '#0b1020', borderRadius: barH/2, overflow: 'hidden' }}>
            <div style={{
              width: (r.value / max * 100) + '%',
              height: '100%',
              background: PALETTE[i % PALETTE.length],
              borderRadius: barH/2,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const EmptyChart = ({ big }) => (
  <div style={{
    height: big ? '100%' : 140, width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#64748b', fontSize: big ? 18 : 12,
  }}>Нет данных за период</div>
);

// ─────────────── Aggregators
function aggByCategory(entries) {
  const m = new Map();
  for (const e of entries) m.set(e.category, (m.get(e.category) || 0) + e.price);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: CAT_COLORS[label] || '#6366f1' }));
}

function aggByTime(entries, from, to) {
  if (!entries.length) return [];
  const span = to - from;
  const days = span / 86400000;
  let bucketMs, fmt;
  if (days <= 1.5) { bucketMs = 3600000; fmt = (d) => String(d.getHours()).padStart(2,'0'); }
  else if (days <= 35) { bucketMs = 86400000; fmt = (d) => String(d.getDate()); }
  else if (days <= 120) { bucketMs = 7 * 86400000; fmt = (d) => String(d.getDate()) + '.' + String(d.getMonth()+1).padStart(2,'0'); }
  else { bucketMs = 30 * 86400000; fmt = (d) => ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]; }
  const start = Math.floor(from / bucketMs) * bucketMs;
  const bucketCount = Math.max(1, Math.ceil((to - start) / bucketMs));
  const buckets = new Array(bucketCount).fill(0);
  for (const e of entries) {
    const idx = Math.floor((e.ts - start) / bucketMs);
    if (idx >= 0 && idx < bucketCount) buckets[idx] += e.price;
  }
  return buckets.map((v, i) => ({ value: v, label: fmt(new Date(start + i * bucketMs)) }));
}

function aggByMonth(entries) {
  const m = new Map();
  for (const e of entries) {
    const d = new Date(e.ts);
    const k = d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0');
    m.set(k, (m.get(k) || 0) + e.price);
  }
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([k, v]) => {
      const [, mm] = k.split('-');
      return { label: months[parseInt(mm, 10)], value: v };
    });
}

function aggTopItems(entries) {
  const m = new Map();
  for (const e of entries) m.set(e.name, (m.get(e.name) || 0) + e.price);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

// ─────────────── Render one chart given its id (used by both small + big)
function renderChart(id, data, big) {
  switch (id) {
    case 'cat':   return <Doughnut data={data} big={big} />;
    case 'time':  return <AreaChart points={data} big={big} />;
    case 'month': return <BarChart bars={data} big={big} />;
    case 'top':   return <HBarChart rows={data} big={big} />;
  }
  return null;
}

// ─────────────── Fullscreen rotated chart overlay
function FullscreenChart({ chart, onClose }) {
  if (!chart) return null;
  // Screen area inside the device frame: ~356 x 744 (below the status bar).
  // We rotate the inner panel 90° clockwise so the rotated width = screen height, rotated height = screen width.
  const SCREEN_W = 356;
  const SCREEN_H = 744;
  const ROT_W = SCREEN_H;   // becomes on-screen width after rotation
  const ROT_H = SCREEN_W;   // becomes on-screen height after rotation

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: '#0b1020',
      animation: 'fadeIn 180ms ease',
    }}>
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: ROT_W, height: ROT_H,
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
        background: '#0b1020',
        display: 'flex', flexDirection: 'column',
        padding: '20px 28px',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              {chart.subtitle}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
              {chart.title}
            </div>
          </div>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 40, height: 40, borderRadius: 999,
            background: '#141a2e', border: '1px solid #283056',
            color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Icon name="x" size={20} />
          </button>
        </div>
        {/* Chart area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {renderChart(chart.id, chart.data, true)}
        </div>
        <div style={{
          textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 8,
        }}>
          Нажмите × или на фон, чтобы вернуться
        </div>
      </div>
      {/* tap-outside */}
      <button onClick={onClose} aria-label="Закрыть" style={{
        position: 'absolute', inset: 0,
        background: 'transparent', border: 'none',
        cursor: 'pointer', zIndex: -1,
      }} />
    </div>
  );
}

// ─────────────── Tab
function AnalyticsTab({ entries, openFullscreen }) {
  const [range, setRange] = React.useState('month');
  const [from, setFrom] = React.useState(fmtDateInput(Date.now() - 30 * 86400000));
  const [to, setTo] = React.useState(fmtDateInput(Date.now()));

  const [lo, hi] = rangeBounds(range, from, to);
  const filtered = React.useMemo(
    () => entries.filter(e => e.ts >= lo && e.ts <= hi),
    [entries, lo, hi]
  );
  const total = filtered.reduce((s, e) => s + e.price, 0);
  const rangeLabel = RANGES.find(r => r.id === range)?.label || '';

  const byCat = React.useMemo(() => aggByCategory(filtered), [filtered]);
  const byTime = React.useMemo(() => aggByTime(filtered, lo, hi), [filtered, lo, hi]);
  const byMonth = React.useMemo(() => aggByMonth(filtered), [filtered]);
  const topItems = React.useMemo(() => aggTopItems(filtered), [filtered]);

  const open = (id, title, data) => openFullscreen({ id, title, subtitle: rangeLabel, data });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <Label>Период</Label>
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4, marginBottom: 8,
          scrollbarWidth: 'none',
        }}>
          {RANGES.map(r => (
            <button key={r.id}
              onClick={() => setRange(r.id)}
              style={{
                flexShrink: 0,
                padding: '6px 11px', borderRadius: 999,
                background: range === r.id ? '#6366f1' : 'transparent',
                border: '1px solid ' + (range === r.id ? '#6366f1' : '#283056'),
                color: range === r.id ? '#fff' : '#cbd5e1',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>{r.label}</button>
          ))}
        </div>

        {range === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <Label>С</Label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                style={{ ...fieldStyle(false), height: 38, fontSize: 12 }} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>По</Label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                style={{ ...fieldStyle(false), height: 38, fontSize: 12 }} />
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          paddingTop: 8, borderTop: '1px solid #283056',
        }}>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{filtered.length}</span> записей
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: '#f1f5f9',
            fontVariantNumeric: 'tabular-nums',
          }}>{fmtMoney(total)}</div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <ChartCard title="По категориям" onOpen={() => open('cat',   'По категориям', byCat)}>
          <Doughnut data={byCat} />
        </ChartCard>
        <ChartCard title="По времени"   onOpen={() => open('time',  'По времени',   byTime)}>
          <AreaChart points={byTime} />
        </ChartCard>
        <ChartCard title="По месяцам"   onOpen={() => open('month', 'По месяцам',   byMonth)}>
          <BarChart bars={byMonth} />
        </ChartCard>
        <ChartCard title="Топ позиций"  onOpen={() => open('top',   'Топ позиций',  topItems)}>
          <HBarChart rows={topItems.slice(0, 6)} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children, onOpen }) {
  return (
    <button onClick={onOpen} style={{
      background: '#141a2e',
      border: '1px solid #283056',
      borderRadius: 12,
      padding: 10,
      minWidth: 0,
      textAlign: 'left',
      fontFamily: 'inherit',
      cursor: 'pointer',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>{title}</div>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </div>
      {children}
    </button>
  );
}

Object.assign(window, { AnalyticsTab, FullscreenChart });
