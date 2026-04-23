// Main app — header, pill tabs, content, toast, dialog, persistence.

const STORAGE_KEY = 'expenses-ru-v1';

function useExpenses() {
  const [entries, setEntries] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed.sort((a, b) => b.ts - a.ts);
      }
    } catch {}
    return buildSeed();
  });

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  }, [entries]);

  const add = (e) => setEntries(prev => [{
    id: 'e-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    ts: Date.now(),
    ...e,
  }, ...prev]);

  const update = (id, patch) => setEntries(prev =>
    prev.map(e => e.id === id ? { ...e, ...patch } : e)
  );

  const remove = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  const replaceAll = (arr) => setEntries(arr.slice().sort((a, b) => b.ts - a.ts));

  return { entries, add, update, remove, replaceAll };
}

const TABS = [
  { id: 'add',       label: 'Добавить' },
  { id: 'history',   label: 'История' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'settings',  label: 'Настройки' },
];

function App() {
  const { entries, add, update, remove, replaceAll } = useExpenses();
  const [tab, setTab] = React.useState(() => localStorage.getItem('tab') || 'add');
  const [toast, setToast] = React.useState(null);
  const [dialog, setDialog] = React.useState(null);
  const [fsChart, setFsChart] = React.useState(null);
  const dialogResolver = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => { localStorage.setItem('tab', tab); }, [tab]);
  React.useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab]);

  const showToast = (msg, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToast({ id, msg, kind });
    setTimeout(() => setToast(cur => (cur && cur.id === id ? null : cur)), 2000);
  };

  const confirm = (opts) => new Promise(resolve => {
    dialogResolver.current = resolve;
    setDialog(opts);
  });
  const resolveDialog = (val) => {
    dialogResolver.current?.(val);
    dialogResolver.current = null;
    setDialog(null);
  };

  return (
    <div style={{
      position: 'relative', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#0b1020',
      fontFamily: "system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
      color: '#e2e8f0',
      overflow: 'hidden',
    }}>
      {/* Radial indigo glow top-right */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 110% -10%, rgba(99,102,241,0.38) 0%, rgba(99,102,241,0.12) 25%, transparent 55%)',
      }} />

      {/* Sticky frosted header */}
      <div style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(11,16,32,0.72)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        borderBottom: '1px solid rgba(40,48,86,0.7)',
        padding: '12px 16px 10px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline',
          justifyContent: 'space-between', marginBottom: 10,
        }}>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 700,
            color: '#f1f5f9', letterSpacing: -0.4,
          }}>Расходы</h1>
          <div style={{
            fontSize: 11, color: '#94a3b8',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
            }} />
            оффлайн
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          marginLeft: -2, paddingLeft: 2, paddingRight: 2,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }} className="nosb">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flexShrink: 0,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: active ? '1px solid #6366f1' : '1px solid rgba(40,48,86,0.8)',
                  background: active
                    ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)'
                    : 'transparent',
                  color: active ? '#fff' : '#94a3b8',
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: active ? '0 6px 16px rgba(99,102,241,0.32)' : 'none',
                  transition: 'all 160ms',
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        padding: '14px 14px 34px',
        position: 'relative', zIndex: 5,
      }} className="nosb">
        {tab === 'add'       && <AddTab       entries={entries} add={add} showToast={showToast} />}
        {tab === 'history'   && <HistoryTab   entries={entries} update={update} remove={remove} showToast={showToast} confirm={confirm} />}
        {tab === 'analytics' && <AnalyticsTab entries={entries} openFullscreen={setFsChart} />}
        {tab === 'settings'  && <SettingsTab  entries={entries} replaceAll={replaceAll} showToast={showToast} confirm={confirm} />}
      </div>

      <Toast toast={toast} />
      <ConfirmDialog dialog={dialog} onResolve={resolveDialog} />
      <FullscreenChart chart={fsChart} onClose={() => setFsChart(null)} />
    </div>
  );
}

// ─────────── Page root: center the device frame
function Page() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 30% 0%, #1a1d2a 0%, #0a0b0f 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box',
    }}>
      <SamsungS23Frame>
        <App />
      </SamsungS23Frame>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Page />);
