// Shared primitives: formatters, icons, Toast, ConfirmDialog.

const fmtMoney = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('ru-RU') + ' ₸';
};

const fmtMoneyShort = (n) => {
  const v = Math.round(Number(n) || 0);
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + 'к';
  return String(v);
};

const fmtTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `Сегодня · ${hh}:${mm}`;
  if (isYest) return `Вчера · ${hh}:${mm}`;
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return `${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
};

const fmtDateInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Tiny inline SVG icons — stroke-based, 20px default.
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => {
  const paths = {
    plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search:  <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    edit:    <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
    trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></>,
    x:       <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:   <><polyline points="20 6 9 17 4 12"/></>,
    chevron: <><polyline points="6 9 12 15 18 9"/></>,
    download:<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    upload:  <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    wifi:    <><path d="M5 12.55a11 11 0 0114 0"/><path d="M8.5 16.05a6 6 0 017 0"/><line x1="12" y1="20" x2="12" y2="20"/></>,
    info:    <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// Category badge pill
const CatBadge = ({ category, size = 'sm' }) => {
  const c = CAT_COLORS[category] || '#6366f1';
  const pad = size === 'sm' ? '3px 8px' : '4px 10px';
  const fs  = size === 'sm' ? 10.5 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, borderRadius: 999,
      fontSize: fs, fontWeight: 500,
      letterSpacing: 0.1,
      color: c,
      background: c + '1f',
      border: '1px solid ' + c + '33',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
      {category}
    </span>
  );
};

// Toast — ephemeral snackbar near the bottom
function Toast({ toast }) {
  if (!toast) return null;
  const color = toast.kind === 'err' ? '#ef4444'
             : toast.kind === 'ok'  ? '#22c55e'
             : '#6366f1';
  return (
    <div key={toast.id} style={{
      position: 'absolute', left: '50%', bottom: 38,
      transform: 'translateX(-50%)',
      background: 'rgba(20,26,46,0.96)',
      border: `1px solid ${color}55`,
      color: '#e2e8f0',
      padding: '10px 14px',
      borderRadius: 999,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', gap: 8,
      zIndex: 50,
      animation: 'toastIn 220ms cubic-bezier(.2,.9,.3,1.2)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {toast.msg}
    </div>
  );
}

// Confirm dialog
function ConfirmDialog({ dialog, onResolve }) {
  if (!dialog) return null;
  const { title, body, confirmLabel = 'Подтвердить', danger = false } = dialog;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'rgba(5,8,18,0.72)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn 180ms ease',
    }}>
      <div style={{
        background: '#141a2e',
        border: '1px solid #283056',
        borderRadius: 16,
        padding: 18,
        width: '100%',
        boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
        animation: 'dialogIn 240ms cubic-bezier(.2,.9,.3,1.1)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.45, marginBottom: 18 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onResolve(false)} style={{
            flex: 1, height: 42, borderRadius: 10,
            background: 'transparent',
            border: '1px solid #283056',
            color: '#cbd5e1',
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}>Отмена</button>
          <button onClick={() => onResolve(true)} style={{
            flex: 1, height: 42, borderRadius: 10,
            background: danger ? '#ef4444' : '#6366f1',
            border: 'none',
            color: '#fff',
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: danger ? '0 6px 18px rgba(239,68,68,0.35)' : '0 6px 18px rgba(99,102,241,0.4)',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { fmtMoney, fmtMoneyShort, fmtTime, fmtDateInput, Icon, CatBadge, Toast, ConfirmDialog });
