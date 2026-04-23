// Shared inputs + "Добавить" (Add) tab with autocomplete.

const Label = ({ children }) => (
  <div style={{
    fontSize: 11.5, fontWeight: 600,
    color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 6,
  }}>{children}</div>
);

const fieldStyle = (focused) => ({
  width: '100%', boxSizing: 'border-box',
  height: 44,
  background: '#0b1020',
  border: `1px solid ${focused ? '#6366f1' : '#283056'}`,
  color: '#f1f5f9',
  borderRadius: 10,
  padding: '0 12px',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 120ms',
  boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
});

// Card wrapper used everywhere
const Card = ({ children, style }) => (
  <div style={{
    background: '#141a2e',
    border: '1px solid #283056',
    borderRadius: 12,
    padding: 14,
    ...style,
  }}>{children}</div>
);

// ─────────── entry row (shared by Recent + History)
function EntryRow({ entry, onEdit, onDelete, compact = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: compact ? '10px 0' : '11px 0',
      borderBottom: '1px solid rgba(40,48,86,0.6)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#f1f5f9',
          marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{entry.name}</div>
        <CatBadge category={entry.category} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: '#818cf8',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>{fmtMoney(entry.price)}</div>
        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 3 }}>
          {fmtTime(entry.ts)}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 2 }}>
          {onEdit && (
            <button onClick={onEdit} title="Изменить" style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'transparent',
              border: '1px solid #283056', color: '#cbd5e1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}><Icon name="edit" size={13} /></button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Удалить" style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}><Icon name="trash" size={13} /></button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────── Autocomplete input — shows up to 5 suggestions
function NameInput({ value, onChange, entries, onPick, placeholder, setCategory, setPrice }) {
  const [focused, setFocused] = React.useState(false);
  const [active, setActive] = React.useState(-1);

  const q = value.trim().toLowerCase();
  const suggestions = React.useMemo(() => {
    if (!q) return [];
    // unique by name, sorted by recency
    const seen = new Set();
    const out = [];
    for (const e of entries) {
      const k = e.name.toLowerCase();
      if (seen.has(k)) continue;
      if (k.includes(q)) { seen.add(k); out.push(e); }
      if (out.length >= 5) break;
    }
    return out;
  }, [q, entries]);

  const pick = (e) => {
    onChange(e.name);
    setCategory?.(e.category);
    setPrice?.(String(e.price));
    setFocused(false);
    onPick?.(e);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 140)}
        placeholder={placeholder}
        style={fieldStyle(focused)}
      />
      {focused && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 48, zIndex: 20,
          background: '#1b2240',
          border: '1px solid #283056',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
        }}>
          {suggestions.map((e, i) => (
            <div
              key={e.id}
              onMouseDown={() => pick(e)}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '9px 12px',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(40,48,86,0.7)' : 'none',
                cursor: 'pointer',
                background: active === i ? 'rgba(99,102,241,0.12)' : 'transparent',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(e.price)}</div>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{e.category}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────── Category select with suggestions
function CategoryInput({ value, onChange }) {
  const [focused, setFocused] = React.useState(false);
  const q = value.trim().toLowerCase();
  const matches = CATEGORIES.filter(c => !q || c.toLowerCase().includes(q));
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 140)}
        placeholder="Например, Продукты"
        style={fieldStyle(focused)}
      />
      {focused && matches.length > 0 && !CATEGORIES.includes(value) && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 48, zIndex: 20,
          background: '#1b2240', border: '1px solid #283056',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {matches.map((c, i) => (
            <div key={c}
              onMouseDown={() => { onChange(c); setFocused(false); }}
              style={{
                padding: '9px 12px', cursor: 'pointer',
                borderBottom: i < matches.length - 1 ? '1px solid rgba(40,48,86,0.7)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: CAT_COLORS[c] }} />
              <span style={{ fontSize: 13.5, color: '#f1f5f9' }}>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────── ADD TAB
function AddTab({ entries, add, showToast }) {
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [err, setErr] = React.useState('');

  const recent = entries.slice(0, 6);

  const submit = () => {
    const p = parseFloat(price.replace(',', '.'));
    if (!name.trim()) return setErr('Укажите название');
    if (!category.trim()) return setErr('Укажите категорию');
    if (!isFinite(p) || p <= 0) return setErr('Укажите цену');
    add({ name: name.trim(), category: category.trim(), price: p });
    setName(''); setCategory(''); setPrice(''); setErr('');
    showToast('Добавлено.', 'ok');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ marginBottom: 12 }}>
          <Label>Название</Label>
          <NameInput
            value={name} onChange={setName}
            entries={entries}
            placeholder="Например, Капучино"
            setCategory={setCategory} setPrice={setPrice}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Категория</Label>
          <CategoryInput value={category} onChange={setCategory} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Цена, ₸</Label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            style={{ ...fieldStyle(false), fontVariantNumeric: 'tabular-nums' }}
          />
        </div>
        {err && (
          <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 10 }}>{err}</div>
        )}
        <button onClick={submit} style={{
          width: '100%', height: 46,
          borderRadius: 10, border: 'none',
          background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
          color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 10px 24px rgba(99,102,241,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Добавить
        </button>
      </Card>

      <Card>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 4,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Недавние</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>последние {recent.length}</div>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: '22px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Пока ничего нет
          </div>
        ) : (
          recent.map(e => <EntryRow key={e.id} entry={e} compact />)
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { AddTab, Card, Label, fieldStyle, EntryRow });
